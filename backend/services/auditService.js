const AuditLog = require('../models/AuditLog');

async function log(action, actorId, targetUserId = null, req = null, meta = {}) {
  try {
    const ip = req ? (req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress) : null;
    await AuditLog.create({ action, actor: actorId, targetUser: targetUserId, ip, meta });
  } catch (err) {
    console.error('Audit log failed', err);
  }
}

module.exports = { log };
