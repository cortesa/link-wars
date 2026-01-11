-- Cashier Service - Initial Database Schema
-- Creates the core tables for wallet management

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Transaction ledger - immutable record of all financial operations
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
  reference VARCHAR(255) NOT NULL,
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Indexes for transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_player_id ON transactions(player_id);
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency_key ON transactions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC);

-- Player balances - current wallet state
CREATE TABLE IF NOT EXISTS balances (
  player_id VARCHAR(255) PRIMARY KEY,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 1000.00,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT non_negative_balance CHECK (amount >= 0)
);

-- Trigger to auto-update updated_at on balances
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_balances_updated_at ON balances;
CREATE TRIGGER update_balances_updated_at
  BEFORE UPDATE ON balances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE transactions IS 'Immutable ledger of all financial operations (deposits and withdrawals)';
COMMENT ON TABLE balances IS 'Current balance state for each player wallet';
COMMENT ON COLUMN transactions.direction IS 'DEBIT = withdrawal, CREDIT = deposit';
COMMENT ON COLUMN transactions.idempotency_key IS 'Unique key to prevent duplicate transactions';
