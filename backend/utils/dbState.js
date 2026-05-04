const mongoose = require('mongoose');

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

function ensureMongoReady(res) {
  if (isMongoReady()) {
    return true;
  }

  res.status(503).json({
    error: 'Authentication service is temporarily unavailable. Please try again shortly.',
  });
  return false;
}

module.exports = {
  isMongoReady,
  ensureMongoReady,
};
