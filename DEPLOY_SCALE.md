# Scaling Ocass: infrastructure and cost planning

Sizing and cost estimates for running Ocass on [Railway](./DEPLOY_RAILWAY.md)
from 100,000 users up through 1,000,000 users. Google Cloud is no longer a
deployment target for this project - see [DEPLOY_RENDER.md](./DEPLOY_RENDER.md)
for the platform actually in use.

**These are list-price-based estimates, not quoted numbers.** This sandbox
can't reach live Railway pricing pages to verify current rates - run these
through the provider's official calculator before budgeting. Treat this doc
as a starting shape for the conversation, not a final bill.

## Assumptions

"100K users" and "1M users" are read as *registered* users, not concurrent.
Sizing below models:

- ~15% DAU/MAU ratio (typical for a multi-module consumer app) → 15K DAU at
  100K users, 150K DAU at 1M users
- ~30-40 API calls/user/day (browse, cart, wallet checks, order polling)
- ~5x peak-to-average traffic multiplier (evening rush in a mobile-money-heavy
  market)

That gives roughly **6-9 req/sec average / 30-45 req/sec peak** at the 100K
tier, and **~10x that (300-450 req/sec peak)** at the 1M tier. If your actual
usage pattern differs materially (e.g. much higher/lower DAU ratio, bursty
promotional traffic), rework the sizing from those numbers rather than
trusting the totals below directly.

## The real bottleneck isn't compute - it's Postgres connections

This matters more than instance sizing: Railway (and most serverless/
container-autoscaling platforms) scales by spinning up *more container
instances*, and each one holds its own Prisma connection pool (default
5-13 connections). At even modest concurrency you blow past Postgres's
`max_connections` (~100-200 on most managed tiers) long before compute is
the constraint - capping instance count is a workaround, not a scaling
strategy.

**Getting past the 100K tier requires adding connection pooling (PgBouncer,
or Prisma Accelerate / Cloud SQL's built-in pooler) - this isn't in the app
today.**

## What's missing from the current build for real scale

| Gap | Why it matters | Needed by |
|---|---|---|
| Connection pooling (PgBouncer/Accelerate) | Serverless × Prisma exhausts Postgres connections | 100K tier |
| Redis (caching + rate limiting) | Not in the stack; hot reads (catalog, categories) hit Postgres every time | 100K tier |
| Object storage + CDN for images | Currently `picsum.photos` placeholders - real images need this regardless of scale | Before launch |
| Background job queue | OTP send, PayDunya IPN, notifications run inline today - will bottleneck request latency | 1M tier |
| Postgres read replicas | Offload browse/catalog reads from the primary | 1M tier |
| Real SMS provider | `OTP_DEV_MODE=true` today (dev-only, echoes codes in the API response) | Before launch |
| Monitoring/alerting (Sentry or similar) | Nothing wired up yet | 100K tier |
| Rate limiting / WAF | No abuse protection today | Before public launch |

Most of these are correctness/reliability issues at any traffic level, not
just cost optimizations - budget for them as part of getting to 100K, not as
a later "scale" project.

## Railway

Railway is genuinely good for the 100K tier - simpler pricing, less ops, and
cheaper at moderate scale since there's no per-request billing layer. Its
ceiling is the managed Postgres: **Railway has never offered native read
replicas or multi-zone HA** on its Postgres product, which is the thing you
actually need at 1M users.

### Monthly cost

| Component | 100K users | 1M users |
|---|---|---|
| Frontend service | $20-50/mo | $200-450/mo |
| Backend service | $30-80/mo | $300-700/mo |
| Postgres | $40-100/mo | $300-600/mo (still single-writer - real risk) |
| Redis add-on | $10-30/mo | $50-150/mo |
| **Total** | **~$120-300/mo** | **~$900-1,900/mo, but with a scaling ceiling** |

The 1M-tier Railway total looks attractive, but it's misleading - at that
scale you'd be running a single-writer Postgres instance with no failover
and no read offload, which is an availability/performance risk, not just
a line item.

## Bottom line

- **Start on Railway** while validating product-market fit under
  ~100-200K users - cheaper, faster to iterate, and Ocass's current
  architecture (two stateless services + Postgres) maps onto it cleanly.
- **Add a managed Postgres provider with HA + read replicas (e.g. Neon,
  RDS, or Cloud SQL in front of Railway compute) before crossing a few
  hundred thousand users** - the HA + read-replica story is the deciding
  factor, not raw compute cost.
- Either way, budget for the missing pieces above (pooling, Redis, CDN,
  background jobs, SMS, monitoring) as part of getting to 100K, not as a
  later "scale" project.
