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
below), and delivery's address autocomplete + live tracking map (see
"Delivery & ride dispatch" below) - every Google Maps feature in this app
shares one script load (`src/hooks/useGoogleMaps.js`). Without it, the
Zones tab falls back to a manual JSON boundary entry and delivery's
address fields fall back to plain text input with no coordinates.

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
- **Restaurant** — full Yassir-Food-style flow: any user can self-serve into
  the `RESTAURANT_OWNER` role, create one restaurant, and manage its menu
  and incoming orders. Customers browse, order, and pay by wallet at
  checkout; the restaurant walks an order through CONFIRMED → PREPARING →
  OUT_FOR_DELIVERY, and that last step hands it straight to the delivery
  module - the exact same agent job board and live tracking map used for
  standalone package delivery. See "Restaurant marketplace" below.
- **Delivery, Ride Sharing** — request forms with a price estimate, a
  history list, cancelling a still-pending request/ride, and a full dispatch
  loop: any user can self-serve into the `DELIVERY_AGENT`/`RIDER` role from
  their profile, see unassigned jobs, accept one (race-safe - a conditional
  update means two agents tapping "accept" at once can't both win), and walk
  it through accepted → picked up/in progress → delivered/completed, which
  auto-credits 80% of the fare to their wallet. See "Delivery & ride
  dispatch" below for what this does and doesn't cover (there's no map).
- **Insurance** — browse plans by category, subscribe, view policies, cancel
  a pending/active one. **Auto** additionally has a real comparison/purchase
  engine integrated with [AAS Assurances](https://www.aas-assurances.sn/)'
  digital-attestation API: live multi-tier quotes, wallet-gated purchase with
  real issuance (never marks a policy active without a genuine attestation),
  retry on failure, cancel. See "AAS auto insurance" below for setup, what's
  confirmed vs. best-effort, and how to test without live AAS access.
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
simulated estimate otherwise.

**Not built**: an approval/verification flow for becoming an agent or rider
(this is deliberately a self-service MVP toggle). A user with both a
customer order/ride and an agent/rider role *can't* accept their own
request - `acceptRequest`/`acceptRide` check `existing.userId !== req.user.id`
before the race-safe conditional `updateMany`, alongside the normal "was
this already taken" guard.

### Delivery: address auto-pick + live map tracking

Package delivery (`/delivery`) goes further than rideshare here, in a
Yango-Delivery-style flow:

- **Sender & receiver as distinct parties**: `DeliveryRequest` now carries
  `senderName`/`senderPhone` (defaults to the requester's own account at
  creation time - editable, for sending on someone else's behalf) and
  required `receiverName`/`receiverPhone` for whoever's on the other end
  of the handoff. Browsing the open job board (`GET /delivery/jobs/
  available`) shows names but withholds both phone numbers until an agent
  actually accepts (`AVAILABLE_JOB_FIELDS` in `delivery.controller.js`) -
  `GET /delivery/jobs/mine` returns full contact details once committed.
- **Address auto-pick**: both the pickup and dropoff fields
  (`AddressAutocompleteField.js`) are Google Places Autocomplete fields
  biased to Senegal, not free-typed text - picking a real suggestion gives
  a geocoded lat/lng directly, which is what makes real distance-based
  pricing (above) work for dropoff too, not just pickup-via-geolocation.
  Falls back to an ordinary text field (still submittable, just without
  coordinates) when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` isn't configured -
  same fallback philosophy as the admin Zones tab's map, which shares the
  same loader (`src/hooks/useGoogleMaps.js`, a single page-global script
  load covering `places`+`drawing`+`geometry` so the two features don't
  race to insert conflicting `<script>` tags).
- **Live GPS tracking**: while a job is `ACCEPTED`/`PICKED_UP`, the agent
  dashboard (`/delivery/agent`) pings `PATCH /delivery/jobs/:id/location`
  with the browser's current position every 10s for every active job it
  has (`useLiveLocationBroadcast` in `pages/delivery/agent.js`) - not
  `watchPosition`, so updates land on a predictable cadence rather than
  on every GPS jitter. The customer's tracking page (`/delivery/track/
  [id]`, linked from a "Track" button once a job is accepted) polls
  `GET /delivery/requests/:id` every 5s and renders pickup/dropoff/agent
  pins on a live `LiveTrackingMap.js`, updating the agent marker in place
  without re-fitting the map bounds on every poll (so it doesn't
  re-zoom/pan under the user's thumb as the agent moves).
- **No route line or ETA**: there's no Directions API integration in this
  app, so drawing a route polyline or estimating arrival time would mean
  fabricating one. The tracking page instead shows a straight-line
  distance from the agent's last position to the dropoff - a real
  Haversine calculation, the same honest-math approach as the pricing
  above, just not turned into a time estimate.
- This is delivery-specific for now; rideshare (`/ride-sharing`) still
  uses pickup-only geolocation with no live tracking map, no autocomplete,
  and no sender/receiver split - extending the same components there is a
  natural follow-up.

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
products are in the order gets their line items' total credited as an
`EARNING` wallet transaction (`purpose: "VENDOR_SALE"`), the platform
keeping the rest as its commission - same "share" pattern as the
delivery/rideshare payout split, and (like those two) admin-configurable
via `ModuleConfig("vendor").feeConfig.vendorSharePercent` from the admin
panel's Modules & fees tab (defaults to 85% to the vendor if never
configured). Idempotent per (order, store), so a retried webhook or
duplicate call never double-pays. Orders containing products from an
admin/seed-managed store (`Store.ownerId: null`) are skipped for that
store - there's no vendor wallet to credit.

A vendor's store can be suspended from the admin panel's Vendors tab
(`Store.isActive`) - see "Admin panel" below for what that does to the
store's visibility.

**Not built**: an approval/verification flow for becoming a vendor (same
self-service MVP tradeoff as delivery/ride), and multi-vendor
cart/checkout splitting (checkout is unchanged - one cart, one order,
regardless of how many stores its items come from; payouts still split
correctly per store even though the checkout UI doesn't).

## Restaurant marketplace

Same self-service ownership pattern as the vendor marketplace, applied to
food delivery (Yassir Food-style, not just an order-and-forget menu):

1. **Self-service onboarding** (`/restaurant/register`): any user can opt
   into `RESTAURANT_OWNER` (`PATCH /api/auth/role`) and create one
   restaurant (`Restaurant.ownerId`, nullable + unique - same "at most one
   per user" pattern as `Store.ownerId`). A restaurant's `address`/`lat`/
   `lng` double as its delivery pickup point, so an owner without an
   address set can't dispatch an order (see step 3).
2. **Menu management** (`/restaurant/manage/items`): create/edit/soft-
   delete menu items (`MenuItem.isActive`), same shape as vendor product
   management.
3. **Order lifecycle** (`/restaurant/manage/orders`): a paid order starts
   `CONFIRMED`, and the owner walks it through `PREPARING` →
   `OUT_FOR_DELIVERY` (or cancels from either state, refunding the
   customer's wallet). That last transition
   (`dispatchForDelivery` in `server/src/modules/restaurant/orders.
   controller.js`) is the entire "use the delivery module" integration:
   it creates an ordinary `DeliveryRequest` - pickup = the restaurant,
   dropoff = the order's delivery address, sender = the restaurant/owner,
   receiver = the customer - with no agent pre-assigned, so it shows up on
   the exact same open job board any delivery agent already sees
   (`GET /delivery/jobs/available`), no parallel dispatch system. `DELIVERED`
   is never set by the owner - it only ever arrives via that
   `DeliveryRequest`'s own completion (see `markDelivered`'s cascade in
   `delivery.controller.js`, which flips any `RestaurantOrder` linked by
   `deliveryRequestId`), so "delivered" always reflects a real agent-
   confirmed handoff, not the restaurant's own say-so. Once dispatched, the
   customer gets the identical live-tracking experience described in
   "Delivery: address auto-pick + live map tracking" above (`/delivery/
   track/[id]`, linked from a "Track" button on their food order).
4. **Checkout & payment**: customers pick a delivery address via the same
   `AddressAutocompleteField` the delivery module uses, and pay by wallet
   at order time - the only payment method wired up here today (unlike
   ecommerce, which also offers a PayDunya redirect; that's a documented
   gap, not a silent one). The delivery fee itself is estimated the same
   way a standalone package delivery is (real distance-based pricing when
   both ends have coordinates), but isn't itemized onto the order total -
   it's platform-absorbed for now, so the agent is still paid their normal
   share out of that estimate without the customer being charged for it
   twice. Adding a real delivery-fee line item to the order total is a
   natural follow-up.
5. **Commission**: like vendor sales, a restaurant owner's share of each
   paid order is credited to their wallet automatically
   (`server/src/modules/restaurant/restaurant.service.js`'s
   `payoutOwnerForOrder`, called right after the wallet debit settles),
   admin-configurable via `ModuleConfig("restaurant").feeConfig.
   ownerSharePercent` from the admin panel's Modules & fees tab (defaults
   to 85% to the owner). Idempotent per order, same pattern as vendor
   payout.
6. **Admin management** (admin panel's Restaurants tab): lists every
   owner-run restaurant with its menu-item and order counts, and a switch
   for `Restaurant.isActive` - suspending one hides it from public
   browsing and its own page shows an "unavailable" state, without
   deleting the owner's menu or order history (identical behavior to the
   Vendors tab's `Store.isActive`).

**Job-board privacy**: unlike vendor product listings, an available
delivery job's sender/receiver phone numbers are withheld until an agent
accepts (`AVAILABLE_JOB_FIELDS` in `delivery.controller.js`) - this
already applied to every delivery job, restaurant-dispatched or not, from
the delivery module build.

**Not built**: an approval/verification flow for becoming a restaurant
owner (same self-service MVP tradeoff as vendor/delivery/ride), a PayDunya
checkout option (wallet-only for now, as noted above), and itemizing the
delivery fee onto the customer's order total.

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

## AAS auto insurance

Auto insurance (`pages/insurance/auto/`) is a real multi-provider comparison
engine, though only one insurer is actually wired in today: [AAS
Assurances](https://www.aas-assurances.sn/)'s "Assurance Digitale" API for
the AUTOMOBILE branch (Mono/four-wheel and deux roues/C5 two-wheelers).
Adding a second real insurer means adding another module beside
`server/src/modules/insurance/aasClient.js` and another branch in
`aas.controller.js`'s quote/purchase functions - the comparison results
shape (`{ companyCode, tier, premium, ... }`) and the `InsuranceAutoPolicy`
schema (`companyCode` field) were built with that in mind, not AAS-specific.

**Flow**: vehicle details → live per-tier quotes from AAS (`rc.request`/
`rc.moto`) → pick a tier → vehicle + subscriber/insured details → pay from
wallet → AAS issuance (`qrcode.request`/`moto.request`) → real digital
attestation link, or an honest failure with the payment refunded. The
customer-facing pages are `pages/insurance/auto/index.js` (the wizard) and
`pages/insurance/auto/policies.js` ("my auto policies" - retry a failed
issuance, cancel an active one).

**Hard invariants** (see `aas.controller.js` comments for where each is
enforced): never sell a quote AAS can't actually issue (`assertCanIssue`
probes `stock.qr` before any wallet debit); never mark a policy `ACTIVE`
without a real `linkAttestation` from AAS; a failed issuance always refunds
the wallet and records `fulfillmentError`/`fulfillmentErrorCode` plus the
exact request/response (`requestSnapshot`/`responseSnapshot`) so support can
tell "AAS refused the payload" from "we never sent the field"; retries use a
fresh `referenceTrxPartner` (`-R1`, `-R2`, ...) since AAS rejects a reused
reference even after a failed attempt, and are refused once a real
attestation exists.

**Setup**: AAS credentials go under admin → Providers, category
`INSURANCE_AAS` (`partner`, `accessToken`, `username`, `police`, `baseUrl`,
`timeoutMs`, `garantieOptPT`) - see the example JSON that category preset
fills in. Admin config wins over the `AAS_*` env vars in `server/.env`
(`.env.example` documents both). `garantieOptPT` is a tariff decision (which
"personnes transportées" option to charge whenever a tier includes that
guarantee) - the default tiers (`TIER_GARANTIES`/`MOTO_TIER_GARANTIES` in
`server/src/constants/aasGuarantees.js`) never include it, so it's unused
today. `npm run seed:test-data` (from `server/`) creates this Provider row
automatically, pointed at the local stand-in
(`baseUrl: "http://localhost:5099"`), plus two sample `InsuranceAutoPolicy`
rows (one `ACTIVE`, one `FAILED`) for the seeded test customer - run
`npm run aas:standin` alongside it and the whole flow works with zero
manual admin setup.

**Testing without live AAS access**: there is no network egress to AAS's
real sandbox from this build's environment, so everything was built and
tested against a local stand-in
(`server/src/modules/insurance/aasStandIn.js`) that reproduces every
documented sandbox-reality behavior - run it with `npm run aas:standin`
(inside `server/`) and point `AAS_BASE_URL` at it
(`http://localhost:5099` by default). It also exposes `GET
/__standin/state` and `POST /__standin/reset` (with an optional `qrStock`
body) for driving specific scenarios - stock exhaustion, duplicate
references, etc. - from a test script. **Before trusting this in
production, run it against AAS's real sandbox at least once** and compare
behavior against what the stand-in assumes.

**What's confirmed vs. best-effort**: the source material is the vendor's
own "Description API Assurance Digitale A.A.S V.1.1" PDF (which turned out
to have the full field-level spec for every endpoint used here, not just
the metadata tables) plus hand-written integration notes from a prior real
build of this same integration, documenting exactly where the PDF is wrong
about the live sandbox. Both are cited by comment throughout `aasClient.js`
and `aasStandIn.js`. Two things remain genuinely unverified because the
notes flag them as never exercised live: `qrcode.mono.cancel`'s exact
query-param shape (the doc's own section 5.3 gives one; a referenced
Postman collection allegedly gives a different JSON-body one - the doc's
shape is what's implemented), and which guarantee codes each tier should
actually carry (`TIER_GARANTIES`/`MOTO_TIER_GARANTIES` are a placeholder
business decision, clearly commented as such - revisit with
product/underwriting). REMORQUE (trailer) and BUS_ECOLE genres are
excluded on purpose: they use their own dedicated AAS endpoint families
(PDF sections 5.4-5.5 and 8) that aren't implemented, same as the C4 (Pool
TPV) vehicles AAS's own doc says are excluded from digital issuance.

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

**Two ways in, both landing on the same `/admin`:**

- **`/admin/login`** - a dedicated email + password entrance for the admin
  console, entirely separate from the customer phone/OTP flow (see
  `POST /api/auth/admin/login` in `server/src/modules/auth/`). Only works
  for an account that both has `role = ADMIN` *and* a `passwordHash` set -
  `User.passwordHash` (bcrypt, `server/src/utils/password.js`) is never set
  by any self-service path, so this can't be used to grant admin access,
  only to log into an account that already has it.
- **`/auth/login`** - the normal customer phone/OTP flow still works for
  any `ADMIN`-role account too, password or not (`AdminPanel` only checks
  `user.role === "ADMIN"`, not how the session was established). This is
  what a promoted admin uses if nobody's ever set them a password.

`User.phone` is nullable specifically so an admin-only account created via
email+password doesn't need a phone number it'll never use for login.

**Logging in, for local dev/testing:**

1. `npm run seed:test-data` (from `server/`, see
   `server/prisma/seed-test-data.js`) creates a ready-to-use ADMIN account
   at `+221771000006` / `admin@gmail.com`, alongside its one-per-role test
   users. Its console password is `saynabou` (seed script logs it on every
   run, right after "Admin console (/admin/login):").
2. Open `/admin/login` and sign in with `admin@gmail.com` / `saynabou`.
   Or, with `OTP_DEV_MODE=true` (the default in `server/.env.example`),
   every OTP is echoed back in the `/api/auth/otp/request` response instead
   of actually being sent - no SMS account needed. Set
   `OTP_DEV_FIXED_CODE=000000` (also in `.env.example`, commented out by
   default) to make every OTP that same fixed code instead of a fresh
   random one each time, so repeated manual testing doesn't mean copying a
   new code every login - request an OTP for `+221771000006`, then verify
   with `000000`, every time. Only ever honored when `OTP_DEV_MODE=true`,
   so it's safe to leave set in a dev `.env`.
3. Either way, `/admin` (or Profile → Admin panel, shown only to `ADMIN`
   users) is now open.

In production, promote the first admin directly in the database (there's
deliberately no other way in). A password is optional - without one, that
account signs into `/admin` through the normal phone/OTP flow instead:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE phone = '+221...';
```

After that, other admins can be promoted from the panel's Users tab
itself. `requireAuth` re-fetches the user from the DB on every request, so
a role change (or `active: false` suspension) takes effect on the user's
very next request - no re-login needed, and no way for a suspended user to
keep using a still-valid token.

There's no Users-tab UI yet to set a `/admin/login` password for an admin
promoted this way (a gap, not a design choice) - do it directly with a
bcrypt hash in the meantime:

```js
// node -e 'require("bcryptjs").hash("the-password", 10).then(console.log)'
```

```sql
UPDATE "User" SET "passwordHash" = '<hash from above>' WHERE email = '...';
```

**Users**: search/filter (text search, plus one-tap role chips -
Customer/Vendor/Rider/Delivery Agent/Admin - both hit the same
`GET /admin/users?role=` the text search uses), change role (including
to/from `ADMIN`), and suspend (`active: false` - `requireAuth` rejects
every request from a suspended user with 403). An admin can't deactivate
their own account (guarded server-side, not just hidden in the UI). This
tab is also how delivery agents and riders get managed day-to-day - there's
no separate "delivery men" screen, since a delivery agent is just a `User`
with `role: "DELIVERY_AGENT"`.

**Modules & fees**: `ModuleConfig` (one row per module, key matching
`server/src/modules/<key>`) has an `enabled` toggle that's actually
enforced - `requireModuleEnabled(key)` (see `app.js`) sits in front of
every module's routes and returns `503` when disabled, and
`GET /api/modules/status` (public, unauthenticated) lets the web/mobile
clients hide a disabled module's nav entry. `delivery`, `rideshare`,
`vendor`, and `restaurant` have a real fee editor, because those are the
only modules whose pricing/payout code actually reads `ModuleConfig.
feeConfig` - `delivery`/`rideshare`'s `estimatePrice` (base fare, rate/km,
driver/agent payout share), `vendor.service.js`'s `payoutVendorsForOrder`
(`vendorSharePercent`), and `restaurant.service.js`'s `payoutOwnerForOrder`
(`ownerSharePercent`) - both default to 85% to the seller, the rest being
the platform's implicit commission on every sale. Every other module's
toggle only controls availability, not price, since there's no fee math
anywhere else yet to hook a fee config into.

**Vendors**: lists every vendor-owned `Store` (admin/seed-managed stores
with no `ownerId` don't show here - there's nothing to suspend) with its
owner and product count, and a switch for `Store.isActive`. Suspending a
store hides all of its products from every public listing
(`GET /ecommerce/products`, including a direct `?store=` browse) and from
direct product-page access, and its `/store/[slug]` storefront shows an
"unavailable" message instead of its catalog - without deleting the
vendor's store, products, or order history. This is the platform's only
vendor-suspension lever today; there's no separate ban/warning workflow.

**Restaurants**: identical pattern for `Restaurant.isActive` - lists every
owner-run restaurant (again, admin/seed-managed ones with no `ownerId`
don't show here) with its owner, menu-item count, and order count.
Suspending one hides it from public browsing and its `/restaurant/[slug]`
page shows an "unavailable" state instead of its menu, without deleting
the owner's menu or order history. See "Restaurant marketplace" above for
the full self-service flow this tab moderates.

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
vendor. The category field offers `SMS`, `PAYMENT`, `MAPS`, `EMAIL`,
`FIREBASE`, `OPENAI`, `GEMINI`, `CLAUDE`, and `INSURANCE_AAS` as presets
(free text still accepts anything else). **Only `SMS` and
`INSURANCE_AAS` have real behavior wired to them** - the other presets
(PAYMENT, MAPS, EMAIL, FIREBASE, OPENAI, GEMINI, CLAUDE) exist purely as
labeled credential storage: there is no feature anywhere in this app that
reads a Provider row in those categories yet. Adding one of those presets
makes it possible to *store* an API key for a future integration without
a schema change; it does not, by itself, wire up anything. Wiring an
actual feature to one of these keys (e.g. an AI product-description
generator, or Firebase push notifications) is future work with its own
scope.

`INSURANCE_AAS` has its own dedicated admin UI rather than this tab's raw
JSON textarea - see the admin panel's **Insurance** tab (below) and the
"AAS auto insurance" section above. It still saves to the same generic
`Provider` model under the hood, so the JSON textarea here would also
work for it in a pinch (same category, same field names), but the
structured form is the intended way to manage it.

For the `SMS` category specifically, `server/src/utils/otp.js` sends OTP
codes through whatever `Provider` row
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

**Insurance**: a dedicated tab (not the generic Providers/Services tabs)
with two views, toggled at the top: **Provider config** - a structured
form (partner, access token, username, police, base URL, timeout,
personnes-transportées option) for the AAS `Provider` row, instead of
hand-editing JSON, since `aasClient.js` reads a fixed set of documented
keys rather than a freeform request template; and **Policies** - the
same fulfillment-status/failure-triage view described in "AAS auto
insurance" above (`AdminAasPoliciesTab`).

**Services**: admin CRUD for `MobileService` (the airtime/bill catalog -
previously seed-only, now editable without a redeploy) and `InsurancePlan`
(create/edit; no delete, since removing a plan with existing
`InsurancePolicy` rows would violate a foreign key with no
soft-delete/reassignment flow built for that yet).

**Dashboard**: `GET /admin/stats` - user/order/role counts, pending
deliveries, active rides, vendor stores, open Anando postings. Read-only.

**What the admin panel deliberately does *not* do**: there's no "backup"
button here. Database backups are handled at the hosting/infra layer, not
as an app feature - Render's managed Postgres (see `DEPLOY_RENDER.md`)
takes automatic daily backups with point-in-time recovery on paid plans,
and the Railway equivalent is documented in `DEPLOY_RAILWAY.md`. Building
a custom in-app backup feature would mean
either re-implementing what the managed Postgres already does, or shipping
something worse (an app-level export with no point-in-time recovery,
running on the same box it's meant to protect). If a scheduled *export*
(e.g. a nightly CSV/JSON dump to object storage, distinct from
infra-level backups) is wanted later, that's a separate, well-scoped
feature to design on its own.

## Deploying

- [DEPLOY_RENDER.md](./DEPLOY_RENDER.md) — Render Web Services + Render
  Postgres, with a [`render.yaml`](./render.yaml) Blueprint for one-shot
  infra-as-code setup (the platform actually in use for this project)
- [DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md) — Railway + Railway Postgres
- [DEPLOY_SCALE.md](./DEPLOY_SCALE.md) — infrastructure and monthly cost
  estimates for scaling from 100K to 1M users

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
