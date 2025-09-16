const SecurityLog = require('../models/SecurityLog');

// GET all security logs (Admin only)
exports.getLogs = async (req, res) => {
  try {
    const logs = await SecurityLog.find()
      .sort({ createdAt: -1 })
      .limit(200); // avoid flooding UI
    res.json(logs);
  } catch (error) {
    console.error('Error fetching security logs:', error);
    res.status(500).json({ message: 'Error fetching security logs' });
  }
};

// POST a new security log (manual)
exports.createLog = async (req, res) => {
  try {
    const { ip, origin, endpoint, reason } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    const log = new SecurityLog({ ip, origin, endpoint, reason });
    await log.save();
    res.status(201).json(log);
  } catch (error) {
    console.error('Error creating security log:', error);
    res.status(500).json({ message: 'Error creating security log' });
  }
};

// Middleware: automatically log a security event
exports.autoLog = async (reason) => {
  return async (req, res, next) => {
    try {
      const log = new SecurityLog({
        ip: req.ip || req.connection.remoteAddress,
        origin: req.headers.origin || '',
        endpoint: req.originalUrl || '',
        reason
      });
      await log.save();
    } catch (err) {
      console.error('Failed to auto-log security event:', err);
    }
    next();
  };
};
