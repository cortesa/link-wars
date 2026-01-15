import Fastify from 'fastify';
import cors from '@fastify/cors';
import verifyJwtPlugin from './plugins/verifyJwt.js';
import walletRoutes from './routes/wallet.js';

const PORT = Number(process.env.PORT) || 3003;
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const PORTAL_ORIGIN = process.env.PORTAL_ORIGIN || 'http://localhost:5173';

const app = Fastify({
  logger: true,
});

// CORS for web-portal
await app.register(cors, {
  origin: PORTAL_ORIGIN,
  credentials: true,
});

// JWT verification with Keycloak JWKS
await app.register(verifyJwtPlugin, {
  jwksUri: `${KEYCLOAK_URL}/realms/link-wars/protocol/openid-connect/certs`,
  issuer: `${KEYCLOAK_URL}/realms/link-wars`,
});

// Register wallet routes
await app.register(walletRoutes, { prefix: '/api/wallet' });

// Health check endpoint (not protected)
app.get('/health', async () => {
  return {
    status: 'ok',
    service: 'portal-bff',
    timestamp: new Date().toISOString(),
  };
});

// Root endpoint with service info
app.get('/', async () => {
  return {
    service: 'Portal BFF',
    version: '1.0.0',
    status: 'running',
    description: 'Backend-For-Frontend service for Link Wars Web Portal',
    endpoints: {
      health: '/health',
      wallet: {
        balance: 'GET /api/wallet/balance',
        transactions: 'GET /api/wallet/transactions',
      },
    },
  };
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Portal BFF is running on http://0.0.0.0:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
