# Cashier API - Documentation & TDD Guide

## Overview
The Cashier API is the authoritative service responsible for the game's economy. It manages player balances, records every transaction in a ledger, and handles tournament buy-ins and payouts.

## Technology Stack
- **Runtime**: Node.js
- **Framework**: Fastify (Performance & Schema Validation)
- **ORM**: Prisma (Type-safe DB access)
- **Database**: PostgreSQL
- **Testing**: Vitest (Unit & Integration)

## Directory Structure (Planned)
```
services/cashier/
├── prisma/                 # Database schema and migrations
├── src/
│   ├── routes/             # API Endpoints (Buy-in, Refund, Payout, Balance)
│   ├── services/           # Business Logic (Wallet, Ledger)
│   ├── plugins/            # Fastify plugins (Auth, Prisma, etc.)
│   └── app.ts              # Fastify entry point
├── tests/
│   ├── unit/               # Business logic unit tests
│   └── integration/        # API and DB integration tests
└── package.json
```

## Core Requirements & Logic
1. **Idempotency**: Every transaction must include an `idempotencyKey` to prevent double-charging or double-payouts.
2. **Ledger-first**: Every balance change must be accompanied by a ledger entry (audit trail).
3. **Transaction Safety**: Use database transactions for all operations that affect balances and ledger.
4. **Calculated Payouts**: Logic to divide the "Pot" among winners based on the percentages defined in `Docs/GAME_ARCHITECTURE.md`.

## TDD Workflow
Before implementing any endpoint or service logic:
1. **Define the Test Case**: e.g., "Should not allow buy-in if balance is insufficient".
2. **Write the Test**: Implement the test in `tests/unit/wallet.test.ts`.
3. **Run Test**: Confirm it fails (`yarn test`).
4. **Implement**: Write the minimum code in `src/services/wallet.ts`.
5. **Verify**: Run test until it passes.
6. **Refactor**: Clean up the logic.

## Specific Actions
- [ ] Implement Prisma schema with `Account` and `Transaction` tables.
- [ ] Create `WalletService` with `getBalance`, `credit`, and `debit` methods.
- [ ] Create `TournamentService` for handling multi-player payouts.
- [ ] Implement Fastify routes with strict JSON schema validation.
