const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/fortigrid');

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

User.updateOne(
  { email: "admin@fortigrid.com" },
  { $set: { isApproved: true, isAdmin: true } }
).then(res => {
  console.log('Update result:', res);
  mongoose.disconnect();
});