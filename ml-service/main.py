"""
FastAPI ML service: prices, Prophet forecasts, risk metrics, technical signals, LSTM accuracy.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import yfinance as yf
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from analytics.risk import risk_summary
from analytics.signals import compute_signal
from data.fetcher import download_ohlcv
from models.lstm_model import device as torch_device
from models.lstm_model import train_directional_accuracy
from models.prophet_model import predict_with_prophet_or_sma

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(ENV_PATH)

MONGODB_URI = os.getenv("MONGODB_URI", "")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if MONGODB_URI:
        try:
            from pymongo import MongoClient

            client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
            client.admin.command("ping")
            client.close()
            print("MongoDB: ping OK")
        except Exception as e:
            print(f"MongoDB: optional ping failed ({e})")
    print(f"PyTorch device: {torch_device}")
    yield


app = FastAPI(title="Trading ML Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STOCK_SYMBOLS = ["AAPL", "TSLA", "MSFT", "GOOGL", "NVDA", "META", "AMZN"]
CRYPTO_SYMBOLS = ["BTC-USD", "ETH-USD", "SOL-USD"]
INDEX_SYMBOLS = ["SPY", "QQQ", "USO", "VIXY"]
ALL_SYMBOLS = STOCK_SYMBOLS + CRYPTO_SYMBOLS + INDEX_SYMBOLS
PRICE_SYMBOLS = [
    "AAPL",
    "TSLA",
    "MSFT",
    "GOOGL",
    "NVDA",
    "META",
    "AMZN",
    "BTC-USD",
    "ETH-USD",
    "GC=F",
]


class PredictRequest(BaseModel):
    symbol: str
    horizon_days: int = Field(default=5, ge=1, le=365)


class RiskRequest(BaseModel):
    returns: list[float]


class SignalPostBody(BaseModel):
    symbol: str = ""
    features: dict = Field(default_factory=dict)


@app.get("/prices")
def get_prices():
    """Latest close for core watchlist via Yahoo Finance (no API key required)."""
    out: dict[str, Optional[float]] = {}
    display_names = {"GC=F": "GOLD"}
    for sym in PRICE_SYMBOLS:
        try:
            t = yf.Ticker(sym)
            hist = t.history(period="5d", auto_adjust=True)
            key = display_names.get(sym, sym)
            out[key] = float(hist["Close"].iloc[-1]) if not hist.empty else None
        except Exception:
            key = display_names.get(sym, sym)
            out[key] = None
    return out


@app.get("/candles/{symbol}")
def get_candles(symbol: str):
    """Return 1m intraday candles from Yahoo Finance for a symbol."""
    try:
        df = yf.download(symbol, period="1d", interval="1m", progress=False)
        if df.empty:
            return []

        # yfinance can return MultiIndex columns for single/multi ticker downloads.
        if hasattr(df.columns, "nlevels") and df.columns.nlevels > 1:
            df.columns = df.columns.get_level_values(0)
        df = df.reset_index()

        time_col = "Datetime" if "Datetime" in df.columns else "Date"
        if time_col not in df.columns:
            return []

        candles = []
        for _, row in df.iterrows():
            ts = row.get(time_col)
            if ts is None:
                continue
            candles.append(
                {
                    "time": int(ts.timestamp()),
                    "open": float(row.get("Open", 0.0) or 0.0),
                    "high": float(row.get("High", 0.0) or 0.0),
                    "low": float(row.get("Low", 0.0) or 0.0),
                    "close": float(row.get("Close", 0.0) or 0.0),
                    "volume": int(row.get("Volume", 0) or 0),
                }
            )

        candles.sort(key=lambda c: c["time"])
        return candles
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch candles for {symbol.upper()}: {e}",
        ) from e


@app.post("/predict")
def post_predict(body: PredictRequest):
    try:
        return predict_with_prophet_or_sma(body.symbol, body.horizon_days)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/risk")
def post_risk(body: RiskRequest):
    s = risk_summary(body.returns)
    return {"sharpe": s["sharpe"], "max_drawdown": s["max_drawdown"], "var_95": s["var_95"]}


@app.get("/signals/{symbol}")
def get_signals(symbol: str):
    try:
        df = download_ohlcv(symbol, period="2y")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    sig = compute_signal(df["Close"])
    return {
        "signal": sig["signal"],
        "confidence": sig["confidence"],
        "rsi": sig["rsi"],
        "macd": sig["macd"],
    }


@app.get("/accuracy/{symbol}")
def get_accuracy(symbol: str):
    try:
        acc = train_directional_accuracy(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    return {"directional_accuracy": round(acc, 4)}


@app.post("/signal")
def post_signal_compat(body: SignalPostBody):
    """Compatibility with Node backend `POST /signal`."""
    if not body.symbol:
        raise HTTPException(status_code=400, detail="symbol is required")
    try:
        df = download_ohlcv(body.symbol, period="2y")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    sig = compute_signal(df["Close"])
    return {
        "symbol": body.symbol.upper(),
        "signal": sig["signal"],
        "confidence": sig["confidence"],
        "rsi": sig["rsi"],
        "macd": sig["macd"],
    }


@app.get("/health")
def health():
    return {"ok": True, "device": str(torch_device)}
