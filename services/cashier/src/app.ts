import Fastify from "fastify";

const PORT = Number(process.env.PORT) || 3000;

const app = Fastify({
  logger: true,
});

// Health check endpoint
app.get("/health", async () => {
  return {
    status: "ok",
    service: "cashier",
    timestamp: new Date().toISOString(),
  };
});

// Root endpoint with welcome message
app.get("/", async () => {
  return {
    service: "Cashier API",
    version: "1.0.0",
    status: "running",
    description: "Economy and wallet service for Link Wars",
    endpoints: {
      health: "/health",
      docs: "/docs (coming soon)",
    },
  };
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 Cashier API is running on http://0.0.0.0:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
