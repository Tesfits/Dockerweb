const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const generator = require("generate-password");
const fs = require("fs");
const path = require("path");
const { getUsers, deleteUser } = require("../controllers/adminController");
const User = require("../models/User");

// === Routes ===

// List users
router.get("/users", getUsers);

// Approve user and write provisioning job file (no direct Samba exec here)
router.post("/approve/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.isApproved)
      return res.status(400).json({ message: "User already approved" });

    // Generate strong password for user
    const password = generator.generate({
      length: 12,
      numbers: true,
      symbols: true,
      uppercase: true,
      strict: true,
    });

    // Hash and update user password in DB
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);
    user.isApproved = true;
    await user.save();

    // Create provisioning job file for host-side worker
    const JOBS_DIR = "/opt/provision_jobs/pending";
    const job = {
      username: user.email.split("@")[0],
      email: user.email,
      password: password,
      timestamp: new Date().toISOString(),
    };

    if (!fs.existsSync(JOBS_DIR)) fs.mkdirSync(JOBS_DIR, { recursive: true });
    const jobFile = path.join(JOBS_DIR, `job_${Date.now()}_${job.username}.json`);
    fs.writeFileSync(jobFile, JSON.stringify(job));

    console.log(`Provision job written to ${jobFile}`);

    res.json({
      message: "User approved and provisioning job created",
      samba: { username: job.username, password },
    });
  } catch (err) {
    console.error("Error approving user:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Reset password by admin (unchanged)
router.post("/reset-password/:id", async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: "Password required." });
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { passwordHash: hash },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Password reset successful." });
  } catch (err) {
    console.error("Admin password reset error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// Approve or revoke app access (unchanged)
router.post("/approve-app/:userId", async (req, res) => {
  const { appName, approve } = req.body;
  const allowedApps = [
    "filebrowser",
    "o365mail",
    "zohomail",
    "truenasCloud",
    "truenasLocal",
  ];

  if (!allowedApps.includes(appName)) {
    return res.status(400).json({ message: "Invalid app name" });
  }

  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.approvals = user.approvals || {};
    user.approvals[appName] = approve;

    await user.save();
    res.json({ message: `${appName} approval updated`, approvals: user.approvals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete user (unchanged)
router.delete("/user/:id", deleteUser);

module.exports = router;
