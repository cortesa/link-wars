# ⚔️ Link Wars - Monorepo

Welcome to the **Link Wars** repository! This is a high-performance multiplayer game ecosystem built with a modern architecture and a strict focus on developer experience and quality.

## 🏛️ Architecture Overview

The project is structured as a **Yarn Workspaces Monorepo**. This allows us to share types, logic, and tooling across our diverse service stack while keeping deployment independent.

### Core Services
- **`services/cashier`**: 💰 **Cashier API**. Handles the ledger, payments, and balance management. Built with **Fastify**, **Prisma**, and **PostgreSQL**.
- **`services/game-server`**: 🕹️ **Game Server**. Orchestrates real-time multiplayer logic using **Colyseus** (Node.js).
- **`services/client-web`**: 🌐 **Web Client**. The game UI and client-side logic powered by **Phaser** and **Vite**.
- **`services/identity`**: 🔑 **Identity**. Authentication and authorization (Keycloak integration).

### Technology Stack
- **Language**: TypeScript (v5.x)
- **Package Manager**: Yarn (Berry/v3+)
- **Linting & Formatting**: [Biome](https://biomejs.dev/) (Ultra-fast, unified tool)
- **Testing**: [Vitest](https://vitest.dev/) (Strict TDD approach)
- **Containerization**: Docker & Docker Compose

---

## 🚀 Getting Started

Follow these steps to get your development environment up and running.

### 1. Prerequisites
Ensure you have the following installed:
- [Docker](https://www.docker.com/products/docker-desktop/)
- [Yarn](https://yarnpkg.com/getting-started/install)
- [Node.js](https://nodejs.org/) (v20+)

### 2. Initial Setup
```bash
# Clone the repository
git clone https://github.com/cortesa/link-wars.git
cd link-wars

# Install all dependencies (hoisted to root)
yarn install
```

### 3. Running the Project
The easiest way to start is using Docker Compose, which handles all services and infrastructure (DBs, Redis) with **Hot Reload** enabled.

```bash
docker compose up
```

- **Web Client**: [localhost:5173](http://localhost:5173)
- **Cashier API**: [localhost:3000](http://localhost:3000)
- **Game Server**: [localhost:2567](http://localhost:2567)
- **Identity (Keycloak)**: [localhost:8080](http://localhost:8080)

---

## 🛠️ Development Workflow

We follow a **Strict TDD (Test-Driven Development)** methodology. All code must be validated by tests.

### Common Commands
- **Run all tests**: `yarn test`
- **Lint & Format**: `yarn lint` / `yarn format`
- **Start single service**: `yarn workspace <service-name> dev`

### Project Rules
1. **Language**: All code, documentation, and comments must be in **English**.
2. **Standardization**: Biome is the source of truth for formatting. VS Code is pre-configured to format on save.
3. **Architecture**: Services are poly-repo style (standalone) but managed within this single monorepo for shared logic and atomic commits.

---

> [!NOTE]
> For a more detailed breakdown of commands and advanced configuration, please refer to the **[development-guide.md](Docs/development-guide.md)**.
