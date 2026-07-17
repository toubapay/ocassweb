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
- **Payments** — [PayDunya](https://www.paydunya.com) (Senegalese payment
  gateway) is wired into ecommerce checkout: placing an order creates a
  `Payment` record, redirects to PayDunya's hosted checkout, and the customer
  lands back on `/payments/return` (or `/payments/cancel`), which re-confirms
  the payment's real status against PayDunya's API before marking the order
  paid - see "Payments (PayDunya)" below for setup and what's unverified.
- **Mobile** — a Flutter app in `/mobile` with the same module coverage
  against the same backend (see `mobile/README.md`).

Richer delivery/ride dispatch (live pricing, maps, driver assignment) is
intentionally left as the next milestone — the current build gives each
module a real API + UI, not just a shell.

## Payments (PayDunya)

Ecommerce checkout is wired to [PayDunya](https://www.paydunya.com), a
Senegalese payment gateway, using their Checkout Invoice API:

1. `POST /ecommerce/orders` creates the order, then creates a `Payment` row
   and a PayDunya invoice (`server/src/modules/payments/paydunya.service.js`),
   and returns `{ order, paymentUrl }`.
2. The web app redirects the browser to `paymentUrl` (PayDunya's hosted
   checkout page).
3. After paying, PayDunya redirects the customer back to
   `${APP_FRONTEND_URL}/payments/return?token=...` (or `/payments/cancel` if
   they cancel), and separately calls
   `${APP_BASE_URL}/api/payments/paydunya/ipn` server-to-server.
4. Both paths re-confirm the payment with `GET /checkout-invoice/confirm/:token`
   before trusting it (PayDunya's own recommendation - never trust the
   redirect or IPN body alone). On confirmed completion, the linked order is
   marked `paid: true` and `status: CONFIRMED`.

**Setup**: get your Master/Private/Public keys and token from the PayDunya
dashboard and set them in `server/.env` (see `.env.example`). `APP_BASE_URL`
must be publicly reachable for PayDunya's IPN to reach you - in local dev
that means tunneling it (e.g. `ngrok http 5000`) and setting `APP_BASE_URL`
to the tunnel URL.

**What's unverified**: this was built without live network access to
paydunya.com (blocked in the build sandbox), so the invoice-create request/
response shape, the IPN payload shape (`payments.controller.js`'s `ipn`
handler tries a few likely shapes for the `token` field), and the exact
`checkoutUrl` format are all implemented from PayDunya's published API docs
but not exercised against a real PayDunya call. Test against their sandbox
(`PAYDUNYA_MODE=test`) before going live, and check `ipn`'s request logging
if the callback doesn't parse correctly the first time.

Only ecommerce checkout uses PayDunya so far. `payments.service.js`'s
`applyPaymentSideEffects` is a switch keyed on `PaymentPurpose` - add a case
there (and an `initiatePayment` call in the relevant controller) to wire
PayDunya into restaurant orders, mobile top-up/bills, insurance, delivery, or
ride requests.

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
