// init-mongo.js
db = db.getSiblingDB('fortigrid');

// Remove existing users
db.users.drop();

// Insert admin user
db.users.insertOne({
  username: "admin",
  email: "admin@fortigrid.com",
  passwordHash: "$2b$10$2KD6FgYdMy9XDWyWUN6JOOjZUM4YXLWzm6mwwqRGskNYYV2UptkZK", // bcrypt of Admin@123
  isAdmin: true,
  isApproved: true,
  homeDirectory: "/home/samba/admin",
  createdAt: new Date(),
  updatedAt: new Date()
});
