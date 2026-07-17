# Ocass

A multi-module "super app" (Ecommerce, Restaurant, Package Delivery, Ride Sharing,
Insurance) with a Next.js/MUI web frontend, a Flutter mobile app, and a
Node/Express/Prisma backend shared by both.

## Structure

```
/                Next.js frontend (Pages Router)
  pages/         Routes: /, /auth/*, /ecommerce/*, /delivery, /insurance,
                 /restaurant/*, /ride-sharing, /profile
  src/           theme, redux store, api clients, components, hooks
/server          Express + Prisma backend (PostgreSQL)
  prisma/        schema.prisma, migrations, seed.js
  src/modules/   auth, ecommerce, delivery, insurance, restaurant, rideshare
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
# .env.development already points NEXT_PUBLIC_BASE_URL at http://localhost:5000/api
yarn dev                    # http://localhost:3000
```

## What's implemented

- **Ecommerce** — full flow: category browse (sidebar + grid, matching the
  reference design), product detail, cart, wishlist, checkout, order history.
- **Delivery, Ride Sharing** — request forms with a price estimate and a
  history list, backed by real endpoints.
- **Insurance** — browse plans by category, subscribe, view policies.
- **Restaurant** — browse restaurants and menus (ordering not wired to cart yet).
- **Auth** — phone + OTP, JWT session, protected routes via `middleware.js`.

Restaurant checkout and richer delivery/ride dispatch (live pricing, maps,
driver assignment) are intentionally left as the next milestones — the
current build gives each module a real API + UI shell to extend.

## Notes for deployment

- Seed data uses `picsum.photos` placeholder images — swap for real product
  photography before shipping, and check that your hosting environment's
  network/CSP policy allows whatever image host you pick.
- `DATABASE_URL`, `JWT_SECRET`, and OTP/SMS credentials must be set as real
  secrets in production (see `server/.env.example`).
