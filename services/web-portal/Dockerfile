# Multi-stage Dockerfile for Web Portal
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json yarn.lock ./
COPY services/web-portal/package.json ./services/web-portal/
RUN yarn install --frozen-lockfile

FROM base AS development
COPY services/web-portal ./services/web-portal
CMD ["yarn", "workspace", "web-portal", "dev"]

FROM base AS build
COPY services/web-portal ./services/web-portal
RUN yarn workspace web-portal build

FROM nginx:stable-alpine AS production
COPY --from=build /app/services/web-portal/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
