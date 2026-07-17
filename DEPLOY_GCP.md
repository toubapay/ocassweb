# Deploying Ocass to Google Cloud

Two Cloud Run services (frontend, backend) + one Cloud SQL for PostgreSQL
instance. Cloud Run gives you HTTPS, autoscaling (including to zero), and a
generous free tier out of the box; Cloud SQL is the managed Postgres the
backend already expects via Prisma.

This guide assumes the `gcloud` CLI, authenticated against the target GCP
project. Run it from your own machine, Cloud Shell, or hand it to CI - it
was not run from this environment, since this sandbox has no GCP
credentials and creating real (billable) cloud resources needs your
explicit go-ahead.

## 0. One-time setup

```bash
export PROJECT_ID=your-gcp-project-id
export REGION=europe-west1          # pick the region closest to your users
gcloud config set project $PROJECT_ID

gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com

gcloud artifacts repositories create ocass \
  --repository-format=docker --location=$REGION
```

## 1. Cloud SQL (PostgreSQL)

```bash
gcloud sql instances create ocass-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=$REGION \
  --storage-auto-increase

gcloud sql databases create ocassweb --instance=ocass-db

gcloud sql users create ocass \
  --instance=ocass-db \
  --password="$(openssl rand -base64 24)"   # save this - see below
```

Note the connection name: `gcloud sql instances describe ocass-db --format='value(connectionName)'`
(looks like `PROJECT_ID:REGION:ocass-db`). Cloud Run talks to it over a Unix
socket at `/cloudsql/<connectionName>`, so the backend's `DATABASE_URL`
becomes:

```
postgresql://ocass:<password>@localhost/ocassweb?host=/cloudsql/PROJECT_ID:REGION:ocass-db
```

## 2. Secrets

```bash
echo -n "postgresql://ocass:<password>@localhost/ocassweb?host=/cloudsql/PROJECT_ID:REGION:ocass-db" | \
  gcloud secrets create ocass-database-url --data-file=-

echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets create ocass-jwt-secret --data-file=-
```

## 3. Backend - build, migrate, deploy

```bash
cd server
gcloud builds submit --tag $REGION-docker.pkg.dev/$PROJECT_ID/ocass/backend

gcloud run deploy ocass-backend \
  --image $REGION-docker.pkg.dev/$PROJECT_ID/ocass/backend \
  --region $REGION \
  --add-cloudsql-instances $PROJECT_ID:$REGION:ocass-db \
  --set-secrets DATABASE_URL=ocass-database-url:latest,JWT_SECRET=ocass-jwt-secret:latest \
  --set-env-vars JWT_EXPIRES_IN=7d,OTP_DEV_MODE=true,OTP_TTL_MINUTES=5 \
  --allow-unauthenticated \
  --min-instances 0 --max-instances 3
```

`OTP_DEV_MODE=true` echoes OTP codes in the API response since no SMS
provider is wired up yet (see the root README) - flip this once you add
one, and drop `--allow-unauthenticated` scoping down as needed once the
frontend is the only caller.

Run migrations + seed once, against the deployed database, from anywhere
with the Cloud SQL Auth Proxy or `gcloud sql connect`:

```bash
# From your machine, with the Cloud SQL Auth Proxy running against ocass-db:
DATABASE_URL="postgresql://ocass:<password>@127.0.0.1:5432/ocassweb" \
  npm run prisma:deploy   # `prisma migrate deploy`
DATABASE_URL="postgresql://ocass:<password>@127.0.0.1:5432/ocassweb" \
  npm run seed
```

Grab the backend's URL for the next step:

```bash
export BACKEND_URL=$(gcloud run services describe ocass-backend --region $REGION --format='value(status.url)')
```

## 4. Frontend - build, deploy

The frontend doesn't need the backend URL at build time - `next.config.js`
proxies `/api/*` to `BACKEND_URL` server-side at request time (see the
rewrite in `next.config.js` and `src/api/client.js`), so the same image
works in any environment; only the env var changes.

```bash
cd ..   # repo root
gcloud builds submit --tag $REGION-docker.pkg.dev/$PROJECT_ID/ocass/frontend

gcloud run deploy ocass-frontend \
  --image $REGION-docker.pkg.dev/$PROJECT_ID/ocass/frontend \
  --region $REGION \
  --set-env-vars BACKEND_URL=$BACKEND_URL \
  --allow-unauthenticated \
  --min-instances 0 --max-instances 5
```

Open the printed URL - that's the live app.

## 5. Ongoing deploys

For anything past this first deploy, connect the GitHub repo to Cloud
Build (Cloud Console → Cloud Build → Triggers → Connect Repository) and
add a trigger per service pointing at `Dockerfile` / `server/Dockerfile`
on push to `main`. That way deploys happen through GCP's own GitHub
integration - no long-lived credentials need to be shared with anyone
outside the GCP project.

## Costs

`db-f1-micro` + two Cloud Run services with `min-instances 0` stay within
or close to GCP's free tier for low traffic - Cloud Run scales to zero
when idle, Cloud SQL does not (it's the main fixed cost, typically a few
dollars/month at this tier). Set up a budget alert:

```bash
gcloud billing budgets create --billing-account=YOUR_BILLING_ACCOUNT_ID \
  --display-name="Ocass budget" --budget-amount=20
```
