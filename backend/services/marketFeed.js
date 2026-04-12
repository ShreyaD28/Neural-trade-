const cron = require('node-cron');
const {
  getTrackedSymbols,
  tickSymbol,
  seedInitialCandlesIfEmpty,
} = require('./simulator');

let ioRef = null;
let cronTask = null;

function broadcastCandle(candle) {
  if (!ioRef || !candle) return;
  ioRef.emit('candle', candle);
  ioRef.to(`symbol:${candle.symbol}`).emit('candle', candle);
}

async function runTick() {
  const symbols = getTrackedSymbols();
  for (const symbol of symbols) {
    try {
      const candle = await tickSymbol(symbol);
      if (candle) broadcastCandle(candle);
    } catch (err) {
      console.error(`[marketFeed] tick ${symbol}:`, err.message);
    }
  }
}

/**
 * Attach Socket.IO namespaces / rooms and schedule synthetic candles.
 */
function startMarketFeed(io) {
  ioRef = io;

  io.on('connection', (socket) => {
    socket.on('subscribe', (symbol) => {
      if (typeof symbol !== 'string' || !symbol.trim()) return;
      const room = `symbol:${symbol.toUpperCase()}`;
      socket.join(room);
    });
    socket.on('unsubscribe', (symbol) => {
      if (typeof symbol !== 'string' || !symbol.trim()) return;
      socket.leave(`symbol:${symbol.toUpperCase()}`);
    });
  });

  seedInitialCandlesIfEmpty()
    .then(() => runTick())
    .catch((err) => console.error('[marketFeed] seed:', err.message));

  if (cronTask) cronTask.stop();
  cronTask = cron.schedule('* * * * *', () => {
    runTick().catch((err) => console.error('[marketFeed] cron:', err.message));
  });
}

module.exports = { startMarketFeed, broadcastCandle };
