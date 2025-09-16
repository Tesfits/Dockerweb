const User = require('../models/User');
const { createSambaHome, addSambaUser } = require('../utils/samba');
const { log } = require('./auditService');
const crypto = require('crypto');

async function listAllUsers() {
  return User.find().select('-passwordHash -__v').lean();
}

async function listPendingUsers() {
  return User.find({ isApproved: false }).select('-passwordHash -__v').lean();
}

async function approveUser(actorId, userId, req = null) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  if (user.isApproved) throw new Error('User already approved');

  const sambaPassword = crypto.randomBytes(8).toString('base64');
  user.isApproved = true;
  // do not store plaintext passwords in prod; store hashed/encrypted if needed
  user.sambaPassword = sambaPassword;
  await user.save();

  await createSambaHome(user.username);
  await addSambaUser(user.username, sambaPassword);

  // audit log
  await log('approve_user', actorId, user._id, req, { sambaPasswordProvided: true });

  return user;
}

async function deleteUser(actorId, userId, req = null) {
  const user = await User.findByIdAndDelete(userId).select('-passwordHash');
  await log('delete_user', actorId, userId, req, {});
  return user;
}

module.exports = { listAllUsers, listPendingUsers, approveUser, deleteUser };
