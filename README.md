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
  history list, cancelling a still-pending request/ride, and a full dispatch
  loop: any user can self-serve into the `DELIVERY_AGENT`/`RIDER` role from
  their profile, see unassigned jobs, accept one (race-safe - a conditional
  update means two agents tapping "accept" at once can't both win), and walk
  it through accepted → picked up/in progress → delivered/completed, which
  auto-credits 80% of the fare to their wallet. See "Delivery & ride
  dispatch" below for what this does and doesn't cover (there's no map).
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
- **Vendor marketplace** — any user can self-serve into the `VENDOR` role
  from their profile, create one store, and manage its product catalog
  (create/edit/soft-delete) and see orders containing their products. See
  "Vendor marketplace" below.
- **French / English** — the whole web app is translated (`src/i18n/`,
  `react-i18next`), French by default. A toggle on the profile page switches
  languages instantly and the choice persists (redux-persist) across
  reloads. See "Internationalization" below for how to add new strings.
- **Mobile** — a Flutter app in `/mobile` with the same module coverage as
  the web app *up through the wallet feature* (see `mobile/README.md`).
  Everything since then - i18n, the dispatch system, and the vendor
  marketplace below - is web-only; syncing them to Flutter hasn't been done
  yet.

## Delivery & ride dispatch

Both request flows now go all the way through fulfillment, not just
request-and-cancel:

1. Any signed-in user can opt into `DELIVERY_AGENT` or `RIDER` from their
   profile (`PATCH /api/auth/role` - self-service, no approval flow) and get
   a dashboard (`/delivery/agent`, `/ride-sharing/driver`) listing
   unassigned jobs.
2. Accepting a job is race-safe: `acceptRequest`/`acceptRide`
   (`server/src/modules/{delivery,rideshare}/*.controller.js`) use a
   conditional `updateMany` (still `REQUESTED` and unassigned) rather than a
   read-then-write, so two agents tapping "accept" on the same job at the
   same moment can't both win - the loser gets a clean 409.
3. Walking a job through accepted → picked up/in progress →
   delivered/completed auto-credits 80% of the fare to the agent's wallet
   (`WalletTransactionType.EARNING`) on completion; the other 20% is an
   implicit platform fee, not tracked as its own ledger anywhere yet.

**Pricing**: real Haversine (straight-line) distance-based pricing when both
pickup and dropoff coordinates are available, falling back to the original
simulated estimate otherwise. In practice that means pickup only, via the
"use my location" button (`navigator.geolocation`) on both request forms -
**there's no geocoding**, so a typed address alone never has coordinates,
and dropoff stays text-only. This sandbox's network blocks reaching
geocoding services (confirmed against OpenStreetMap's free Nominatim API)
to test one even with a key, so wiring up real geocoding/routing (Google
Maps, Mapbox, or self-hosted Nominatim) and turn-by-turn distance is left
as a follow-up requiring a real API key and live network access to build
against.

**Not built**: any visual map, an approval/verification flow for becoming an
agent or rider (this is deliberately a self-service MVP toggle), and a
"don't let someone accept their own request" check - a user with both a
customer order and an agent role can currently accept their own delivery.

## Vendor marketplace

Self-service store ownership, the same opt-in pattern as the delivery/ride
dispatch roles above:

1. Any signed-in user can opt into the `VENDOR` role from their profile
   (`PATCH /api/auth/role`, no approval flow) and gets a dashboard
   (`/vendor`) to create their store.
2. **One store per vendor**: `Store.ownerId` is a nullable, unique foreign
   key (`server/prisma/schema.prisma`) - nullable so existing admin-seeded
   stores with no owner keep working, unique so Postgres itself enforces
   "at most one store per user." All vendor endpoints
   (`server/src/modules/vendor/vendor.controller.js`, mounted at
   `/api/vendor`) are gated by `requireRole("VENDOR")` and resolve "my
   store" from the authenticated user, never from a client-supplied id.
3. **Products** (`/vendor/products`): create, edit, and soft-delete
   (`Product.isActive`, not a hard delete - existing cart/order/wishlist/
   review rows reference products by id). `discountPercent` is always
   server-computed from `price`/`discountPrice`, never accepted from the
   client, so the storefront's "X% OFF" badge can't disagree with what's
   actually charged; a partial update (e.g. changing only `stock`) merges
   against the product's existing price fields before recomputing so the
   discount stays consistent without re-sending both prices every time.
   Deactivated products disappear from public listings/search
   (`GET /api/ecommerce/products`) and product detail (404s) but remain
   visible in the vendor's own product list.
4. **Orders** (`/vendor/orders`): orders containing at least one of the
   vendor's products, with each order's `items` filtered down to only that
   vendor's own line items - an order can in principle span multiple
   stores, and a vendor should never see another store's items.

**Not built**: an approval/verification flow for becoming a vendor (same
self-service MVP tradeoff as delivery/ride), payouts/settlement (a vendor's
sales aren't credited to their wallet automatically - see "Wallet" below),
storefront pages for browsing a specific vendor's catalog as a shopper
(products already carry `storeId`/`store`, so `GET
/api/ecommerce/products?store=<slug>` works today, there's just no
dedicated `/store/[slug]` page yet), and multi-vendor cart/checkout
splitting (checkout is unchanged - one cart, one order, regardless of how
many stores its items come from).

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
vendors and delivery men.

- **Funding**: top-up only, via a PayDunya invoice (`purpose: WALLET_TOPUP`),
  plus the automatic delivery/ride earnings credit described in "Delivery &
  ride dispatch" above. A vendor's wallet is **not** auto-credited from
  their store's sales - `Store.ownerId` exists now (see "Vendor
  marketplace" above), but wiring payouts on order completion is still a
  follow-up, not yet built.
- **Spending**: usable as a checkout payment method - `POST
  /api/ecommerce/orders` accepts `paymentMethod: "wallet" | "paydunya"`. A
  wallet debit settles synchronously (no redirect/IPN round trip): balance
  and order status update in the same request, guarded against
  overdraft/concurrent-debit races by a conditional `balance >= amount`
  update (`server/src/modules/wallet/wallet.service.js`). Only ecommerce
  checkout offers the choice so far; wiring it into restaurant/topup/
  insurance/delivery/ride checkouts follows the same pattern.
- **UI**: one wallet screen (`/wallet`: balance, top-up, transaction
  history) reachable from every user's profile, shared by every role. It's
  separate from the role-specific dashboards (`/delivery/agent`,
  `/ride-sharing/driver`, `/vendor`) built later - the wallet itself has no
  vendor- or agent-specific view.

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
