# Deploying Ocass to Render

Two Render Web Services (frontend, backend), each built from its existing
Dockerfile, plus Render's managed Postgres. This reuses the same
`Dockerfile` / `server/Dockerfile` written for the
[Cloud Run guide](./DEPLOY_GCP.md) - Render, like Cloud Run and Railway,
builds a Dockerfile it finds in the repo without needing a separate
buildpack config, and injects its own `PORT` env var into the container at
runtime, overriding the `ENV PORT=8080` default baked into both
Dockerfiles. No code changes were needed to support Render.

**This was not run from this environment.** Render's dashboard, API
(`api.render.com`), and docs site are all blocked by this sandbox's
network policy, so nothing here could be executed or verified against a
live deploy - it's written from Render's documented, stable
[Blueprint spec](https://render.com/docs/blueprint-spec) and Docker-service
model. Button labels in the dashboard may have moved since; the concepts
below haven't.

## Option A: Blueprint (recommended)

[`render.yaml`](./render.yaml) in the repo root declares both services and
the database in one file - Render's infra-as-code equivalent of
`cloudbuild.yaml` in the GCP guide.

1. [dashboard.render.com/blueprints](https://dashboard.render.com/blueprints)
   → **New Blueprint Instance** → pick `toubapay/ocassweb` →
   branch `main` (or whichever branch you deploy from). Render parses
   `render.yaml` and shows a plan: 1 database (`ocass-db`), 2 web services
   (`ocass-backend`, `ocass-frontend`).
2. `render.yaml` deliberately leaves `plan` unset on all three resources,
   so Render applies its own current default plan for each rather than
   this file hardcoding a tier that might get renamed or retired later.
   Review the plan Render preselects for each resource on this screen and
   change it if you want something else - see Costs below.
3. Apply it. Render provisions the database first, then builds and deploys
   both services from their respective Dockerfiles.
4. A few env vars in `render.yaml` are intentionally marked `sync: false`
   (PayDunya keys, plus `BACKEND_URL`/`APP_FRONTEND_URL`/`APP_BASE_URL`) -
   Render's Blueprint spec has no way to concatenate a `https://` scheme
   onto a `fromService` hostname reference, so these need one manual pass
   after the first deploy. See step 4 below.

Editing `render.yaml` and pushing later updates the existing services in
place (Render matches on the `name` fields) rather than creating new ones.

## Option B: Manual setup

If you'd rather not use the Blueprint, create the same three resources by
hand:

1. **New +** → **PostgreSQL**. Name it `ocass-db`, note the **Internal
   Database URL** once it's provisioned.
2. **New +** → **Web Service** → connect `toubapay/ocassweb`.
   - **Runtime**: Docker. **Dockerfile Path**: `server/Dockerfile`.
     **Docker Build Context Directory**: `server`.
   - **Pre-Deploy Command**: `npx prisma migrate deploy` - runs against
     the new instance before it takes traffic, same purpose as the manual
     `railway run --service backend npm run prisma:deploy` step in the
     Railway guide, but automatic here since Render has a dedicated hook
     for it.
   - **Health Check Path**: `/api/health`.
   - Environment variables (see the full list and description of each in
     [`server/.env.example`](./server/.env.example)):
     ```
     DATABASE_URL    = <ocass-db's Internal Database URL>
     JWT_SECRET      = <generate one, e.g. `openssl rand -hex 32`>
     JWT_EXPIRES_IN  = 7d
     OTP_DEV_MODE    = true
     OTP_TTL_MINUTES = 5
     CORS_ORIGIN     = *
     PAYDUNYA_MODE   = test
     PAYDUNYA_MASTER_KEY  = <from your PayDunya dashboard, once ready>
     PAYDUNYA_PRIVATE_KEY = <same>
     PAYDUNYA_PUBLIC_KEY  = <same>
     PAYDUNYA_TOKEN       = <same>
     ```
     `APP_FRONTEND_URL` and `APP_BASE_URL` are added in step 4, once both
     services have live URLs.
   - Name this service `ocass-backend`. Create it - Render builds and
     gives it a public `https://ocass-backend.onrender.com`-style URL.
3. **New +** → **Web Service** → same repo again.
   - **Runtime**: Docker. **Dockerfile Path**: `Dockerfile`. **Docker
     Build Context Directory**: `.` (repo root).
   - Environment variable:
     ```
     BACKEND_URL = https://ocass-backend.onrender.com   (from step 2)
     ```
     Read server-side by `middleware.js` (`/api/* → BACKEND_URL/api/*`),
     freshly on every request, same mechanism as the Cloud Run and Railway
     guides - never baked into the client bundle, and (unlike using
     `next.config.js`'s `rewrites()`, which bakes its destination in at
     build time - this bit an earlier version of this guide, where the
     proxy silently kept using its `localhost:5000` fallback in production
     no matter what `BACKEND_URL` was set to) not baked into the build
     either, so it can genuinely change without a rebuild - just save the
     new value and Render's automatic redeploy picks it up.
   - Name this service `ocass-frontend`. Create it.

## 4. Wire the backend's callback URLs (both options)

Once `ocass-frontend` and `ocass-backend` both have live `.onrender.com`
URLs, add these two to the **backend** service's environment (Settings →
Environment) and save, which triggers a redeploy:

```
APP_FRONTEND_URL = https://ocass-frontend.onrender.com
APP_BASE_URL      = https://ocass-backend.onrender.com
```

These build PayDunya's return/cancel/callback URLs (see
`server/.env.example`) - PayDunya's servers need `APP_BASE_URL` to be
publicly reachable to deliver the IPN `callback_url`, which is exactly
what a `.onrender.com` URL is, unlike local dev.

## 5. Seed data (optional)

The backend's Pre-Deploy Command only runs migrations, not the seed
script, since re-seeding on every deploy would duplicate data. Run it once
manually via Render's **Shell** tab on the `ocass-backend` service (or a
one-off Job, if you'd rather not leave the shell open):

```bash
npm run seed
```

## Ongoing deploys

Both services redeploy automatically on push to the connected branch,
same as the Cloud Build trigger in the GCP guide and Railway's GitHub
integration - Render's GitHub integration handles this natively once a
service is connected, no extra config needed beyond what's already in
`render.yaml` or set up in Option B.

## Costs

`render.yaml` doesn't pin a `plan` for `ocass-db`, `ocass-backend`, or
`ocass-frontend`, so whatever Render defaults to at deploy time is what
you get unless you change it (in the Blueprint's preview screen before
applying, or later per-resource in the dashboard). Render's lowest web
service and Postgres tiers are meant for testing, not production - among
other limits, low-tier web services spin down after inactivity (cold
start on the next request) and low-tier Postgres instances expire after a
set number of days. Check [render.com/pricing](https://render.com/pricing)
for current plan names, limits, and numbers before going live, since this
sandbox couldn't reach render.com to confirm them.
