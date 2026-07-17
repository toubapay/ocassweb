# Ocass Mobile (Flutter)

Native iOS/Android client for the Ocass super app, covering the same 5
modules as the web app (Ecommerce, Restaurant, Delivery, Ride Sharing,
Insurance) against the same backend (`/server`).

## ⚠️ Before you start: this code has not been compiled

This was written in an environment with no Flutter SDK and a network
policy that blocks the hosts the Flutter SDK installer itself needs
(`github.com`, `storage.googleapis.com`) - only `pub.dev` was reachable.
So: no `flutter create`, `pub get`, `analyze`, or build ever ran here.
Every file was written by hand and manually cross-checked (imports resolve,
referenced classes exist, package APIs matched against current pub.dev
docs) but **expect to spend a first pass running `flutter analyze` and
fixing whatever it finds** - most likely spots, in rough order of risk:

1. `lib/screens/home/home_screen.dart` - `ReorderableGridView.count(...)`
   is the least-common widget used here.
2. Anywhere using Dart 3 records (`(a, b, c)` / `.$1` field access) -
   straightforward but easy to typo by hand.
3. Minor Flutter-version drift (a Material 3 API renamed between the
   version this assumes and whatever you have installed).

## First-time setup

Flutter's native `android/` and `ios/` project scaffolding isn't included
here (it's boilerplate `flutter create` generates from your local SDK/tool
versions - hand-writing it blind risked being outright broken). Generate
it once, in this directory:

```bash
cd mobile
flutter create --platforms=android,ios --org com.ocass --project-name ocass_mobile .
```

This scaffolds `android/` and `ios/` without touching the `lib/`,
`pubspec.yaml`, or `analysis_options.yaml` already here (flutter create
skips files that already exist). Then:

```bash
flutter pub get
flutter analyze     # fix whatever it flags - see above
```

## Running against the backend

The API base URL is a compile-time define (`lib/core/constants.dart`):

```bash
# Android emulator (10.0.2.2 reaches the host machine's localhost):
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api

# iOS simulator:
flutter run --dart-define=API_BASE_URL=http://localhost:5000/api

# Physical device / deployed backend:
flutter run --dart-define=API_BASE_URL=https://your-backend-url/api
```

Start the backend first (`cd ../server && npm run dev`, or point at the
deployed Cloud Run backend from /DEPLOY_GCP.md).

## Structure

```
lib/
  main.dart, app.dart       Entry point, provider + router wiring
  theme/                    AppColors + ThemeData matching the web app's palette
  core/                     API client (Dio), secure token storage, module registry, formatting
  models/                   Response models (note: Prisma Decimal fields serialize as JSON strings - see product.dart)
  providers/                ChangeNotifier state: auth, cart, wishlist, module order
  router/                   go_router config + the bottom-tab shell
  widgets/                  Shared UI: ModuleTile, ProductCard, TopBar, CategorySidebar, OtpInput, ...
  screens/                  One folder per module, mirroring the web app's pages/ structure
```

## What's implemented

Same scope as the web app: full-depth Ecommerce (browse, product detail,
cart, checkout, orders, wishlist), phone+OTP auth, and request-form shells
for Delivery/Ride Sharing/Insurance plus a Restaurant browse/menu screen
(ordering not wired up yet, matches the web app).

The home screen's module icons are drag-to-reorder (long-press then drag,
via `reorderable_grid_view`), persisted locally with `shared_preferences` -
the mobile equivalent of the web app's redux-persist-backed layoutSlice.
