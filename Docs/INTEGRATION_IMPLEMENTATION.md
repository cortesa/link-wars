# Integration Implementation Notes

This document collects **implementation-level** snippets referenced by the flow diagrams.
It is not the source of truth for architecture; see `Docs/GAME_ARCHITECTURE.md`.

---

## 1. Game Server Session API Implementation

```typescript
// game-server/src/api/sessions.ts

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const sessions = new Map<string, GameSession>();

// Portal authentication middleware
function authenticatePortal(req: Request, res: Response, next: NextFunction) {
  const portalKey = req.headers['x-portal-key'];

  if (portalKey !== process.env.PORTAL_SECRET) {
    return res.status(401).json({ error: 'Invalid portal key' });
  }

  next();
}

// POST /api/sessions - Create new game session
router.post('/sessions', authenticatePortal, (req, res) => {
  const { playerId, playerName, gameId, roomId, cashier } = req.body;

  // Validate required fields
  if (!playerId || !playerName || !gameId || !cashier) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Generate session token
  const sessionToken = `sess_${uuidv4()}`;
  const now = Date.now();

  // Create session
  const session: GameSession = {
    sessionToken,
    playerId,
    playerName,
    gameId,
    roomId,
    cashier: {
      endpoint: cashier.endpoint,
      serviceId: cashier.serviceId,
      signingSecret: cashier.signingSecret,
      playerId: cashier.playerId,
    },
    createdAt: now,
    expiresAt: now + 60 * 60 * 1000, // 1 hour
    status: 'active',
  };

  // Store session
  sessions.set(sessionToken, session);

  // Schedule cleanup
  setTimeout(() => {
    const s = sessions.get(sessionToken);
    if (s && s.status === 'active') {
      s.status = 'expired';
    }
  }, 60 * 60 * 1000);

  res.json({
    sessionToken,
    expiresAt: session.expiresAt,
    wsUrl: process.env.WS_URL || 'ws://localhost:2567',
  });
});

// GET /api/sessions/:token - Validate session
router.get('/sessions/:token', (req, res) => {
  const session = sessions.get(req.params.token);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.status !== 'active' || Date.now() > session.expiresAt) {
    return res.status(410).json({ error: 'Session expired' });
  }

  res.json({
    playerId: session.playerId,
    playerName: session.playerName,
    gameId: session.gameId,
    status: session.status,
  });
});

// DELETE /api/sessions/:token - End session
router.delete('/sessions/:token', authenticatePortal, (req, res) => {
  const session = sessions.get(req.params.token);

  if (session) {
    session.status = 'ended';
  }

  res.json({ success: true });
});

// Internal function for Colyseus rooms to get session
export function getSession(token: string): GameSession | null {
  const session = sessions.get(token);

  if (!session || session.status !== 'active' || Date.now() > session.expiresAt) {
    return null;
  }

  return session;
}

export default router;
```

---

## 2. Colyseus Room Authentication

```typescript
// game-server/src/rooms/MatchRoom.ts

import { Room, Client } from '@colyseus/core';
import { getSession } from '../api/sessions';
import { CashierClient } from '../services/CashierClient';

interface JoinOptions {
  sessionToken: string;
  roomId?: string;
}

interface PlayerData {
  sessionToken: string;
  playerId: string;
  playerName: string;
  cashierClient: CashierClient;
}

export class MatchRoom extends Room {
  private buyIn: number = 100; // Room buy-in amount

  // Called before onJoin - validates the session
  async onAuth(client: Client, options: JoinOptions): Promise<PlayerData> {
    const { sessionToken } = options;

    if (!sessionToken) {
      throw new Error('No session token provided');
    }

    // Get session from session store
    const session = getSession(sessionToken);

    if (!session) {
      throw new Error('Invalid or expired session');
    }

    // Create Cashier client with session's cashier config
    const cashierClient = new CashierClient(
      session.cashier.endpoint,
      session.cashier.serviceId,
      session.cashier.signingSecret
    );

    return {
      sessionToken,
      playerId: session.playerId,
      playerName: session.playerName,
      cashierClient,
    };
  }

  async onJoin(client: Client, options: JoinOptions, player: PlayerData) {
    console.log(`${player.playerName} (${player.playerId}) joining...`);

    // Charge buy-in via Cashier
    try {
      const result = await player.cashierClient.withdraw(
        player.playerId,
        this.buyIn,
        `buy-in:${this.roomId}`
      );

      console.log(`Buy-in charged: txId=${result.txId}`);
    } catch (error) {
      // Insufficient balance or Cashier error
      console.error(`Buy-in failed for ${player.playerId}:`, error.message);
      throw new Error('Failed to charge buy-in');
    }

    // Add player to game state
    this.state.players.set(client.sessionId, {
      id: player.playerId,
      name: player.playerName,
      // ... other player state
    });

    // Store cashier client for later payouts
    client.userData = {
      cashierClient: player.cashierClient,
      playerId: player.playerId,
    };
  }

  async onLeave(client: Client, consented: boolean) {
    // Handle disconnection/forfeit
    // Possibly refund if game hasn't started
  }

  async distributePayouts(placements: Array<{ playerId: string; amount: number }>) {
    // Get any client's cashier config (they all have the same endpoint)
    const anyClient = Array.from(this.clients.values())[0];
    const cashierClient = anyClient?.userData?.cashierClient;

    if (!cashierClient) {
      console.error('No cashier client available for payouts');
      return;
    }

    try {
      for (const payout of placements) {
        await cashierClient.deposit(
          payout.playerId,
          payout.amount,
          `payout:${this.roomId}`
        );
      }

      console.log('Payouts distributed successfully');
    } catch (error) {
      console.error('Payout failed:', error.message);
      // Handle payout failure (retry logic, etc.)
    }
  }
}
```

