const express = require('express');
const { auth } = require('../middleware/auth');
const {
  quickSignalFromMlService,
  narrativeSignalWithOpenAI,
} = require('../services/mlClient');

const router = express.Router();

/** Optional auth: attach user when Bearer token present */
router.use(auth(false));

/**
 * Ask the optional Python ML service for a structured signal
 * POST { symbol, features? }
 */
router.post('/ml', async (req, res) => {
  try {
    const { symbol, features } = req.body;
    if (!symbol) {
      return res.status(400).json({ error: 'symbol is required' });
    }
    const result = await quickSignalFromMlService(symbol, features);
    res.json(result);
  } catch (err) {
    const status = err.response?.status || 502;
    res.status(status >= 400 && status < 600 ? status : 502).json({
      error: err.message || 'ML service error',
      detail: err.response?.data,
    });
  }
});

/**
 * LLM-assisted commentary (requires OPENAI_API_KEY)
 * POST { symbol, candlesSummary?, question? }
 */
router.post('/llm', auth(true), async (req, res) => {
  try {
    const { symbol, candlesSummary, question } = req.body;
    if (!symbol) {
      return res.status(400).json({ error: 'symbol is required' });
    }
    const text = await narrativeSignalWithOpenAI({
      symbol: String(symbol).toUpperCase(),
      candlesSummary: candlesSummary || '',
      question: question || 'Give a concise risk-aware outlook.',
    });
    res.json({ symbol: String(symbol).toUpperCase(), narrative: text });
  } catch (err) {
    res.status(500).json({ error: err.message || 'LLM request failed' });
  }
});

module.exports = router;
