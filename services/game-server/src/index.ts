import { createServer } from "node:http";

const PORT = Number(process.env.PORT) || 2567;

const server = createServer((req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  if (req.url === "/health") {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        status: "ok",
        service: "game-server",
        timestamp: new Date().toISOString(),
      }),
    );
  } else if (req.url === "/") {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        service: "Game Server",
        version: "1.0.0",
        status: "running",
        description:
          "Real-time multiplayer game server for Link Wars (Colyseus will be integrated later)",
        endpoints: {
          health: "/health",
          colyseus: "/colyseus (coming soon)",
        },
      }),
    );
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🎮 Game Server is running on http://0.0.0.0:${PORT}`);
  console.log(`🔌 Colyseus integration coming soon...`);
});