---

## 3. Game Client Implementation

```typescript
// game-client/src/main.ts

import * as Colyseus from 'colyseus.js';

interface GameParams {
  sessionToken: string;
  wsUrl: string;
  gameId: string;
  roomId?: string;
}

// Parse URL parameters
function getGameParams(): GameParams {
  const params = new URLSearchParams(window.location.search);

  const sessionToken = params.get('sessionToken');
  const wsUrl = params.get('wsUrl');
  const gameId = params.get('gameId');
  const roomId = params.get('roomId') || undefined;

  if (!sessionToken || !wsUrl || !gameId) {
    throw new Error('Missing required URL parameters');
  }

  return { sessionToken, wsUrl, gameId, roomId };
}

// Initialize game
async function initGame() {
  try {
    const params = getGameParams();

    console.log('Connecting to game server...');
    console.log('Game:', params.gameId);
    console.log('Room:', params.roomId || 'auto-match');

    // Connect to Colyseus
    const client = new Colyseus.Client(params.wsUrl);

    // Join or create room
    const room = await client.joinOrCreate(params.gameId, {
      sessionToken: params.sessionToken,
      roomId: params.roomId,
    });

    console.log('Joined room:', room.id);

    // Initialize Phaser game with room
    startPhaserGame(room);

  } catch (error) {
    console.error('Failed to connect:', error.message);
    showErrorScreen(error.message);
  }
}

function showErrorScreen(message: string) {
  // Display error to user
  // Could send message to parent portal via postMessage
  window.parent.postMessage({
    type: 'GAME_ERROR',
    error: message,
  }, '*');
}

// Start on load
window.addEventListener('load', initGame);
```

---

## 4. Portal Game Page Implementation

