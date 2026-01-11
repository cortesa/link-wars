import { describe, it, expect, beforeEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import verifySignaturePlugin from '../../src/plugins/verifySignature.js';

describe('verifySignature Plugin', () => {
  let app: FastifyInstance;
  const testSecret = 'test-secret-key';
  const serviceId = 'test-service';

  beforeEach(async () => {
    app = Fastify({ logger: false });

    // Register plugin with test configuration
    await app.register(verifySignaturePlugin, {
      services: {
        [serviceId]: testSecret,
      },
      timestampTolerance: 5 * 60 * 1000, // 5 minutes
    });

    // Add a protected test route
    app.post('/test', async (request, reply) => {
      return { success: true, serviceId: (request as any).serviceId };
    });

    await app.ready();
  });

  const generateSignature = (
    serviceId: string,
    timestamp: string,
    nonce: string,
    body: string,
    secret: string
  ): string => {
    const message = `${serviceId}${timestamp}${nonce}${body}`;
    return crypto.createHmac('sha256', secret).update(message).digest('hex');
  };

  it('should allow requests with valid signature', async () => {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomUUID();
    const body = JSON.stringify({ test: 'data' });
    const signature = generateSignature(serviceId, timestamp, nonce, body, testSecret);

    const response = await app.inject({
      method: 'POST',
      url: '/test',
      headers: {
        'x-service-id': serviceId,
        'x-timestamp': timestamp,
        'x-nonce': nonce,
        'x-signature': signature,
        'content-type': 'application/json',
      },
      payload: body,
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      success: true,
      serviceId: serviceId,
    });
  });

  it('should reject requests with invalid signature', async () => {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomUUID();
    const body = JSON.stringify({ test: 'data' });

    const response = await app.inject({
      method: 'POST',
      url: '/test',
      headers: {
        'x-service-id': serviceId,
        'x-timestamp': timestamp,
        'x-nonce': nonce,
        'x-signature': 'invalid-signature',
        'content-type': 'application/json',
      },
      payload: body,
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toMatchObject({
      error: 'Unauthorized',
      message: 'Invalid signature',
    });
  });

  it('should reject requests with expired timestamp', async () => {
    const timestamp = (Date.now() - 10 * 60 * 1000).toString(); // 10 minutes ago
    const nonce = crypto.randomUUID();
    const body = JSON.stringify({ test: 'data' });
    const signature = generateSignature(serviceId, timestamp, nonce, body, testSecret);

    const response = await app.inject({
      method: 'POST',
      url: '/test',
      headers: {
        'x-service-id': serviceId,
        'x-timestamp': timestamp,
        'x-nonce': nonce,
        'x-signature': signature,
        'content-type': 'application/json',
      },
      payload: body,
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toMatchObject({
      error: 'Unauthorized',
      message: 'Request timestamp expired',
    });
  });

  it('should reject requests with reused nonce (replay attack)', async () => {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomUUID();
    const body = JSON.stringify({ test: 'data' });
    const signature = generateSignature(serviceId, timestamp, nonce, body, testSecret);

    const headers = {
      'x-service-id': serviceId,
      'x-timestamp': timestamp,
      'x-nonce': nonce,
      'x-signature': signature,
      'content-type': 'application/json',
    };

    // First request should succeed
    const response1 = await app.inject({
      method: 'POST',
      url: '/test',
      headers,
      payload: body,
    });

    expect(response1.statusCode).toBe(200);

    // Second request with same nonce should fail
    const response2 = await app.inject({
      method: 'POST',
      url: '/test',
      headers,
      payload: body,
    });

    expect(response2.statusCode).toBe(401);
    expect(JSON.parse(response2.body)).toMatchObject({
      error: 'Unauthorized',
      message: 'Nonce already used (replay attack detected)',
    });
  });

  it('should reject requests from unknown service', async () => {
    const unknownServiceId = 'unknown-service';
    const timestamp = Date.now().toString();
    const nonce = crypto.randomUUID();
    const body = JSON.stringify({ test: 'data' });
    const signature = generateSignature(unknownServiceId, timestamp, nonce, body, testSecret);

    const response = await app.inject({
      method: 'POST',
      url: '/test',
      headers: {
        'x-service-id': unknownServiceId,
        'x-timestamp': timestamp,
        'x-nonce': nonce,
        'x-signature': signature,
        'content-type': 'application/json',
      },
      payload: body,
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toMatchObject({
      error: 'Unauthorized',
      message: 'Unknown service ID',
    });
  });

  it('should reject requests missing required headers', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/test',
      headers: {
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ test: 'data' }),
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toMatchObject({
      error: 'Unauthorized',
      message: 'Missing required signature headers',
    });
  });

  it('should allow health check without signature', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(404); // Route doesn't exist in test setup, but middleware didn't block it
  });
});
