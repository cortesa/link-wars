# Cashier API - Documentation & TDD Guide

## Overview
The Cashier API is the authoritative service responsible for the game's economy. It manages player balances, records every transaction in a ledger, and handles tournament buy-ins and payouts.

## Technology Stack
- **Runtime**: Node.js
- **Framework**: Fastify (Performance & Schema Validation)
- **Query Builder**: Kysely (Type-safe, lightweight SQL)
- **Database**: PostgreSQL
- **Testing**: Vitest (Unit & Integration)

## Directory Structure
```
services/cashier/
├── migrations/             # SQL migration files
├── src/
│   ├── db/                 # Database connection and types
│   │   ├── connection.ts   # Kysely instance
│   │   ├── types.ts        # Table type definitions
│   │   └── index.ts        # Exports
│   ├── routes/             # API Endpoints (Withdraw, Deposit, Balance)
│   ├── services/           # Business Logic (TransactionService)
│   ├── plugins/            # Fastify plugins (verifySignature)
│   └── app.ts              # Fastify entry point
├── tests/
│   └── unit/               # Business logic unit tests
└── package.json
```

## Setup

### 1. Install dependencies
```bash
yarn install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Run database migrations
```bash
# Ensure PostgreSQL is running
yarn db:migrate
```

### 4. Start development server
```bash
yarn dev
```

## Core Requirements & Logic
1. **Idempotency**: Every transaction must include an `idempotencyKey` to prevent double-charging or double-payouts.
2. **Ledger-first**: Every balance change must be accompanied by a ledger entry (audit trail).
3. **Transaction Safety**: Use database transactions for all operations that affect balances and ledger.
4. **HMAC Security**: All endpoints (except /health) require signed requests from authorized services.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/wallets/withdraw` | Debit funds from player wallet |
| POST | `/v1/wallets/deposit` | Credit funds to player wallet |
| GET | `/v1/wallets/:playerId/balance` | Get current balance |
| GET | `/v1/wallets/:playerId/transactions` | Get transaction history |
| GET | `/health` | Health check (no auth) |

## TDD Workflow
Before implementing any endpoint or service logic:
1. **Define the Test Case**: e.g., "Should not allow buy-in if balance is insufficient".
2. **Write the Test**: Implement the test in `tests/unit/`.
3. **Run Test**: Confirm it fails (`yarn test`).
4. **Implement**: Write the minimum code.
5. **Verify**: Run test until it passes.
6. **Refactor**: Clean up the logic.

## Implementation Status
- [x] Database schema (transactions, balances)
- [x] TransactionService (withdraw, deposit, getBalance, getTransactions)
- [x] HMAC signature verification plugin
- [x] Wallet REST endpoints
- [x] Unit tests
- [ ] TournamentService for multi-player payouts
- [ ] Integration tests
