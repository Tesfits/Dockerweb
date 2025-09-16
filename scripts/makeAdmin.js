const mongoose = require('mongoose');
const User = require('../models/User');

mongoose.connect('mongodb://localhost:27017/fortigrid', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

(async () => {
  const email = 'admin@fortigrid.com';
  const user = await User.findOne({ email });
  if (user) {
    user.role = 'admin';
    user.approved = true;
    await user.save();
    console.log("User is now admin");
  } else {
    console.log("User not found");
  }
  mongoose.disconnect();
})();
