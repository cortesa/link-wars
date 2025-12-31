# Identity Service - Keycloak Documentation

## Overview
Keycloak is the central identity provider for the Link Wars ecosystem. It handles user registration, authentication, and security through OpenID Connect (OIDC).

## Technology Stack
- **Engine**: Keycloak (Docker)
- **Database**: PostgreSQL (Dedicated instance)

## Security Model
1. **JWT (JSON Web Tokens)**: Keycloak issues signed RS256 JWTs.
2. **Realms**: A dedicated realm `link-wars` will be created.
3. **Clients**:
    - `client-web`: Public client for the Phaser app.
    - `game-server`: Bearer-only (or confidential) client to validate tokens.
    - `cashier-api`: Bearer-only client to check user permissions.

## TDD / Verification
Since Keycloak is a third-party service, we focus on:
1. **Infrastructure as Code**: Using Docker Compose to ensure a reproducible setup.
2. **Integration Tests**: In other services (Cashier/Game Server), write tests that mock or utilize a test-realm to verify token validation logic.

## Specific Actions
- [ ] Configure `docker-compose` with Keycloak and Postgres.
- [ ] Define Realm and Client settings (JSON export/import).
- [ ] Setup initial "Test User" for development.
