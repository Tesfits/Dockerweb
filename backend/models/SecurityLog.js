const mongoose = require('mongoose');

const SecurityLogSchema = new mongoose.Schema({
  ip: { type: String },
  origin: { type: String },
  endpoint: { type: String },
  reason: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: '30d' } // auto-delete after 30 days
});

module.exports = mongoose.model('SecurityLog', SecurityLogSchema);