```typescript
// web-portal/src/pages/GamePage.tsx

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { gameServerApi } from '../api/gameServer';

interface GameConfig {
  id: string;
  name: string;
  clientUrl: string;      // e.g., "http://localhost:5174"
  serverUrl: string;      // e.g., "ws://localhost:2567"
  buyIn?: number;
}

// Game catalog (could come from API)
const GAMES: Record<string, GameConfig> = {
  'tower-wars': {
    id: 'tower-wars',
    name: 'Tower Wars',
    clientUrl: import.meta.env.VITE_TOWER_WARS_CLIENT_URL,
    serverUrl: import.meta.env.VITE_TOWER_WARS_SERVER_URL,
    buyIn: 100,
  },
};

export function GamePage() {
  const { gameId, roomId } = useParams();
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function createGameSession() {
      if (!gameId || !user) return;

      const game = GAMES[gameId];
      if (!game) {
        setError('Game not found');
        setLoading(false);
        return;
      }

      try {
        // Create session on game server
        const session = await gameServerApi.createSession({
          playerId: user.id,           // Keycloak sub
          playerName: user.username,
          gameId: game.id,
          roomId,
          cashier: {
            endpoint: import.meta.env.VITE_CASHIER_URL,
            serviceId: 'game-server',
            signingSecret: import.meta.env.VITE_CASHIER_SECRET,
            playerId: user.id,
          },
        });

        // Build iframe URL with session token
        const url = new URL(`${game.clientUrl}/game.html`);
        url.searchParams.set('sessionToken', session.sessionToken);
        url.searchParams.set('wsUrl', session.wsUrl);
        url.searchParams.set('gameId', game.id);
        if (roomId) {
          url.searchParams.set('roomId', roomId);
        }

        setIframeSrc(url.toString());
        setLoading(false);

      } catch (err) {
        console.error('Failed to create game session:', err);
        setError('Failed to start game. Please try again.');
        setLoading(false);
      }
    }

    createGameSession();
  }, [gameId, roomId, user]);

  // Listen for messages from game iframe
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Validate origin (should be game client)
      const game = GAMES[gameId!];
      if (!game || !event.origin.startsWith(new URL(game.clientUrl).origin)) {
        return;
      }

      switch (event.data?.type) {
        case 'GAME_ERROR':
          setError(event.data.error);
          break;

        case 'GAME_OVER':
          // Handle game end (show results, navigate, etc.)
          console.log('Game over:', event.data);
          break;

        case 'REQUEST_CLOSE':
          navigate('/');
          break;
      }
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [gameId, navigate]);

  if (loading) {
    return <div className="loading">Loading game...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')}>Back to Lobby</button>
      </div>
    );
  }

  return (
    <div className="game-container">
      <iframe
        ref={iframeRef}
        src={iframeSrc!}
        title={GAMES[gameId!]?.name}
        allow="autoplay; fullscreen"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
}
```

---

## 5. Cashier Client (Game Server)

```typescript
// game-server/src/services/CashierClient.ts

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

interface TxResult {
  success: boolean;
  txId: string;
  newBalance: number;
}

export class CashierError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'CashierError';
  }
}

export class CashierClient {
  constructor(
    private readonly endpoint: string,
    private readonly serviceId: string,
    private readonly signingSecret: string
  ) {}

  // WITHDRAW: Take money from player (buy-in)
  async withdraw(playerId: string, amount: number, reference: string): Promise<TxResult> {
    return this.request('/v1/wallets/withdraw', {
      playerId,
      amount,
      reference,
    });
  }

  // DEPOSIT: Give money to player (payout, refund)
  async deposit(playerId: string, amount: number, reference: string): Promise<TxResult> {
    return this.request('/v1/wallets/deposit', {
      playerId,
      amount,
      reference,
    });
  }

  // Optional: check balance
  async getBalance(playerId: string): Promise<number> {
    const res = await fetch(`${this.endpoint}/v1/wallets/${playerId}/balance`);
    return (await res.json()).balance;
  }

  private async request(path: string, payload: object): Promise<TxResult> {
    const timestamp = Date.now();
    const nonce = uuidv4();
    const idempotencyKey = uuidv4();
    const fullPayload = { ...payload, idempotencyKey };

    const signature = this.sign(fullPayload, timestamp, nonce);

    const response = await fetch(`${this.endpoint}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Id': this.serviceId,
        'X-Timestamp': timestamp.toString(),
        'X-Nonce': nonce,
        'X-Signature': signature,
      },
      body: JSON.stringify(fullPayload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new CashierError(response.status, error.message);
    }

    return response.json();
  }

  private sign(payload: object, timestamp: number, nonce: string): string {
    const data = JSON.stringify({ ...payload, timestamp, nonce });
    return crypto.createHmac('sha256', this.signingSecret).update(data).digest('hex');
  }
}
```

---

## 6. Cashier Signature Verification

```typescript
// cashier/src/middleware/verifySignature.ts

import crypto from 'crypto';

const SERVICE_SECRETS: Record<string, string> = {
  'game-server': process.env.GAME_SERVER_SECRET!,
};

const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
const usedNonces = new Map<string, number>();

// Clean old nonces periodically
setInterval(() => {
  const cutoff = Date.now() - TIMESTAMP_TOLERANCE_MS * 2;
  for (const [nonce, timestamp] of usedNonces.entries()) {
    if (timestamp < cutoff) {
      usedNonces.delete(nonce);
    }
  }
}, 60 * 1000);

