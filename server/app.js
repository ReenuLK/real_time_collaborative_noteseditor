// // backend/app.js
// const express = require("express");
// const cors = require("cors");
// const app = express();

// app.use(cors());
// app.use(express.json());

// // In-memory storage for the note
// let savedNote = [
//   { type: "paragraph", children: [{ text: "" }] }
// ];

// // Save endpoint
// app.post("/save", (req, res) => {
//   const data = req.body;
//   if (Array.isArray(data)) {
//     savedNote = data;  // save the Slate editor content
//     res.send({ status: "ok" });
//   } else {
//     res.status(400).send({ status: "error", message: "Invalid note format" });
//   }
// });

// // Load endpoint
// app.get("/load", (req, res) => {
//   res.json(savedNote);  // return saved note
// });

// // Start server
// const PORT = 5000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Always keep a valid Slate document
let savedNote = [
  { type: "paragraph", children: [{ text: "" }] }
];

// Save endpoint
app.post("/save", (req, res) => {
  const data = req.body;
  if (Array.isArray(data)) {
    savedNote = data;
    return res.json({ status: "ok" });
  }
  res.status(400).json({ status: "error", message: "Invalid data format" });
});

// Load endpoint
app.get("/load", (req, res) => {
  res.json(Array.isArray(savedNote) ? savedNote : [{ type: "paragraph", children: [{ text: "" }] }]);
});

app.listen(5000, () => console.log("Server running on port 5000"));
