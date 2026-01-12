// yjs-server/server.js
import http from "http";
import WebSocket from "ws";
import { setupWSConnection } from "y-websocket/bin/utils.cjs"; // <- correct import

const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {
  setupWSConnection(ws, req);
});

const PORT = 1234;
server.listen(PORT, () => {
  console.log(`✅ Yjs WebSocket server running on ws://localhost:${PORT}`);
});
