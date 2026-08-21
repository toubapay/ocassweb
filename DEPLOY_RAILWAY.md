# Deploying Ocass to Railway

Two Railway services (frontend, backend) in one project, plus Railway's
managed Postgres. This reuses the same `Dockerfile` / `server/Dockerfile`
written for the [Cloud Run guide](./DEPLOY_GCP.md) - Railway auto-detects
and builds a Dockerfile it finds in a service's root directory, no separate
config needed for that part.

**This was not run from this environment.** Railway's app/API
(`backboard.railway.app`) and docs site are both blocked by this sandbox's
network policy, so nothing here could be executed or verified against live
docs - it's written from Railway's stable, long-standing deployment model
(services, root directory, reference variables). The dashboard's exact
button labels may have moved since; the concepts below haven't.

## 1. Create the project + database

1. [railway.app/new](https://railway.app/new) → **Deploy from GitHub repo**
   → pick `toubapay/ocassweb`. Railway will create one service from the
   repo root - keep it, it'll become the frontend (step 2 sets its root
   directory explicitly).
2. In the same project, **+ New → Database → Add PostgreSQL**. Railway
   provisions it and exposes connection variables automatically to other
   services in the project via reference syntax (`${{Postgres.DATABASE_URL}}`
   etc.) - no manual connection string needed.

## 2. Backend service

On the service Railway created from the repo (or a new one, **+ New →
GitHub Repo** → same repo again if you kept the first as frontend):

- **Settings → Source → Root Directory**: `server`
- Railway will find `server/Dockerfile` and build from it automatically.
- **Settings → Variables**, add:
  ```
  DATABASE_URL   = ${{Postgres.DATABASE_URL}}
  JWT_SECRET     = <generate one, e.g. `openssl rand -base64 32`>
  JWT_EXPIRES_IN = 7d
  OTP_DEV_MODE   = true
  OTP_TTL_MINUTES = 5
  CORS_ORIGIN    = *
  ```
  `OTP_DEV_MODE=true` echoes OTP codes in the API response since no SMS
  provider is wired up yet (see the root README) - turn it off once you add
  one.
- **Settings → Networking → Generate Domain** to get a public HTTPS URL
  (`<service>.up.railway.app`). Name the service `backend` if prompted -
  the frontend variable below references it by that name.
- **Rename this service to `backend`** (Settings → General) if it isn't
  already, since the frontend's `BACKEND_URL` below references it by name.

Run the database migration + seed once, from your own machine, using the
Railway CLI (which needs to run somewhere that can reach
`backboard.railway.app` - not this sandbox):

```bash
npm install -g @railway/cli
railway login
railway link          # pick this project
railway run --service backend npm run prisma:deploy   # from the server/ directory
railway run --service backend npm run seed
```

`npm run seed` only loads the sample catalog (categories/products/
restaurants/plans) - it creates no login-ready accounts. For a
ready-to-use admin console login plus one test user per role, also run:

```bash
railway run --service backend npm run seed:test-data
```

This prints an `ADMIN` account (`admin@gmail.com` / `saynabou`) you can
sign in with at `/admin/login` - see `README.md`'s "Admin panel" section.
Running `npm run seed:test-data` any other way (e.g. against a local
database instead of `railway run --service backend`) seeds that other
database instead, leaving the live site's database untouched.

## 3. Frontend service

On the frontend service (repo root, no Root Directory override needed
since the top-level `Dockerfile` is already there):

- **Settings → Variables**, add:
  ```
  BACKEND_URL = https://${{backend.RAILWAY_PUBLIC_DOMAIN}}
  ```
  This is why the backend service needed a public domain and the name
  `backend` in step 2 - Railway resolves that reference to its live URL.
  Same mechanism as the Cloud Run guide's `BACKEND_URL`: it's read
  server-side by `middleware.js` (`/api/* → BACKEND_URL/api/*`), freshly
  on every request - never baked into the client bundle, and (unlike an
  approach using `next.config.js`'s `rewrites()`, which resolves once at
  build time) not baked into the server build either, so it can genuinely
  change without a rebuild.
- **Settings → Networking → Generate Domain** for the frontend's own
  public URL - that's the live app.
- **Optional - Google Maps**: add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to
  the same Variables tab to enable the admin Zones tab's polygon-drawing
  map, delivery's address autocomplete, and its live tracking map (every
  one degrades to a manual/text-only fallback without it, so skip this
  freely). Railway passes Dockerfile-service variables through as build
  args automatically (matching the `ARG` in the Dockerfile), so unlike
  the GCP guide's workaround this needs no extra build step - just add
  the variable and redeploy. Enable the **Maps JavaScript API** and
  **Places API** for the key in Google Cloud Console, and restrict it
  (Credentials → your key → Application restrictions → HTTP referrers)
  to this service's Railway domain - the key ships inside client-side
  JS, so referrer restriction is what keeps it from being usable
  elsewhere, not secrecy.
- **Optional, separate feature - real road-distance pricing**: add
  `GOOGLE_MAPS_SERVER_KEY` to the **backend** service's Variables to make
  delivery/ride-sharing price off Google's Distance Matrix API instead of
  straight-line distance (falls back automatically without it). Restrict
  this key by **IP address**, not HTTP referrer - it's only ever called
  server-side. Enable the **Distance Matrix API** for it. See
  `server/src/utils/distanceMatrix.js`.

## 4. Ongoing deploys

Both services redeploy automatically on push to the connected branch,
same as the Cloud Build trigger in the GCP guide - Railway's GitHub
integration handles this natively once the services are connected, no
extra config file needed.

## Costs

Railway bills usage-based (compute + a Postgres instance) after a small
free allowance - check your plan's current pricing before deploying, since
this sandbox couldn't reach railway.app to confirm current numbers.
