# Multi-stage Dockerfile for Link Wars Game Client
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json yarn.lock ./
COPY games/link-wars/client/package.json ./games/link-wars/client/
RUN yarn install --frozen-lockfile

FROM base AS development
COPY games/link-wars/client ./games/link-wars/client
CMD ["yarn", "workspace", "linkwars-client", "dev"]

FROM base AS build
COPY games/link-wars/client ./games/link-wars/client
RUN yarn workspace linkwars-client build

FROM nginx:stable-alpine AS production
COPY --from=build /app/games/link-wars/client/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
