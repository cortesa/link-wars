# User Authentication & Game Session Flow

## Overview

This document describes the complete authentication and game session flow for the **Link Wars** platform. The architecture separates concerns clearly:

- **web-portal**: Handles user authentication (Keycloak) and orchestrates game sessions
- **game-server**: Agnostic to auth system, receives session info via API from portal
- **game-client**: Pure game UI in iframe, connects to game-server via URL params
- **cashier**: Financial service, validates requests via shared secrets with game-server

**Key principle**: The game-server and game-client are **completely agnostic** to Keycloak and the portal's auth system. They only need session tokens and cashier credentials provided by the portal.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              WEB-PORTAL (Lobby)                               │
│                          http://localhost:5173                                │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  React App                                                              │  │
│  │  - Authenticates users via Keycloak (OAuth 2.0 + PKCE)                  │  │
│  │  - Manages game catalog                                                 │  │
│  │  - Creates game sessions via Game Server API                            │  │
│  │  - Embeds games in iframes with session token in URL                    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│         │                              │                                     │
│         │ OAuth 2.0                    │ REST API                            │
│         │                              │ (Create Session)                    │
│         ▼                              ▼                                     │
│  ┌─────────────┐              ┌─────────────────┐                           │
│  │  KEYCLOAK   │              │  GAME-SERVER    │                           │
│  │   (IdP)     │              │  (Colyseus)     │                           │
│  │             │              │                 │                           │
│  │ - Login     │              │ - Agnostic to   │                           │
│  │ - Register  │              │   Keycloak      │                           │
│  │ - JWT       │              │ - Session API   │                           │
│  └─────────────┘              │ - Cashier proxy │                           │
│                               └────────┬────────┘                           │
│                                        │                                     │
│                    ┌───────────────────┴───────────────────┐                │
│                    │              IFRAME                    │                │
│                    │  ┌─────────────────────────────────┐  │                │
│                    │  │         GAME-CLIENT             │  │                │
│                    │  │     http://localhost:5174       │  │                │
│                    │  │                                 │  │                │
│                    │  │  - Pure Phaser game             │  │                │
│                    │  │  - Receives sessionToken        │  │                │
│                    │  │    via URL params               │  │                │
│                    │  │  - Connects to game-server      │  │                │
│                    │  │    WebSocket                    │  │                │
│                    │  └─────────────────────────────────┘  │                │
│                    └───────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ Signed HTTP
                                        │ (HMAC-SHA256)
                                        ▼
                               ┌─────────────────┐
                               │    CASHIER      │
                               │   (Economy)     │
                               │                 │
                               │ - Validates     │
                               │   signatures    │
                               │ - Manages       │
                               │   wallets       │
                               └─────────────────┘
```

---

## Service Responsibilities

| Service | Knows About | Responsibilities |
|---------|-------------|------------------|
| **web-portal** | Keycloak, Game-Server API, Game catalog | User auth, session creation, iframe embedding |
| **game-server** | Session tokens, Cashier credentials | Game logic, session validation, Cashier operations |
| **game-client** | Session token (URL param), Game-server WS | Render game, send player inputs |
| **cashier** | Service secrets, Player wallets | Financial operations, signature validation |
| **keycloak** | Users, Roles | Authentication, JWT issuance |

---

# PART 1: User Authentication (Portal ↔ Keycloak)

## 1.1 Keycloak Configuration

```yaml
Realm: link-wars

Clients:
  - link-wars-portal:
      Client Protocol: openid-connect
      Access Type: public
      Standard Flow Enabled: true
      Direct Access Grants: false
      Valid Redirect URIs:
        - http://localhost:5173/*
        - https://linkwars.com/*
      Web Origins:
        - http://localhost:5173
        - https://linkwars.com

Realm Roles:
  - player     # Default role, can play games
  - vip        # Higher bet limits
  - admin      # System administration

Token Lifespan:
  Access Token: 5 minutes
  Refresh Token: 30 days