export function verifySignature(req: Request, res: Response, next: NextFunction) {
  const serviceId = req.headers['x-service-id'] as string;
  const timestamp = parseInt(req.headers['x-timestamp'] as string, 10);
  const nonce = req.headers['x-nonce'] as string;
  const signature = req.headers['x-signature'] as string;

  // 1. Validate service ID
  const secret = SERVICE_SECRETS[serviceId];
  if (!secret) {
    return res.status(401).json({ error: 'Unknown service' });
  }

  // 2. Validate timestamp (prevent replay attacks)
  const now = Date.now();
  if (Math.abs(now - timestamp) > TIMESTAMP_TOLERANCE_MS) {
    return res.status(401).json({ error: 'Request expired' });
  }

  // 3. Validate nonce (prevent duplicate requests)
  if (usedNonces.has(nonce)) {
    return res.status(409).json({ error: 'Duplicate request' });
  }
  usedNonces.set(nonce, timestamp);

  // 4. Verify signature
  const payload = { ...req.body, timestamp, nonce };
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}
```

---

## 7. Game Events & Cashier Operations

The game-server handles all player state changes and communicates with Cashier accordingly.

### Player States & Financial Rules

| State | Trigger | Cashier Action | Pool Effect |
|-------|---------|----------------|-------------|
| **Eliminated** | All towers conquered | None | Buy-in stays in pool |
| **Disconnected** | 30s+ without connection | Refund 25% of buy-in | 75% stays in pool |
| **Forfeit** | Voluntary quit | None | Buy-in stays in pool |
| **Winner (1st)** | Last standing or most soldiers | Payout 70% of final pool | - |
| **Runner-up (2nd)** | Second place | Payout 30% of final pool | - |

### Prize Distribution Formula

```typescript
// game-server/src/services/PrizeCalculator.ts

interface PlayerResult {
  playerId: string;
  placement: number;         // 1 = winner, 2 = runner-up, etc.
  status: 'winner' | 'runner_up' | 'eliminated' | 'disconnected' | 'forfeit';
  buyIn: number;
  refund: number;            // Only for disconnected (25%)
  prize: number;             // Final payout
}

const PRIZE_CONFIG = {
  WINNER_SHARE: 0.70,
  RUNNER_UP_SHARE: 0.30,
  DISCONNECT_REFUND: 0.25,
};

export function calculatePrizes(
  players: Array<{ playerId: string; buyIn: number; status: string; placement: number }>
): PlayerResult[] {
  // Step 1: Calculate initial pool
  const initialPool = players.reduce((sum, p) => sum + p.buyIn, 0);

  // Step 2: Process disconnected players (they get 25% refund, 75% stays in pool)
  let finalPool = initialPool;
  const results: PlayerResult[] = players.map(p => {
    if (p.status === 'disconnected') {
      const refund = Math.floor(p.buyIn * PRIZE_CONFIG.DISCONNECT_REFUND);
      finalPool -= refund; // Remove refund from pool
      return {
        playerId: p.playerId,
        placement: p.placement,
        status: 'disconnected' as const,
        buyIn: p.buyIn,
        refund,
        prize: 0,
      };
    }
    return {
      playerId: p.playerId,
      placement: p.placement,
      status: p.status as any,
      buyIn: p.buyIn,
      refund: 0,
      prize: 0,
    };
  });

  // Step 3: Distribute prizes to winner and runner-up
  const winner = results.find(r => r.placement === 1);
  const runnerUp = results.find(r => r.placement === 2);

  if (winner) {
    winner.status = 'winner';
    winner.prize = Math.floor(finalPool * PRIZE_CONFIG.WINNER_SHARE);
  }

  if (runnerUp) {
    runnerUp.status = 'runner_up';
    runnerUp.prize = Math.floor(finalPool * PRIZE_CONFIG.RUNNER_UP_SHARE);
  }

  // Step 4: Handle rounding (give remainder to winner)
  const totalDistributed = results.reduce((sum, r) => sum + r.prize + r.refund, 0);
  const remainder = initialPool - totalDistributed;
  if (winner && remainder > 0) {
    winner.prize += remainder;
  }

  return results;
}
```

---

## 8. Game Server Event Handlers

```typescript
// game-server/src/rooms/MatchRoom.ts

import { Room, Client } from '@colyseus/core';
import { CashierClient } from '../services/CashierClient';
import { calculatePrizes } from '../services/PrizeCalculator';

interface PlayerState {
  playerId: string;
  playerName: string;
  status: 'active' | 'eliminated' | 'disconnected' | 'forfeit';
  buyIn: number;
  disconnectTimer?: NodeJS.Timeout;
  cashierClient: CashierClient;
}

export class MatchRoom extends Room {
  private players = new Map<string, PlayerState>();
  private buyIn: number = 100;
  private gameStarted: boolean = false;
  private gameEnded: boolean = false;

