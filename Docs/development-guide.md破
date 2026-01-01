# Link Wars - Development Guide

Welcome to the development of **Link Wars**! This guide outlines the workflow and commands you need to build, test, and run the project using our Monorepo and Docker setup.

## 1. Initial Setup

Before starting, ensure you have **Docker** and **Yarn** installed on your machine.

```bash
# Install all dependencies in the monorepo root
yarn install
```

## 2. Running the Development Environment

We use Docker Compose to orchestrate all services with **Hot Reload** enabled.

```bash
# Start all services (Identity, Cashier, Game-Server, Client-Web)
docker-compose up

# If you make changes to package.json or Dockerfiles, rebuild:
docker-compose up --build
```

- **Cashier API**: http://localhost:3000
- **Game Server**: http://localhost:2567
- **Web Client**: http://localhost:5173

## 3. Daily Development Workflow

### Starting Services Individually
While Docker runs everything in the background, you can also run services locally for faster debugging or specific work:

- `yarn dev:cashier`: Starts the Cashier API with `tsx watch`.
- `yarn dev:game`: Starts the Game Server with `tsx watch`.
- `yarn dev:client`: Starts the Web Client with `Vite`.

### Test-Driven Development (TDD)
We follow a strict TDD methodology. Always write your tests first!

- `yarn test`: Runs all tests in the monorepo.
- `yarn workspace <service-name> test:watch`: Runs tests for a specific service in watch mode.

### Linting & Formatting
We use **Biome** for everything. It's incredibly fast.

- `yarn lint`: Checks for linting/formatting issues.
- `yarn format`: Automatically fixes all formatting and import sorting.

> [!TIP]
> **VS Code / Cursor User?** 
> Just open the root folder. We've configured the editor to **Format on Save** and **Organize Imports** automatically using Biome.

## 4. Project Structure

- `services/`: Contains the standalone services.
- `Docs/`: High-level architecture, data models, and guides.

## 5. Adding a New Feature (Example)
1.  **Define the Requirement**: Read the architecture docs in `Docs/`.
2.  **Write a Failing Test**: Create a test file in `services/<service>/tests/unit/`.
3.  **Run Tests**: `yarn test` (verify it fails).
4.  **Implement**: Write the minimal code to pass the test.
5.  **Refactor**: Clean up the code and run `yarn format`.
