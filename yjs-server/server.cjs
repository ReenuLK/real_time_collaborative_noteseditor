import http from "http";
import WebSocket from "ws";
import { setupWSConnection } from "y-websocket/bin/utils.js";

const server = http.createServer();

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws, req) => {
  console.log("✅ Client connected");
  setupWSConnection(ws, req);
});

server.listen(1234, () => {
  console.log("🚀 Yjs WebSocket server running on ws://localhost:1234");
});
