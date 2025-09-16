// routes/users.js
const express = require("express");
const { body } = require("express-validator");
const { getProfile, updateProfile, changePassword } = require("../controllers/userController");
const { verifyToken } = require("../middleware/authMiddleware");
const validateRequest = require("../middleware/validateRequest");
const User = require("../models/User");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/**
 * ✅ User registration with Samba home directory
 * POST /api/users/register
 */
router.post(
  "/register",
  [
    body("username").isLength({ min: 3 }).withMessage("Username must be at least 3 characters"),
    body("email").isEmail().withMessage("Invalid email format"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  validateRequest,
  async (req, res) => {
    const { username, email, password } = req.body;

    try {
      // Check if user exists
      const existingUser = await User.findOne({ username });
      if (existingUser) return res.status(400).json({ message: "Username already taken" });

      // Save user in MongoDB
      const newUser = new User({ username, email, password, approved: false });
      await newUser.save();

      // Create Samba home directory
      const userHome = path.join("/samba/users", username);
      if (!fs.existsSync(userHome)) fs.mkdirSync(userHome, { recursive: true });

      // Add Samba user (non-interactive)
      const sambaPassword = password.replace(/(["$`\\])/g, '\\$1'); // escape special chars
      const sambaCmd = `(echo "${sambaPassword}"; echo "${sambaPassword}") | smbpasswd -s -a ${username}`;
      exec(sambaCmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`Samba error: ${stderr}`);
          return res.status(500).json({
            message: "User created in DB, but Samba setup failed",
            error: stderr,
          });
        }
        console.log(`Samba user ${username} created`);
        return res.status(201).json({ message: "User registered successfully, waiting admin approval" });
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Registration failed", error: err.message });
    }
  }
);

/**
 * ✅ Get logged-in user's profile
 * GET /api/users/profile
 */
router.get("/profile", verifyToken, getProfile);

/**
 * ✅ Update profile
 * PUT /api/users/profile
 */
router.put(
  "/profile",
  verifyToken,
  [
    body("name").optional().isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
    body("email").optional().isEmail().withMessage("Invalid email format"),
  ],
  validateRequest,
  updateProfile
);

/**
 * ✅ Change password
 * PUT /api/users/password
 */
router.put(
  "/password",
  verifyToken,
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters long"),
  ],
  validateRequest,
  changePassword
);

module.exports = router;
