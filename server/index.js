require('dotenv').config(); // MUST be the first line
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("./models/User");
const Document = require("./models/Document");

const app = express();

// Use Environment Variables for secrets
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 5000;

// Connect to MongoDB using the URI from .env
mongoose.connect(MONGO_URI)
  .then(() => console.log("Connected to MongoDB ✅"))
  .catch((err) => console.error("Could not connect to MongoDB...", err));

app.use(cors({
  exposedHeaders: ["x-document-title"]
}));

app.use(express.json());
app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));

// --- AUTH MIDDLEWARE ---
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

// --- AUTH ROUTES ---
app.post("/api/auth/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: "User created" });
  } catch (err) { res.status(400).json({ error: "User already exists" }); }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: user.username });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

// --- DOCUMENT ROUTES ---

app.get("/api/documents", authMiddleware, async (req, res) => {
  try {
    const docs = await Document.find({
      $or: [{ owner: req.userId }, { collaborators: req.userId }]
    }).select("title lastUpdated").sort({ lastUpdated: -1 });
    res.json(docs);
  } catch (err) { res.status(500).json({ error: "Fetch failed" }); }
});

app.post("/api/documents/new", authMiddleware, async (req, res) => {
  try {
    const newDoc = new Document({ 
      title: "Untitled Note", 
      owner: req.userId, 
      content: Buffer.from([]), 
      collaborators: [] 
    });
    await newDoc.save();
    res.status(201).json(newDoc);
  } catch (err) { res.status(500).json({ error: "Creation failed" }); }
});

app.get("/api/load/:id", authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.set("x-document-title", encodeURIComponent(doc.title));
    res.send(doc.content); 
  } catch (err) { res.status(500).json({ error: "Load failed" }); }
});

app.post("/api/save/:id", authMiddleware, async (req, res) => {
  try {
    await Document.findOneAndUpdate(
      { _id: req.params.id, $or: [{ owner: req.userId }, { collaborators: req.userId }] },
      { content: req.body, lastUpdated: Date.now() }
    );
    res.send("Saved");
  } catch (err) { res.status(500).send("Error saving document"); }
});

app.put("/api/documents/:id/rename", authMiddleware, async (req, res) => {
  try {
    await Document.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId }, 
      { title: req.body.title }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).send("Error"); }
});

app.post("/api/share/:id", authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    const userToShareWith = await User.findOne({ email });
    if (!userToShareWith) return res.status(404).json({ error: "User not found" });

    await Document.findByIdAndUpdate(req.params.id, {
      $addToSet: { collaborators: userToShareWith._id }
    });
    res.json({ message: "Shared successfully" });
  } catch (err) { res.status(500).json({ error: "Sharing failed" }); }
});

app.delete("/api/documents/:id", authMiddleware, async (req, res) => {
  try {
    await Document.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ error: "Delete failed" }); }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));