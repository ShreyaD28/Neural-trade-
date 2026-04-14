const axios = require('axios');
const Candle = require('../models/Candle');

const ML_BASE_URL = (process.env.ML_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
const DEFAULT_SYMBOLS = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'NVDA', 'META', 'AMZN', 'BTC-USD', 'ETH-USD'];
const INTERVAL = '1m';
const POLL_MS = 60_000;

let ioRef = null;
let pollTimer = null;

/** Broadcast a candle to all clients and the symbol-specific room */
function broadcastCandle(candle) {
  if (!ioRef || !candle) return;
  ioRef.emit('candle', candle);
  ioRef.to(`symbol:${candle.symbol}`).emit('candle', candle);
}

async function upsertAndBroadcast(symbol, rawCandle) {
  const timestamp = new Date(Number(rawCandle.time) * 1000);
  if (Number.isNaN(timestamp.getTime())) return;

  try {
    const persisted = await Candle.findOneAndUpdate(
      { symbol, interval: INTERVAL, timestamp },
      {
        $set: {
          open: Number(rawCandle.open ?? 0),
          high: Number(rawCandle.high ?? 0),
          low: Number(rawCandle.low ?? 0),
          close: Number(rawCandle.close ?? 0),
          volume: Number(rawCandle.volume ?? 0),
        },
        $setOnInsert: { symbol, interval: INTERVAL, timestamp },
      },
      { upsert: true, returnDocument: 'after', lean: true }
    );
    broadcastCandle(persisted);
  } catch (err) {
    if (err.code !== 11000) {
      console.error(`[marketFeed] persist ${symbol}:`, err.message);
    }
  }
}

async function pollSymbol(symbol) {
  const started = Date.now();
  const endpoint = `${ML_BASE_URL}/candles/${encodeURIComponent(symbol)}`;
  const { data } = await axios.get(endpoint, { timeout: 15_000 });
  const elapsed = Date.now() - started;

  if (elapsed > 300) {
    console.warn(`[marketFeed] slow candles fetch ${symbol}: ${elapsed}ms`);
  } else {
    console.log(`[marketFeed] candles ${symbol}: ${elapsed}ms`);
  }

  if (!Array.isArray(data)) return;
  for (const candle of data) {
    await upsertAndBroadcast(symbol, candle);
  }
}

async function runPollTick() {
  for (const symbol of DEFAULT_SYMBOLS) {
    try {
      await pollSymbol(symbol);
    } catch (err) {
      console.error(`[marketFeed] poll ${symbol}:`, err.message);
    }
  }
}

/**
 * Returns all tradeable symbols (for the chart dropdown).
 */
function getTrackedSymbols() {
  return [...DEFAULT_SYMBOLS];
}

/**
 * Attach Socket.IO rooms and start the appropriate market feed.
 * @param {import('socket.io').Server} io
 */
function startMarketFeed(io) {
  ioRef = io;

  io.on('connection', (socket) => {
    socket.on('subscribe', (symbol) => {
      if (typeof symbol !== 'string' || !symbol.trim()) return;
      socket.join(`symbol:${symbol.toUpperCase()}`);
    });
    socket.on('unsubscribe', (symbol) => {
      if (typeof symbol !== 'string' || !symbol.trim()) return;
      socket.leave(`symbol:${symbol.toUpperCase()}`);
    });
  });
  console.log('[marketFeed] 🟢 ML-backed candles feed mode');

  runPollTick().catch((err) => console.error('[marketFeed] initial poll:', err.message));
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    runPollTick().catch((err) => console.error('[marketFeed] scheduled poll:', err.message));
  }, POLL_MS);
}

module.exports = { startMarketFeed, broadcastCandle, getTrackedSymbols };
