require('dotenv').config(); 
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("./models/User");
const Document = require("./models/Document");

const app = express();

const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;

// --- 1. CLOUD DATABASE CONNECTION ---
mongoose.connect(MONGO_URI)
  .then(() => console.log("Connected to Cloud MongoDB ✅"))
  .catch((err) => {
    console.error("Could not connect to MongoDB...", err);
    process.exit(1); // Stop process if DB connection fails
  });

// --- 2. DYNAMIC CORS FOR PRODUCTION ---
const allowedOrigins = [
  "http://localhost:3000", // Local development
  process.env.FRONTEND_URL  // Your live Vercel/Netlify URL
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error("CORS policy blocked this request"), false);
    }
    return callback(null, true);
  },
  exposedHeaders: ["x-document-title"],
  credentials: true
}));

app.use(express.json());
app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));

// --- AUTH MIDDLEWARE & ROUTES (Keeping your existing logic) ---
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.userId = decoded.userId; 
    next();
  });
};

// ... [Your Auth & Document Routes remain the same as provided] ...

// --- 3. EXPLICIT HOST BINDING ---
// "0.0.0.0" is required for many cloud hosts to map the internal port to the web
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT} 🚀`);
});