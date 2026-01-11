# Cashier API Security Specification

## Technical Security Analysis for Financial Transaction Protection

This document describes the complete security architecture implemented to protect the Cashier API from unauthorized access, ensuring that only authenticated and authorized services can perform financial operations on player wallets.

---

## 1. Executive Summary

### Security Model: Defense in Depth

The Cashier API is **never exposed to end users**. It operates as an internal service protected by multiple security layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SECURITY ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────┘

     INTERNET                    INTERNAL NETWORK                   DATABASE
   ───────────────────────────────────────────────────────────────────────────

   ┌──────────┐    HTTPS      ┌──────────────┐
   │  User    │◄──────────────│  Keycloak    │
   │ Browser  │    OIDC/JWT   │  (Identity)  │
   └────┬─────┘               └──────────────┘
        │
        │ HTTPS + JWT
        ▼
   ┌──────────────┐           ┌──────────────┐         ┌──────────────┐
   │  Web Portal  │───────────│ Game Server  │─────────│  PostgreSQL  │
   │   (React)    │  Session  │  (Colyseus)  │         │   (Games)    │
   └──────────────┘   Token   └──────┬───────┘         └──────────────┘
                                     │
                                     │ HMAC-SHA256 Signed
                                     │ Internal HTTP
                                     ▼
                              ┌──────────────┐         ┌──────────────┐
                              │  Cashier API │─────────│  PostgreSQL  │
                              │  (Fastify)   │         │  (Wallets)   │
                              └──────────────┘         └──────────────┘
                                     │
                                     │ BLOCKED
                                     ▼
                              ┌──────────────┐
                              │   Internet   │ ✗ NO ACCESS
                              └──────────────┘
```

### Key Security Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **User Access** | Blocked | Users never call Cashier directly |
| **Authentication** | HMAC-SHA256 signatures | Service-to-service trust |
| **Replay Prevention** | Nonce + Timestamp | Prevents request duplication |
| **Idempotency** | Unique keys per transaction | Prevents double-charging |
| **Network** | Internal only | No public exposure |

---

## 2. Why Users Cannot Access Cashier Directly

### 2.1 The Problem with Direct Access

If users could call the Cashier API directly, they could:

1. **Forge deposits**: Credit their own wallet without winning
2. **Modify amounts**: Change transaction values
3. **Replay transactions**: Duplicate successful payouts
4. **Bypass game rules**: Withdraw without meeting conditions

### 2.2 The Solution: Server Authority

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AUTHORITATIVE SERVER MODEL                                │
└─────────────────────────────────────────────────────────────────────────────┘

  NEVER TRUST THE CLIENT
  ──────────────────────

  ✗ WRONG: Client → Cashier
     "I won the game, give me 1000 coins"

  ✓ CORRECT: Client → Game Server → Cashier
     Client: "I want to play" (intention only)
     Server: Validates game state, determines winner
     Server: Signs request to Cashier
     Cashier: Verifies signature, executes transaction
```

**The Game Server is the ONLY entity that can:**
- Determine game outcomes
- Calculate prize distributions
- Request financial operations from Cashier

---

## 3. Service-to-Service Authentication (HMAC-SHA256)

### 3.1 How HMAC Signing Works

