const express = require('express');
const router = express.Router();
const SecurityLog = require('../models/SecurityLog');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

// ✅ GET all security logs (Admin only)
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const logs = await SecurityLog.find()
      .sort({ createdAt: -1 })
      .limit(200); // avoid flooding UI
    res.json(logs);
  } catch (error) {
    console.error('Error fetching security logs:', error);
    res.status(500).json({ message: 'Error fetching security logs' });
  }
});

module.exports = router;
