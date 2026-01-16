<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>README - Real-Time Collaborative Notes Editor</title>
</head>
<body>

    <h1> Real-Time Collaborative Notes Editor</h1>

    <p>A professional, full-stack web application that allows multiple users to edit documents simultaneously in real-time. Built with a focus on high-performance synchronization and secure user collaboration.</p>

    <hr>

    <h2> Live Demo</h2>
    <ul>
        <li><strong>Frontend:</strong> <a href="https://real-time-collaborative-noteseditor.vercel.app">Visit Frontend</a></li>
        <li><strong>Backend:</strong> <a href="https://real-time-collaborative-noteseditor.onrender.com">Visit Backend API</a></li>
    </ul>

    <h2> Features</h2>
    <ul>
        <li><strong>Real-Time Collaboration:</strong> Powered by <strong>Yjs</strong> and <strong>WebSockets</strong> for seamless, conflict-free document editing.</li>
        <li><strong>Rich Text Editing:</strong> Full support for bold, italics, underline, custom colors, and font sizes using <strong>Slate.js</strong>.</li>
        <li><strong>Secure Authentication:</strong> User registration and login protected by <strong>JWT</strong> (JSON Web Tokens) and <strong>bcrypt</strong> password hashing.</li>
        <li><strong>Note Management:</strong> Create, rename, and delete personal notes.</li>
        <li><strong>Collaboration System:</strong> Invite other users to your notes via email to grant them editing permissions.</li>
    </ul>

    <h2> Tech Stack</h2>
    <ul>
        <li><strong>Frontend:</strong> React.js, Slate.js (Rich Text), Yjs (CRDTs), Slate-Yjs</li>
        <li><strong>Backend:</strong> Node.js, Express.js, WebSocket (ws)</li>
        <li><strong>Database:</strong> MongoDB Atlas (Mongoose)</li>
        <li><strong>Hosting:</strong> Vercel (Frontend), Render (Backend)</li>
    </ul>

  


    <h2> Installation & Setup</h2>

    <h3>1. Clone the repository</h3>
    <code>git clone https://github.com/your-username/your-repo-name.git</code>

    <h3>2. Backend Setup</h3>
    <p>Navigate to the root directory and create a <code>.env</code> file:</p>
    <pre>
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_secret_key
FRONTEND_URL=https://real-time-collaborative-noteseditor.vercel.app
    </pre>
    <p>Install dependencies and start:</p>
    <code>npm install && npm start</code>

    <h3>3. Frontend Setup</h3>
    <p>Navigate to the client folder and create a <code>.env</code> file:</p>
    <pre>
REACT_APP_API_URL=https://real-time-collaborative-noteseditor.onrender.com
REACT_APP_WS_URL=wss://real-time-collaborative-noteseditor.onrender.com/ws
    </pre>
    <p>Install dependencies and start:</p>
    <code>npm install && npm start</code>

    <h2> API Endpoints</h2>

    

    <h3>Auth</h3>
    <ul>
        <li><code>POST /api/auth/register</code> - Create a new account.</li>
        <li><code>POST /api/auth/login</code> - Authenticate and receive a JWT.</li>
    </ul>

    <h3>Documents</h3>
    <ul>
        <li><code>GET /api/documents</code> - Fetch all accessible notes (Owned + Collaborating).</li>
        <li><code>POST /api/documents/new</code> - Create a new document.</li>
        <li><code>PUT /api/documents/save/:id</code> - Rename/Update document title.</li>
        <li><code>POST /api/documents/share/:id</code> - Invite a user to collaborate by email.</li>
        <li><code>DELETE /api/documents/:id</code> - Remove a document (Owner only).</li>
    </ul>

</body>
</html>
