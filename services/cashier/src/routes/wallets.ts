import type { FastifyPluginCallback } from 'fastify';
import { transactionService } from '../services/TransactionService.js';

interface WithdrawBody {
  playerId: string;
  amount: number;
  reference: string;
  idempotencyKey: string;
}

interface DepositBody {
  playerId: string;
  amount: number;
  reference: string;
  idempotencyKey: string;
}

interface BalanceParams {
  playerId: string;
}

interface TransactionParams {
  playerId: string;
}

interface TransactionQuery {
  limit?: number;
  offset?: number;
}

const walletsRoutes: FastifyPluginCallback = (fastify, options, done) => {
  /**
   * POST /v1/wallets/withdraw
   * Withdraw funds from a player's wallet
   */
  fastify.post<{ Body: WithdrawBody }>(
    '/v1/wallets/withdraw',
    {
      schema: {
        body: {
          type: 'object',
          required: ['playerId', 'amount', 'reference', 'idempotencyKey'],
          properties: {
            playerId: { type: 'string' },
            amount: { type: 'number', minimum: 0 },
            reference: { type: 'string' },
            idempotencyKey: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              txId: { type: 'string' },
              balance: { type: 'number' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { playerId, amount, reference, idempotencyKey } = request.body;

      try {
        const result = await transactionService.withdraw({
          playerId,
          amount,
          reference,
          idempotencyKey,
        });

        if (!result.success) {
          return reply.code(400).send({
            error: 'WithdrawFailed',
            message: result.error || 'Failed to withdraw funds',
          });
        }

        return reply.code(200).send({
          txId: result.txId,
          balance: result.balance,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'An unexpected error occurred',
        });
      }
    }
  );

  /**
   * POST /v1/wallets/deposit
   * Deposit funds to a player's wallet
   */
  fastify.post<{ Body: DepositBody }>(
    '/v1/wallets/deposit',
    {
      schema: {
        body: {
          type: 'object',
          required: ['playerId', 'amount', 'reference', 'idempotencyKey'],
          properties: {
            playerId: { type: 'string' },
            amount: { type: 'number', minimum: 0 },
            reference: { type: 'string' },
            idempotencyKey: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              txId: { type: 'string' },
              balance: { type: 'number' },
            },
          },
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { playerId, amount, reference, idempotencyKey } = request.body;

      try {
        const result = await transactionService.deposit({
          playerId,
          amount,
          reference,
          idempotencyKey,
        });

        if (!result.success) {
          return reply.code(400).send({
            error: 'DepositFailed',
            message: result.error || 'Failed to deposit funds',
          });
        }

        return reply.code(200).send({
          txId: result.txId,
          balance: result.balance,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'An unexpected error occurred',
        });
      }
    }
  );

  /**
   * GET /v1/wallets/:playerId/balance
   * Get current balance for a player
   */
  fastify.get<{ Params: BalanceParams }>(
    '/v1/wallets/:playerId/balance',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            playerId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              playerId: { type: 'string' },
              balance: { type: 'number' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { playerId } = request.params;

      try {
        const balance = await transactionService.getBalance(playerId);

        return reply.code(200).send({
          playerId,
          balance,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'An unexpected error occurred',
        });
      }
    }
  );

  /**
   * GET /v1/wallets/:playerId/transactions
   * Get transaction history for a player
   */
  fastify.get<{ Params: TransactionParams; Querystring: TransactionQuery }>(
    '/v1/wallets/:playerId/transactions',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            playerId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 50 },
            offset: { type: 'number', default: 0 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              transactions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    amount: { type: 'number' },
                    direction: { type: 'string' },
                    reference: { type: 'string' },
                    timestamp: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { playerId } = request.params;
      const { limit = 50, offset = 0 } = request.query;

      try {
        const transactions = await transactionService.getTransactions(
          playerId,
          limit,
          offset
        );

        return reply.code(200).send({
          transactions,
        });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: 'InternalServerError',
          message: 'An unexpected error occurred',
        });
      }
    }
  );

  done();
};

export default walletsRoutes;
