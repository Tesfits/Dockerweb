const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/fortigrid');

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

User.findOne({ email: "admin@fortigrid.com" }).then(user => {
  console.log(user);
  mongoose.disconnect();
});