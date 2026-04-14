const express = require('express');
const Trade = require('../models/Trade');
const Candle = require('../models/Candle');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth(true));

/** List trades for the authenticated user */
router.get('/trades', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const trades = await Trade.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ trades });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load trades' });
  }
});

/** Record a trade (paper / simulated execution) */
router.post('/trades', async (req, res) => {
  try {
    const { symbol, side, quantity, price, status } = req.body;
    if (!symbol || !side || quantity == null || price == null) {
      return res.status(400).json({
        error: 'symbol, side, quantity, and price are required',
      });
    }
    if (!['buy', 'sell'].includes(side)) {
      return res.status(400).json({ error: 'side must be buy or sell' });
    }
    const normalizedSymbol = String(symbol).toUpperCase();
    const q = Number(quantity);
    const p = Number(price);
    const commission = 1.5;
    const notional = q * p;

    if (!Number.isFinite(q) || q <= 0 || !Number.isFinite(p) || p <= 0) {
      return res.status(400).json({ error: 'quantity and price must be positive numbers' });
    }

    if (side === 'buy' && Number(req.user.cashBalance) < notional + commission) {
      return res.status(400).json({
        error: `Insufficient funds — need $${(notional + commission).toFixed(2)} have $${Number(req.user.cashBalance).toFixed(2)}`,
      });
    }

    if (side === 'sell') {
      const fills = await Trade.find({
        user: req.user._id,
        symbol: normalizedSymbol,
        status: 'filled',
      }).lean();
      const ownedQty = fills.reduce((sum, t) => {
        return sum + (t.side === 'buy' ? Number(t.quantity) : -Number(t.quantity));
      }, 0);
      if (q > Math.max(0, ownedQty)) {
        return res.status(400).json({
          error: `Insufficient shares — trying to sell ${q}, owned ${Math.max(0, ownedQty)}`,
        });
      }
    }

    const trade = await Trade.create({
      user: req.user._id,
      symbol: normalizedSymbol,
      side,
      quantity: q,
      price: p,
      total: notional,
      status: status && ['pending', 'filled', 'cancelled'].includes(status)
        ? status
        : 'filled',
    });

    const nextCash =
      side === 'buy'
        ? Number(req.user.cashBalance) - (notional + commission)
        : Number(req.user.cashBalance) + (notional - commission);
    req.user.cashBalance = Math.max(0, nextCash);
    await req.user.save();

    res.status(201).json({
      success: true,
      trade,
      newCashBalance: Number(req.user.cashBalance),
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create trade' });
  }
});

/**
 * Positions derived from trades using latest candle close as mark price
 * when available; otherwise uses average entry from trades only.
 */
router.get('/summary', async (req, res) => {
  try {
    const trades = await Trade.find({
      user: req.user._id,
      status: 'filled',
    })
      .sort({ filledAt: 1, createdAt: 1 })
      .lean();

    const bySymbol = {};
    for (const t of trades) {
      if (!bySymbol[t.symbol]) {
        bySymbol[t.symbol] = { qty: 0, costBasis: 0 };
      }
      const s = bySymbol[t.symbol];
      const q = t.quantity;
      const p = t.price;
      if (t.side === 'buy') {
        s.costBasis += q * p;
        s.qty += q;
      } else {
        const sellQ = Math.min(q, Math.max(0, s.qty));
        const avg = s.qty > 0 ? s.costBasis / s.qty : 0;
        s.costBasis -= sellQ * avg;
        s.qty -= sellQ;
        if (s.qty <= 0) {
          s.qty = 0;
          s.costBasis = 0;
        }
      }
    }

    const symbols = Object.keys(bySymbol);
    const marks = {};
    for (const sym of symbols) {
      const last = await Candle.findOne({ symbol: sym, interval: '1m' })
        .sort({ timestamp: -1 })
        .lean();
      marks[sym] = last ? last.close : null;
    }

    const positions = symbols
      .filter((s) => bySymbol[s].qty !== 0)
      .map((symbol) => {
        const { qty, costBasis } = bySymbol[symbol];
        const avg = qty !== 0 ? costBasis / qty : 0;
        const mark = marks[symbol];
        const marketValue = mark != null ? qty * mark : null;
        const unrealized =
          mark != null && qty !== 0 ? qty * (mark - avg) : null;
        return {
          symbol,
          quantity: qty,
          avgPrice: avg,
          markPrice: mark,
          marketValue,
          unrealizedPnl: unrealized,
        };
      });

    res.json({
      cashBalance: Number(req.user.cashBalance ?? 0),
      positions,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to build summary' });
  }
});

module.exports = router;
