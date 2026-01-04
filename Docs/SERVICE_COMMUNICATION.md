# Service Communication & Protocols

This document defines how information flows between the different services in the Link Wars ecosystem.

## 1. Authentication & Session Flow
Security is handled by Keycloak in the **web-portal**. The game stack is **agnostic** to Keycloak.

1.  **Login**: Portal authenticates with Keycloak (OIDC Authorization Code Flow + PKCE).
2.  **Token**: Keycloak issues an `accessToken` (JWT) used only by the portal.
3.  **Session**: Portal calls the Game Server Session API to create a game session.
4.  **Join**: Game client connects to Game Server via WebSocket using `sessionToken`.

## 2. Internal Communication (Server-to-Server)
Between **Portal -> Game Server** and **Game Server -> Cashier API**.

### Portal -> Game Server (Session API)
| Endpoint | Method | Description | Security |
| :--- | :--- | :--- | :--- |
| `/api/sessions` | POST | Create a game session. | `X-Portal-Key` header |
| `/api/sessions/:token` | GET | Validate session (game-client lookup). | Public |
| `/api/sessions/:token` | DELETE | End a session. | `X-Portal-Key` header |

### Game Server -> Cashier API (REST)
| Endpoint | Method | Description | Security |
| :--- | :--- | :--- | :--- |
| `/v1/wallets/withdraw` | POST | Debit player wallet. | HMAC-SHA256 + nonce |
| `/v1/wallets/deposit` | POST | Credit player wallet. | HMAC-SHA256 + nonce |
| `/v1/wallets/:playerId/balance` | GET | Check player funds (optional). | Internal service key |

---

## 3. Real-time Communication (Client-to-Server)
Handled via **WebSockets** using the Colyseus framework.

### Session-based Join (No JWT)
The game client connects with a `sessionToken` received from the portal:

```json
{
  "sessionToken": "sess_abc123",
  "roomId": "room-456"
}
```

### State Synchronization
The Game Server broadcasts the `GameState` schema periodically. The client patches its local copy.

### Client Messages (Intentions)
| Type | Data Payload | Responsibility |
| :--- | :--- | :--- |
| `COMMIT_LINK` | `{ from: string, to: string }` | Request to bridge two towers. |
| `CANCEL_LINK` | `{ linkId: string }` | Request to disconnect a bridge. |
| `JOIN_TOURNAMENT` | `{ tournamentId: string }` | Register for an upcoming bracket. |

---

## 4. Event Bus (Optional / Future)
If asynchronous processing is needed (e.g., global notifications), a **Redis Pub/Sub** or **RabbitMQ** will be introduced.
- **Topic**: `user.payout.completed` -> Triggers email or global UI alert.
- **Topic**: `tournament.created` -> Broadcasts to all connected lobby clients.
