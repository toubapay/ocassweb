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

## 5. Ongoing deploys via Cloud Build (recommended)

Sections 0-4 above are a one-time bootstrap - someone with `gcloud` access
runs them once to create Cloud SQL, the secrets, and each service's first
revision (which is what attaches `--add-cloudsql-instances` and
`--set-secrets` to the services). After that, `cloudbuild.yaml` at the repo
root handles every subsequent deploy automatically on push, without
sharing any credentials with whoever/whatever triggers it - GCP's own
GitHub integration handles auth.

**Connect the repo** (Cloud Console → Cloud Build → Triggers → "Connect
Repository", pick `toubapay/ocassweb`), then create one trigger:

```bash
gcloud builds triggers create github \
  --name=ocass-deploy \
  --repo-name=ocassweb \
  --repo-owner=toubapay \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

**Grant the Cloud Build service account permission to deploy to Cloud
Run** (it can push images by default, but needs these two roles to run
`gcloud run deploy` and act as the Cloud Run runtime service account):

```bash
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
export CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CB_SA" --role="roles/run.admin"

gcloud iam service-accounts add-iam-policy-binding \
  $PROJECT_NUMBER-compute@developer.gserviceaccount.com \
  --member="serviceAccount:$CB_SA" --role="roles/iam.serviceAccountUser"
```

From here, every push to `main` rebuilds both images and rolls out a new
Cloud Run revision for each service. If you'd rather review before
deploying, change `--branch-pattern` to target a PR-merge event, or trigger
manually with `gcloud builds triggers run ocass-deploy --branch=main`.

## Costs

`db-f1-micro` + two Cloud Run services with `min-instances 0` stay within
or close to GCP's free tier for low traffic - Cloud Run scales to zero
when idle, Cloud SQL does not (it's the main fixed cost, typically a few
dollars/month at this tier). Set up a budget alert:

```bash
gcloud billing budgets create --billing-account=YOUR_BILLING_ACCOUNT_ID \
  --display-name="Ocass budget" --budget-amount=20
```
