import type { FastifyPluginCallback, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import crypto from 'node:crypto';

// Service configuration interface
interface ServiceConfig {
  [serviceId: string]: string; // serviceId -> shared secret
}

// Headers expected from calling services
interface SignatureHeaders {
  'x-service-id': string;
  'x-timestamp': string;
  'x-nonce': string;
  'x-signature': string;
}

// Plugin options
interface VerifySignatureOptions {
  services: ServiceConfig;
  timestampTolerance?: number; // in milliseconds, default 5 minutes
}

// Store nonces to prevent replay attacks (in-memory for MVP, use Redis in production)
const usedNonces = new Map<string, number>();

// Clean up old nonces every 10 minutes
setInterval(() => {
  const now = Date.now();
  const expirationTime = 10 * 60 * 1000; // 10 minutes
  
  for (const [nonce, timestamp] of usedNonces.entries()) {
    if (now - timestamp > expirationTime) {
      usedNonces.delete(nonce);
    }
  }
}, 10 * 60 * 1000);

/**
 * Verify HMAC-SHA256 signature from calling service
 * 
 * Expected request headers:
 * - X-Service-Id: Identifier of the calling service
 * - X-Timestamp: Unix timestamp (milliseconds) when request was signed
 * - X-Nonce: Unique random value to prevent replay attacks
 * - X-Signature: HMAC-SHA256(serviceId + timestamp + nonce + requestBody, sharedSecret)
 */
const verifySignaturePlugin: FastifyPluginCallback<VerifySignatureOptions> = (
  fastify,
  options,
  done
) => {
  const { services, timestampTolerance = 5 * 60 * 1000 } = options;

  fastify.decorateRequest('serviceId', '');

  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip verification for health check
    if (request.url === '/health') {
      return;
    }

    const headers = request.headers as unknown as SignatureHeaders;
    const serviceId = headers['x-service-id'];
    const timestamp = headers['x-timestamp'];
    const nonce = headers['x-nonce'];
    const signature = headers['x-signature'];

    // Validate required headers
    if (!serviceId || !timestamp || !nonce || !signature) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Missing required signature headers',
      });
    }

    // Verify service is known
    const sharedSecret = services[serviceId];
    if (!sharedSecret) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Unknown service ID',
      });
    }

    // Verify timestamp is within tolerance
    const requestTime = parseInt(timestamp, 10);
    const now = Date.now();
    const timeDiff = Math.abs(now - requestTime);

    if (timeDiff > timestampTolerance) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Request timestamp expired',
      });
    }

    // Verify nonce hasn't been used (replay attack prevention)
    if (usedNonces.has(nonce)) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Nonce already used (replay attack detected)',
      });
    }

    // Get request body as string
    const body = request.body ? JSON.stringify(request.body) : '';

    // Compute expected signature
    const message = `${serviceId}${timestamp}${nonce}${body}`;
    const expectedSignature = crypto
      .createHmac('sha256', sharedSecret)
      .update(message)
      .digest('hex');

    // Compare signatures (timing-safe comparison)
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid signature',
      });
    }

    // Mark nonce as used
    usedNonces.set(nonce, requestTime);

    // Store serviceId in request for later use
    (request as any).serviceId = serviceId;
  });

  done();
};

export default fp(verifySignaturePlugin, {
  name: 'verify-signature',
  fastify: '5.x',
});
