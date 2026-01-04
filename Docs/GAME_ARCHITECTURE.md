# Casual Multiplayer Game - Tower War Style
## Architecture and Flows Document (Scalable MVP)

This document describes the **architecture, services, flows, and game logic** agreed upon to execute the project step by step, with an initial focus on **casual** use (children, friends, Discord) but with a **scalable** foundation.

---

## 1. Overview

2D Web Game style *Tower War*:

- Client: **Phaser + TypeScript**
- Real-time Multiplayer with **rooms**
- Simultaneous matches
- Modes:
  - FFA (Free For All) 2–5 players
  - 1v1
  - 1v1 Tournaments (single elimination)
- **Fictional coin** system
- Optional **Buy-in**
- Public **Spectators** with per-tournament link
- Architecture prepared for growth (more players, more games)

---

## 2. Services

### 2.1 Identity – Keycloak
- Authentication and login.
- Issues JWT (OIDC).
- `playerId = sub` from JWT.
- Runs on Docker.
- Own database (Postgres).

---

### 2.2 Cashier API (Economy / Wallet)
Reusable service for other games.

Responsibilities:
- Balances per player.
- Operation ledger.
- Only two operations:
  - **Withdraw** (debit).
  - **Deposit** (credit).

Features:
- **Authoritative** (client does not touch coins).
- **Idempotent** (`idempotencyKey` per operation).
- Own DB (Postgres).

Future monetization (post-MVP):
- MVP does not sell coins and does not take a cut from matches.
- Economy is zero-sum: all withdrawals are redistributed to players.
- Revenue later comes from **coin purchases** (packages) in the portal.
- This keeps game-server and cashier logic neutral while payments evolve separately.

---

### 2.3 Game Server (Real-time)
- WebSocket (Colyseus).
- Authoritative simulation.
- Simultaneous room management.
- Input validation.
- Calls to Cashier.

Includes:
- `MatchRoom` (1v1 or FFA).
- `TournamentHubRoom` (tournament hub + spectators).
- Tournament Manager (brackets and advancement).

Optional:
- Redis (queues, rate limit, matchmaking).

---

### 2.4 Web Client
- Phaser + TypeScript.
- Renders server state.
- Sends only **intentions**.
- Never decides results or economy.

---

## 3. Docker Compose (Minimum Stack)

Recommended local services:

- `postgres_keycloak`
- `keycloak`
- `postgres_cashier`
- `cashier_api`
- `game_server`
- `redis` (optional)
- `client_web` (optional)

### Connections
- Client (portal) → Keycloak (login)
- Portal → Game Server (Session API)
- Game Client → Game Server (WS + sessionToken)
- Game Server → Cashier (Internal HTTP, HMAC signed)

---

## 4. Game Logic (Core)

### 4.1 Basic Entities
- **Tower**
  - `id`
  - `ownerId | null`
  - `count`
  - `x, y`
- **Link**
  - `fromTowerId`
  - `toTowerId`
  - `ownerId`
- **UnitStream**
  - Represents sending units between towers

---

### 4.2 Player Actions (Intentions)
- `commitLink(fromTowerId, toTowerId)`
- `cancelLink(...)` (optional)

---

### 4.3 Authoritative Tick (Server)
On each tick:
- Unit generation.
- Dispatch resolution.
- Combat upon arrival:
  - Same faction → addition.
  - Enemy faction → subtraction.
  - If it reaches 0 → ownership change.

---

### 4.4 Main Ending
**Total Domination**:
- The player who controls **all towers** wins.

Secondary possible endings:
- Time + tie-breakers (towers, units).
- Progressive elimination.

---

## 5. Match Modes

### 5.1 Casual FFA (2–5 players)
- 1 player = 1 team.
- Free for all.
- Each match is an independent room.
- Server calculates **placements** (1st..N).

---

### 5.2 1v1
- Base for tournaments.
- Same rules.
- Ending by total domination.

---

### 5.3 Concurrency
- Many simultaneous matches.
- Each room has:
  - Isolated state.
  - Independent tick.
  - Own `matchId`.

---

## 6. Economy and Prizes

### 6.1 Principles
- Client never modifies coins.
- Server decides results.
- No P2P transfers.
- Cashier is the source of truth.

---

### 6.2 Casual Matches with Buy-in (Optional)
- Configurable `buyIn`.
- `pot = buyIn * players`.

Suggested tables (casual):

| Players | Distribution (%) |
|---------|------------|
| 2       | 70 / 30    |
| 3       | 70 / 20 / 10 |
| 4       | 60 / 25 / 15 / 0 |
| 5       | 55 / 25 / 15 / 5 / 0 |

The server:
- Calculates integer prizes.
- Guarantees `sum = pot`.
- Sends exact values to client for UI.

---

## 7. 1v1 Tournaments

### 7.1 Format
- Single elimination.
- Each match is a 1v1.
- Winner advances.
- Loser eliminated.

Recommended initial sizes:
- 4 and 8 players (no byes).

---

### 7.2 One-time Buy-in per Tournament (Decision Made)
Flow:
1. Player registers.
2. Game Server charges buy-in via Cashier.
3. A single pot is created.
4. Matches are generated.
5. Upon completion, Cashier distributes prizes.

---

### 7.3 Tournament Prizes (Proposal)
- 4 players: 70% / 30%
- 8+ players:
  - 1st: 60%
  - 2nd: 25%
  - 3rd–4th: 7.5% / 7.5%

---

### 7.4 Tournament Manager
Responsible for:
- Creating tournaments.
- Generating bracket.
- Creating match rooms.
- Listening for results.
- Advancing winners.
- Executing final payout.

---

## 8. Spectators / Observers

### 8.1 Link per Tournament
- `/watch/t/:tournamentId?token=...`
- Allows watching the entire tournament.

---

### 8.2 TournamentHubRoom
- Special room for spectators.
- Sends:
  - List of active matches.
  - Light previews (reduced state).

---

### 8.3 MatchRoom as Spectator
- Input only in read-only mode.
- No inputs allowed.

---

### 8.4 Security
- Long, unguessable `watchToken`.
- Server-side validation.
- Future rate limiting possible.

---

## 9. Roles
- **Player**
  - Can send inputs.
  - Participates in matches.
- **Spectator**
  - Read-only.
  - Can be anonymous.

---

## 10. Events (Conceptual)

### Tournament Hub
- `tournament.state`
- `matches.previews`
- `tournament.started`
- `tournament.finished`
- `nextMatch.ready`

### Match
- `match.state`
- `match.event`
- `match.finished`

---

## 11. Closed Decisions
- Phaser as client.
- Multiplayer by rooms.
- Casual FFA 2–5 players.
- Total domination as main ending.
- 1v1 Tournaments.
- One-time buy-in per tournament.
- Separate economy (Cashier).
- Spectators per tournament with grid view.

---

## 12. Technical Next Steps
1. Functional Docker Compose.
2. Login with Keycloak.
3. Minimal 1v1 MatchRoom.
4. Basic Tournament Manager.
5. TournamentHubRoom with previews.
6. Cashier integration (entry + payout).

---

This document defines the **complete foundation** to start implementing the project step by step without redoing architecture in the future.
