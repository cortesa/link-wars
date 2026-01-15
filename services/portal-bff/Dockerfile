# Multi-stage Dockerfile for Portal BFF
FROM node:20-alpine AS base
WORKDIR /app

# Copy root package files
COPY package.json yarn.lock ./
COPY services/portal-bff/package.json ./services/portal-bff/

# Install dependencies
RUN yarn install --frozen-lockfile

# Development stage
FROM base AS development
WORKDIR /app/services/portal-bff
COPY services/portal-bff ./
CMD ["yarn", "dev"]

# Build stage
FROM base AS build
COPY services/portal-bff ./services/portal-bff
WORKDIR /app/services/portal-bff
RUN yarn build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Copy built files and dependencies
COPY --from=build /app/services/portal-bff/dist ./dist
COPY --from=build /app/services/portal-bff/package.json ./
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3003
CMD ["node", "dist/app.js"]