```

---

## 1.2 User Registration Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     REGISTRATION FLOW                             │
└──────────────────────────────────────────────────────────────────┘

  ┌─────────────┐                    ┌─────────────┐
  │ web-portal  │                    │  Keycloak   │
  └──────┬──────┘                    └──────┬──────┘
         │                                  │
    1. User clicks "Register"               │
         │                                  │
    2. Generate PKCE:                       │
       code_verifier = random(64)           │
       code_challenge = SHA256(verifier)    │
         │                                  │
    3. Redirect to Keycloak registration    │
         │ GET /realms/link-wars/protocol/  │
         │     openid-connect/registrations │
         │   ?client_id=link-wars-portal    │
         │   &redirect_uri=/callback        │
         │   &response_type=code            │
         │   &scope=openid profile email    │
         │   &code_challenge=<challenge>    │
         │   &code_challenge_method=S256    │
         │─────────────────────────────────▶│
         │                                  │
         │                                  │ Display registration form
         │                                  │ User fills: email, username, password
         │                                  │ Keycloak creates user
         │                                  │ Assigns 'player' role
         │                                  │
    4. Redirect back with auth code         │
         │ /callback?code=<auth_code>       │
         │◀─────────────────────────────────│
         │                                  │
    5. Exchange code for tokens             │
         │ POST /realms/link-wars/protocol/ │
         │      openid-connect/token        │
         │ {                                │
         │   grant_type: authorization_code,│
         │   code: <auth_code>,             │
         │   code_verifier: <verifier>,     │
         │   client_id: link-wars-portal,   │
         │   redirect_uri: /callback        │
         │ }                                │
         │─────────────────────────────────▶│
         │                                  │
         │ {                                │
         │   access_token: <JWT>,           │
         │   refresh_token: <JWT>,          │
         │   id_token: <JWT>,               │
         │   expires_in: 300                │
         │ }                                │
         │◀─────────────────────────────────│
         │                                  │
    6. Store tokens:                        │
       - access_token → memory              │
       - refresh_token → httpOnly cookie    │
         │                                  │
    7. User registered and logged in        │
       Redirect to lobby                    │
         │                                  │
```

---

## 1.3 User Login Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                   LOGIN FLOW (OAuth 2.0 + PKCE)                   │
└──────────────────────────────────────────────────────────────────┘

  ┌─────────────┐                    ┌─────────────┐
  │ web-portal  │                    │  Keycloak   │
  └──────┬──────┘                    └──────┬──────┘
         │                                  │
    1. User clicks "Login"                  │
         │                                  │
    2. Generate PKCE:                       │
       code_verifier = random(64)           │
       code_challenge = SHA256(verifier)    │
       state = random UUID (CSRF protection)│
         │                                  │
    3. Redirect to Keycloak login           │
         │ GET /realms/link-wars/protocol/  │
         │     openid-connect/auth          │
         │   ?client_id=link-wars-portal    │
         │   &redirect_uri=/callback        │
         │   &response_type=code            │
         │   &scope=openid profile email    │
         │   &code_challenge=<challenge>    │
         │   &code_challenge_method=S256    │
         │   &state=<state>                 │
         │─────────────────────────────────▶│
         │                                  │
         │                                  │ Display login form
         │                                  │ User enters credentials
         │                                  │ Keycloak validates
         │                                  │
    4. Redirect back with auth code         │
         │ /callback?code=<code>&state=<state>
         │◀─────────────────────────────────│
         │                                  │
    5. Verify state matches                 │
         │                                  │
    6. Exchange code for tokens             │
         │ POST /token                      │
         │─────────────────────────────────▶│
         │                                  │
         │ { access_token, refresh_token,   │
         │   id_token, expires_in }         │
         │◀─────────────────────────────────│
         │                                  │
    7. Store tokens securely                │
       Show game lobby                      │
         │                                  │
```

---

## 1.4 Token Refresh Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     TOKEN REFRESH FLOW                            │
└──────────────────────────────────────────────────────────────────┘

  ┌─────────────┐                    ┌─────────────┐
  │ web-portal  │                    │  Keycloak   │
  └──────┬──────┘                    └──────┬──────┘
         │                                  │
    Access token expires soon               │
    (check exp claim, refresh 30s before)   │
         │                                  │
         │ POST /realms/link-wars/protocol/ │
         │      openid-connect/token        │
         │ {                                │
         │   grant_type: refresh_token,     │
         │   refresh_token: <token>,        │
         │   client_id: link-wars-portal    │
         │ }                                │
         │─────────────────────────────────▶│
         │                                  │
         │ {                                │
         │   access_token: <new_token>,     │
         │   refresh_token: <rotated>,      │
         │   expires_in: 300                │
         │ }                                │
         │◀─────────────────────────────────│
         │                                  │
    Update stored tokens                    │
         │                                  │
```

---

