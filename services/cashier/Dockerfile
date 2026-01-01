# Multi-stage Dockerfile for Cashier API
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json yarn.lock ./
COPY services/cashier/package.json ./services/cashier/
RUN yarn install --frozen-lockfile

FROM base AS development
COPY services/cashier ./services/cashier
CMD ["yarn", "workspace", "cashier", "dev"]

FROM base AS build
COPY services/cashier ./services/cashier
RUN yarn workspace cashier build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/services/cashier/dist ./services/cashier/dist
COPY --from=build /app/services/cashier/package.json ./services/cashier/
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile
EXPOSE 3000
CMD ["node", "services/cashier/dist/app.js"]
