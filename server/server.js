const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 5001 });

let latestDoc = null;

wss.on("connection", (ws) => {
  console.log("Client connected");

  // Send latest doc to new client
  if (latestDoc) {
    ws.send(JSON.stringify(latestDoc));
  }

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      latestDoc = data;

      // Broadcast to all clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });

    } catch (err) {
      console.error("Invalid JSON");
    }
  });

  ws.on("close", () => console.log("Client disconnected"));
});

console.log("WS server running on ws://localhost:5001");

