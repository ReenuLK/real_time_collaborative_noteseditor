require('dotenv').config(); 
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const http = require("http");
const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');

// Models
const User = require("./models/User");
const Document = require("./models/Document");

const app = express();
const server = http.createServer(app);

const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 10000;

// --- 1. DATABASE CONNECTION ---
mongoose.connect(MONGO_URI)
  .then(() => console.log("Connected to Cloud MongoDB ✅"))
  .catch((err) => console.error("MongoDB Connection Error ❌:", err));

// --- 2. CORS CONFIGURATION ---
const frontendUrl = process.env.FRONTEND_URL || "https://real-time-collaborative-noteseditor.vercel.app";

app.use(cors({
  origin: frontendUrl,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// --- 3. AUTH MIDDLEWARE ---
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

// --- 4. AUTH ROUTES ---
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

// --- 5. DOCUMENT ROUTES ---

// FETCH ALL: Get notes where user is OWNER OR COLLABORATOR
app.get("/api/documents", authMiddleware, async (req, res) => {
  try {
    const docs = await Document.find({
      $or: [
        { owner: req.userId },
        { collaborators: req.userId }
      ]
    }).sort({ updatedAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// CREATE: New note
app.post("/api/documents/new", authMiddleware, async (req, res) => {
  try {
    const newDoc = new Document({ title: "Untitled Note", owner: req.userId });
    await newDoc.save();
    res.status(201).json(newDoc);
  } catch (err) {
    res.status(500).json({ error: "Creation failed" });
  }
});

// SHARE/LOAD: Load note if user is owner or collaborator
app.get("/api/documents/share/:id", authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findOne({ 
      _id: req.params.id, 
      $or: [{ owner: req.userId }, { collaborators: req.userId }] 
    });
    if (!doc) return res.status(404).json({ error: "Document not found or access denied" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "Load failed" });
  }
});

// SAVE/UPDATE: Update title
app.put("/api/documents/save/:id", authMiddleware, async (req, res) => {
  try {
    const { title } = req.body;
    const doc = await Document.findOneAndUpdate(
      { 
        _id: req.params.id, 
        $or: [{ owner: req.userId }, { collaborators: req.userId }] 
      },
      { title },
      { new: true }
    );
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: "Update failed" });
  }
});

// INVITE: Add a collaborator by email
app.post("/api/documents/share/:id", authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    const userToInvite = await User.findOne({ email });
    
    if (!userToInvite) return res.status(404).json({ error: "User not found" });

    const doc = await Document.findOne({ _id: req.params.id, owner: req.userId });
    if (!doc) return res.status(403).json({ error: "Only the owner can invite others" });

    if (!doc.collaborators.includes(userToInvite._id)) {
      doc.collaborators.push(userToInvite._id);
      await doc.save();
    }
    res.json({ message: "Invited successfully" });
  } catch (err) {
    res.status(500).json({ error: "Invite failed" });
  }
});

// DELETE: Only owner can delete
app.delete("/api/documents/:id", authMiddleware, async (req, res) => {
  try {
    const result = await Document.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!result) return res.status(403).json({ error: "Access denied or not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// --- 6. WEBSOCKET LOGIC (Yjs) ---
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req, { gc: true });
});

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

app.get("/", (req, res) => res.send("Collaborative Server Live 🚀"));

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server live on port ${PORT}`);
});