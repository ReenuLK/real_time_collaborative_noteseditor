const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema({
  // New field for Stage 7 to identify notes in the Sidebar
  title: {
    type: String,
    default: "Untitled Note"
  },

  // The User ID of the creator
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    // CRITICAL: Ensure unique is false to allow multiple documents per owner
    unique: false 
  },

  // The binary snapshot of the Yjs document
  content: {
    type: Buffer,
    required: false, 
    default: () => Buffer.from([]) 
  },

  // Array of user ObjectIds invited to collaborate
  collaborators: [
    { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User"
    }
  ],

  // Timestamp for the last save operation
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
});

// Create and export the model
module.exports = mongoose.model("Document", DocumentSchema);