  // ... onCreate, onAuth, onJoin from previous sections ...

  //──────────────────────────────────────────────────────────────
  // PLAYER ELIMINATION (all towers conquered)
  //──────────────────────────────────────────────────────────────
  private async onPlayerEliminated(client: Client) {
    const player = this.players.get(client.sessionId);
    if (!player || player.status !== 'active') return;

    player.status = 'eliminated';

    console.log(`${player.playerName} eliminated - loses ${player.buyIn} coins`);

    // No cashier action - buy-in stays in pool
    // Broadcast elimination to all clients
    this.broadcast('player_eliminated', {
      playerId: player.playerId,
      playerName: player.playerName,
    });

    // Check if game should end
    this.checkGameEnd();
  }

  //──────────────────────────────────────────────────────────────
  // PLAYER DISCONNECT (30s timeout → partial refund)
  //──────────────────────────────────────────────────────────────
  async onLeave(client: Client, consented: boolean) {
    const player = this.players.get(client.sessionId);
    if (!player) return;

    if (!this.gameStarted) {
      // Game hasn't started - full refund
      await this.refundPlayer(player, player.buyIn, 'game_not_started');
      this.players.delete(client.sessionId);
      return;
    }

    if (consented) {
      // Voluntary forfeit - no refund
      player.status = 'forfeit';
      console.log(`${player.playerName} forfeited - loses ${player.buyIn} coins`);
      this.neutralizePlayerTowers(player.playerId);
      this.checkGameEnd();
      return;
    }

    // Unexpected disconnect - start 30s timer
    console.log(`${player.playerName} disconnected - waiting 30s for reconnect`);

    player.disconnectTimer = setTimeout(async () => {
      if (player.status === 'active') {
        player.status = 'disconnected';

        // 25% refund
        const refundAmount = Math.floor(player.buyIn * 0.25);
        await this.refundPlayer(player, refundAmount, 'disconnect_timeout');

        console.log(`${player.playerName} disconnect confirmed - refunded ${refundAmount} coins`);

        // Towers become neutral
        this.neutralizePlayerTowers(player.playerId);

        this.broadcast('player_disconnected', {
          playerId: player.playerId,
          playerName: player.playerName,
          refund: refundAmount,
        });

        this.checkGameEnd();
      }
    }, 30 * 1000); // 30 seconds

    // Allow reconnection
    try {
      await this.allowReconnection(client, 30);
      // Player reconnected - cancel timer
      if (player.disconnectTimer) {
        clearTimeout(player.disconnectTimer);
        player.disconnectTimer = undefined;
      }
      console.log(`${player.playerName} reconnected`);
    } catch {
      // Reconnection failed - timer will handle it
    }
  }

  //──────────────────────────────────────────────────────────────
  // GAME END (victory or timeout)
  //──────────────────────────────────────────────────────────────
  private async checkGameEnd() {
    if (this.gameEnded) return;

    const activePlayers = Array.from(this.players.values())
      .filter(p => p.status === 'active');

    // Victory: only one player left
    if (activePlayers.length === 1) {
      await this.endGame('conquest');
      return;
    }

    // Victory: no players left (edge case)
    if (activePlayers.length === 0) {
      await this.endGame('draw');
      return;
    }
  }

  private async onTimeout() {
    // Called when 10 minute timer expires
    await this.endGame('timeout');
  }

  private async endGame(reason: 'conquest' | 'timeout' | 'draw') {
    if (this.gameEnded) return;
    this.gameEnded = true;

    console.log(`Game ended: ${reason}`);

    // Calculate placements
    const placements = this.calculatePlacements(reason);

    // Calculate prizes
    const results = calculatePrizes(
      placements.map(p => ({
        playerId: p.playerId,
        buyIn: p.buyIn,
        status: p.status,
        placement: p.placement,
      }))
    );

    // Execute Cashier operations
    await this.executeCashierOperations(results);

    // Broadcast results to all clients
    this.broadcast('game_over', {
      reason,
      results: results.map(r => ({
        playerId: r.playerId,
        placement: r.placement,
        status: r.status,
        prize: r.prize,
        refund: r.refund,
      })),
    });

    // Notify portal via postMessage (through clients)
    this.broadcast('portal_event', {
      type: 'GAME_OVER',
      data: { reason, results },
    });

    // Close room after delay
    setTimeout(() => this.disconnect(), 10000);
  }

