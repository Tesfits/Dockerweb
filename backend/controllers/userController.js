// controllers/userController.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// ✅ Get logged-in user's profile
async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      message: "Profile fetched successfully",
      data: { user },
    });
  } catch (err) {
    console.error("Error fetching profile:", err.stack || err);
    return res.status(500).json({ success: false, message: "Error fetching profile" });
  }
}

// ✅ Update logged-in user's profile
async function updateProfile(req, res) {
  try {
    let { name, email } = req.body;

    // Normalize email
    if (email) {
      email = email.toLowerCase().trim();

      // Ensure uniqueness
      const existing = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (existing) {
        return res.status(400).json({ success: false, message: "Email already in use" });
      }
    }

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { ...(name && { name }), ...(email && { email }) },
      { new: true }
    ).select("-passwordHash");

    if (!updated) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log(`User ${req.user.id} updated profile at ${new Date().toISOString()}`);

    return res.json({
      success: true,
      message: "Profile updated successfully",
      data: { user: updated },
    });
  } catch (err) {
    console.error("Error updating profile:", err.stack || err);
    return res.status(500).json({ success: false, message: "Error updating profile" });
  }
}

// ✅ Change logged-in user's password
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Both current and new passwords are required",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    // Prevent reusing old password
    const isSame = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSame) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from the old one",
      });
    }

    // Enforce strong password policy
    if (
      newPassword.length < 8 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 8 characters and include upper, lower, and number",
      });
    }

    // Hash & save new password
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    console.log(`User ${req.user.id} changed password at ${new Date().toISOString()}`);

    return res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    console.error("Error changing password:", err.stack || err);
    return res.status(500).json({ success: false, message: "Error changing password" });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
};
