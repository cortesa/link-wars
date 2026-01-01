# Multi-stage Dockerfile for Game Server
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json yarn.lock ./
COPY services/game-server/package.json ./services/game-server/
RUN yarn install --frozen-lockfile

FROM base AS development
COPY services/game-server ./services/game-server
CMD ["yarn", "workspace", "game-server", "dev"]

FROM base AS build
COPY services/game-server ./services/game-server
RUN yarn workspace game-server build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/services/game-server/dist ./services/game-server/dist
COPY --from=build /app/services/game-server/package.json ./services/game-server/
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile
EXPOSE 2567
CMD ["node", "services/game-server/dist/index.js"]
