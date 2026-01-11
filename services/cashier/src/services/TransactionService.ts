import { db } from '../db/index.js';

const DEFAULT_BALANCE = '1000.00';

export interface WithdrawRequest {
  playerId: string;
  amount: number;
  reference: string;
  idempotencyKey: string;
}

export interface DepositRequest {
  playerId: string;
  amount: number;
  reference: string;
  idempotencyKey: string;
}

export interface TransactionResult {
  txId: string;
  balance: number;
  success: boolean;
  error?: string;
}

export class TransactionService {
  /**
   * Withdraw funds from player's wallet
   * Creates a DEBIT transaction and updates balance atomically
   */
  async withdraw(request: WithdrawRequest): Promise<TransactionResult> {
    const { playerId, amount, reference, idempotencyKey } = request;

    // Validate amount
    if (amount <= 0) {
      return {
        txId: '',
        balance: 0,
        success: false,
        error: 'Amount must be positive',
      };
    }

    // Check if this is a duplicate request (idempotency)
    const existingTx = await db
      .selectFrom('transactions')
      .selectAll()
      .where('idempotency_key', '=', idempotencyKey)
      .executeTakeFirst();

    if (existingTx) {
      const currentBalance = await this.getBalance(playerId);
      return {
        txId: existingTx.id,
        balance: currentBalance,
        success: true,
      };
    }

    // Execute withdrawal in a transaction
    try {
      const result = await db.transaction().execute(async (trx) => {
        // Get or create balance
        let balance = await trx
          .selectFrom('balances')
          .selectAll()
          .where('player_id', '=', playerId)
          .executeTakeFirst();

        if (!balance) {
          await trx
            .insertInto('balances')
            .values({
              player_id: playerId,
              amount: DEFAULT_BALANCE,
            })
            .execute();

          balance = { player_id: playerId, amount: DEFAULT_BALANCE, updated_at: new Date() };
        }

        const currentBalance = parseFloat(balance.amount);
        const newBalance = currentBalance - amount;

        // Check for insufficient funds
        if (newBalance < 0) {
          throw new Error('INSUFFICIENT_FUNDS');
        }

        // Create debit transaction
        const transaction = await trx
          .insertInto('transactions')
          .values({
            player_id: playerId,
            amount: amount.toFixed(2),
            direction: 'DEBIT',
            reference,
            idempotency_key: idempotencyKey,
          })
          .returning(['id'])
          .executeTakeFirstOrThrow();

        // Update balance
        await trx
          .updateTable('balances')
          .set({
            amount: newBalance.toFixed(2),
            updated_at: new Date(),
          })
          .where('player_id', '=', playerId)
          .execute();

        return {
          txId: transaction.id,
          balance: newBalance,
        };
      });

      return {
        ...result,
        success: true,
      };
    } catch (error: any) {
      if (error.message === 'INSUFFICIENT_FUNDS') {
        const currentBalance = await this.getBalance(playerId);
        return {
          txId: '',
          balance: currentBalance,
          success: false,
          error: 'Insufficient funds',
        };
      }

      throw error;
    }
  }

  /**
   * Deposit funds to player's wallet
   * Creates a CREDIT transaction and updates balance atomically
   */
  async deposit(request: DepositRequest): Promise<TransactionResult> {
    const { playerId, amount, reference, idempotencyKey } = request;

    // Validate amount
    if (amount <= 0) {
      return {
        txId: '',
        balance: 0,
        success: false,
        error: 'Amount must be positive',
      };
    }

    // Check if this is a duplicate request (idempotency)
    const existingTx = await db
      .selectFrom('transactions')
      .selectAll()
      .where('idempotency_key', '=', idempotencyKey)
      .executeTakeFirst();

    if (existingTx) {
      const currentBalance = await this.getBalance(playerId);
      return {
        txId: existingTx.id,
        balance: currentBalance,
        success: true,
      };
    }

    // Execute deposit in a transaction
    const result = await db.transaction().execute(async (trx) => {
      // Get or create balance
      let balance = await trx
        .selectFrom('balances')
        .selectAll()
        .where('player_id', '=', playerId)
        .executeTakeFirst();

      if (!balance) {
        await trx
          .insertInto('balances')
          .values({
            player_id: playerId,
            amount: DEFAULT_BALANCE,
          })
          .execute();

        balance = { player_id: playerId, amount: DEFAULT_BALANCE, updated_at: new Date() };
      }

      const currentBalance = parseFloat(balance.amount);
      const newBalance = currentBalance + amount;

      // Create credit transaction
      const transaction = await trx
        .insertInto('transactions')
        .values({
          player_id: playerId,
          amount: amount.toFixed(2),
          direction: 'CREDIT',
          reference,
          idempotency_key: idempotencyKey,
        })
        .returning(['id'])
        .executeTakeFirstOrThrow();

      // Update balance
      await trx
        .updateTable('balances')
        .set({
          amount: newBalance.toFixed(2),
          updated_at: new Date(),
        })
        .where('player_id', '=', playerId)
        .execute();

      return {
        txId: transaction.id,
        balance: newBalance,
      };
    });

    return {
      ...result,
      success: true,
    };
  }

  /**
   * Get current balance for a player
   * Creates initial balance if player doesn't exist
   */
  async getBalance(playerId: string): Promise<number> {
    const balance = await db
      .selectFrom('balances')
      .selectAll()
      .where('player_id', '=', playerId)
      .executeTakeFirst();

    if (!balance) {
      // Create initial balance
      await db
        .insertInto('balances')
        .values({
          player_id: playerId,
          amount: DEFAULT_BALANCE,
        })
        .execute();

      return parseFloat(DEFAULT_BALANCE);
    }

    return parseFloat(balance.amount);
  }

  /**
   * Get transaction history for a player
   */
  async getTransactions(
    playerId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const transactions = await db
      .selectFrom('transactions')
      .selectAll()
      .where('player_id', '=', playerId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .offset(offset)
      .execute();

    return transactions.map((tx) => ({
      id: tx.id,
      amount: parseFloat(tx.amount),
      direction: tx.direction,
      reference: tx.reference,
      timestamp: tx.timestamp.toISOString(),
    }));
  }
}

export const transactionService = new TransactionService();
