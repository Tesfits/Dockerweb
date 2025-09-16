const User = require("../models/User");

// Get list of users with optional pagination and filtering
exports.getUsers = async (req, res) => {
  try {
    // Pagination params from query string, defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Optional search filter by username or email (case-insensitive)
    const search = req.query.search || "";
    const searchRegex = new RegExp(search, "i");

    // Total users count matching filter
    const total = await User.countDocuments({
      $or: [{ username: searchRegex }, { email: searchRegex }],
    });

    // Find users with filter and pagination, exclude passwordHash
    const users = await User.find({
      $or: [{ username: searchRegex }, { email: searchRegex }],
    })
      .select("-passwordHash")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users,
      page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total,
    });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete user by id
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting admin users — optional safety check
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (user.isAdmin) {
      return res
        .status(403)
        .json({ success: false, message: "Cannot delete admin user" });
    }

    await User.findByIdAndDelete(id);

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
