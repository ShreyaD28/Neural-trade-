const express = require('express');
const Candle = require('../models/Candle');
const { getTrackedSymbols } = require('../services/marketFeed');
const { getMl } = require('../services/mlClient');

const router = express.Router();

const USE_SIMULATOR = process.env.USE_SIMULATOR === 'true';

function fallbackLimitForRange(interval, period) {
  const key = `${interval}:${period}`;
  const map = {
    '5m:1d': 288,
    '15m:5d': 480,
    '1h:1mo': 720,
    '1d:6mo': 540,
  };
  return map[key] ?? 500;
}

// ─── Symbols list ─────────────────────────────────────────────────────────────
router.get('/symbols', (req, res) => {
  res.json({ symbols: getTrackedSymbols() });
});

// ─── Latest live prices (Yahoo Finance or last candle from DB) ────────────────
router.get('/prices', async (req, res) => {
  if (!USE_SIMULATOR) {
    try {
      const { fetchLatestPrices } = require('../services/yahooFeed');
      const prices = await fetchLatestPrices();
      // If we got at least some prices, return them
      if (Object.values(prices).some((v) => v != null)) {
        return res.json(prices);
      }
    } catch (err) {
      console.error('[market/prices] Yahoo error:', err.message);
      // fall through to DB fallback
    }
  }

  // Fallback: last candle close per symbol from MongoDB
  try {
    const symbols = getTrackedSymbols();
    const result = {};
    await Promise.all(
      symbols.map(async (sym) => {
        const last = await Candle.findOne({ symbol: sym, interval: '1m' })
          .sort({ timestamp: -1 })
          .lean();
        result[sym] = last ? last.close : null;
      })
    );
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── OHLCV candle series for a symbol ────────────────────────────────────────
router.get('/candles/:symbol', async (req, res) => {
  try {
    const symbol = String(req.params.symbol || '').toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: 'symbol is required' });
    }
    const interval = String(req.query.interval || '1m');
    const limit = Math.min(Number(req.query.limit) || 500, 2000);

    const candles = await Candle.find({ symbol, interval })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    candles.reverse();
    res.json({ symbol, interval, candles });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load candles' });
  }
});

// ─── Live external candles proxied through the backend ───────────────────────
router.get('/live-candles/:symbol', async (req, res) => {
  const symbol = String(req.params.symbol || '').toUpperCase();
  if (!symbol) {
    return res.status(400).json({ error: 'symbol is required' });
  }

  const interval = String(req.query.interval || '1h');
  const period = String(req.query.period || '1mo');

  try {
    const data = await getMl(`/candles/${encodeURIComponent(symbol)}`, {
      params: { interval, period },
    });
    res.json(Array.isArray(data) ? data : []);
  } catch (err) {
    try {
      const limit = fallbackLimitForRange(interval, period);
      const candles = await Candle.find({ symbol, interval: '1m' })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();

      candles.reverse();
      const normalized = candles.map((c) => ({
        time: Math.floor(new Date(c.timestamp).getTime() / 1000),
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume ?? 0),
      }));
      res.json(normalized);
    } catch (fallbackErr) {
      const status = err.response?.status || 502;
      res.status(status >= 400 && status < 600 ? status : 502).json({
        error: err.message || 'Failed to load live candles',
        detail: err.response?.data ?? fallbackErr.message,
      });
    }
  }
});

// ─── Latest quote snapshot from last candle ───────────────────────────────────
router.get('/quote/:symbol', async (req, res) => {
  try {
    const symbol = String(req.params.symbol || '').toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: 'symbol is required' });
    }
    const interval = String(req.query.interval || '1m');
    const last = await Candle.findOne({ symbol, interval })
      .sort({ timestamp: -1 })
      .lean();
    if (!last) {
      return res.status(404).json({ error: 'No data for symbol' });
    }
    res.json({
      symbol,
      interval,
      last: {
        open: last.open,
        high: last.high,
        low: last.low,
        close: last.close,
        volume: last.volume,
        timestamp: last.timestamp,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load quote' });
  }
});

module.exports = router;
