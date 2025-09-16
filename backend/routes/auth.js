const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const sanitize = require("sanitize-html");
const fs = require("fs");
const path = require("path");
const User = require("../models/User");
require("dotenv").config();

const router = express.Router();

// Rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many attempts, try again later." },
});

// Middleware: sanitize input strings
function sanitizeInput(req, res, next) {
  for (const key in req.body) {
    if (typeof req.body[key] === "string") {
      req.body[key] = sanitize(req.body[key], {
        allowedTags: [],
        allowedAttributes: {},
      }).trim();
    }
  }
  next();
}

// JWT helper
function signToken(user) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not defined!");
  return jwt.sign(
    {
      id: user._id,
      isAdmin: user.isAdmin,
      isApproved: user.isApproved,
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
}

// --- REGISTER ---
router.post(
  "/register",
  authLimiter,
  sanitizeInput,
  [
    body("username").notEmpty().withMessage("Username is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
      // Check existing user
      let user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        return res.status(400).json({ msg: "User already exists" });
      }

      // Create new user
      const passwordHash = await bcrypt.hash(password, 12);

      user = new User({
        username,
        email: email.toLowerCase(),
        passwordHash,
        isApproved: false,
        isAdmin: false,
        approvals: {
          filebrowser: false,
          o365mail: false,
          zohomail: false,
          truenasCloud: false,
          truenasLocal: false,
        },
      });

      await user.save();

      // ===== QUEUE THE PROVISION JOB FOR HOST-SIDE WORKER =====
      const JOBS_DIR = '/opt/provision_jobs/pending';
      const job = {
        username,
        email,
        password,    // plain password needed for Samba/FileBrowser creation by host worker
        timestamp: new Date().toISOString()
      };
      try {
        if (!fs.existsSync(JOBS_DIR)) fs.mkdirSync(JOBS_DIR, { recursive: true });
        fs.writeFileSync(
          path.join(JOBS_DIR, `job_${Date.now()}_${username}.json`),
          JSON.stringify(job)
        );
        console.log(`Provision job created for ${username}`);
      } catch (jobErr) {
        console.error("Failed to queue provisioning job:", jobErr);
        // Optional: Decide if you want to delete the user or handle this error further
      }

      res.status(201).json({ msg: "User registered, pending admin approval" });
    } catch (err) {
      console.error("Registration error:", err);
      res.status(500).json({ success: false, msg: "Server error" });
    }
  }
);

// --- LOGIN ---
router.post(
  "/login",
  authLimiter,
  sanitizeInput,
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(401).json({ msg: "Invalid credentials" });

      if (!user.isApproved) {
        return res.status(403).json({ msg: "Account not approved yet" });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);

      if (!isMatch) {
        return res.status(401).json({ msg: "Invalid credentials" });
      }

      const token = signToken(user);

      res.json({
        success: true,
        msg: "Login successful",
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
          isApproved: user.isApproved,
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ success: false, msg: "Server error" });
    }
  }
);

// --- GET CURRENT USER ---
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ msg: "Authorization header missing" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "Token missing" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ msg: "Invalid or expired token" });
  }
}

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json({ user });
  } catch (err) {
    console.error("Error in /auth/me:", err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
