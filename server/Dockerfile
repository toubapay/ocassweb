# Backend (Express + Prisma) - runs on Cloud Run, connects to Cloud SQL.
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
# node:22-slim has libssl3 (Node itself needs it) but not the `openssl`
# CLI binary, which Prisma's engines shell out to for OpenSSL-version
# detection. Without it, detection fails and Prisma loads the wrong query/
# schema engine even with binaryTargets set correctly below - see
# https://github.com/prisma/prisma/issues/16553.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Same OpenSSL-detection requirement as the builder stage above, but here
# it matters even more: this is the image Render's Pre-Deploy Command
# (`prisma migrate deploy`) and the running server both actually execute
# in, not just prisma generate at build time.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 expressjs

COPY --from=builder --chown=expressjs:nodejs /app ./

USER expressjs
EXPOSE 8080
CMD ["node", "src/index.js"]
