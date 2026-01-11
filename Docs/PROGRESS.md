# Project Progress Tracker

This document tracks the implementation progress of the Link Wars project.

---

## Services Status

| Service | Status | Description |
|---------|--------|-------------|
| **Identity (Keycloak)** | ✅ Configured | OIDC authentication, realm config |
| **Cashier API** | ✅ MVP Complete | Wallet management, HMAC security |
| **Game Server** | 🚧 In Progress | Colyseus setup, needs Cashier integration |
| **Web Portal** | 🚧 In Progress | React + Keycloak auth |
| **Game Client** | 🚧 In Progress | Phaser setup |

---

## Cashier API - Completed Features

### Core Functionality
- [x] **TransactionService** - withdraw, deposit, getBalance, getTransactions
- [x] **Database** - PostgreSQL with Kysely (migrated from Prisma)
- [x] **Ledger-first design** - All operations create immutable transaction records
- [x] **Idempotency** - Unique `idempotencyKey` prevents duplicate transactions
- [x] **Atomic transactions** - DB transactions ensure consistency

### Security
- [x] **HMAC-SHA256 signatures** - Service-to-service authentication
- [x] **Replay attack prevention** - Timestamp + nonce validation
- [x] **Timing-safe comparison** - Prevents timing attacks on signatures
- [x] **Internal-only access** - No public exposure, only trusted services

### API Endpoints
- [x] `POST /v1/wallets/withdraw` - Debit funds
- [x] `POST /v1/wallets/deposit` - Credit funds
- [x] `GET /v1/wallets/:playerId/balance` - Get current balance
- [x] `GET /v1/wallets/:playerId/transactions` - Transaction history
- [x] `GET /health` - Health check (no auth required)

### Infrastructure
- [x] **Docker Compose** - Service + PostgreSQL configured
- [x] **Auto migrations** - SQL runs on container init
- [x] **Environment variables** - DATABASE_URL, secrets configured

### Documentation
- [x] [CASHIER_SECURITY_SPEC.md](./CASHIER_SECURITY_SPEC.md) - Complete security architecture
- [x] [services/cashier/README.md](../services/cashier/README.md) - Service documentation

---

## Pending Features (Cashier)

### TournamentService (Future)
- [ ] `calculatePayouts(pot, placements)` - Prize distribution logic
- [ ] `executeTournamentPayout(tournamentId, placements)` - Batch payouts
- [ ] Payout tables (2 players: 70/30, 4 players: 60/25/15, etc.)

### Integration
- [ ] Game Server ↔ Cashier integration
- [ ] Buy-in flow on match start
- [ ] Payout flow on match end

---

## Tech Stack Summary

| Component | Technology | Notes |
|-----------|------------|-------|
| Identity | Keycloak 24 | OIDC + PKCE |
| Cashier DB | PostgreSQL 16 | Kysely query builder |
| Cashier API | Fastify 5 | TypeScript, ESM |
| Game Server | Colyseus | WebSocket rooms |
| Game Client | Phaser 3 | TypeScript |
| Web Portal | React + Vite | Keycloak integration |
| Containers | Docker Compose | Multi-service orchestration |

---

## Recent Changes

### 2026-01-11: Cashier API MVP
- Migrated from Prisma to Kysely (lighter, ~200KB vs ~10MB)
- Implemented HMAC-SHA256 service authentication
- Created security documentation
- Configured Docker services with health checks
- All endpoints tested and working

---

## Next Steps

1. **Game Server** - Implement CashierClient to call Cashier API
2. **Match Flow** - Buy-in on join, payout on finish
3. **Tournament Flow** - Bracket management + batch payouts
