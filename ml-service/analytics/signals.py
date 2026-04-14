"""Technical indicators and discrete trading signal."""

from __future__ import annotations

import pandas as pd


def _rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = (-delta).where(delta < 0, 0.0)
    avg_gain = gain.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, float("nan"))
    rsi = 100 - (100 / (1 + rs))
    return rsi


def _macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    ema_fast = close.ewm(span=fast, adjust=False).mean()
    ema_slow = close.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    hist = macd_line - signal_line
    return macd_line, signal_line, hist


def _bollinger(close: pd.Series, window: int = 20, num_std: float = 2.0):
    mid = close.rolling(window).mean()
    std = close.rolling(window).std(ddof=0)
    upper = mid + num_std * std
    lower = mid - num_std * std
    return lower, mid, upper


def compute_signal(close: pd.Series) -> dict:
    """
    RSI(14), MACD(12,26,9), Bollinger(20,2) -> BUY | SELL | HOLD and confidence in [0,1].
    """
    close = close.dropna()
    if len(close) < 35:
        return {
            "signal": "HOLD",
            "confidence": 0.0,
            "rsi": float("nan"),
            "macd": float("nan"),
        }

    rsi = _rsi(close, 14)
    macd_line, signal_line, _ = _macd(close, 12, 26, 9)
    lower, mid, upper = _bollinger(close, 20, 2.0)

    last_price = float(close.iloc[-1])
    rsi_v = float(rsi.iloc[-1])
    macd_v = float(macd_line.iloc[-1])
    sig_v = float(signal_line.iloc[-1])
    low_bb = float(lower.iloc[-1])
    high_bb = float(upper.iloc[-1])

    if rsi_v < 35 and macd_v > sig_v:
        signal = "BUY"
    elif rsi_v > 65 and macd_v < sig_v:
        signal = "SELL"
    else:
        signal = "HOLD"

    confidence = min(1.0, max(0.0, abs(rsi_v - 50.0) / 50.0))

    return {
        "signal": signal,
        "confidence": round(min(1.0, max(0.0, confidence)), 4),
        "rsi": round(rsi_v, 4),
        "macd": round(macd_v, 6),
    }
