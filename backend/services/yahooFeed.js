/**
 * Yahoo Finance real-time market data feed.
 *
 * No API key required. Uses yahoo-finance2 for:
 * - Polling live quotes every 15 seconds
 * - Fetching historical OHLCV bars on startup
 * - Persisting candles into MongoDB
 * - Broadcasting via Socket.IO
 */

const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const Candle = require('../models/Candle');

// ─── Symbols ────────────────────────────────────────────────────────────────
const EQUITY_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'META', 'AMZN', 'NVDA', 'TSLA'];
const CRYPTO_SYMBOLS = ['BTC-USD', 'ETH-USD', 'SOL-USD'];
const INDEX_ETF_SYMBOLS = ['SPY', 'QQQ', 'USO', 'VIXY'];

const ALL_SYMBOLS = [...EQUITY_SYMBOLS, ...CRYPTO_SYMBOLS, ...INDEX_ETF_SYMBOLS];
const TRADEABLE_SYMBOLS = [...EQUITY_SYMBOLS, ...CRYPTO_SYMBOLS];

const INTERVAL = '1m';

// ─── In-memory price state ──────────────────────────────────────────────────
const state = new Map();

// ─── Persist a bar to MongoDB ───────────────────────────────────────────────
async function persistBar(symbol, bar) {
  const { open, high, low, close, volume, timestamp } = bar;
  const bucket = new Date(timestamp);
  bucket.setSeconds(0, 0);

  state.set(symbol, close);

  try {
    const doc = await Candle.findOneAndUpdate(
      { symbol, interval: INTERVAL, timestamp: bucket },
      {
        $set: { open, high, low, close, volume },
        $setOnInsert: { symbol, interval: INTERVAL, timestamp: bucket },
      },
      { upsert: true, returnDocument: 'after', lean: true }
    );
    return doc;
  } catch (err) {
    if (err.code === 11000) return null;
    throw err;
  }
}

// ─── Seed historical bars on startup ────────────────────────────────────────
async function seedHistoricalBars() {
  console.log('[yahooFeed] seeding historical bars...');
  for (const symbol of ALL_SYMBOLS) {
    try {
      const result = await yahooFinance.chart(symbol, {
        period1: new Date(Date.now() - 2 * 60 * 60 * 1000), // last 2 hours
        interval: '1m',
      });
      const quotes = result?.quotes ?? [];
      for (const q of quotes) {
        if (!q.open || !q.close) continue;
        await persistBar(symbol, {
          open: q.open,
          high: q.high,
          low: q.low,
          close: q.close,
          volume: q.volume ?? 0,
          timestamp: q.date,
        });
      }
    } catch (err) {
      console.warn(`[yahooFeed] seed ${symbol}:`, err.message?.slice(0, 80));
    }
  }
  console.log('[yahooFeed] historical seed complete');
}

// ─── Poll live quotes ───────────────────────────────────────────────────────
let pollTimer = null;

async function pollQuotes(ioRef) {
  for (const symbol of ALL_SYMBOLS) {
    try {
      const quote = await yahooFinance.quoteSummary(symbol, { modules: ['price'] });
      const price = quote?.price;
      if (!price) continue;

      const close = price.regularMarketPrice ?? null;
      const open = price.regularMarketOpen ?? close;
      const high = price.regularMarketDayHigh ?? close;
      const low = price.regularMarketDayLow ?? close;
      const volume = price.regularMarketVolume ?? 0;

      if (close == null) continue;

      const now = new Date();
      const candle = {
        symbol,
        interval: INTERVAL,
        open,
        high,
        low,
        close,
        volume,
        timestamp: now,
      };

      await persistBar(symbol, candle);

      if (ioRef) {
        ioRef.emit('candle', candle);
        ioRef.to(`symbol:${symbol}`).emit('candle', candle);
      }
    } catch (err) {
      // Silently skip — Yahoo can be flaky
    }
  }
}

function startPolling(ioRef) {
  if (pollTimer) clearInterval(pollTimer);

  // Initial poll
  pollQuotes(ioRef).catch((err) =>
    console.error('[yahooFeed] initial poll error:', err.message)
  );

  // Poll every 15 seconds
  pollTimer = setInterval(() => {
    pollQuotes(ioRef).catch(() => {});
  }, 15_000);

  console.log('[yahooFeed] 🟢 live polling active (every 15s)');
}

// ─── Fetch latest prices (REST helper for /api/market/prices) ───────────────
async function fetchLatestPrices() {
  const result = {};
  for (const symbol of ALL_SYMBOLS) {
    try {
      const quote = await yahooFinance.quoteSummary(symbol, { modules: ['price'] });
      result[symbol] = quote?.price?.regularMarketPrice ?? null;
    } catch {
      result[symbol] = state.get(symbol) ?? null;
    }
  }
  return result;
}

// ─── Symbol lists ───────────────────────────────────────────────────────────
function getTrackedSymbols() {
  return [...TRADEABLE_SYMBOLS];
}

function getAllSymbols() {
  return [...ALL_SYMBOLS];
}

module.exports = {
  seedHistoricalBars,
  startPolling,
  fetchLatestPrices,
  getTrackedSymbols,
  getAllSymbols,
  state,
};