## 1.5 Logout Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                       LOGOUT FLOW                                 │
└──────────────────────────────────────────────────────────────────┘

  ┌─────────────┐                    ┌─────────────┐
  │ web-portal  │                    │  Keycloak   │
  └──────┬──────┘                    └──────┬──────┘
         │                                  │
    User clicks "Logout"                    │
         │                                  │
    Option A: Full logout (end SSO session) │
         │                                  │
         │ Redirect to:                     │
         │ /realms/link-wars/protocol/      │
         │   openid-connect/logout          │
         │ ?post_logout_redirect_uri=<url>  │
         │ &id_token_hint=<id_token>        │
         │─────────────────────────────────▶│
         │                                  │
         │                                  │ End Keycloak session
         │                                  │ Invalidate tokens
         │                                  │
         │ Redirect to portal               │
         │◀─────────────────────────────────│
         │                                  │
    Clear local tokens                      │
         │                                  │
```

---

## 1.6 Auth Guard - Redirect to Login

When user tries to access a game without being logged in:

```
┌──────────────────────────────────────────────────────────────────┐
│                   AUTH GUARD - GAME ACCESS                        │
└──────────────────────────────────────────────────────────────────┘

  ┌─────────────┐
  │ web-portal  │
  └──────┬──────┘
         │
    User navigates to /game/tower-wars
         │
         ▼
    ┌─────────────────────────────┐
    │ Check: Is user logged in?   │
    │ (has valid access_token?)   │
    └──────────────┬──────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
    ┌─────────┐         ┌─────────┐
    │   YES   │         │   NO    │
    └────┬────┘         └────┬────┘
         │                   │
         ▼                   ▼
    Load game           Store intended URL
    (see Part 2)        in sessionStorage
                             │
                             ▼
                        Redirect to /login
                             │
                             ▼
                        After login, redirect
                        back to stored URL
```

### Portal Auth Guard Implementation

```typescript
// web-portal/src/guards/AuthGuard.tsx

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Store where user wanted to go
      sessionStorage.setItem('redirectAfterLogin', location.pathname);
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, location, navigate]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

// After successful login callback
function handleLoginCallback() {
  const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || '/';
  sessionStorage.removeItem('redirectAfterLogin');
  navigate(redirectUrl);
}
```

---

# PART 2: Game Session Flow (Portal ↔ Game Server ↔ Cashier)

This is the core flow where the portal creates a game session and the agnostic game-server receives everything it needs to operate.

## 2.1 Game Server Session API

The game-server exposes a REST API for session management. This API is called by the portal **before** loading the game iframe.

### API Endpoints

```
POST /api/sessions              # Create a new game session
GET  /api/sessions/:token       # Validate session (used by game-client)
DELETE /api/sessions/:token     # End session (player leaves)
```

### Session Data Model

```typescript
// game-server/src/types/session.ts

interface GameSession {
  // Session identification
  sessionToken: string;           // Unique token for this session (UUID)

  // Player info (from portal)
  playerId: string;               // Keycloak sub (or any unique ID)
  playerName: string;             // Display name

  // Game configuration
  gameId: string;                 // Which game (tower-wars, etc.)
  roomId?: string;                // Specific room to join (optional)

  // Cashier configuration (how to charge this player)
  cashier: {
    endpoint: string;             // Cashier API URL
    serviceId: string;            // Service identifier for signing
    signingSecret: string;        // HMAC secret for this session
    playerId: string;             // Player ID in Cashier system
  };

