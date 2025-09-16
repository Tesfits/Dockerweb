// backend/middleware/adminLimiter.js
const rateLimit = require('express-rate-limit');

exports.adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // limit each admin IP to 100 reqs per windowMs
  message: 'Too many admin requests, please try again later.'
});
