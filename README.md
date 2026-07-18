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
- **Wallet** — every user (customer, vendor, delivery man - same model for
  all three, `role` doesn't change the wallet) gets a balance funded by
  topping up through PayDunya, spendable as a checkout payment method
  alongside PayDunya itself (ecommerce checkout first). See "Wallet" below.
- **French / English** — the whole web app is translated (`src/i18n/`,
  `react-i18next`), French by default. A toggle on the profile page switches
  languages instantly and the choice persists (redux-persist) across
  reloads. See "Internationalization" below for how to add new strings.
- **Mobile** — a Flutter app in `/mobile` with the same module coverage
  against the same backend (see `mobile/README.md`). Not yet translated -
  the i18n work above is web-only so far.

Richer delivery/ride dispatch (live pricing, maps, driver assignment) is
intentionally left as the next milestone — the current build gives each
module a real API + UI, not just a shell.

## Internationalization

The web app is fully translated into French and English (`react-i18next`),
with French as the default. Setup:

- `src/i18n/index.js` initializes `i18next` synchronously with both locale
  JSON files inlined as resources (no lazy-loading/backend - the whole
  translation set is a few KB) and `lng: "fr"`.
- `src/i18n/locales/en.json` / `fr.json` hold every string, namespaced by
  page/feature (`ecommerce.checkout.*`, `wallet.*`, `payments.*`, ...). Keep
  the two files' key sets in sync - a missing French key silently falls
  back to the English string via i18next's `fallbackLng`.
- The chosen language is redux-persisted (`src/redux/slices/i18nSlice.js`,
  whitelisted in `src/redux/store.js`) and synced into the live `i18next`
  instance by `src/i18n/I18nSync.js`, mounted inside `PersistGate` in
  `pages/_app.js` so it only runs once the persisted choice (if any) has
  rehydrated.
- `src/components/settings/LanguageSwitcher.js` is the toggle UI, currently
  only placed on the profile page (`pages/profile.js`, both the signed-in
  and signed-out states).
- Module registry labels (`src/constants/modules.js`) don't store text
  directly anymore - `ModuleTile.js` looks up `modules.<id>.label` by the
  module's `id`, so adding a module means adding a `modules.<id>` entry to
  both locale files, not a hardcoded label.
- Real-world proper nouns (the "Ocass" brand name, the "Plateau, Dakar"
  address, operator/biller names from the backend catalog) are deliberately
  left untranslated - only actual UI copy is a translation key.
- Not yet done: the Flutter app (`/mobile`) - it has its own, separate
  i18n system (Flutter's `intl`/ARB files, not `react-i18next`) and hasn't
  been touched by this pass.

**Adding a new string**: add the key to both `en.json` and `fr.json` (same
path), then `const { t } = useTranslation();` and use `t("your.new.key")`.
For interpolation, use `{{placeholder}}` in the JSON value and pass
`t("key", { placeholder: value })`; for pluralization, add `_one`/`_other`
suffixed keys and pass `{ count }`.

## Wallet

Every user has exactly one `Wallet` (`server/prisma/schema.prisma`),
regardless of role - the same balance/top-up/spend model serves customers,
vendors and delivery men. Scope decisions made while building this (no
vendor-store ownership link or delivery/ride-agent assignment exists yet in
the schema, so these were the lower-risk defaults rather than a guess):

- **Funding**: top-up only, via a PayDunya invoice (`purpose: WALLET_TOPUP`).
  Nothing auto-credits a vendor or delivery agent's wallet from sales or
  completed deliveries - that would need a `Store.ownerId` and a
  `DeliveryRequest`/`RideRequest` assignee field first, neither of which
  exists today.
- **Spending**: usable as a checkout payment method - `POST
  /api/ecommerce/orders` accepts `paymentMethod: "wallet" | "paydunya"`. A
  wallet debit settles synchronously (no redirect/IPN round trip): balance
  and order status update in the same request, guarded against
  overdraft/concurrent-debit races by a conditional `balance >= amount`
  update (`server/src/modules/wallet/wallet.service.js`). Only ecommerce
  checkout offers the choice so far; wiring it into restaurant/topup/
  insurance/delivery/ride checkouts follows the same pattern.
- **UI**: one wallet screen (`/wallet`: balance, top-up, transaction
  history) reachable from every user's profile - no separate vendor or
  delivery-agent dashboards were built, since that's a materially larger
  feature (order-to-vendor routing, job assignment) than "add a wallet."

Both a PayDunya top-up and a wallet order-payment go through the same
rollback discipline as ecommerce/PayDunya checkout: if a debit fails
(insufficient balance) or a topup invoice can't be created, the order is
deleted and the customer's cart is left untouched rather than orphaned.

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

Ecommerce checkout and wallet top-up (see "Wallet" above) use PayDunya so
far. `payments.service.js`'s `applyPaymentSideEffects` is a switch keyed on
`PaymentPurpose` - add a case there (and an `initiatePayment` call in the
relevant controller) to wire PayDunya into restaurant orders, mobile
top-up/bills, insurance, delivery, or ride requests. Since PayDunya only
takes one `return_url` per invoice, `/payments/return` is shared across
every purpose and picks its message/destination off the confirmed
payment's `purpose` field (`DESTINATIONS` map in `pages/payments/return.js`)
- add an entry there for any new purpose that needs its own landing copy.

## Deploying

- [DEPLOY_GCP.md](./DEPLOY_GCP.md) — Cloud Run + Cloud SQL
- [DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md) — Railway + Railway Postgres
- [DEPLOY_SCALE.md](./DEPLOY_SCALE.md) — infrastructure and monthly cost
  estimates for scaling from 100K to 1M users on either platform

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