  // Session metadata
  createdAt: number;              // Unix timestamp
  expiresAt: number;              // Session expiry (e.g., 1 hour)
  status: 'active' | 'expired' | 'ended';
}
```

---

## 2.2 Complete Game Join Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     COMPLETE GAME JOIN FLOW                                   │
└──────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │ web-portal  │     │ game-server │     │ game-client │     │   cashier   │
  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
         │                   │                   │                   │
    STEP 1: User clicks "Play Tower Wars"        │                   │
         │                   │                   │                   │
         │ (Portal has user's│                   │                   │
         │  Keycloak JWT)    │                   │                   │
         │                   │                   │                   │
    STEP 2: Portal creates session on game-server                    │
         │                   │                   │                   │
         │ POST /api/sessions│                   │                   │
         │ Headers:          │                   │                   │
         │   X-Portal-Key: <portal_secret>       │                   │
         │ Body: {           │                   │                   │
         │   playerId: "kc-user-123",            │                   │
         │   playerName: "JohnDoe",              │                   │
         │   gameId: "tower-wars",               │                   │
         │   roomId: "room-456" (optional),      │                   │
         │   cashier: {      │                   │                   │
         │     endpoint: "http://cashier:3000",  │                   │
         │     serviceId: "game-server",         │                   │
         │     signingSecret: "<per-session>",   │                   │
         │     playerId: "kc-user-123"           │                   │
         │   }               │                   │                   │
         │ }                 │                   │                   │
         │──────────────────▶│                   │                   │
         │                   │                   │                   │
         │                   │ 1. Validate portal key                │
         │                   │ 2. Generate sessionToken              │
         │                   │ 3. Store session in memory            │
         │                   │ 4. Set expiry (1 hour)                │
         │                   │                   │                   │
         │ {                 │                   │                   │
         │   sessionToken: "sess_abc123",        │                   │
         │   expiresAt: 1704330000000,           │                   │
         │   wsUrl: "ws://localhost:2567"        │                   │
         │ }                 │                   │                   │
         │◀──────────────────│                   │                   │
         │                   │                   │                   │
    STEP 3: Portal loads game iframe with session token              │
         │                   │                   │                   │
         │ <iframe src="http://game:5174/game.html                   │
         │   ?sessionToken=sess_abc123                               │
         │   &wsUrl=ws://localhost:2567                              │
         │   &gameId=tower-wars                                      │
         │   &roomId=room-456">                  │                   │
         │─────────────────────────────────────▶│                   │
         │                   │                   │                   │
    STEP 4: Game client connects to game-server  │                   │
         │                   │                   │                   │
         │                   │ client.joinOrCreate('tower-wars', {   │
         │                   │   sessionToken: "sess_abc123",        │
         │                   │   roomId: "room-456"                  │
         │                   │ })               │                   │
         │                   │◀──────────────────│                   │
         │                   │                   │                   │
         │                   │ 5. onAuth: lookup session             │
         │                   │    by sessionToken                    │
         │                   │ 6. Validate not expired               │
         │                   │ 7. Extract player info                │
         │                   │    and cashier config                 │
         │                   │                   │                   │
    STEP 5: Game-server charges buy-in via Cashier                   │
         │                   │                   │                   │
         │                   │ POST /v1/wallets/withdraw             │
         │                   │ Headers:          │                   │
         │                   │   X-Service-Id: game-server           │
         │                   │   X-Timestamp: <ts>                   │
         │                   │   X-Signature: <hmac>                 │
         │                   │ Body: {           │                   │
         │                   │   playerId: "kc-user-123",            │
         │                   │   amount: 100,                         │
         │                   │   reference: "buy-in:room-456",       │
         │                   │   idempotencyKey: <uuid>              │
         │                   │ }                 │                   │
         │                   │──────────────────────────────────────▶│
         │                   │                   │                   │
         │                   │                   │ 8. Validate signature
         │                   │                   │ 9. Check balance  │
         │                   │                   │ 10. Lock funds    │
         │                   │                   │                   │
         │                   │ { txId, success } │                   │
         │                   │◀──────────────────────────────────────│
         │                   │                   │                   │
    STEP 6: Player joins room                    │                   │
         │                   │                   │                   │
         │                   │ Room joined,      │                   │
         │                   │ state synced      │                   │
         │                   │──────────────────▶│                   │
         │                   │                   │                   │
         │                   │                   │ Game starts!      │
         │                   │                   │                   │
```

---

## 2.3 Implementation Reference

Implementation snippets (Session API, Colyseus auth, client/portal integration, Cashier client,
signature verification, and game event handlers) live in:

- `Docs/INTEGRATION_IMPLEMENTATION.md`

---

## 2.4 Cashier API - Simplified

The Cashier is a **generic wallet service** that knows nothing about games. It only processes two types of operations:

### Core Principle

```
┌─────────────────────────────────────────────────────────────────┐
│                    CASHIER = SIMPLE WALLET                       │
│                                                                  │
│   Game-server can only do TWO things:                           │
│                                                                  │
│   1. WITHDRAW (debit)  →  Take money from player's wallet       │
│   2. DEPOSIT (credit)  →  Add money to player's wallet          │
│                                                                  │
│   The Cashier doesn't know about:                               │
│   - Games, rooms, or matches                                    │
│   - Buy-ins, payouts, or refunds (these are game concepts)      │
│   - Winners or losers                                           │
│                                                                  │
│   It only knows: playerId + amount + direction (in/out)         │
└─────────────────────────────────────────────────────────────────┘
```

