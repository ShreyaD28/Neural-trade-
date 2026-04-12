const Candle = require('../models/Candle');

const DEFAULT_SYMBOLS = ['BTC-USD', 'ETH-USD', 'SOL-USD', 'NVDA-USD'];
const INTERVAL = '1m';

/** In-memory last close per symbol for random walk */
const state = new Map();

function seedPrice(symbol) {
  const base = {
    'BTC-USD': 98000,
    'ETH-USD': 3500,
    'SOL-USD': 180,
    'NVDA-USD': 125,
  };
  return base[symbol] ?? 100 + Math.random() * 50;
}

function getTrackedSymbols() {
  return [...DEFAULT_SYMBOLS];
}

/**
 * Advance one synthetic candle from previous close; persist if new bucket.
 * Returns the candle document (plain object) or null if duplicate bucket.
 */
async function tickSymbol(symbol, now = new Date()) {
  const prev = state.get(symbol) ?? seedPrice(symbol);
  const drift = (Math.random() - 0.5) * prev * 0.002;
  const close = Math.max(0.01, prev + drift);
  const open = prev;
  const wick = Math.random() * prev * 0.001;
  const high = Math.max(open, close) + wick;
  const low = Math.min(open, close) - wick;
  const volume = Math.floor(Math.random() * 5000 + 100);

  const bucket = new Date(now);
  bucket.setSeconds(0, 0);

  state.set(symbol, close);

  try {
    const doc = await Candle.create({
      symbol,
      interval: INTERVAL,
      open,
      high,
      low,
      close,
      volume,
      timestamp: bucket,
    });
    return doc.toObject();
  } catch (err) {
    if (err.code === 11000) {
      return null;
    }
    throw err;
  }
}

async function seedInitialCandlesIfEmpty() {
  const count = await Candle.countDocuments({ interval: INTERVAL });
  if (count > 0) {
    await hydrateStateFromDb();
    return;
  }

  const now = new Date();
  for (const symbol of DEFAULT_SYMBOLS) {
    state.set(symbol, seedPrice(symbol));
    for (let i = 59; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 60_000);
      await tickSymbol(symbol, t);
    }
  }
}

async function hydrateStateFromDb() {
  for (const symbol of DEFAULT_SYMBOLS) {
    const last = await Candle.findOne({ symbol, interval: INTERVAL })
      .sort({ timestamp: -1 })
      .lean();
    if (last) state.set(symbol, last.close);
    else state.set(symbol, seedPrice(symbol));
  }
}

module.exports = {
  getTrackedSymbols,
  tickSymbol,
  seedInitialCandlesIfEmpty,
  SIM_INTERVAL: INTERVAL,
};
