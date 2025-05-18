const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, sparse: true },
  password: { type: String },
  googleId: { type: String },
});

module.exports = mongoose.model('User', userSchema);
