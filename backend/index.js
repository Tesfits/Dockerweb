const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const { xss } = require("express-xss-sanitizer");
const rateLimit = require("express-rate-limit");
const expressMongoSanitize = require("@exortek/express-mongo-sanitize");

const SecurityLog = require("./models/SecurityLog");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Helper to get client IP
function getClientIp(req) {
  return (
    (req && req.headers["x-forwarded-for"]) ||
    (req && req.connection && req.connection.remoteAddress) ||
    "Unknown"
  );
}

// CORS allowed origins
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
  : [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://13.233.183.35:3000",
      "http://13.233.183.35:3001",
      "https://app.protekworx.in",
    ];

app.use(
  cors({
    origin: function (origin, callback, req) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        const ip = getClientIp(req);
        console.warn(`❌ CORS blocked request from: ${origin}`);
        SecurityLog.create({
          ip,
          origin: origin || "Unknown",
          endpoint: "CORS Check",
          method: "CORS",
          reason: "Blocked CORS Origin",
        }).catch((err) => console.error("Error logging CORS:", err));
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Security middlewares
app.use(helmet());
app.use(xss());

// Apply @exortek/express-mongo-sanitize with options
app.use(
  expressMongoSanitize({
    mode: "auto", // automatic sanitization of req.body and req.query
    recursive: true,
    removeEmpty: true,
    // Enable param sanitization by using explicit handlers (see below)
  })
);

// Sanitize route params explicitly to avoid mutation errors
// Example for id param, add more as needed
app.param("id", expressMongoSanitize.paramSanitizeHandler());

// JSON parser
app.use(express.json({ limit: "10kb" }));

// Rate limiting with logging
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res) => {
    const ip = getClientIp(req);
    try {
      await SecurityLog.create({
        ip,
        origin: req.headers.origin || "Unknown",
        endpoint: req.originalUrl,
        method: req.method,
        reason: "Rate Limit Exceeded",
      });
    } catch (err) {
      console.error("Error logging rate limit:", err);
    }
    res.status(429).json({
      message: "Too many requests from this IP, please try again later.",
    });
  },
});
app.use(limiter);

// Global request logger
app.use(async (req, res, next) => {
  try {
    await SecurityLog.create({
      ip: getClientIp(req),
      origin: req.headers.origin || "Unknown",
      endpoint: req.originalUrl,
      method: req.method,
      user: req.user ? req.user.email : "Guest",
      reason: "Request",
    });
  } catch (err) {
    console.error("Error logging request:", err);
  }
  next();
});

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "✅ API is working" });
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/files", require("./routes/files"));

// MongoDB connection + server start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });
