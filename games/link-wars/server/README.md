# Game Server - Documentation & TDD Guide

## Overview
The Game Server manages the real-time multiplayer logic, room synchronization, and authoritative game state. It handles the "Tower War" mechanics and tournament flow.

## Technology Stack
- **Framework**: Colyseus (State-sync Multiplayer)
- **Language**: TypeScript
- **Testing**: Vitest + Colyseus Testing Utils
- **Optional**: Redis (for scaling/matchmaking)

## Directory Structure (Planned)
```
services/game-server/
├── src/
│   ├── rooms/              # Colyseus Rooms (MatchRoom, TournamentHubRoom)
│   ├── schema/             # Game State Schemas (Tower, Link, Unit)
│   ├── logic/              # Pure game logic (Combat, Tick resolution)
│   ├── managers/           # Tournament & Match managers
│   └── index.ts            # Server entry point
├── tests/
│   ├── logic/              # Unit tests for combat and state changes
│   ├── rooms/              # Integration tests for room lifecycle
│   └── tournaments/        # Bracket advancement tests
└── package.json
```

## Authoritative Game Logic
1. **Clock (Ticks)**: The server runs a tick every X ms. All movements and combat happen on ticks.
2. **Input Validation**: Clients send "intentions" (e.g., `commitLink`). The server validates if the move is legal.
3. **State Sync**: Colyseus automatically synchronizes the state to all connected clients.
4. **Economic Hooks**: Communicate with the Cashier API for buy-ins at the start of a tournament and payouts at the end.

## TDD Workflow (Simulation Focus)
Because real-time networking can be hard to test, we isolate the game logic:
1. **Isolate Logic**: Put combat and movement logic in `src/logic/`.
2. **Write Simulation Tests**: Write tests that manually call `logic.update(tickCount)` and verify the state of towers and units.
3. **Room Testing**: Use `@colyseus/testing` to simulate clients joining, sending messages, and verifying state synchronization.

## Specific Actions
- [ ] Define `GameState` schema with `towers`, `links`, and `players`.
- [ ] Implement `CombatResolver` with TDD (unit vs unit, unit vs tower).
- [ ] Implement `MatchRoom` lifecycle (waiting -> playing -> finished).
- [ ] Implement `TournamentManager` to advance winners through a bracket.
