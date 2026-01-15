# Multi-stage Dockerfile for Link Wars Game Server
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json yarn.lock ./
COPY games/link-wars/server/package.json ./games/link-wars/server/
RUN yarn install --frozen-lockfile

FROM base AS development
COPY games/link-wars/server ./games/link-wars/server
CMD ["yarn", "workspace", "linkwars-server", "dev"]

FROM base AS build
COPY games/link-wars/server ./games/link-wars/server
RUN yarn workspace linkwars-server build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/games/link-wars/server/dist ./games/link-wars/server/dist
COPY --from=build /app/games/link-wars/server/package.json ./games/link-wars/server/
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile
EXPOSE 2567
CMD ["node", "games/link-wars/server/dist/index.js"]
