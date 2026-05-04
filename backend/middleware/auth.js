const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isMongoReady } = require('../utils/dbState');

function auth(required = true) {
  return async (req, res, next) => {
    const header = req.headers.authorization;
    const token =
      header && header.startsWith('Bearer ')
        ? header.slice(7).trim()
        : null;

    if (!token) {
      if (required) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      req.user = null;
      return next();
    }

    try {
      if (!isMongoReady()) {
        return res.status(503).json({
          error: 'Authentication service is temporarily unavailable. Please try again shortly.',
        });
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.userId).select('-password');
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      req.user = user;
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

module.exports = { auth };
