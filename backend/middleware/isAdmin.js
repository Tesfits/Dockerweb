// backend/middleware/isAdmin.js
module.exports = function (req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Accept 'admin' or 'superadmin' roles if you have admin levels
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied: Admins only' });
    }
    next();
  } catch (err) {
    console.error('isAdmin error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
