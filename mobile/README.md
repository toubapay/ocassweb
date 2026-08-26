# Ocass Mobile (Flutter)

Native iOS/Android client for the Ocass super app, covering the same
modules as the web app (Ecommerce, Restaurant, Delivery, Ride Sharing,
Insurance, Airtime Top-up & Bill Payment, the Vendor marketplace, Anando
carpooling, and in-app notifications) against the same backend (`/server`).

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
2. `lib/screens/topup/topup_screen.dart` - `FlutterContacts.native.showPicker(...)`.
   This method name and its "no permission needed" behavior came from a
   single pub.dev doc fetch, not from experience with the package; if it's
   wrong, that function is small and isolated to fix.
3. `lib/core/geo.dart` - `Geolocator.getCurrentPosition(locationSettings: ...)`.
   Same caveat as above: written from pub.dev docs for `geolocator: ^13.0.2`,
   not verified against a real build: `LocationSettings` replaced an older
   `desiredAccuracy` positional param in some prior major version, so this
   is worth a second look if `flutter analyze` flags it.
4. `widgets/live_tracking_map.dart` and any `GoogleMap(...)` usage -
   `google_maps_flutter: ^2.10.0` was added without a Flutter SDK to
   compile against; its API has been stable for a while but this specific
   version's signatures (`CameraUpdate.newLatLngBounds`, marker hue
   constants) weren't verified against a real build.
5. Anywhere using Dart 3 records (`(a, b, c)` / `.$1` field access) -
   straightforward but easy to typo by hand.
6. Every `onPlaceSelected: ({required address, required lat, required lng}) => ...`
   callback (delivery/ride-sharing/Anando/vendor screens, calling into
   `AddressAutocompleteField`) relies on Dart inferring the named
   parameters' types from the assignment target's declared function type
   rather than spelling them out - a well-established Dart 3 pattern, but
   this exact shape (required + untyped, all three params) wasn't compiled
   here. If `flutter analyze` flags it, the fix is adding the types back
   explicitly (`{required String address, required double lat, required double lng}`)
   in each call site - a mechanical, low-risk change.
7. Minor Flutter-version drift (a Material 3 API renamed between the
   version this assumes and whatever you have installed).
8. `screens/insurance/insurance_auto_screen.dart` - `ImagePicker().pickImage(source: ImageSource.camera, ...)`
   (`image_picker: ^1.1.2`, added for the carte grise photo scan). Written
   from pub.dev docs, not verified against a real build; the API has been
   stable for a long time so this is low-risk, but check it first if
   `flutter analyze` flags anything in that file.

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

For the contact picker in the Top Up module (`flutter_contacts`), add the
native permission entries once the above has generated the files:

- **Android** (`android/app/src/main/AndroidManifest.xml`), inside `<manifest>`:
  ```xml
  <uses-permission android:name="android.permission.READ_CONTACTS"/>
  ```
- **iOS** (`ios/Runner/Info.plist`), inside the top-level `<dict>`:
  ```xml
  <key>NSContactsUsageDescription</key>
  <string>Ocass uses your contacts to let you pick a phone number to top up.</string>
  ```

For the "use my location" pickup button in Delivery/Ride Sharing
(`geolocator`), add these too:

- **Android** (`android/app/src/main/AndroidManifest.xml`), inside `<manifest>`:
  ```xml
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
  <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
  ```
- **iOS** (`ios/Runner/Info.plist`), inside the top-level `<dict>`:
  ```xml
  <key>NSLocationWhenInUseUsageDescription</key>
  <string>Ocass uses your location to set an accurate delivery/ride pickup point.</string>
  ```

For the Google Maps live tracking/vendor-map widget (`google_maps_flutter`,
`widgets/live_tracking_map.dart`), add a **native** API key - separate from
the `GOOGLE_MAPS_API_KEY` dart-define below, which only covers the Places
Autocomplete/Details REST calls in `core/places.dart`. This mirrors the web
app needing both `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` *and* the Maps
JavaScript API enabled in Google Cloud Console - here it's a dart-define
*and* this native key, enabling **Maps SDK for Android** / **Maps SDK for
iOS** respectively (plus **Places API** for the key used in the dart-define
below). Use a real key only in a local, gitignored file - never commit one:

- **Android** (`android/app/src/main/AndroidManifest.xml`), inside
  `<application>`:
  ```xml
  <meta-data android:name="com.google.android.geo.API_KEY" android:value="YOUR_KEY"/>
  ```
  `google_maps_flutter` also requires `minSdkVersion 21+` in
  `android/app/build.gradle` (`flutter create` generates this at whatever
  its current default is - bump it if `flutter analyze`/build complains).
- **iOS** (`ios/Runner/AppDelegate.swift`), before
  `GeneratedPluginRegistrant.register`:
  ```swift
  import GoogleMaps
  GMSServices.provideAPIKey("YOUR_KEY")
  ```
  (Adds a `pod 'GoogleMaps'` dependency automatically via
  `google_maps_flutter_ios` - no manual Podfile edit needed.)

For the carte grise photo scan in Auto Insurance (`image_picker`,
`screens/insurance/insurance_auto_screen.dart`), add:

- **Android** (`android/app/src/main/AndroidManifest.xml`), inside `<manifest>`:
  ```xml
  <uses-permission android:name="android.permission.CAMERA"/>
  ```
