const jwt = require("jsonwebtoken");
const User = require("../models/User");
const SecurityLog = require("../models/SecurityLog");

// Middleware to verify JWT token and attach user to req.user
async function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    req.user = null;
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("email isAdmin isApproved");

    if (!user) {
      req.user = null;
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      id: user._id,
      email: user.email,
      isAdmin: user.isAdmin,
      isApproved: user.isApproved,
    };

    next();
  } catch (err) {
    req.user = null;
    console.error("JWT verification failed:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Middleware to check for admin privileges
async function verifyAdmin(req, res, next) {
  try {
    if (req.user && req.user.isAdmin === true) {
      return next();
    }

    // Log unauthorized admin access attempts
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

module.exports = { verifyToken, verifyAdmin };
