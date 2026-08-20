# Frontend (Next.js) - builds the standalone server output for Cloud Run.
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* vars are inlined into the client bundle at `next build`
# time, unlike BACKEND_URL (read fresh per-request server-side, see
# middleware.js) - a dashboard "Environment" value alone never reaches
# this RUN step unless mirrored into an ARG of the same name, which
# platforms building from this Dockerfile (Render, Cloud Run, Railway)
# populate from their own build-time env var / build-arg configuration.
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
RUN yarn build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Non-root user, per Cloud Run's recommended container hardening.
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Next's standalone-output file tracer doesn't reliably pick up every
# @swc/helpers ESM helper file it needs at runtime (a known Next.js
# tracing gap - see vercel/next.js#48737, #52735), so copy the whole
# package in explicitly rather than relying on the trace.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@swc/helpers ./node_modules/@swc/helpers

USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
