
# Real-Time Collaborative Notes Editor

A Google Docs–like collaborative notes editor enabling real-time multi-user editing using WebSockets and modern web technologies. Multiple users can edit notes simultaneously with instant synchronization, conflict resolution, and persistent storage.

## Features

- **Real-Time Collaboration** - Multiple users can edit the same document simultaneously with instant updates
- **Conflict Resolution** - Automatic synchronization and conflict handling using Yjs CRDT
- **Rich Text Editing** - Full-featured text editor powered by Slate.js
- **User Authentication** - Secure user registration and login with JWT tokens
- **Persistent Storage** - MongoDB integration for document persistence
- **WebSocket Communication** - Low-latency real-time synchronization
- **Responsive Design** - Works seamlessly across different devices and screen sizes

## Architecture

The project follows a three-tier architecture with WebSocket-based real-time synchronization.

## Tech Stack

### Frontend

- React (v19) - UI framework
- Slate.js (v0.120) - Rich text editor
- Yjs (v13.6.28) - CRDT for real-time collaboration
- WebSocket - Real-time communication
- React Router - Client-side routing
- Axios - HTTP client

### Backend

- Node.js - Runtime environment
- Express (v5.2) - Web framework
- MongoDB - Database
- Mongoose - ODM for MongoDB- JWT - Authentication
- Bcrypt/BcryptJS - Password hashing
- CORS - Cross-origin resource sharing

### Collaboration & Synchronization

- Yjs - Conflict-free replicated data type (CRDT)
- y-websocket - WebSocket provider for Yjs
- Slate-Yjs - Integration between Slate and Yjs

## Project Structure

real_time_collaborative_noteseditor/
├── client/ # React frontend application
├── server/ # Express backend API
├── yjs-server/ # CRDT synchronization server
└── README.md # This file

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB instance (local or cloud)

### Installation

1. Install frontend dependencies:
   cd client && npm install

2. Install backend dependencies:
   cd ../server && npm install

3. Install Yjs server dependencies:
   cd ../yjs-server && npm install

## Usage

1. Create an Account - Register with email and password
2. Login - Access your notes with credentials
3. Create a Note - Start a new collaborative document
4. Share - Share document link with collaborators
5. Edit - Edit together in real-time with other users
6. Save - Changes are automatically saved to the database

## API Endpoints

### Authentication

- POST /api/auth/register - User registration
- POST /api/auth/login - User login
- POST /api/auth/logout - User logout

### Documents

- GET /api/documents - Get all user documents
- POST /api/documents - Create new document
- GET /api/documents/:id - Get document by ID
- PUT /api/documents/:id - Update document
- DELETE /api/documents/:id - Delete document
