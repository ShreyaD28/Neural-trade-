"""Download OHLCV history via yfinance."""

from __future__ import annotations

import pandas as pd
import yfinance as yf


def download_ohlcv(symbol: str, period: str = "2y") -> pd.DataFrame:
    """
    Return a DataFrame with Open, High, Low, Close, Volume (index: dates).
    """
    ticker = yf.Ticker(symbol)
    df = ticker.history(period=period, auto_adjust=True)
    if df.empty:
        raise ValueError(f"No OHLCV data for symbol {symbol!r} (period={period!r})")
    if df.index.tz is not None:
        df.index = df.index.tz_localize(None)
    return df
