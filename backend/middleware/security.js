const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const SecurityLog = require('../models/SecurityLog');

module.exports = (app, allowedOrigins) => {
  // Security headers
  app.use(helmet());

  // XSS protection
  app.use(xss());

  // Prevent MongoDB injection
  app.use(mongoSanitize());

  // CORS
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!origin || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') return res.sendStatus(200);
      next();
    } else {
      console.warn(`❌ CORS blocked request from: ${origin}`);
      SecurityLog.create({
        ip: req.ip,
        endpoint: req.originalUrl,
        method: req.method,
        reason: `CORS Blocked - Origin: ${origin}`
      });
      res.status(403).json({ error: 'Not allowed by CORS' });
    }
  });

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100,
    handler: (req, res) => {
      console.warn(`🚨 Rate limit hit from ${req.ip}`);
      SecurityLog.create({
        ip: req.ip,
        endpoint: req.originalUrl,
        method: req.method,
        reason: 'Rate Limit Exceeded'
      });
      res.status(429).json({ error: 'Too many requests, please try again later.' });
    }
  });
  app.use(limiter);
};
