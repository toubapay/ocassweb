# Ocass

A multi-module "super app" (Ecommerce, Restaurant, Package Delivery, Ride Sharing,
Insurance, Airtime Top-up & Bill Payment) with a Next.js/MUI web frontend, a
Flutter mobile app, and a Node/Express/Prisma backend shared by both. Seed
data models a Senegal market (CFA pricing, Dakar addresses, Orange/Free/
Expresso as mobile operators, SENELEC/SEN'EAU as billers).

## Structure

```
/                Next.js frontend (Pages Router)
  pages/         Routes: /, /auth/*, /ecommerce/*, /delivery, /insurance,
                 /restaurant/*, /ride-sharing, /topup, /profile
  src/           theme, redux store, api clients, components, hooks
/server          Express + Prisma backend (PostgreSQL)
  prisma/        schema.prisma, migrations, seed.js
  src/modules/   auth, ecommerce, delivery, insurance, restaurant, rideshare, mobile
/mobile          Flutter app (iOS/Android) - same modules, same backend.
                 See mobile/README.md before running it: it needs one
                 `flutter create` bootstrap step and its own first
                 `flutter analyze` pass (see that README for why).
```

## Backend setup

```bash
cd server
cp .env.example .env        # point DATABASE_URL at your Postgres instance
npm install
npm run prisma:migrate      # creates tables
npm run seed                # loads sample categories/products/restaurants/plans
npm run dev                 # http://localhost:5000
```

Auth uses phone number + OTP. There's no SMS provider wired up yet, so with
`OTP_DEV_MODE=true` (the default) requested codes are logged to the server
console **and** returned in the API response (`devCode`) so the flow is
testable end-to-end without Twilio/etc. Swap in a real SMS provider in
`server/src/utils/otp.js` before going to production.

## Frontend setup

```bash
npm install
# The browser calls same-origin /api/*, which next.config.js rewrites to
# BACKEND_URL (defaults to http://localhost:5000) server-side - no
# NEXT_PUBLIC_BASE_URL needed for local dev.
yarn dev                    # http://localhost:3000
```

## What's implemented

- **Ecommerce** — full flow: category browse (sidebar + grid, matching the
  reference design), product detail, cart, wishlist, checkout, order history.
- **Restaurant** — full ordering flow: per-restaurant quantity cart, place
  order, order history.
- **Delivery, Ride Sharing** — request forms with a price estimate, a
  history list, and cancelling a still-pending request/ride.
- **Insurance** — browse plans by category, subscribe, view policies, cancel
  a pending/active one.
- **Airtime Top-up & Bill Payment** — operators/billers are a backend-managed
  catalog (never hardcoded client-side); phone entry is manual or via the
  browser's Contact Picker API (feature-detected — Chrome for Android only,
  falls back to manual gracefully elsewhere) with operator auto-detected
  from the number; bill payment by account/meter number; shared transaction
  history.
- **Auth** — phone + OTP, JWT session, protected routes via `middleware.js`.
- **Mobile** — a Flutter app in `/mobile` with the same module coverage
  against the same backend (see `mobile/README.md`).

Richer delivery/ride dispatch (live pricing, maps, driver assignment) is
intentionally left as the next milestone — the current build gives each
module a real API + UI, not just a shell.

## Deploying

- [DEPLOY_GCP.md](./DEPLOY_GCP.md) — Cloud Run + Cloud SQL
- [DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md) — Railway + Railway Postgres

Neither has been run from this environment — both were prepared and
documented but not executed, since this sandbox has no credentials for
either platform (see each guide for specifics on what was and wasn't
verifiable from here).

## Notes for deployment

- Seed data uses `picsum.photos` placeholder images — swap for real product
  photography before shipping, and check that your hosting environment's
  network/CSP policy allows whatever image host you pick.
- `DATABASE_URL`, `JWT_SECRET`, and OTP/SMS credentials must be set as real
  secrets in production (see `server/.env.example`).
