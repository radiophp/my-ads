# syntax=docker/dockerfile:1.4

FROM node:22-alpine AS base
WORKDIR /app

# Install build tools needed for Prisma during build stage
RUN apk add --no-cache openssl

FROM node:22-alpine AS builder
WORKDIR /app
ENV NODE_ENV=development
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run prisma:generate
RUN npm run build

FROM base AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
# Disable Husky hooks inside the container; only required for local dev environments.
RUN HUSKY=0 npm install --omit=dev
COPY prisma ./prisma
RUN npm run prisma:generate
COPY --from=builder /app/dist ./dist
EXPOSE 6200
CMD ["node", "dist/main.js"]
