# Multi-stage Dockerfile for Game Client
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json yarn.lock ./
COPY services/game-client/package.json ./services/game-client/
RUN yarn install --frozen-lockfile

FROM base AS development
COPY services/game-client ./services/game-client
CMD ["yarn", "workspace", "game-client", "dev"]

FROM base AS build
COPY services/game-client ./services/game-client
RUN yarn workspace game-client build

FROM nginx:stable-alpine AS production
COPY --from=build /app/services/game-client/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