- **iOS** (`ios/Runner/Info.plist`), inside the top-level `<dict>`:
  ```xml
  <key>NSCameraUsageDescription</key>
  <string>Ocass uses your camera to scan your vehicle's registration card (carte grise) and prefill your insurance application.</string>
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

Address autopick (Delivery, ride-sharing, Anando, Vendor - see
`core/places.dart`) needs a second compile-time define, on top of the
native Maps key from the setup step above:

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api \
  --dart-define=GOOGLE_MAPS_API_KEY=YOUR_KEY
```

Every screen using `AddressAutocompleteField`/`LiveTrackingMap` degrades to
a plain text field / omitted map when this is unset, same fallback
philosophy as the web app's `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` - so it's
safe to skip during normal development.

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
cart, checkout, orders, wishlist) and Restaurant (per-restaurant cart,
place order, order history); request forms with cancel for Delivery/Ride
Sharing, and subscribe/cancel for Insurance; Airtime Top-up & Bill Payment
(manual or device-contacts phone entry, operator auto-detected, backend-
managed catalog); a Wallet (balance, top-up, transaction history) reachable
from the profile screen, usable at ecommerce checkout as an alternative to
PayDunya; phone+OTP auth.

**French / English**, matching the web app: `lib/l10n/strings_en.dart` and
`strings_fr.dart` hold the same key set as `src/i18n/locales/{en,fr}.json`
(hand-derived from that JSON, not codegen'd - there's no Flutter SDK here
to run `flutter gen-l10n`), `LocaleProvider` persists the choice with
`shared_preferences` (French default, same as web), and
`context.t('some.key')` mirrors the web's `t("some.key")`. One difference
from the web hook: `context.t()` reads via `context.watch`, so it's only
safe to call from a `build()` method - anywhere else (a button's
`onPressed`, an async method) use `context.tr()` instead, which reads the
current language with `context.read` and doesn't try to subscribe to
changes outside of a build phase. `context.tOr(key, fallback)` mirrors the
web's `t(key, { defaultValue })` for backend-sourced text (category names,
order/ride/delivery statuses) where only a known subset is translated.

**Delivery/ride dispatch**, matching the web app: any user can opt into the
`DELIVERY_AGENT`/`RIDER` role from the profile screen and reach a dashboard
(`/delivery/agent`, `/ride-sharing/driver`) listing unassigned jobs, accept
one, and walk it through pickup/start to delivered/completed - same
backend endpoints and race-safe accept as the web app. The "use my
location" pickup button (`lib/core/geo.dart`, via the `geolocator` package)
mirrors the web's `navigator.geolocation` button, and sits alongside real
Places-suggestion picking (see below) as a second way to get coordinates.

**Address autopick + live tracking** (`core/places.dart`,
`widgets/address_autocomplete_field.dart`, `widgets/live_tracking_map.dart`
- Dart ports of `src/components/maps/AddressAutocompleteField.js` and
`LiveTrackingMap.js`): Delivery's request form (sender/receiver, pickup/
dropoff), ride-sharing's pickup/dropoff, Anando's origin/destination, and
the Vendor store form all use Places Autocomplete/Details instead of plain
text, and Delivery gets a dedicated `/delivery/track/:id` screen polling
the agent's live position onto a map, same as `pages/delivery/track/[id].js`
on web. Every one of these degrades to a plain text field (autocomplete)
or an omitted map (tracking) when `GOOGLE_MAPS_API_KEY` isn't set - see
"Running against the backend" above.

**Vendor marketplace**: any user can opt into the `VENDOR` role from the
profile screen, create/edit a store (name, address with map picking, logo
URL), add products (category, price, discount price, stock - no image
upload, same as the store logo field: a plain URL), and view orders
containing their products. Matches `pages/vendor/*.js` on the web.

**Anando** (peer-to-peer carpooling), independent of the `RIDER` gig-work
role above - any user can post a ride they're already making (scheduled
or "leaving now" instant availability, BlaBlaCar-style) and/or book a seat
on someone else's, paying cash, wallet, or PayDunya. The hub
(`/anando`) has Available/My rides/My bookings tabs; posting and booking
are separate pushed screens (`/anando/post`, `/anando/book`) rather than
web's modal dialogs. Since there's no `GET /anando/postings/:id` backend
endpoint, the booking screen receives the full posting via go_router's
`extra` parameter from the postings list it was opened from, rather than
re-fetching it.

**In-app notifications**: a bell + unread badge in `TopBar` and the home
screen header (`NotificationsProvider` polls the unread count every 30s
while signed in, matching the web's `refetchInterval: 30000`), and a
`/notifications` list screen with mark-read/mark-all-read. Anando booking
notifications deep-link to `/anando` on tap, same as the web app.

PayDunya's hosted checkout (used by both ecommerce checkout and wallet
top-up) opens in the device's external browser via `url_launcher` rather
than in-app - there's no custom URL scheme registered for PayDunya's
return_url to hand control back to the app, so after paying the customer
finishes on the web app's `/payments/return` page and returns to the app
manually. A real deep link back into the app is the natural follow-up if
this becomes the primary flow.

The home screen's module icons are drag-to-reorder (long-press then drag,
via `reorderable_grid_view`), persisted locally with `shared_preferences` -
the mobile equivalent of the web app's redux-persist-backed layoutSlice.
