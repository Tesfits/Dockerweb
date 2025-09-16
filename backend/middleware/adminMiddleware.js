const SecurityLog = require("../models/SecurityLog");

/**
 * Middleware to verify that the request comes from an admin user.
 * Assumes that req.user is set by previous authentication middleware.
 * Logs any unauthorized access attempts.
 */
async function verifyAdmin(req, res, next) {
  try {
    if (req.user && req.user.isAdmin === true) {
      // User is admin; allow request to continue
      return next();
    }

    // Log unauthorized access attempt
    await SecurityLog.create({
      ip:
        req.headers["x-forwarded-for"] ||
        req.connection.remoteAddress ||
        "Unknown",
      user: req.user ? req.user.email : "Guest",
      endpoint: req.originalUrl,
      reason: "Blocked - Not Admin",
    });

    return res.status(403).json({ message: "Admin access required" });
  } catch (error) {
    console.error("Error in verifyAdmin middleware:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = verifyAdmin;
