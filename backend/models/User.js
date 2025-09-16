const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // enforce unique usernames
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  isApproved: {
    type: Boolean,
    default: false, // admin must approve
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  homeDirectory: {
    type: String, // optional, e.g. /home/samba/username
  },
  approvals: {
    filebrowser: { type: Boolean, default: false },
    o365mail: { type: Boolean, default: false },
    zohomail: { type: Boolean, default: false },
    truenasCloud: { type: Boolean, default: false },
    truenasLocal: { type: Boolean, default: false },
  },
}, { timestamps: true });

// Hash password before saving
UserSchema.pre("save", async function(next) {
  if (!this.isModified("passwordHash")) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  next();
});

// Method to compare password
UserSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.passwordHash);
};

module.exports = mongoose.model("User", UserSchema);
