# Backend (Express + Prisma) - runs on Cloud Run, connects to Cloud SQL.
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 expressjs

COPY --from=builder --chown=expressjs:nodejs /app ./

USER expressjs
EXPOSE 8080
CMD ["node", "src/index.js"]
