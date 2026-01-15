# Project Progress Tracker

This document tracks the implementation progress of the Link Wars project.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CORE SERVICES (docker-compose.yml)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │  Keycloak   │    │   Cashier   │    │ Portal-BFF  │    │ Web-Portal  │  │
│  │ (Identity)  │    │   (API)     │    │  (Fastify)  │    │  (React)    │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    GAMES (games/*/docker-compose.yml)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Link Wars Game (games/link-wars/)                                   │   │
│  │  ┌─────────────────┐              ┌─────────────────┐               │   │
│  │  │  linkwars-server │              │  linkwars-client │              │   │
│  │  │   (Colyseus)     │              │    (Phaser)      │              │   │
│  │  └─────────────────┘              └─────────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Future Game (games/another-game/)                                   │   │
│  │  ... server + client ...                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Services Status

| Service | Status | Location | Description |
|---------|--------|----------|-------------|
| **Identity (Keycloak)** | ✅ Complete | `services/identity/` | OIDC authentication, realm config |
| **Cashier API** | ✅ Complete | `services/cashier/` | Wallet management, HMAC security |
| **Portal-BFF** | ✅ Complete | `services/portal-bff/` | JWT validation, Cashier proxy |
| **Web Portal** | ✅ Complete | `services/web-portal/` | React + Keycloak + Wallet display |
| **Link Wars Server** | 🚧 In Progress | `games/link-wars/server/` | Colyseus game server |
| **Link Wars Client** | 🚧 In Progress | `games/link-wars/client/` | Phaser game client |

---

## Directory Structure

```
link-wars/
├── docker-compose.yml              # Core services orchestration
├── docker-compose.override.yml     # Development overrides
├── package.json                    # Root workspace config
│
├── services/                       # CORE SERVICES (we control these)
│   ├── identity/                   # Keycloak configuration
│   ├── cashier/                    # Economy/wallet API
│   ├── portal-bff/                 # Backend-For-Frontend
│   └── web-portal/                 # React frontend
│
├── games/                          # GAMES (can be external providers)
│   └── link-wars/                  # First game
│       ├── docker-compose.yml      # Game-specific compose
│       ├── server/                 # Colyseus server
│       └── client/                 # Phaser client
│
└── Docs/                           # Documentation
```

---

## How to Run

### Core Services Only
```bash
docker compose up -d
# Starts: identity, cashier, portal-bff, web-portal
```

### Core Services + Link Wars Game
```bash
# Start core first
docker compose up -d

# Then start the game
docker compose -f games/link-wars/docker-compose.yml up -d
```

### Access Points
| Service | URL |
|---------|-----|
| Web Portal | http://localhost:5173 |
| Keycloak Admin | http://localhost:8080 |
| Cashier API | http://localhost:3002 |
| Portal BFF | http://localhost:3003 |
| Link Wars Server | http://localhost:2567 |
| Link Wars Client | http://localhost:5174 |

---

## Portal-BFF - Completed Features

### Purpose
The Portal-BFF (Backend-For-Frontend) acts as a secure proxy between the Web Portal and internal services like Cashier.

### Flow
```
Browser (React) ──JWT──► Portal-BFF ──HMAC──► Cashier
                              │
                              ▼
                          Keycloak
                        (JWKS validation)
```

### Features
- [x] **JWT Validation** - Uses Keycloak JWKS endpoint
- [x] **HMAC Signing** - Signs requests to Cashier
- [x] **Wallet Routes** - `/api/wallet/balance`, `/api/wallet/transactions`
- [x] **CORS** - Configured for web-portal origin

### API Endpoints
- `GET /api/wallet/balance` - Get user balance (requires JWT)
- `GET /api/wallet/transactions` - Get transaction history (requires JWT)
- `GET /health` - Health check

---

## Cashier API - Completed Features

### Core Functionality
- [x] **TransactionService** - withdraw, deposit, getBalance, getTransactions
- [x] **Database** - PostgreSQL with Kysely
- [x] **Ledger-first design** - Immutable transaction records
- [x] **Idempotency** - Unique `idempotencyKey` prevents duplicates
- [x] **Atomic transactions** - DB transactions ensure consistency

### Security
- [x] **HMAC-SHA256 signatures** - Service-to-service auth
- [x] **Replay attack prevention** - Timestamp + nonce validation
- [x] **Timing-safe comparison** - Prevents timing attacks

### Authorized Services
| Service ID | Purpose |
|------------|---------|
| `portal-bff` | Web Portal balance/transactions |
| `linkwars-server` | Link Wars game operations |
| `game-server` | Legacy support |

---

## Web Portal - Completed Features

### Authentication
- [x] **Keycloak PKCE flow** - Secure browser auth
- [x] **Token refresh** - Automatic token renewal
- [x] **AuthContext** - React context for auth state

### Wallet Integration
- [x] **WalletContext** - React context for wallet state
- [x] **Balance display** - Shows in header when logged in
- [x] **Auto-fetch** - Balance loads on authentication

---

## Tech Stack Summary

| Component | Technology | Notes |
|-----------|------------|-------|
| Identity | Keycloak 26 | OIDC + PKCE |
| Cashier DB | PostgreSQL 16 | Kysely query builder |
| Cashier API | Fastify 5 | TypeScript, ESM |
| Portal BFF | Fastify 5 | JWT validation, HMAC proxy |
| Web Portal | React + Vite | Keycloak + Wallet integration |
| Game Server | Colyseus | WebSocket rooms |
| Game Client | Phaser 3 | TypeScript |
| Containers | Docker Compose | Multi-service orchestration |

---

## Recent Changes

### 2026-01-15: Project Restructure
- Separated games from core services
- Created `games/link-wars/` with dedicated docker-compose
- Updated workspace configuration
- Games can now be managed independently

### 2026-01-15: Portal-BFF Integration
- Created Portal-BFF service for secure Cashier access
- Implemented JWT validation with Keycloak JWKS
- Added wallet balance display to Web Portal
- PR #9 merged

### 2026-01-11: Cashier API MVP
- Migrated from Prisma to Kysely
- Implemented HMAC-SHA256 authentication
- Created security documentation
- PR #8 merged

---

## Next Steps

1. **Link Wars Server** - Implement CashierClient for buy-in/payout
2. **Match Flow** - Buy-in on join, payout on finish
3. **Tournament Flow** - Bracket management + batch payouts
4. **Game Integration** - Connect game client to web-portal via iframe