The Cashier uses HMAC-SHA256 signatures to verify that requests come from authorized services.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    HMAC-SHA256 SIGNATURE FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐                              ┌──────────────┐
  │ Game Server  │                              │  Cashier API │
  └──────┬───────┘                              └──────┬───────┘
         │                                             │
    1. Prepare request                                 │
       {                                               │
         playerId: "player-123",                       │
         amount: 100,                                  │
         reference: "game-456",                        │
         idempotencyKey: "tx-789"                      │
       }                                               │
         │                                             │
    2. Generate signature components                   │
       serviceId  = "game-server"                      │
       timestamp  = 1704330000000 (ms)                 │
       nonce      = "550e8400-e29b-41d4-a716-..."      │
       body       = JSON.stringify(request)            │
         │                                             │
    3. Create message string                           │
       message = serviceId + timestamp + nonce + body  │
         │                                             │
    4. Compute HMAC-SHA256                             │
       signature = HMAC(                               │
         message,                                      │
         SHARED_SECRET                                 │
       ).digest('hex')                                 │
         │                                             │
    5. Send request with headers                       │
         │  POST /v1/wallets/withdraw                  │
         │  Headers:                                   │
         │    X-Service-Id: game-server                │
         │    X-Timestamp: 1704330000000               │
         │    X-Nonce: 550e8400-e29b-...               │
         │    X-Signature: a1b2c3d4e5f6...             │
         │    Content-Type: application/json           │
         │  Body: {"playerId":"player-123",...}        │
         │─────────────────────────────────────────────▶│
         │                                             │
         │                                        6. Validate headers exist
         │                                             │
         │                                        7. Verify service is known
         │                                           secret = services["game-server"]
         │                                             │
         │                                        8. Check timestamp freshness
         │                                           |now - timestamp| < 5 min
         │                                             │
         │                                        9. Check nonce not reused
         │                                           usedNonces.has(nonce) === false
         │                                             │
         │                                       10. Recompute signature
         │                                           expected = HMAC(
         │                                             serviceId + timestamp +
         │                                             nonce + body,
         │                                             secret
         │                                           )
         │                                             │
         │                                       11. Compare signatures
         │                                           (timing-safe)
         │                                             │
         │                                       12. Mark nonce as used
         │                                           usedNonces.set(nonce, timestamp)
         │                                             │
         │                                       13. Process transaction
         │                                             │
         │  { txId: "abc-123", balance: 900 }          │
         │◀─────────────────────────────────────────────│
```

### 3.2 Implementation Details

#### Header Requirements

```typescript
// Required headers for all protected endpoints
interface SignatureHeaders {
  'x-service-id': string;   // Identifier of calling service
  'x-timestamp': string;    // Unix timestamp in milliseconds
  'x-nonce': string;        // UUID v4 unique per request
  'x-signature': string;    // HMAC-SHA256 hex digest
}
```

#### Message Construction

```typescript
// The message to sign MUST be constructed in this exact order
const message = `${serviceId}${timestamp}${nonce}${JSON.stringify(body)}`;

// Example:
// serviceId  = "game-server"
// timestamp  = "1704330000000"
// nonce      = "550e8400-e29b-41d4-a716-446655440000"
// body       = '{"playerId":"p-1","amount":100,"reference":"g-1","idempotencyKey":"tx-1"}'
//
// message = "game-server1704330000000550e8400-e29b-41d4-a716-446655440000{\"playerId\":\"p-1\",...}"
```

#### Signature Generation (Client Side)

```typescript
import crypto from 'node:crypto';

