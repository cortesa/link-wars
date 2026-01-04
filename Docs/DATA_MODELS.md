# Global Data Models

High-level schema definitions for shared entities across the system.

## 1. Player (Identity & Metrics)
Managed by Keycloak, referenced by all services.
- `id`: UUID (Keycloak `sub`).
- `username`: String.
- `balance`: Decimal (managed by Cashier).

---

## 2. GameSession (Portal ↔ Game Server)
Session data created by the portal and consumed by the game-server.
- `sessionToken`: String (UUID, passed to game-client).
- `playerId`: UUID (Keycloak `sub`).
- `playerName`: String.
- `gameId`: String.
- `roomId`: String | null.
- `cashier`:
  - `endpoint`: String.
  - `serviceId`: String.
  - `signingSecret`: String.
  - `playerId`: UUID (Cashier player ID).
- `createdAt`: Unix timestamp (ms).
- `expiresAt`: Unix timestamp (ms).
- `status`: enum (`active`, `expired`, `ended`).

---

## 3. Match (Game Server State)
The real-time representation of a single game.
- `matchId`: Unique string.
- `mode`: enum (`1V1`, `FFA`, `TOURNAMENT`).
- `towers`: Map of `TowerId` -> `TowerState`.
- `links`: List of `LinkState`.
- `status`: enum (`WAITING`, `STARTING`, `PLAYING`, `FINISHED`).

---

## 4. Transaction (Cashier Ledger)
The financial record of any balance change.
- `txId`: UUID.
- `playerId`: UUID.
- `amount`: Decimal (always positive).
- `direction`: enum (`DEBIT`, `CREDIT`).
- `reference`: String (e.g., `buy-in:room-123`, `payout:room-123:1st`).
- `idempotencyKey`: Unique string provided by the caller.
- `timestamp`: UTC DateTime.

---

## 5. Tournament (Management)
The bracket-level entity.
- `tournamentId`: UUID.
- `entryFee`: Decimal.
- `potTotal`: Decimal.
- `bracket`: JSON/Array (winner tree structure).
- `winnerIds`: List of UUIDs (ordered 1st, 2nd, etc.).

---

## Model Consistency Rule
- **Primary Source**: Each field must have a "Source of Truth" service.
    - Balance -> Cashier.
    - Game State -> Game Server.
    - Display Name -> Keycloak.
- **Referential Integrity**: Always use the Keycloak `sub` as the `playerId` across all DBs.
