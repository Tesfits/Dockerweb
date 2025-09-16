// resetAdmin.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Update these values
const MONGO_URI = 'mongodb://mongo:27017/your_db_name'; // replace with your MongoDB URI
const ADMIN_EMAIL = 'admin@fortigrid.com';
const NEW_PASSWORD = 'YourNewStrongPassword123!';

async function resetAdmin() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    passwordHash: String,
    isApproved: Boolean,
    isAdmin: Boolean,
  });

  const User = mongoose.model('User', userSchema);

  const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 10);

  const result = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      passwordHash: hashedPassword,
      isAdmin: true,
      isApproved: true,
    },
    { new: true }
  );

  if (result) {
    console.log('Admin password reset successfully:');
    console.log(result);
  } else {
    console.log('Admin user not found.');
  }

  mongoose.connection.close();
}

resetAdmin().catch(err => console.error(err));
