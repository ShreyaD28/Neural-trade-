const express = require('express');
const Candle = require('../models/Candle');
const { getTrackedSymbols } = require('../services/simulator');

const router = express.Router();

router.get('/symbols', (req, res) => {
  res.json({ symbols: getTrackedSymbols() });
});

/** OHLCV series for a symbol (defaults: interval 1m, limit 500) */
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

/** Latest quote-style snapshot from last candle */
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
