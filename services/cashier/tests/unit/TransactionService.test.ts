import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../../src/db/index.js';
import { TransactionService } from '../../src/services/TransactionService.js';

const transactionService = new TransactionService();

describe('TransactionService', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await db.deleteFrom('transactions').execute();
    await db.deleteFrom('balances').execute();
  });

  afterEach(async () => {
    // Clean up after tests
    await db.deleteFrom('transactions').execute();
    await db.deleteFrom('balances').execute();
  });

  describe('getBalance', () => {
    it('should create initial balance for new player', async () => {
      const playerId = 'player-1';
      const balance = await transactionService.getBalance(playerId);

      expect(balance).toBe(1000);

      // Verify balance was created in database
      const dbBalance = await db
        .selectFrom('balances')
        .selectAll()
        .where('player_id', '=', playerId)
        .executeTakeFirst();

      expect(dbBalance).toBeDefined();
      expect(parseFloat(dbBalance!.amount)).toBe(1000);
    });

    it('should return existing balance', async () => {
      const playerId = 'player-2';

      // Create balance manually
      await db
        .insertInto('balances')
        .values({
          player_id: playerId,
          amount: '500.00',
        })
        .execute();

      const balance = await transactionService.getBalance(playerId);
      expect(balance).toBe(500);
    });
  });

  describe('withdraw', () => {
    it('should successfully withdraw funds', async () => {
      const playerId = 'player-3';
      await db
        .insertInto('balances')
        .values({ player_id: playerId, amount: '1000.00' })
        .execute();

      const result = await transactionService.withdraw({
        playerId,
        amount: 100,
        reference: 'game-session-1',
        idempotencyKey: 'withdraw-1',
      });

      expect(result.success).toBe(true);
      expect(result.balance).toBe(900);
      expect(result.txId).toBeDefined();

      // Verify transaction was created
      const tx = await db
        .selectFrom('transactions')
        .selectAll()
        .where('idempotency_key', '=', 'withdraw-1')
        .executeTakeFirst();

      expect(tx).toBeDefined();
      expect(tx?.direction).toBe('DEBIT');
      expect(parseFloat(tx!.amount)).toBe(100);
    });

    it('should reject withdrawal with insufficient funds', async () => {
      const playerId = 'player-4';
      await db
        .insertInto('balances')
        .values({ player_id: playerId, amount: '50.00' })
        .execute();

      const result = await transactionService.withdraw({
        playerId,
        amount: 100,
        reference: 'game-session-2',
        idempotencyKey: 'withdraw-2',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient funds');
      expect(result.balance).toBe(50); // Balance unchanged

      // Verify no transaction was created
      const tx = await db
        .selectFrom('transactions')
        .selectAll()
        .where('idempotency_key', '=', 'withdraw-2')
        .executeTakeFirst();

      expect(tx).toBeUndefined();
    });

    it('should handle idempotency (duplicate withdrawal)', async () => {
      const playerId = 'player-5';
      await db
        .insertInto('balances')
        .values({ player_id: playerId, amount: '1000.00' })
        .execute();

      // First withdrawal
      const result1 = await transactionService.withdraw({
        playerId,
        amount: 100,
        reference: 'game-session-3',
        idempotencyKey: 'withdraw-3',
      });

      expect(result1.success).toBe(true);
      expect(result1.balance).toBe(900);

      // Second withdrawal with same idempotency key
      const result2 = await transactionService.withdraw({
        playerId,
        amount: 100,
        reference: 'game-session-3',
        idempotencyKey: 'withdraw-3',
      });

      expect(result2.success).toBe(true);
      expect(result2.txId).toBe(result1.txId); // Same transaction
      expect(result2.balance).toBe(900); // Balance only deducted once

      // Verify only one transaction exists
      const transactions = await db
        .selectFrom('transactions')
        .selectAll()
        .where('player_id', '=', playerId)
        .execute();

      expect(transactions).toHaveLength(1);
    });

    it('should reject negative amounts', async () => {
      const playerId = 'player-6';

      const result = await transactionService.withdraw({
        playerId,
        amount: -100,
        reference: 'game-session-4',
        idempotencyKey: 'withdraw-4',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Amount must be positive');
    });
  });

  describe('deposit', () => {
    it('should successfully deposit funds', async () => {
      const playerId = 'player-7';
      await db
        .insertInto('balances')
        .values({ player_id: playerId, amount: '1000.00' })
        .execute();

      const result = await transactionService.deposit({
        playerId,
        amount: 500,
        reference: 'prize-payout-1',
        idempotencyKey: 'deposit-1',
      });

      expect(result.success).toBe(true);
      expect(result.balance).toBe(1500);
      expect(result.txId).toBeDefined();

      // Verify transaction was created
      const tx = await db
        .selectFrom('transactions')
        .selectAll()
        .where('idempotency_key', '=', 'deposit-1')
        .executeTakeFirst();

      expect(tx).toBeDefined();
      expect(tx?.direction).toBe('CREDIT');
      expect(parseFloat(tx!.amount)).toBe(500);
    });

    it('should handle idempotency (duplicate deposit)', async () => {
      const playerId = 'player-8';
      await db
        .insertInto('balances')
        .values({ player_id: playerId, amount: '1000.00' })
        .execute();

      // First deposit
      const result1 = await transactionService.deposit({
        playerId,
        amount: 500,
        reference: 'prize-payout-2',
        idempotencyKey: 'deposit-2',
      });

      expect(result1.success).toBe(true);
      expect(result1.balance).toBe(1500);

      // Second deposit with same idempotency key
      const result2 = await transactionService.deposit({
        playerId,
        amount: 500,
        reference: 'prize-payout-2',
        idempotencyKey: 'deposit-2',
      });

      expect(result2.success).toBe(true);
      expect(result2.txId).toBe(result1.txId); // Same transaction
      expect(result2.balance).toBe(1500); // Balance only credited once

      // Verify only one transaction exists
      const transactions = await db
        .selectFrom('transactions')
        .selectAll()
        .where('player_id', '=', playerId)
        .execute();

      expect(transactions).toHaveLength(1);
    });

    it('should reject negative amounts', async () => {
      const playerId = 'player-9';

      const result = await transactionService.deposit({
        playerId,
        amount: -500,
        reference: 'prize-payout-3',
        idempotencyKey: 'deposit-3',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Amount must be positive');
    });

    it('should create balance for new player', async () => {
      const playerId = 'player-10';

      const result = await transactionService.deposit({
        playerId,
        amount: 500,
        reference: 'prize-payout-4',
        idempotencyKey: 'deposit-4',
      });

      expect(result.success).toBe(true);
      expect(result.balance).toBe(1500); // Initial 1000 + 500 deposit
    });
  });

  describe('getTransactions', () => {
    it('should return transaction history', async () => {
      const playerId = 'player-11';
      await db
        .insertInto('balances')
        .values({ player_id: playerId, amount: '1000.00' })
        .execute();

      // Create multiple transactions
      await transactionService.withdraw({
        playerId,
        amount: 100,
        reference: 'game-1',
        idempotencyKey: 'tx-1',
      });

      await transactionService.deposit({
        playerId,
        amount: 200,
        reference: 'prize-1',
        idempotencyKey: 'tx-2',
      });

      await transactionService.withdraw({
        playerId,
        amount: 50,
        reference: 'game-2',
        idempotencyKey: 'tx-3',
      });

      const transactions = await transactionService.getTransactions(playerId);

      expect(transactions).toHaveLength(3);
      expect(transactions[0]?.direction).toBe('DEBIT'); // Most recent first
      expect(transactions[0]?.amount).toBe(50);
      expect(transactions[1]?.direction).toBe('CREDIT');
      expect(transactions[1]?.amount).toBe(200);
    });

    it('should support pagination', async () => {
      const playerId = 'player-12';
      await db
        .insertInto('balances')
        .values({ player_id: playerId, amount: '1000.00' })
        .execute();

      // Create 5 transactions
      for (let i = 0; i < 5; i++) {
        await transactionService.withdraw({
          playerId,
          amount: 10,
          reference: `game-${i}`,
          idempotencyKey: `tx-${i}`,
        });
      }

      const page1 = await transactionService.getTransactions(playerId, 2, 0);
      const page2 = await transactionService.getTransactions(playerId, 2, 2);

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0]?.id).not.toBe(page2[0]?.id);
    });
  });
});
