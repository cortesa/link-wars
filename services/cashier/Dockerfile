# Multi-stage Dockerfile for Cashier API
FROM node:20-alpine AS base
WORKDIR /app

# Install PostgreSQL client for migrations
RUN apk add --no-cache postgresql-client

# Copy root package files
COPY package.json yarn.lock ./
COPY services/cashier/package.json ./services/cashier/

# Install dependencies
RUN yarn install --frozen-lockfile

# Development stage
FROM base AS development
WORKDIR /app/services/cashier
COPY services/cashier ./
CMD ["yarn", "dev"]

# Build stage
FROM base AS build
COPY services/cashier ./services/cashier
WORKDIR /app/services/cashier
RUN yarn build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Install PostgreSQL client for migrations
RUN apk add --no-cache postgresql-client

# Copy built files and dependencies
COPY --from=build /app/services/cashier/dist ./dist
COPY --from=build /app/services/cashier/migrations ./migrations
COPY --from=build /app/services/cashier/package.json ./
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "dist/app.js"]
