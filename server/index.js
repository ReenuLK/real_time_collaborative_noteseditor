require('dotenv').config(); 
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const http = require("http"); // Added for cleaner server handling
const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');

// Models
const User = require("./models/User");
const Document = require("./models/Document");

const app = express();

const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 10000; // Render preferred port

// --- 1. CLOUD DATABASE CONNECTION ---
mongoose.connect(MONGO_URI)
  .then(() => console.log("Connected to Cloud MongoDB ✅"))
  .catch((err) => {
    console.error("Could not connect to MongoDB...", err);
  });

// --- 2. FIXED CORS FOR PRODUCTION ---
// Directly use the variable to avoid the "indexOf" check failing on undefined
const frontendUrl = process.env.FRONTEND_URL || "https://real-time-collaborative-noteseditor.vercel.app";

app.use(cors({
  origin: frontendUrl,
  credentials: true,
  exposedHeaders: ["x-document-title"]
}));

app.use(express.json());

// --- 3. AUTH ROUTES (Restored from your logic) ---

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: "User created" });
  } catch (err) {
    res.status(400).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// --- 4. SERVER & WEBSOCKET LOGIC ---

// Create the HTTP server from the Express app
const server = http.createServer(app);

const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req, { gc: true });
});

// Handle the "Upgrade" (HTTP to WS) for Yjs
server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url, `http://${request.headers.host}`);

  if (pathname.startsWith('/ws')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Root route for Render health check
app.get("/", (req, res) => res.send("Server is running..."));

server.listen(PORT, "0.0.0.0", () => {
  console.log(`API and WebSocket Server running on port ${PORT} 🚀`);
});