function signRequest(
  serviceId: string,
  secret: string,
  body: object
): { timestamp: string; nonce: string; signature: string } {
  const timestamp = Date.now().toString();
  const nonce = crypto.randomUUID();
  const bodyString = JSON.stringify(body);

  const message = `${serviceId}${timestamp}${nonce}${bodyString}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  return { timestamp, nonce, signature };
}
```

#### Signature Verification (Server Side)

```typescript
// From services/cashier/src/plugins/verifySignature.ts

// Compute expected signature
const message = `${serviceId}${timestamp}${nonce}${body}`;
const expectedSignature = crypto
  .createHmac('sha256', sharedSecret)
  .update(message)
  .digest('hex');

// IMPORTANT: Use timing-safe comparison to prevent timing attacks
if (!crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(expectedSignature)
)) {
  return reply.code(401).send({
    error: 'Unauthorized',
    message: 'Invalid signature',
  });
}
```

### 3.3 Shared Secrets Configuration

```typescript
// services/cashier/src/app.ts

app.register(verifySignaturePlugin, {
  services: {
    'game-server': process.env.GAME_SERVER_SECRET || 'dev-game-server-secret',
    'web-portal': process.env.WEB_PORTAL_SECRET || 'dev-web-portal-secret',
  },
  timestampTolerance: 5 * 60 * 1000, // 5 minutes
});
```

```bash
# .env (NEVER commit to git)
GAME_SERVER_SECRET=your-256-bit-secret-key-here-minimum-32-chars
WEB_PORTAL_SECRET=another-256-bit-secret-key-here-minimum-32-chars
```

---

## 4. Replay Attack Prevention

### 4.1 What is a Replay Attack?

An attacker captures a valid signed request and sends it again to duplicate the transaction.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REPLAY ATTACK SCENARIO                               │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
  │ Game Server  │     │   Attacker   │     │  Cashier API │
  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
         │                    │                    │
    1. Original request       │                    │
         │────────────────────┼───────────────────▶│
         │                    │                    │  ✓ Transaction succeeds
         │                    │ INTERCEPT          │
         │                    │◀───────────────────│
         │                    │                    │
         │                    │ 2. Replay same     │
         │                    │    request         │
         │                    │───────────────────▶│
         │                    │                    │  ? Without protection:
         │                    │                    │    Transaction duplicated!
```

### 4.2 Protection Mechanisms

#### Mechanism 1: Timestamp Validation

```typescript
// Reject requests older than 5 minutes
const requestTime = parseInt(timestamp, 10);
const now = Date.now();
const timeDiff = Math.abs(now - requestTime);

if (timeDiff > timestampTolerance) {  // 5 * 60 * 1000 ms
  return reply.code(401).send({
    error: 'Unauthorized',
    message: 'Request timestamp expired',
  });
}
```

**Why this works:**
- Attacker must replay within 5 minutes
- Reduces the window of opportunity significantly

#### Mechanism 2: Nonce Tracking

```typescript
// In-memory nonce storage (use Redis in production)
const usedNonces = new Map<string, number>();

// Check if nonce was already used
if (usedNonces.has(nonce)) {
  return reply.code(401).send({
    error: 'Unauthorized',
    message: 'Nonce already used (replay attack detected)',
  });
}

// Mark nonce as used after successful validation
usedNonces.set(nonce, requestTime);

// Cleanup old nonces every 10 minutes
setInterval(() => {
  const now = Date.now();
  const expirationTime = 10 * 60 * 1000;

  for (const [nonce, timestamp] of usedNonces.entries()) {
    if (now - timestamp > expirationTime) {
      usedNonces.delete(nonce);
    }
  }
}, 10 * 60 * 1000);
```

**Why this works:**
- Each request must have a unique nonce (UUID)
- Same nonce cannot be used twice within the validity window
- Nonces are cleaned up after expiration to prevent memory bloat

### 4.3 Combined Protection Flow

```
Request arrives:
│
├── 1. Check timestamp freshness
│   ├── ✗ Expired → REJECT (can't replay old requests)
│   └── ✓ Valid → Continue
│
├── 2. Check nonce uniqueness
│   ├── ✗ Already used → REJECT (can't replay recent requests)
│   └── ✓ New nonce → Continue
│
├── 3. Verify HMAC signature
│   ├── ✗ Invalid → REJECT (can't forge requests)
│   └── ✓ Valid → Continue
│
├── 4. Mark nonce as used
│
└── 5. Process transaction
```

---

## 5. Idempotency Protection

### 5.1 The Double-Charge Problem

Network issues can cause requests to be retried, potentially duplicating transactions:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DOUBLE-CHARGE WITHOUT IDEMPOTENCY                         │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐                              ┌──────────────┐
  │ Game Server  │                              │  Cashier API │
  └──────┬───────┘                              └──────┬───────┘
         │                                             │
    1. Withdraw 100 coins                              │
         │────────────────────────────────────────────▶│
         │                                             │  ✓ Balance: 1000 → 900
         │                                             │
         │        ✗ Network timeout                    │
         │◀ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
         │                                             │
    2. Retry (same request)                            │
         │────────────────────────────────────────────▶│
         │                                             │  ✗ Balance: 900 → 800
         │                                             │    PLAYER OVERCHARGED!
```

### 5.2 Idempotency Key Solution

```typescript
// Each transaction includes a unique idempotencyKey
interface WithdrawRequest {
  playerId: string;
  amount: number;
  reference: string;
  idempotencyKey: string;  // e.g., "game-456-buyin-player-123"
}
```

```typescript
// From services/cashier/src/services/TransactionService.ts

async withdraw(request: WithdrawRequest): Promise<TransactionResult> {
  const { playerId, amount, reference, idempotencyKey } = request;

  // Check for existing transaction with same key
  const existingTx = await prisma.transaction.findUnique({
    where: { idempotencyKey },
  });

  if (existingTx) {
    // Return existing transaction result (no new charge)
    const currentBalance = await this.getBalance(playerId);
    return {
      txId: existingTx.id,
      balance: currentBalance,
      success: true,
    };
  }

  // Proceed with new transaction...
}
```

### 5.3 Idempotency Key Best Practices

```typescript
// GOOD: Deterministic, unique per logical operation
const idempotencyKey = `game-${gameId}-buyin-${playerId}`;
const idempotencyKey = `tournament-${tournamentId}-payout-${placement}`;
const idempotencyKey = `match-${matchId}-prize-${winnerId}`;

// BAD: Random (defeats the purpose)
const idempotencyKey = crypto.randomUUID();  // ✗ Different on retry!

// BAD: Too generic (collisions)
const idempotencyKey = `withdraw-${playerId}`;  // ✗ All withdraws collide!
```

### 5.4 Database Enforcement

```prisma
// services/cashier/prisma/schema.prisma

model Transaction {
  id             String   @id @default(uuid())
  playerId       String
  amount         Decimal  @db.Decimal(10, 2)
  direction      String   // DEBIT or CREDIT
  reference      String
  idempotencyKey String   @unique  // ← Enforced at DB level
  timestamp      DateTime @default(now())

  @@index([playerId])
  @@index([idempotencyKey])
}
```

---

## 6. Transaction Atomicity

### 6.1 The Problem: Partial Updates

Without atomicity, a crash mid-transaction could leave data inconsistent:

```
1. Create transaction record ✓
2. Update balance          ✗ CRASH

Result: Transaction exists but balance unchanged = audit mismatch
```

### 6.2 Solution: Database Transactions

```typescript
// From services/cashier/src/services/TransactionService.ts

const result = await prisma.$transaction(async (tx) => {
  // All operations in this block succeed or fail together

  // 1. Get current balance
  const balance = await tx.balance.findUnique({
    where: { playerId },
  });

  // 2. Validate funds
  if (balance.amount.toNumber() - amount < 0) {
    throw new Error('INSUFFICIENT_FUNDS');
  }

  // 3. Create ledger entry
  const transaction = await tx.transaction.create({
    data: {
      playerId,
      amount: new Prisma.Decimal(amount),
      direction: 'DEBIT',
      reference,
      idempotencyKey,
    },
  });

  // 4. Update balance
  await tx.balance.update({
    where: { playerId },
    data: { amount: new Prisma.Decimal(newBalance) },
  });

  return { txId: transaction.id, balance: newBalance };
});
// If any step fails, ALL changes are rolled back
```

---

## 7. Complete Security Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE TRANSACTION SECURITY FLOW                        │
└─────────────────────────────────────────────────────────────────────────────┘

 User         Web Portal       Keycloak        Game Server       Cashier
   │              │               │                │                │
   │ 1. Login     │               │                │                │
   │─────────────▶│               │                │                │
   │              │──────────────▶│                │                │
   │              │ OIDC + PKCE   │                │                │
   │              │◀──────────────│                │                │
   │              │  JWT Token    │                │                │
   │◀─────────────│               │                │                │
   │  Authenticated                                │                │
   │              │                                │                │
   │ 2. Join Game │                                │                │
   │─────────────▶│                                │                │
   │              │── Create Session ─────────────▶│                │
   │              │◀── sessionToken ──────────────│                │
   │◀─────────────│                                │                │
   │  sessionToken│                                │                │
   │              │                                │                │
   │ 3. Connect WS (sessionToken)                  │                │
   │────────────────────────────────────────────────▶               │
   │              │                                │                │
   │ 4. Game Actions (intentions only)             │                │
   │────────────────────────────────────────────────▶               │
   │              │                                │                │
   │              │                     5. Game ends, server        │
   │              │                        determines winner        │
   │              │                                │                │
   │              │                     6. Sign request:            │
   │              │                        - Generate nonce         │
   │              │                        - Get timestamp          │
   │              │                        - HMAC(msg, secret)      │
   │              │                                │                │
   │              │                     7. POST /v1/wallets/deposit │
   │              │                        Headers:                 │
   │              │                          X-Service-Id           │
   │              │                          X-Timestamp            │
   │              │                          X-Nonce                │
   │              │                          X-Signature            │
   │              │                                │───────────────▶│
   │              │                                │                │
   │              │                                │    8. Validate:
   │              │                                │       - Headers exist
   │              │                                │       - Service known
   │              │                                │       - Timestamp fresh
   │              │                                │       - Nonce unique
   │              │                                │       - Signature valid
   │              │                                │       - Idempotency check
   │              │                                │
   │              │                                │    9. Execute atomic:
   │              │                                │       - Create ledger
   │              │                                │       - Update balance
   │              │                                │
   │              │                                │◀──────────────│
   │              │                     10. { txId, balance }       │
   │              │                                │                │
   │◀─────────────────────────────────────────────│                │
   │  "You won! New balance: 1100"                 │                │
```

---

## 8. Relationship: Web Portal ↔ Keycloak ↔ Cashier

### 8.1 Authentication vs Authorization

| Concept | Service | Purpose |
|---------|---------|---------|
| **Authentication** | Keycloak | "Who is the user?" |
| **Session** | Game Server | "Is this user in this game?" |
| **Authorization** | Game Server | "Can this user perform this action?" |
| **Transaction** | Cashier | "Execute the financial operation" |

### 8.2 JWT Token Flow (Users)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER AUTHENTICATION FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

1. User logs in via Web Portal
   └── Portal redirects to Keycloak
       └── User enters credentials
           └── Keycloak validates
               └── Returns JWT (access_token)

2. JWT contains:
   {
     "sub": "player-uuid-123",      ← playerId for Cashier
     "preferred_username": "gamer1",
     "email": "gamer1@example.com",
     "realm_access": {
       "roles": ["player"]
     }
   }

3. Portal stores JWT in memory (not localStorage - XSS protection)

4. Portal creates game session:
   POST /api/sessions
   Authorization: Bearer <JWT>

   Returns: { sessionToken: "sess_abc123" }

5. Game client connects to Game Server:
   WebSocket + sessionToken

   ✗ JWT is NOT sent to Game Server
   ✓ Only sessionToken (short-lived, game-scoped)
```

### 8.3 HMAC Flow (Services)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SERVICE-TO-SERVICE AUTHENTICATION                       │
└─────────────────────────────────────────────────────────────────────────────┘

IMPORTANT: Cashier does NOT verify JWT tokens!
           Cashier trusts signed requests from known services.

Why?
├── Cashier is internal-only (not user-facing)
├── Game Server already validated the user's session
├── HMAC provides stronger service-level trust
└── Simplifies Cashier (no Keycloak dependency)

Flow:
1. Game Server decides player won
2. Game Server signs request with shared secret
3. Cashier verifies signature
4. Cashier trusts the playerId in the request body
```

### 8.4 Security Boundaries

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SECURITY BOUNDARIES                                │
└─────────────────────────────────────────────────────────────────────────────┘

  INTERNET BOUNDARY                    INTERNAL NETWORK
  ─────────────────────────────────────────────────────────────────────────

  ┌────────────────────────┐          ┌────────────────────────────────────┐
  │   PUBLIC ZONE          │          │         TRUSTED ZONE               │
  │   ──────────────       │          │         ────────────               │
  │                        │          │                                    │
  │   • Web Portal         │          │   • Game Server                    │
  │   • Keycloak login     │          │   • Cashier API                    │
  │                        │          │   • PostgreSQL                     │
  │   Protected by:        │          │                                    │
  │   • HTTPS/TLS          │          │   Protected by:                    │
  │   • JWT (OIDC)         │          │   • Network isolation              │
  │   • PKCE               │          │   • HMAC signatures                │
  │   • CORS               │          │   • Shared secrets                 │
  │                        │          │   • No public exposure             │
  └────────────────────────┘          └────────────────────────────────────┘

  Users CAN:                          Users CANNOT:
  ├── Login/Register                  ├── Call Cashier directly
  ├── View their balance              ├── Modify their balance
  ├── Join games                      ├── Forge transactions
  └── Play (send intentions)          └── Access internal services
```

---

## 9. Attack Scenarios & Mitigations

### 9.1 Scenario: Direct API Call

```
Attacker: POST https://cashier.linkwars.com/v1/wallets/deposit
          { "playerId": "attacker-id", "amount": 1000000 }

Result: ✗ BLOCKED

Why:
1. Cashier is not exposed to internet
2. Even if reached, missing signature headers → 401
3. Even if headers present, signature invalid → 401
```

### 9.2 Scenario: Stolen Signature

```
Attacker captures valid request and tries to reuse it.

Result: ✗ BLOCKED

Why:
1. Timestamp expires after 5 minutes
2. Nonce already marked as used
3. Can't modify body (signature would be invalid)
```

### 9.3 Scenario: Man-in-the-Middle

```
Attacker intercepts request and modifies amount.

Original: { "amount": 100 }
Modified: { "amount": 10000 }

Result: ✗ BLOCKED

Why:
1. Signature includes body hash
2. Modified body = different signature
3. Attacker doesn't know secret = can't re-sign
```

### 9.4 Scenario: Brute Force Secret

```
Attacker tries to guess the shared secret.

Result: ✗ IMPRACTICAL

Why:
1. 256-bit secret = 2^256 possibilities
2. HMAC-SHA256 is cryptographically secure
3. Rate limiting (future) would block attempts
4. Nonce requirement prevents parallel attempts
```

### 9.5 Scenario: Internal Compromise

```
Attacker gains access to Game Server.

Result: ⚠️ PARTIALLY MITIGATED

Mitigations:
1. Each transaction requires valid game context
2. Ledger provides audit trail
3. Idempotency prevents mass duplication
4. Monitoring (future) would detect anomalies

Recommendations:
1. Rotate secrets periodically
2. Use separate secrets per service
3. Implement transaction limits
4. Add anomaly detection
```

---

## 10. Production Recommendations

### 10.1 Infrastructure

```yaml
# Recommended production setup

Network:
  - Cashier in private subnet (no public IP)
  - Only Game Server can reach Cashier
  - Use VPC peering or service mesh

Secrets:
  - Store in Vault/AWS Secrets Manager
  - Rotate every 90 days
  - Different secrets per environment

Database:
  - Enable SSL connections
  - Restrict to Cashier IP only
  - Regular backups
  - Point-in-time recovery enabled
```

### 10.2 Monitoring & Alerting

```yaml
Alerts:
  - Signature validation failures > 10/min
  - Replay attack detections > 5/min
  - Unusual transaction volumes
  - Large single transactions
  - Rapid balance changes

Logging:
  - All transaction attempts (success/fail)
  - Signature validation results
  - Source service identification
  - Timestamps for audit trail
```

### 10.3 Future Enhancements

| Enhancement | Purpose | Priority |
|-------------|---------|----------|
| Redis nonce storage | Scalability across instances | High |
| Rate limiting | Prevent abuse | High |
| Transaction limits | Prevent large fraud | Medium |
| Anomaly detection | Detect unusual patterns | Medium |
| Secret rotation API | Automated key rotation | Low |
| Multi-signature | Require 2+ services for large amounts | Low |

---

## 11. Quick Reference

### 11.1 Required Headers

```
X-Service-Id: game-server
X-Timestamp: 1704330000000
X-Nonce: 550e8400-e29b-41d4-a716-446655440000
X-Signature: a1b2c3d4e5f6789...
Content-Type: application/json
```

### 11.2 Signature Algorithm

```
signature = HMAC-SHA256(
  serviceId + timestamp + nonce + JSON.stringify(body),
  sharedSecret
).digest('hex')
```

### 11.3 Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 401 | Missing required signature headers | Headers not provided |
| 401 | Unknown service ID | Service not in whitelist |
| 401 | Request timestamp expired | Request too old |
| 401 | Nonce already used | Replay attack detected |
| 401 | Invalid signature | Signature mismatch |
| 400 | Insufficient funds | Balance too low |
| 400 | Amount must be positive | Invalid amount |

---

## 12. Conclusion

The Cashier API security model ensures that:

1. **Users cannot access the API directly** - Internal network only
2. **Only authorized services can call it** - HMAC-SHA256 signatures
3. **Requests cannot be replayed** - Timestamp + nonce validation
4. **Transactions are never duplicated** - Idempotency keys
5. **Data integrity is guaranteed** - Atomic database transactions
6. **Full audit trail exists** - Immutable ledger

This defense-in-depth approach protects against both external attacks and internal errors, ensuring the integrity of the game's economy.
