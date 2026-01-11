import type { ColumnType, Generated } from 'kysely';

// Database table types for Kysely
// These types define the shape of our database tables

export interface TransactionTable {
  id: Generated<string>;
  player_id: string;
  amount: string; // Decimal stored as string for precision
  direction: 'DEBIT' | 'CREDIT';
  reference: string;
  idempotency_key: string;
  timestamp: Generated<Date>;
}

export interface BalanceTable {
  player_id: string;
  amount: string; // Decimal stored as string for precision
  updated_at: ColumnType<Date, never, Date>; // Auto-updated on change
}

// Database interface combining all tables
export interface Database {
  transactions: TransactionTable;
  balances: BalanceTable;
}

// Type helpers for query results
export type Transaction = {
  id: string;
  playerId: string;
  amount: number;
  direction: 'DEBIT' | 'CREDIT';
  reference: string;
  idempotencyKey: string;
  timestamp: Date;
};

export type Balance = {
  playerId: string;
  amount: number;
  updatedAt: Date;
};