  //──────────────────────────────────────────────────────────────
  // PLACEMENT CALCULATION
  //──────────────────────────────────────────────────────────────
  private calculatePlacements(reason: 'conquest' | 'timeout' | 'draw') {
    const allPlayers = Array.from(this.players.values());

    if (reason === 'conquest') {
      // Last player standing is winner
      const winner = allPlayers.find(p => p.status === 'active');
      const others = allPlayers.filter(p => p !== winner);

      // Sort others by elimination order (last eliminated = runner-up)
      // For simplicity, just assign placements
      let placement = 1;
      return [
        { ...winner!, placement: placement++ },
        ...others.map(p => ({ ...p, placement: placement++ })),
      ];
    }

    if (reason === 'timeout') {
      // Sort by soldier count, then by tower count
      const activePlayers = allPlayers
        .filter(p => p.status === 'active')
        .map(p => ({
          ...p,
          soldiers: this.countPlayerSoldiers(p.playerId),
          towers: this.countPlayerTowers(p.playerId),
        }))
        .sort((a, b) => {
          if (b.soldiers !== a.soldiers) return b.soldiers - a.soldiers;
          return b.towers - a.towers;
        });

      const inactivePlayers = allPlayers.filter(p => p.status !== 'active');

      let placement = 1;
      return [
        ...activePlayers.map(p => ({ ...p, placement: placement++ })),
        ...inactivePlayers.map(p => ({ ...p, placement: placement++ })),
      ];
    }

    // Draw - no winner
    return allPlayers.map((p, i) => ({ ...p, placement: i + 1 }));
  }

  //──────────────────────────────────────────────────────────────
  // CASHIER OPERATIONS
  //──────────────────────────────────────────────────────────────
  private async executeCashierOperations(results: PlayerResult[]) {
    // Get a cashier client (all players have same endpoint)
    const anyPlayer = Array.from(this.players.values())[0];
    const cashierClient = anyPlayer?.cashierClient;

    if (!cashierClient) {
      console.error('No cashier client available');
      return;
    }

    // Execute refunds (for disconnected players)
    const refunds = results.filter(r => r.refund > 0);
    for (const refund of refunds) {
      try {
        await cashierClient.deposit(
          refund.playerId,
          refund.refund,
          `refund:${this.roomId}:disconnect`
        );
        console.log(`Refunded ${refund.refund} to ${refund.playerId}`);
      } catch (error) {
        console.error(`Refund failed for ${refund.playerId}:`, error);
      }
    }

    // Execute payouts (for winner and runner-up)
    const payouts = results
      .filter(r => r.prize > 0)
      .map(r => ({ playerId: r.playerId, amount: r.prize }));

    if (payouts.length > 0) {
      try {
        for (const payout of payouts) {
          await cashierClient.deposit(
            payout.playerId,
            payout.amount,
            `payout:${this.roomId}`
          );
        }
        console.log('Payouts distributed:', payouts);
      } catch (error) {
        console.error('Payout failed:', error);
        // TODO: Retry logic or manual intervention
      }
    }
  }

  //──────────────────────────────────────────────────────────────
  // HELPER METHODS
  //──────────────────────────────────────────────────────────────
  private async refundPlayer(player: PlayerState, amount: number, reason: string) {
    try {
      await player.cashierClient.deposit(
        player.playerId,
        amount,
        `refund:${this.roomId}:${reason}`
      );
      console.log(`Refunded ${amount} to ${player.playerName}: ${reason}`);
    } catch (error) {
      console.error(`Refund failed for ${player.playerName}:`, error);
    }
  }

  private neutralizePlayerTowers(playerId: string) {
    // Set all player's towers to neutral
    this.state.towers.forEach(tower => {
      if (tower.owner === playerId) {
        tower.owner = null;
        tower.generationRate = 0; // Neutral towers don't generate
      }
    });
  }

  private countPlayerSoldiers(playerId: string): number {
    let total = 0;
    // Count soldiers in towers
    this.state.towers.forEach(tower => {
      if (tower.owner === playerId) {
        total += tower.soldiers;
      }
    });
    // Count soldiers in transit
    this.state.troops.forEach(troop => {
      if (troop.owner === playerId) {
        total += troop.soldiers;
      }
    });
    return total;
  }

  private countPlayerTowers(playerId: string): number {
    let count = 0;
    this.state.towers.forEach(tower => {
      if (tower.owner === playerId) {
        count++;
      }
    });
    return count;
  }
}
```