### Cashier API Endpoints

```typescript
// ONLY 2 ENDPOINTS NEEDED

// 1. WITHDRAW: Deduct funds from player's wallet
POST /v1/wallets/withdraw
Headers: {
  X-Service-Id: string;        // "game-server"
  X-Timestamp: string;         // Unix timestamp
  X-Nonce: string;             // UUID for idempotency
  X-Signature: string;         // HMAC-SHA256
}
Body: {
  playerId: string;            // Keycloak sub
  amount: number;              // Positive integer (coins)
  reference: string;           // For audit: "buy-in:room-123"
  idempotencyKey: string;      // UUID to prevent duplicates
}
Response: {
  success: boolean;
  txId: string;
  newBalance: number;
}
Errors:
  - 402: Insufficient funds
  - 409: Duplicate idempotencyKey

// 2. DEPOSIT: Add funds to player's wallet
POST /v1/wallets/deposit
Headers: { same as withdraw }
Body: {
  playerId: string;
  amount: number;
  reference: string;           // For audit: "payout:room-123:1st"
  idempotencyKey: string;
}
Response: {
  success: boolean;
  txId: string;
  newBalance: number;
}

// OPTIONAL: Check balance (for UI display)
GET /v1/wallets/:playerId/balance
Response: { balance: number }
```

### How Game-Server Uses These Endpoints

| Game Event | Cashier Operation | Reference Example |
|------------|-------------------|-------------------|
| Player joins room | `withdraw(100)` | `"buy-in:room-abc"` |
| Player wins (1st) | `deposit(262)` | `"payout:room-abc:1st"` |
| Player 2nd place | `deposit(113)` | `"payout:room-abc:2nd"` |
| Player disconnects | `deposit(25)` | `"refund:room-abc:disconnect"` |
| Game cancelled | `deposit(100)` | `"refund:room-abc:cancelled"` |
| Player eliminated | Nothing | (money stays in pool) |

Implementation snippets for the Cashier client and game logic live in:

- `Docs/INTEGRATION_IMPLEMENTATION.md`

### Security

The Cashier validates every request:

1. **Service ID** - Only known services (game-server) can call
2. **Signature** - HMAC-SHA256 ensures request wasn't tampered
3. **Timestamp** - Rejects requests older than 5 minutes
4. **Nonce** - Prevents replay attacks
5. **Idempotency Key** - Same key = same result (safe retries)

---

