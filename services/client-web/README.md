# Web Client - Documentation & TDD Guide

## Overview
The Web Client is the front-end interface built with Phaser. It renders the game state provided by the server and captures user inputs to send back as "intentions".

## Technology Stack
- **Game Engine**: Phaser 3
- **Build Tool**: Vite
- **Language**: TypeScript
- **Testing**: Vitest (Logic) + Playwright (E2E/Flows)

## Directory Structure (Planned)
```
services/client-web/
├── src/
│   ├── scenes/             # Phaser Scenes (Boot, Login, Lobby, Game)
│   ├── components/         # React/Vue or Vanilla UI components
│   ├── network/            # Colyseus Client & Keycloak integration
│   ├── game/               # Visual entities (TowerSprite, LinkSprite)
│   └── main.ts             # Entry point
├── tests/
│   ├── unit/               # UI logic and utility tests
│   └── e2e/                # Playwright flows (Login -> Win Game)
├── public/                 # Assets (images, sounds)
└── package.json
```

## Core Responsibilities
1. **Interpolation**: Render smooth movements even if the server state updates at a lower frequency.
2. **Visual Feedback**: Animations for units, tower conquest, and link creation.
3. **Authentication**: Handle Keycloak login flow and store JWT for server communication.
4. **UI Layers**: Overlays for tournament brackets, player stats, and wallet balance.

## TDD / E2E Workflow
1. **Flow Testing (Playwright)**: Write a test that navigates through the login screen, enters a lobby, and checks if the game scene loads.
2. **Logic Isolation**: Test calculation utilities (e.g., coordinate conversions) using Vitest.
3. **Mocking**: Mock the Game Server messages to test how the UI reacts to different game events (e.g., "Tournament Finished").

## Specific Actions
- [ ] Setup Vite + Phaser 3 boilerplate.
- [ ] Implement Keycloak OIDC flow.
- [ ] Create `GameScene` that listens to `room.onStateChange`.
- [ ] Implement UI for `Tower` stats and `Player` balance.
