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
/docs/interactive-mock.html
                 Self-contained, clickable HTML mockup of the whole app
                 (no backend, no build step - open it directly in a
                 browser). Mirrors the real screens, copy, and colors of
                 every module, including Anando and notifications.
```

## Backend setup

```bash
cd server
cp .env.example .env        # point DATABASE_URL at your Postgres instance
npm install
npm run prisma:migrate      # creates tables
npm run seed                # loads sample categories/products/restaurants/plans
npm run seed:test-data      # optional: login-ready test accounts + sample orders/postings/notifications in every module
npm run dev                 # http://localhost:5000
```

`seed:test-data` adds one user per role (customer, vendor, delivery agent,
rider) plus a customer who's posted Anando rides, each with a wallet
balance and some sample activity (an order, a restaurant order, an
insurance policy, delivery/ride requests, Anando postings/bookings,
notifications) so the app isn't empty when you browse it. Safe to
re-run - it checks for existing data before inserting. Sign in with any
of the phone numbers it prints; with `OTP_DEV_MODE=true` the OTP code
comes back in the `/api/auth/request-otp` response instead of an SMS.

Auth uses phone number + OTP. There's no SMS provider wired up yet, so with
`OTP_DEV_MODE=true` (the default) requested codes are logged to the server
console **and** returned in the API response (`devCode`) so the flow is
testable end-to-end without Twilio/etc. Swap in a real SMS provider in
`server/src/utils/otp.js` before going to production.

## Frontend setup

```bash
npm install
# The browser calls same-origin /api/*, which middleware.js proxies to
# BACKEND_URL (defaults to http://localhost:5000) server-side, read fresh
# on every request - no NEXT_PUBLIC_BASE_URL needed for local dev. This is
# deliberately in middleware.js, not next.config.js's rewrites() - see the
# comment at the top of middleware.js for why (rewrites() bakes its
# destination in at `next build` time, which broke BACKEND_URL in
# production on every platform this app deploys to, since none of them
# have it available as a Docker build-time value).
yarn dev                    # http://localhost:3000
```

Optional: set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to enable the interactive
polygon-drawing map on the admin panel's Zones tab (see "Admin panel"
below) - the only place in this app that uses a Google Maps key. Without
it, that tab still works via a manual JSON boundary entry fallback.

## Progressive Web App

The web app is installable on mobile (Android/desktop Chrome via the
native install prompt; iOS Safari via Share → Add to Home Screen) and
works without a network connection to the extent an almost entirely
live-data app reasonably can:

- `public/manifest.webmanifest` - name, icons, `display: "standalone"`
  (no browser chrome once installed), theme color matching the app's
  brand green. Linked from `pages/_document.js`, along with the
  `apple-touch-icon`/`apple-mobile-web-app-*` tags iOS needs to behave
  like an installed app (it ignores the manifest entirely).
- `public/sw.js` - a small hand-rolled service worker (no `next-pwa`/
  Workbox dependency, same reasoning as this repo's hand-rolled i18n).
  Two jobs only: satisfy the browser's installability requirement (a
  registered SW with a fetch handler), and show `public/offline.html`
  instead of the browser's default error page when there's no network.
  **Deliberately does not cache `/api/*` or page HTML** - this app is
  almost entirely live data (cart, wallet balance, order status, OTP...),
  so serving a stale cached response would be actively misleading.
  Hashed static assets (`/_next/static/*`, icons) are cached opportunistically
  as they're fetched, since a hashed filename's content never changes.
- `src/hooks/usePwaInstall.js` + `src/components/pwa/InstallPwaBanner.js` -
  registers the service worker, listens for the browser's
  `beforeinstallprompt` event, and shows a dismissible banner (14-day
  cooldown once dismissed, not permanent) prompting install - Chrome
  hides its own default install UI unless a site handles this itself. On
  iOS, where `beforeinstallprompt` doesn't exist at all, the banner shows
  manual "Share → Add to Home Screen" instructions instead.
- `scripts/generate-pwa-icons.py` - generates the icon set (`public/icons/`,
  `public/apple-touch-icon.png`, `public/favicon.ico`) from scratch with
  Pillow, since no source logo file exists in this repo. Re-run it
  (`pip install pillow && python3 scripts/generate-pwa-icons.py`) after
  changing the brand color or wordmark rather than hand-editing the PNGs.

**Verified in this sandbox**: production build, manifest/icons/service
worker all serve correctly, the SW registers and activates in a real
browser (Playwright), `/offline.html` is confirmed precached, and the
service worker's exact network-then-cache-fallback logic was exercised
directly against an unreachable address and correctly returned the cached
offline page. **Not verified**: a true end-to-end offline page load in
this specific sandbox - Chrome DevTools Protocol's offline emulation
(used by both this sandbox's testing and typically Lighthouse-in-CI
setups) doesn't reliably reach service-worker-initiated `fetch()` calls,
a known Chromium limitation independent of this app's code. Confirm with
real airplane-mode testing on a device before relying on the offline
fallback in production.

## What's implemented

- **Ecommerce** — full flow: a Jumia-style shop home page (`pages/ecommerce/
  index.js` - hero banner carousel, category quick-nav, a "Ventes Flash"
  band of the day's steepest discounts across every store, and one themed
  horizontal-scroll band per top-level category), category browse (sidebar
  + grid), product detail (with a "you may also like" related-products
  row), cart, wishlist, checkout, order history. Two pieces of the home
  page are deliberately cosmetic, not backend-driven: the hero banner
  slides are a hardcoded array (no CMS/banner-management concept in this
  app), and the flash-sale countdown just counts down to local midnight
  (`GET /api/ecommerce/products?sort=discount` re-sorts by discount
  percent each time, so what's shown does change day to day, but nothing
  tracks a real per-deal expiry).
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
- **Anando (carpooling)** — peer-to-peer ride sharing, separate from the
  on-demand Ride Sharing dispatch above: any user can post a trip they're
  already making (scheduled or "leaving now") with N seats, and any number
  of other users each claim a seat until it's full. Pay by cash, wallet, or
  PayDunya. See "Anando" below.
- **In-app notifications** — a generic `Notification` model with a bell +
  unread badge (home page and most top bars); Anando is the first module
  that creates them (new booking, seat cancelled, ride cancelled).
- **French / English** — the whole web app is translated (`src/i18n/`,
  `react-i18next`), French by default. A toggle on the profile page switches
  languages instantly and the choice persists (redux-persist) across
  reloads. See "Internationalization" below for how to add new strings.
- **Mobile** — a Flutter app in `/mobile` with the same module coverage as
  the web app, including French/English i18n, the delivery/ride dispatch
  system, the vendor marketplace, Anando, and in-app notifications (see
  `mobile/README.md`).

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

**Not built**: any visual map, and an approval/verification flow for
becoming an agent or rider (this is deliberately a self-service MVP
toggle). A user with both a customer order/ride and an agent/rider role
*can't* accept their own request - `acceptRequest`/`acceptRide` check
`existing.userId !== req.user.id` before the race-safe conditional
`updateMany`, alongside the normal "was this already taken" guard.

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

A shopper-facing storefront (`/store/[slug]`, `pages/store/[slug].js`) lets
anyone browse a specific vendor's catalog - store header (name, logo,
rating, address) from a new public `GET /api/vendor/stores/:slug`, product
grid from the existing `GET /api/ecommerce/products?store=<slug>`. Linked
from the category browse page's "Stores" tab (previously a dead click -
it built a URL with a `?store=` query param the category page never
actually read).

A vendor's sales are credited to their wallet automatically
(`server/src/modules/vendor/vendor.service.js`'s `payoutVendorsForOrder`,
called from both order-settlement paths - the synchronous wallet-payment
branch in `orders.controller.js` and the PayDunya IPN handler in
`payments.service.js`) once an order is confirmed paid: each vendor whose
products are in the order gets 85% of their line items' total credited as
an `EARNING` wallet transaction (`purpose: "VENDOR_SALE"`), the platform
keeping the rest - same "share" pattern as the delivery/rideshare payout
split, hardcoded for now rather than wired into `ModuleConfig.feeConfig`
like those two. Idempotent per (order, store), so a retried webhook or
duplicate call never double-pays. Orders containing products from an
admin/seed-managed store (`Store.ownerId: null`) are skipped for that
store - there's no vendor wallet to credit.

**Not built**: an approval/verification flow for becoming a vendor (same
self-service MVP tradeoff as delivery/ride), and multi-vendor
cart/checkout splitting (checkout is unchanged - one cart, one order,
regardless of how many stores its items come from; payouts still split
correctly per store even though the checkout UI doesn't).

## Anando

Peer-to-peer carpooling (`server/src/modules/anando/`, `/anando`) -
deliberately a separate module from Ride Sharing above, not an extension of
it, because the two are inverted shapes:

|                | Ride Sharing (on-demand)                    | Anando (carpooling)                          |
| -------------- | -------------------------------------------- | --------------------------------------------- |
| Who initiates  | Passenger requests a trip                    | Driver posts a trip they're already making    |
| Cardinality    | 1 request : 1 driver                         | 1 posting : many bookings (seats)             |
| Driver         | `RIDER`-role gig worker                      | Any regular user, no special role             |
| Concurrency guard | Single-winner accept (`assignedRiderId: null`) | Decrementing seat count (`seatsAvailable: { gte: n }`) |

1. **Posting a ride** (`POST /api/anando/postings`): origin/destination,
   seat count, an optional price per seat (null = arrange payment with the
   driver directly), and either a `departureAt` or `isInstant: true` for a
   BlaBlaCar-style "leaving right now" posting (its `departureAt` is set to
   the creation time server-side, so every posting sorts/displays the same
   way regardless).
2. **Booking a seat** (`POST /api/anando/postings/:id/book`) claims
   instantly, no driver approval step - the guard is a conditional
   `updateMany` on `seatsAvailable`, the same shape as
   `acceptDeliveryJob`/`acceptRide`'s single-winner guard but checking a
   range instead of equality, since more than one booking can each
   partially succeed against the same posting. The posting flips to `FULL`
   (and drops off `GET /api/anando/postings/available`) the instant seats
   hit zero; a driver can't book their own posting.
3. **Payment**, chosen per booking: `CASH` (settles off-platform, `paid`
   stays `false` as a record of intent only), `WALLET` (debits
   synchronously, same `InsufficientBalanceError`-driven rollback as
   ecommerce checkout), or `PAYDUNYA` (starts a hosted-checkout invoice,
   `paid` flips `true` once `payments.service`'s IPN handler confirms it).
   If payment fails after the seat was already claimed, the seat is given
   back rather than left as a phantom hold.
4. **Cancelling**: a passenger cancelling a `WALLET`-paid booking gets an
   automatic refund and the posting reopens if it had filled up; a driver
   cancelling the whole posting cascades to cancel every confirmed booking
   on it (refunding `WALLET` payments) and notifies each passenger.
   `CASH`/`PAYDUNYA` bookings aren't auto-refunded on cancel - cash never
   moved through the app, and there's no PayDunya refund flow built
   anywhere in the app yet.

Old scheduled postings are corrected to `DEPARTED` without a background
job/cron - there's no such infrastructure anywhere in this app, so
`flipStalePostings()` runs lazily instead, at the top of the two listing
endpoints (`GET /anando/postings/available`, `GET /anando/postings/mine`):
any non-instant `OPEN`/`FULL` posting more than 2 hours past its
`departureAt` flips to `DEPARTED` right before that read. Instant
postings are excluded - their `departureAt` is set to *creation* time
(see `createPosting`), not a real scheduled time, so this check would
otherwise flip them almost immediately. The driver can still mark a
posting departed manually at any time regardless.

**Not built**: real geocoding (same limitation as Ride Sharing - a typed
address never has coordinates on its own, no maps API key is reachable
from this sandbox), and a request/approval booking flow (deliberately
instant-claim only, per the product decision behind this module).

### Notifications

A generic `Notification` model (`server/src/modules/notifications/`,
`GET/PATCH /api/notifications/*`) that any module can write to via
`notificationsService.notify({ userId, type, title, body, data })` -
Anando is the first and only caller today (new booking, booking
cancelled, posting cancelled, PayDunya payment confirmed). Surfaced as a
bell + unread badge on the home page and most top bars
(`showNotifications` prop on `TopBar`), linking to `/notifications`.
Polls for the unread count every 30s; there's no push/real-time delivery
(no websocket or service worker wired up).

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
- The Flutter app (`/mobile`) is translated too, but with its own
  hand-rolled system (`mobile/lib/l10n/`) rather than `react-i18next` -
  Dart maps derived from these same two JSON files, with a
  `context.t()`/`context.tr()` extension mirroring this hook. See
  `mobile/README.md` for how it differs (build-safe vs. callback-safe
  lookups).

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
  plus the automatic delivery/ride/vendor-sale earnings credit described in
  "Delivery & ride dispatch" and "Vendor marketplace" above.
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

## Admin panel

`/admin` (web only) - every route under `server/src/modules/admin/` is
gated `requireAuth` + `requireRole("ADMIN")`. It's not a separate
deployable: it's just another page in the same Next.js app as everything
else (`pages/admin/index.js`), so it ships automatically as part of the
one `ocass-frontend` web service - on Render (see `render.yaml`) or any
other deploy target, there's nothing extra to stand up or configure to
get it live.

There's no self-service way to become an ADMIN (unlike
`VENDOR`/`RIDER`/`DELIVERY_AGENT` - see `PATCH /api/auth/role`, which
deliberately excludes it), since that would make the gate meaningless.

**Logging in, for local dev/testing:**

1. `npm run seed:test-data` (from `server/`, see
   `server/prisma/seed-test-data.js`) creates a ready-to-use ADMIN account
   at `+221771000006`, alongside its one-per-role test users.
2. With `OTP_DEV_MODE=true` (the default in `server/.env.example`), every
   OTP is echoed back in the `/api/auth/otp/request` response instead of
   actually being sent - no SMS account needed. Set
   `OTP_DEV_FIXED_CODE=000000` (also in `.env.example`, commented out by
   default) to make every OTP that same fixed code instead of a fresh
   random one each time, so repeated manual testing doesn't mean copying
   a new code every login - request an OTP for `+221771000006`, then
   verify with `000000`, every time. Only ever honored when
   `OTP_DEV_MODE=true`, so it's safe to leave set in a dev `.env`.
3. Log in through the normal `/auth/login` flow with that phone number
   and code, then open `/admin` (or Profile → Admin panel, shown only to
   `ADMIN` users).

In production, promote the first admin directly in the database (there's
deliberately no other way in):

```sql
UPDATE "User" SET role = 'ADMIN' WHERE phone = '+221...';
```

After that, other admins can be promoted from the panel's Users tab
itself. `requireAuth` re-fetches the user from the DB on every request, so
a role change (or `active: false` suspension) takes effect on the user's
very next request - no re-login needed, and no way for a suspended user to
keep using a still-valid token.

**Users**: search/filter, change role (including to/from `ADMIN`), and
suspend (`active: false` - `requireAuth` rejects every request from a
suspended user with 403). An admin can't deactivate their own account
(guarded server-side, not just hidden in the UI).

**Modules & fees**: `ModuleConfig` (one row per module, key matching
`server/src/modules/<key>`) has an `enabled` toggle that's actually
enforced - `requireModuleEnabled(key)` (see `app.js`) sits in front of
every module's routes and returns `503` when disabled, and
`GET /api/modules/status` (public, unauthenticated) lets the web/mobile
clients hide a disabled module's nav entry. Only `delivery` and
`rideshare` have a real fee editor, because those are the only two
modules whose pricing code (`estimatePrice` in each controller) actually
reads `ModuleConfig.feeConfig` (base fare, rate/km, driver/agent payout
share) - every other module's toggle only controls availability, not
price, since there's no fee math anywhere else yet to hook a fee config
into.

**Zones**: `ServiceZone` stores a named polygon (points, module key, an
optional fee multiplier) drawn on a Google Map if
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set (falls back to pasting boundary
points as JSON if it isn't - this is the first thing in the whole repo
that needs a Maps key, so it's untested from this sandbox either way, no
network path to `maps.googleapis.com` here). **Storage and CRUD only** -
nothing in delivery/rideshare/ecommerce checks yet whether a request's
coordinates fall inside a zone; point-in-polygon enforcement against
these is the natural next step once zones exist to enforce against.

**Providers**: a generic `Provider` model (`category` is free text, not an
enum, so admins can label new kinds without a migration) for
credentials/config an admin fills in rather than the app hardcoding a
vendor. **Only `category: "SMS"` has real behavior wired to it** -
`server/src/utils/otp.js` sends OTP codes through whatever `Provider` row
has `category: "SMS"`, `isActive: true` (preferring one with
`isDefault: true`) via `server/src/utils/smsGateway.js`, a generic
HTTP-request sender: `config` describes one request (method, url,
headers, body/params) with `{phone}`, `{code}`, `{message}` placeholders
substituted at send time. There's no gateway hardcoded (ProMobile or
otherwise) because each one's real API contract - auth scheme, GET vs
POST, JSON vs form body - has to come from that gateway's own docs; add
one as a Provider once you have them. Example config for a POST/JSON
gateway:

```json
{
  "method": "POST",
  "url": "https://api.example.com/sms/send",
  "headers": { "Authorization": "Bearer sk_live_..." },
  "bodyType": "json",
  "body": { "to": "{phone}", "text": "{message}", "sender": "OCASS" }
}
```

When `OTP_DEV_MODE=true` (see `server/.env.example`) no SMS is sent at
all regardless of Providers configured - the code is logged and echoed in
the API response, same as before this module existed.

**Services**: admin CRUD for `MobileService` (the airtime/bill catalog -
previously seed-only, now editable without a redeploy) and `InsurancePlan`
(create/edit; no delete, since removing a plan with existing
`InsurancePolicy` rows would violate a foreign key with no
soft-delete/reassignment flow built for that yet).

**Dashboard**: `GET /admin/stats` - user/order/role counts, pending
deliveries, active rides, vendor stores, open Anando postings. Read-only.

## Deploying

- [DEPLOY_GCP.md](./DEPLOY_GCP.md) — Cloud Run + Cloud SQL
- [DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md) — Railway + Railway Postgres
- [DEPLOY_RENDER.md](./DEPLOY_RENDER.md) — Render Web Services + Render
  Postgres, with a [`render.yaml`](./render.yaml) Blueprint for one-shot
  infra-as-code setup
- [DEPLOY_SCALE.md](./DEPLOY_SCALE.md) — infrastructure and monthly cost
  estimates for scaling from 100K to 1M users on either platform

None of these were run from this environment — all were prepared and
documented but not executed, since this sandbox has no credentials for
any of these platforms (see each guide for specifics on what was and
wasn't verifiable from here).

## Notes for deployment

- Seed data uses `picsum.photos` placeholder images — swap for real product
  photography before shipping, and check that your hosting environment's
  network/CSP policy allows whatever image host you pick.
- `DATABASE_URL`, `JWT_SECRET`, and OTP/SMS credentials must be set as real
  secrets in production (see `server/.env.example`).
