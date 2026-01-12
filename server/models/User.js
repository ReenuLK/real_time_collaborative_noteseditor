const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true, // Prevents two users from having the same email
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: 6, // Basic security check
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create the Model from the Schema
const User = mongoose.model("User", UserSchema);

module.exports = User;