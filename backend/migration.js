// migration.js
const mongoose = require("mongoose");
const User = require("./models/User");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    const users = await User.find();

    for (const user of users) {
      if (!user.approvals) {
        user.approvals = {
          filebrowser: false,
          o365mail: false,
          zohomail: false,
          truenasCloud: false,
          truenasLocal: false,
        };
        await user.save();
        console.log(`Updated user ${user._id} with approvals`);
      }
    }

    console.log("Migration complete");
    mongoose.disconnect();
  })
  .catch((err) => {
    console.error("Migration error:", err);
    mongoose.disconnect();
  });
