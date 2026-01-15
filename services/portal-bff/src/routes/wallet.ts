import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { getCashierClient } from '../services/CashierClient.js';

interface TransactionsQuery {
  limit?: string;
}

const walletRoutes: FastifyPluginAsync = async (fastify) => {
  // Protect all routes in this plugin with JWT verification
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    await fastify.verifyJwt(request, reply);
  });

  // GET /api/wallet/balance
  fastify.get('/balance', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    const playerId = request.user.sub;

    try {
      const cashierClient = getCashierClient();
      const result = await cashierClient.getBalance(playerId);
      return result;
    } catch (error) {
      fastify.log.error(error, 'Failed to get balance from Cashier');
      return reply.code(502).send({
        error: 'Bad Gateway',
        message: 'Failed to communicate with wallet service',
      });
    }
  });

  // GET /api/wallet/transactions
  fastify.get<{ Querystring: TransactionsQuery }>(
    '/transactions',
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }

      const playerId = request.user.sub;
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;

      if (isNaN(limit) || limit < 1 || limit > 100) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Limit must be a number between 1 and 100',
        });
      }

      try {
        const cashierClient = getCashierClient();
        const result = await cashierClient.getTransactions(playerId, limit);
        return result;
      } catch (error) {
        fastify.log.error(error, 'Failed to get transactions from Cashier');
        return reply.code(502).send({
          error: 'Bad Gateway',
          message: 'Failed to communicate with wallet service',
        });
      }
    }
  );
};

export default walletRoutes;
