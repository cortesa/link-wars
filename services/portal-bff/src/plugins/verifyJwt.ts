import type { FastifyPluginCallback, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import * as jose from 'jose';

interface VerifyJwtOptions {
  jwksUri: string;
  issuer?: string;
  audience?: string;
}

interface JWTPayload {
  sub: string;
  email?: string;
  preferred_username?: string;
  [key: string]: unknown;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JWTPayload | null;
  }
  interface FastifyInstance {
    verifyJwt: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// JWKS fetcher type
type JWKSFetcher = ReturnType<typeof jose.createRemoteJWKSet>;

// Cache JWKS for performance
let jwks: JWKSFetcher | null = null;

const verifyJwtPlugin: FastifyPluginCallback<VerifyJwtOptions> = (
  fastify,
  options,
  done
) => {
  const { jwksUri, issuer, audience } = options;

  // Initialize JWKS fetcher
  jwks = jose.createRemoteJWKSet(new URL(jwksUri));

  // Decorate request with user property
  fastify.decorateRequest('user', null);

  // Add verify method to fastify instance
  fastify.decorate('verifyJwt', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401).send({ error: 'Unauthorized', message: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.slice(7);

    try {
      if (!jwks) {
        throw new Error('JWKS not initialized');
      }

      const verifyOptions: jose.JWTVerifyOptions = {};
      if (issuer) verifyOptions.issuer = issuer;
      if (audience) verifyOptions.audience = audience;

      const { payload } = await jose.jwtVerify(token, jwks, verifyOptions);

      if (!payload.sub) {
        reply.code(401).send({ error: 'Unauthorized', message: 'Token missing subject claim' });
        return;
      }

      request.user = payload as JWTPayload;
    } catch (error) {
      fastify.log.error(error, 'JWT verification failed');
      reply.code(401).send({ error: 'Unauthorized', message: 'Invalid token' });
    }
  });

  done();
};

export default fp(verifyJwtPlugin, {
  name: 'verify-jwt',
  fastify: '5.x',
});
