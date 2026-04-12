"""Prophet forecasts with holdout directional accuracy, in-memory cache, SMA fallback."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

import numpy as np
import pandas as pd
from prophet import Prophet

from data.fetcher import download_ohlcv

MIN_PROPHET_ACCURACY = 0.65


@dataclass
class ProphetCacheEntry:
    use_sma: bool
    holdout_accuracy: float
    model: Optional[Any]
    history: pd.DataFrame  # columns ds, y — last training snapshot


_model_cache: dict[str, ProphetCacheEntry] = {}


def _prepare_prophet_df(df: pd.DataFrame) -> pd.DataFrame:
    idx = pd.to_datetime(df.index)
    return pd.DataFrame({"ds": idx, "y": df["Close"].astype(float).values})


def _directional_accuracy(pred: np.ndarray, actual: np.ndarray) -> float:
    if len(pred) < 2 or len(actual) < 2:
        return 0.0
    p = np.sign(np.diff(pred.astype(float)))
    a = np.sign(np.diff(actual.astype(float)))
    return float(np.mean(p == a))


def prophet_holdout_accuracy(raw: pd.DataFrame) -> float:
    """80% train / 20% test chronological; directional match on holdout predictions."""
    data = _prepare_prophet_df(raw)
    n = len(data)
    if n < 30:
        return 0.0
    split = int(n * 0.8)
    train = data.iloc[:split].copy()
    test = data.iloc[split:].copy()
    m = Prophet(
        daily_seasonality=True,
        weekly_seasonality=True,
        yearly_seasonality=True,
        seasonality_mode="multiplicative",
    )
    m.fit(train)
    future = m.make_future_dataframe(periods=len(test), include_history=False)
    fc = m.predict(future)
    pred = fc["yhat"].values[: len(test)]
    act = test["y"].values
    return _directional_accuracy(pred, act)


def _sma_forecast(history_close: pd.Series, horizon_days: int) -> tuple[list[pd.Timestamp], list[float]]:
    last_date = pd.Timestamp(history_close.index[-1])
    sma5 = float(history_close.rolling(5).mean().iloc[-1])
    if not np.isfinite(sma5):
        sma5 = float(history_close.iloc[-1])
    dates = list(
        pd.date_range(start=last_date + pd.Timedelta(days=1), periods=horizon_days, freq="D")
    )
    predicted = [sma5] * horizon_days
    return dates, predicted


def _refit_prophet(data: pd.DataFrame) -> Prophet:
    m = Prophet(
        daily_seasonality=True,
        weekly_seasonality=True,
        yearly_seasonality=True,
        seasonality_mode="multiplicative",
    )
    m.fit(data)
    return m


def predict_with_prophet_or_sma(
    symbol: str, horizon_days: int, refresh: bool = False
) -> dict:
    """
    Return dates, predicted_close, directional_accuracy (holdout metric).
    Caches per-symbol mode and Prophet model; refits when history extends.
    If holdout accuracy < 0.65, uses flat 5-day SMA extension.
    """
    if refresh:
        _model_cache.pop(symbol, None)

    raw = download_ohlcv(symbol, period="2y")
    data = _prepare_prophet_df(raw)
    last_ds = data["ds"].iloc[-1]

    entry = _model_cache.get(symbol)
    if entry is None:
        acc = prophet_holdout_accuracy(raw)
        use_sma = acc < MIN_PROPHET_ACCURACY
        entry = ProphetCacheEntry(
            use_sma=use_sma,
            holdout_accuracy=acc,
            model=None,
            history=data.copy(),
        )
        if not use_sma:
            entry.model = _refit_prophet(data)
            entry.history = data.copy()
        _model_cache[symbol] = entry
    elif not entry.use_sma:
        trained_through = entry.history["ds"].max()
        if last_ds > trained_through or entry.model is None:
            entry.model = _refit_prophet(data)
            entry.history = data.copy()

    if entry.use_sma:
        dates, predicted_close = _sma_forecast(raw["Close"], horizon_days)
        return {
            "dates": [d.isoformat() for d in dates],
            "predicted_close": predicted_close,
            "directional_accuracy": float(entry.holdout_accuracy),
        }

    assert entry.model is not None
    m = entry.model
    future = m.make_future_dataframe(periods=horizon_days, include_history=False)
    fc = m.predict(future)
    tail = fc.tail(horizon_days)
    dates = [pd.Timestamp(d).isoformat() for d in tail["ds"]]
    predicted_close = [float(x) for x in tail["yhat"]]

    return {
        "dates": dates,
        "predicted_close": predicted_close,
        "directional_accuracy": float(entry.holdout_accuracy),
    }