## 2.5 Game Event Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     GAME EVENTS & CASHIER OPERATIONS                          │
│                                                                               │
│   Cashier only knows: WITHDRAW (take money) and DEPOSIT (give money)         │
└──────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────┐                    ┌─────────────┐
  │ game-server │                    │   cashier   │
  └──────┬──────┘                    └──────┬──────┘
         │                                  │
    PLAYERS JOIN ROOM                       │
         │                                  │
         │ POST /v1/wallets/withdraw        │
         │ { playerId: "A", amount: 100,    │
         │   reference: "buy-in:room-xyz" } │
         │─────────────────────────────────▶│
         │                                  │
         │ (repeat for B, C, D)             │
         │                                  │
    ─────┼──────────────────────────────────┼─────
         │                                  │
    GAME STARTS                             │
    Pool = 400 (4 × 100)                    │
         │                                  │
    ─────┼──────────────────────────────────┼─────
         │                                  │
    PLAYER A ELIMINATED                     │
    (all towers conquered)                  │
         │                                  │
         │ No cashier action                │
         │ (100 stays in pool)              │
         │                                  │
    ─────┼──────────────────────────────────┼─────
         │                                  │
    PLAYER B DISCONNECTS (30s timeout)      │
         │                                  │
         │ POST /v1/wallets/deposit         │
         │ { playerId: "B", amount: 25,     │
         │   reference: "refund:room-xyz:   │
         │              disconnect" }       │
         │─────────────────────────────────▶│
         │                                  │
         │ { txId, newBalance }             │
         │◀─────────────────────────────────│
         │                                  │
         │ Pool = 400 - 25 = 375            │
         │ Towers become neutral            │
         │                                  │
    ─────┼──────────────────────────────────┼─────
         │                                  │
    GAME ENDS (C wins, D runner-up)         │
         │                                  │
         │ Calculate prizes:                │
         │ - C: 70% of 375 = 262            │
         │ - D: 30% of 375 = 113            │
         │                                  │
         │ POST /v1/wallets/deposit         │
         │ { playerId: "C", amount: 262,    │
         │   reference: "payout:room-xyz:   │
         │              1st" }              │
         │─────────────────────────────────▶│
         │                                  │
         │ POST /v1/wallets/deposit         │
         │ { playerId: "D", amount: 113,    │
         │   reference: "payout:room-xyz:   │
         │              2nd" }              │
         │─────────────────────────────────▶│
         │                                  │
         │ Broadcast game_over to clients   │
         │                                  │
    ─────┼──────────────────────────────────┼─────
         │                                  │
    SUMMARY                                 │
         │                                  │
    A: withdraw(100), no deposit = -100     │
    B: withdraw(100), deposit(25) = -75     │
    C: withdraw(100), deposit(262) = +162   │
    D: withdraw(100), deposit(113) = +13    │
         │                                  │
    Total: -100 -75 +162 +13 = 0 ✓          │
         │                                  │
```

---

# PART 3: Complete System Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         COMPLETE SYSTEM FLOW                                  │
└──────────────────────────────────────────────────────────────────────────────┘

    USER                PORTAL              KEYCLOAK           GAME-SERVER         CASHIER
      │                   │                    │                    │                 │
      │ 1. Click Login    │                    │                    │                 │
      │──────────────────▶│                    │                    │                 │
      │                   │                    │                    │                 │
      │                   │ 2. OAuth redirect  │                    │                 │
      │                   │───────────────────▶│                    │                 │
      │                   │                    │                    │                 │
      │                   │ 3. Login form      │                    │                 │
      │◀──────────────────────────────────────│                    │                 │
      │                   │                    │                    │                 │
      │ 4. Enter credentials                   │                    │                 │
      │───────────────────────────────────────▶│                    │                 │
      │                   │                    │                    │                 │
      │                   │ 5. Auth code       │                    │                 │
      │                   │◀───────────────────│                    │                 │
      │                   │                    │                    │                 │
      │                   │ 6. Exchange tokens │                    │                 │
      │                   │───────────────────▶│                    │                 │
      │                   │                    │                    │                 │
      │                   │ 7. JWT tokens      │                    │                 │
      │                   │◀───────────────────│                    │                 │
      │                   │                    │                    │                 │
      │ 8. Show lobby     │                    │                    │                 │
      │◀──────────────────│                    │                    │                 │
      │                   │                    │                    │                 │
      │ 9. Click "Play    │                    │                    │                 │
      │    Tower Wars"    │                    │                    │                 │
      │──────────────────▶│                    │                    │                 │
      │                   │                    │                    │                 │
      │                   │ 10. POST /api/sessions (create session) │                 │
      │                   │───────────────────────────────────────▶│                 │
      │                   │                    │                    │                 │
      │                   │ 11. { sessionToken, wsUrl }             │                 │
      │                   │◀───────────────────────────────────────│                 │
      │                   │                    │                    │                 │
      │ 12. Load iframe   │                    │                    │                 │
      │     with session  │                    │                    │                 │
      │◀──────────────────│                    │                    │                 │
      │                   │                    │                    │                 │
      │                   │                    │    GAME-CLIENT     │                 │
      │                   │                    │        │           │                 │
      │                   │                    │        │ 13. WS connect              │
      │                   │                    │        │    + sessionToken           │
      │                   │                    │        │──────────▶│                 │
      │                   │                    │        │           │                 │
      │                   │                    │        │           │ 14. Validate    │
      │                   │                    │        │           │     session     │
      │                   │                    │        │           │                 │
      │                   │                    │        │           │ 15. POST buy-in │
      │                   │                    │        │           │    (signed)     │
      │                   │                    │        │           │────────────────▶│
      │                   │                    │        │           │                 │
      │                   │                    │        │           │ 16. { txId }    │
      │                   │                    │        │           │◀────────────────│
      │                   │                    │        │           │                 │
      │                   │                    │        │ 17. Room joined             │
      │                   │                    │        │◀──────────│                 │
      │                   │                    │        │           │                 │
      │ 18. Game plays... │                    │        │           │                 │
      │                   │                    │        │           │                 │
      │                   │                    │        │           │ 19. Game ends   │
      │                   │                    │        │           │     POST payout │
      │                   │                    │        │           │────────────────▶│
      │                   │                    │        │           │                 │
      │                   │                    │        │           │ 20. Funds       │
      │                   │                    │        │           │     distributed │
      │                   │                    │        │           │◀────────────────│
      │                   │                    │        │           │                 │
      │                   │                    │        │ 21. Game over event         │
      │                   │◀───────────────────────────│           │                 │
      │                   │                    │        │           │                 │
      │ 22. Show results  │                    │                    │                 │
      │◀──────────────────│                    │                    │                 │
      │                   │                    │                    │                 │
```

---

# PART 4: Environment Configuration

## 4.1 Web Portal

```env
# Keycloak
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=link-wars
VITE_KEYCLOAK_CLIENT_ID=link-wars-portal

# Game Server API (for creating sessions)
VITE_GAME_SERVER_API_URL=http://localhost:2567/api
VITE_PORTAL_SECRET=portal-secret-key-256-bit

# Cashier (passed to game server in session)
VITE_CASHIER_URL=http://localhost:3000
VITE_CASHIER_SECRET=cashier-signing-secret-256-bit

# Game Clients
VITE_TOWER_WARS_CLIENT_URL=http://localhost:5174
VITE_TOWER_WARS_SERVER_URL=ws://localhost:2567
```

## 4.2 Game Server

```env
# Server
PORT=2567
WS_URL=ws://localhost:2567

# Portal authentication
PORTAL_SECRET=portal-secret-key-256-bit

# Session config
SESSION_TTL_MS=3600000  # 1 hour
```

## 4.3 Game Client

```env
# No secrets - everything comes via URL params
# Build-time only config
VITE_DEFAULT_WS_URL=ws://localhost:2567
```

## 4.4 Cashier

```env
# Server
PORT=3000

# Service authentication
GAME_SERVER_SECRET=cashier-signing-secret-256-bit

# Security
TIMESTAMP_TOLERANCE_MS=300000  # 5 minutes

# Database
DATABASE_URL=postgresql://...
```

---

# PART 5: Error Handling

## 5.1 Portal Errors

| Error | Cause | Action |
|-------|-------|--------|
| Keycloak unavailable | IdP down | Show maintenance message |
| Session creation failed | Game server down | Show error, retry button |
| Invalid refresh token | Session expired | Redirect to login |

## 5.2 Game Client Errors

| Error | Cause | Action |
|-------|-------|--------|
| Missing URL params | Direct access to game URL | Show "access via portal" message |
| WebSocket connection failed | Game server down | Show error, return to lobby |
| Session invalid | Expired or tampered | Return to portal |

## 5.3 Game Server Errors

| Error | Code | Cause | Action |
|-------|------|-------|--------|
| Invalid portal key | 401 | Wrong PORTAL_SECRET | Reject request |
| Session not found | 404 | Invalid token | Reject connection |
| Session expired | 410 | TTL exceeded | Reject connection |
| Cashier error | 402 | Insufficient funds | Reject join, notify client |

## 5.4 Cashier Errors

| Error | Code | Cause | Action |
|-------|------|-------|--------|
| Invalid signature | 401 | Wrong secret or tampered | Reject |
| Expired request | 401 | Timestamp too old | Reject |
| Duplicate nonce | 409 | Replay attack | Reject |
| Insufficient balance | 402 | Not enough funds | Return error |

---

# PART 6: Security Checklist

## Authentication (Portal ↔ Keycloak)

- [ ] PKCE enabled for all OAuth flows
- [ ] State parameter for CSRF protection
- [ ] Access tokens in memory only
- [ ] Refresh tokens in httpOnly cookies
- [ ] Proactive token refresh (30s before expiry)

## Session Management (Portal ↔ Game Server)

- [ ] Portal authenticates with X-Portal-Key header
- [ ] Session tokens are UUIDs (unguessable)
- [ ] Sessions expire after 1 hour
- [ ] Sessions can be explicitly ended

## Cashier Communication (Game Server ↔ Cashier)

- [ ] All requests signed with HMAC-SHA256
- [ ] Timestamp validation (5 minute window)
- [ ] Nonce tracking (prevent replay)
- [ ] Idempotency keys for safe retries
- [ ] Timing-safe signature comparison

## General

- [ ] HTTPS in production
- [ ] CORS properly configured
- [ ] No secrets in client-side code
- [ ] No sensitive data in URL params (only session token)
