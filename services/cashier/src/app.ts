import Fastify from "fastify";
import verifySignaturePlugin from "./plugins/verifySignature.js";
import walletsRoutes from "./routes/wallets.js";

const PORT = Number(process.env.PORT) || 3002;

const app = Fastify({
  logger: true,
});

// Register HMAC signature verification plugin
app.register(verifySignaturePlugin, {
  services: {
    // Games (external providers)
    'linkwars-server': process.env.GAME_SERVER_SECRET || 'dev-game-server-secret',
    // Legacy support
    'game-server': process.env.GAME_SERVER_SECRET || 'dev-game-server-secret',
    // Internal services
    'web-portal': process.env.WEB_PORTAL_SECRET || 'dev-web-portal-secret',
    'portal-bff': process.env.PORTAL_BFF_SECRET || 'dev-portal-bff-secret-min-32-chars',
  },
  timestampTolerance: 5 * 60 * 1000, // 5 minutes
});

// Register wallet routes
app.register(walletsRoutes);

// Health check endpoint (not protected by signature verification)
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
      wallets: {
        withdraw: "POST /v1/wallets/withdraw",
        deposit: "POST /v1/wallets/deposit",
        balance: "GET /v1/wallets/:playerId/balance",
        transactions: "GET /v1/wallets/:playerId/transactions",
      },
    },
  };
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`Cashier API is running on http://0.0.0.0:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
