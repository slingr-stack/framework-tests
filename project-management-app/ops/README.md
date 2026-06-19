# GCP Deployment Guide — Drumr Framework Apps

A step-by-step guide for deploying **project-management-app** (a Drumr framework app) to Google Cloud Platform.

The ops scripts support two frontend hosting modes selected via `FRONTEND_HOSTING` in `ops/deploy.env`:
- `simple` bakes the SPA into the backend Docker image and serves it directly from the Cloud Run service.
- `prod` deploys the SPA to a GCS bucket behind the external HTTP(S) load balancer.

---

## Table of Contents

- [GCP Deployment Guide — Drumr Framework Apps](#gcp-deployment-guide--drumr-framework-apps)
  - [Table of Contents](#table-of-contents)
  - [Architecture Overview](#architecture-overview)
  - [Frontend Hosting Modes](#frontend-hosting-modes)
  - [Step 0 — Create a GCP Project](#step-0--create-a-gcp-project)
    - [Create the project](#create-the-project)
    - [Enable billing](#enable-billing)
    - [Set the project as active](#set-the-project-as-active)
  - [Prerequisites](#prerequisites)
    - [Tools](#tools)
    - [GCP Setup](#gcp-setup)
    - [Required GCP IAM Permissions](#required-gcp-iam-permissions)
  - [File Structure Convention](#file-structure-convention)
  - [Script Execution Order](#script-execution-order)
  - [Process Summary](#process-summary)
  - [Adapting the Scripts for Your App](#adapting-the-scripts-for-your-app)
    - [Variable mapping](#variable-mapping)
  - [Step 1 — Backend Dockerfile](#step-1--backend-dockerfile)
    - [Build context](#build-context)
  - [Step 2 — Local Production Smoke Testing](#step-2--local-production-smoke-testing)
    - [Quick start](#quick-start)
    - [Manual step-by-step](#manual-step-by-step)
    - [What to verify](#what-to-verify)
    - [Iterating quickly](#iterating-quickly)
  - [Step 3 — One-Time GCP Infrastructure Setup](#step-3--one-time-gcp-infrastructure-setup)
    - [What it creates](#what-it-creates)
    - [After running](#after-running)
  - [Step 4 — Secrets Management](#step-4--secrets-management)
    - [Rotating secrets later](#rotating-secrets-later)
  - [Step 5 — Cloud Build Trigger (Automated Deploys)](#step-5--cloud-build-trigger-automated-deploys)
    - [Connect the GitHub repository (one-time)](#connect-the-github-repository-one-time)
    - [Create the trigger](#create-the-trigger)
    - [cloudbuild.yaml structure](#cloudbuildyaml-structure)
  - [Step 6 — Manual Deployment](#step-6--manual-deployment)
  - [Step 7 — DNS \& HTTPS Setup (Optional)](#step-7--dns--https-setup-optional)
  - [Networking](#networking)
    - [What was set up](#what-was-set-up)
    - [Cloud SQL connectivity](#cloud-sql-connectivity)
    - [Verifying the networking setup](#verifying-the-networking-setup)
  - [Frontend Hosting](#frontend-hosting)
    - [URL routing](#url-routing)
    - [Manual frontend deploy](#manual-frontend-deploy)
  - [Database Schema Sync](#database-schema-sync)
  - [Default Admin User](#default-admin-user)
  - [Logging \& Observability](#logging--observability)
    - [View backend logs](#view-backend-logs)
    - [Stream live logs](#stream-live-logs)
    - [Useful log filters](#useful-log-filters)
    - [Cloud Monitoring — uptime check](#cloud-monitoring--uptime-check)
    - [Cloud Monitoring — error rate alert](#cloud-monitoring--error-rate-alert)
  - [IAM \& Service Accounts Reference](#iam--service-accounts-reference)
    - [Runtime service account (`<app>-backend`)](#runtime-service-account-app-backend)
    - [Cloud Build service account (CI/CD)](#cloud-build-service-account-cicd)
  - [Ongoing Operations](#ongoing-operations)
    - [Roll back to a previous revision](#roll-back-to-a-previous-revision)
    - [Scale to zero immediately](#scale-to-zero-immediately)
    - [Connect to Cloud SQL from your local machine](#connect-to-cloud-sql-from-your-local-machine)
  - [Troubleshooting](#troubleshooting)
    - [Backend fails to connect to Cloud SQL](#backend-fails-to-connect-to-cloud-sql)
    - [Cloud Run service fails to start](#cloud-run-service-fails-to-start)
    - [Schema sync job exits non-zero](#schema-sync-job-exits-non-zero)
    - [Docker build fails: `cannot find module '@drumr/framework-backend'`](#docker-build-fails-cannot-find-module-drumr-frameworkbackend)
    - [Docker push fails: Unauthenticated request](#docker-push-fails-unauthenticated-request)
    - [Cloud SQL Proxy is not recognized on local machine](#cloud-sql-proxy-is-not-recognized-on-local-machine)
    - [simple mode: SPA returns 404 on `/`](#simple-mode-spa-returns-404-on-)
    - [SSL certificate stuck in PROVISIONING](#ssl-certificate-stuck-in-provisioning)
  - [Security Hardening](#security-hardening)

---

## Architecture Overview

**`simple` mode** — single Cloud Run service serves both API and SPA:

```
Users (browser)
  └─► Cloud Run  (backend + SPA baked into image)
        ├── /graphql, /auth/**, /files/**, /data/**  →  API handlers
        └── /**                                      →  React SPA (express.static)
              │ Direct VPC egress → private IP (TLS)
        ┌─────▼────────┐
        │   Cloud SQL  │  PostgreSQL 15 (private IP only)
        │  <app>-db    │
        └──────────────┘
```

**`prod` mode** — GCS bucket + external HTTP(S) load balancer:

```
Users (browser)
  └─► External HTTP(S) Load Balancer
        ├── /graphql, /auth/**, /files/**, /data/**
        │     └─► Cloud Run (via serverless NEG)
        │               │ Direct VPC egress → private IP (TLS)
        │         ┌─────▼────────┐
        │         │   Cloud SQL  │  PostgreSQL 15 (private IP only)
        │         └──────────────┘
        └── /** (default)
              └─► GCS Bucket  (React SPA static assets)
```

```
Secrets  →  Secret Manager  (DB password, JWT secret)
Images   →  Artifact Registry  (Docker)
CI/CD    →  Cloud Build  (triggered on push to a branch)
```

**Why this architecture:**

| Service | Choice | Reason |
|---|---|---|
| Backend | Cloud Run | Serverless, scales to zero, $0 when idle |
| Frontend (`simple`) | Cloud Run (baked in) | One container, one URL, atomic rollouts, zero frontend infra cost |
| Frontend (`prod`) | GCS + External LB | CDN, Cloud Armor / WAF support, IAP, advanced routing |
| Database | Cloud SQL (PostgreSQL 15, private IP only) | Managed, automated backups, point-in-time recovery |
| DB connectivity | Private IP + Direct VPC egress (TLS) | ~2× lower in-region query latency than the Auth Proxy; no public IP; no VPC connector or Cloud NAT |
| Secrets | Secret Manager | Audit trail, rotation support, IAM-scoped access |

---

## Frontend Hosting Modes

Set `FRONTEND_HOSTING` in `ops/deploy.env` to `simple` or `prod` to choose how the SPA is served.

### `simple` — Backend-served SPA (default)

The frontend SPA is baked directly into the backend Docker image at build time (`frontend/dist/` → `dist/ui/` inside the container). The framework's `DrumrApp` auto-detects `dist/ui/` and serves the SPA via `express.static`, with a catch-all for client-side routes. No separate hosting infrastructure is needed — a single Cloud Run URL serves both the API and the frontend.

**Advantages**
- Simplest possible deployment: one container, one URL, no GCS bucket, no load balancer.
- Zero frontend infrastructure cost: no forwarding rule baseline charge — nothing beyond what the backend already needs.
- Atomic rollouts: frontend and backend always deploy together, so you can never have a frontend that references API types from a mismatched backend revision.
- Works anywhere Cloud Run works: no additional GCP services required.
- Custom domains via Cloud Run domain mappings: automatic SSL provisioning at no extra cost.

**Disadvantages**
- No CDN: static assets are served directly from Cloud Run instances, not a globally distributed edge cache. First load is slower for users far from the Cloud Run region.
- Cold start is marginally slower: the container is larger (includes frontend assets), which can slightly increase cold start time.
- Frontend changes require a full backend redeploy: a CSS or copy change requires a Docker build and Cloud Run deploy.
- No independent rollback: rolling back the backend also rolls back the frontend (and vice versa).

### `prod` — GCS Bucket + External HTTP(S) Load Balancer

The SPA is deployed to a GCS bucket. The external HTTP(S) load balancer serves static assets from the bucket and routes dynamic paths to Cloud Run via serverless NEGs.

**Advantages**
- Native Cloud Armor integration: attach WAF policies to the load balancer to block OWASP Top 10 attacks, rate-limit by IP, apply geo-fencing, and absorb volumetric DDoS at the Google network edge.
- Identity-Aware Proxy (IAP) support: enforce zero-trust authentication (Google Workspace, Workforce Identity Federation) before any request reaches the application.
- Full header and cookie forwarding: the load balancer passes all HTTP headers and cookies to Cloud Run unchanged.
- Lower variable cost at scale: GCP data processing fees (~$0.008/GB) are significantly cheaper at high traffic volumes.
- Advanced traffic control: URL map rules enable path rewrites, header-based routing, percentage-based canary traffic splitting, and backend policy overrides.
- Direct path to Cloud Run: traffic hits Cloud Run through the serverless NEG without an additional proxy hop.

**Disadvantages**
- Fixed baseline cost: the external load balancer's forwarding rules cost ~$18/month regardless of traffic volume.
- More setup and ongoing maintenance: you manage SSL certificate provisioning, bucket IAM, load balancer URL maps, backend services, and NEG configuration.
- Manual CDN cache invalidation: asset cache invalidation after a deploy is a separate `gcloud` command.
- Slower initial setup: requires additional `setup-gcp.js` steps and GCP IAM permissions.

### When to choose which

| Situation | Recommended mode |
|---|---|
| Simplest deployment, fewest moving parts | `simple` |
| Atomic frontend+backend releases required | `simple` |
| Low-to-medium traffic, no WAF requirements | `simple` |
| Enterprise security policy requires WAF / Cloud Armor | `prod` |
| Internal portal requiring IAP / BeyondCorp access control | `prod` |
| High traffic volume where bandwidth cost matters | `prod` |
| Need granular routing rules or canary deployments at the edge | `prod` |

> **This app currently uses `simple`.** It is a standard SPA with no WAF requirements, making `simple` the right balance of deployment simplicity and cost.

---

## Step 0 — Create a GCP Project

Skip this section if you already have a GCP project with billing enabled.

### Create the project

You can create a project via the [Google Cloud Console](https://console.cloud.google.com/projectcreate) or with the CLI.

If you want to use the CLI commands below, first install the gcloud CLI from [Prerequisites → Tools](#tools).

```bash
# Choose a unique project ID (lowercase letters, digits, hyphens; 6-30 characters)
gcloud projects create my-project-id --name="My Project Display Name"
```

Console path (no CLI required):

1. Open [Google Cloud project creation](https://console.cloud.google.com/projectcreate).
2. Enter a project name and project ID.
3. Click **Create**.

> Project IDs are globally unique and permanent — choose carefully. You cannot rename a project ID after creation.

### Enable billing

A billing account is required before any paid GCP service (Cloud Run, Cloud SQL, Artifact Registry, etc.) can be used. Billing must be linked through the Console or CLI:

**Option A — Console:**
1. Open [Billing](https://console.cloud.google.com/billing) in the Cloud Console.
2. Select or create a billing account.
3. Link it to your project: **Billing → My Projects → ⋮ → Change billing**.

**Option B — CLI:**
```bash
# List your billing accounts to find your BILLING_ACCOUNT_ID
gcloud billing accounts list

# Link billing to the project
gcloud billing projects link my-project-id --billing-account=BILLING_ACCOUNT_ID
```

### Set the project as active

```bash
gcloud config set project my-project-id

# Verify
gcloud config get-value project
```

All subsequent scripts (`setup-gcp.js`, `setup-secrets.js`, `deploy.js`) read the active project automatically. You can also override it at any time with the `PROJECT_ID` environment variable:

```bash
PROJECT_ID=my-project-id node ops/scripts/setup-gcp.js
```

---

## Prerequisites

### Tools

| Tool | Min Version | Install | Purpose |
|---|---|---|---|
| **gcloud CLI** | >= 450.0.0 | [Install guide](https://cloud.google.com/sdk/docs/install) | GCP resource management |
| **Docker** | >= 24.0 | [Install guide](https://docs.docker.com/get-docker/) | Build backend container image |
| **Node.js** | >= 20.0 | [Install guide](https://nodejs.org/) | Build frontend, run CLI commands |
| **pnpm** | >= 8.0 | `npm install -g pnpm` | Monorepo workspace dependency management |
| **Cloud SQL Auth Proxy** | latest | `gcloud components install cloud-sql-proxy` | Optional — not used by deploy/seeding anymore; the DB is private-IP only so the proxy can only reach it from inside the VPC |

```bash
# Verify all dependencies
gcloud --version          # >= 450.0.0
docker --version          # >= 24.0
node --version            # >= 20.0
pnpm --version            # >= 8.0
cloud-sql-proxy --version
```

### GCP Setup

- GCP project created with billing enabled
- Required IAM roles on the project (see next section)
- `gcloud init` — sets your authenticated account and default project on this machine
- `gcloud auth application-default login` — sets Application Default Credentials for local SDK usage
- `gcloud auth configure-docker REGION-docker.pkg.dev` — authenticates Docker to push images to Artifact Registry

> **Important:** `setup-gcp.js` and `setup-secrets.js` are **project-level** bootstrap steps — run once per GCP project. `gcloud init`, `gcloud auth ...`, and installing the gcloud CLI are **machine-level** prerequisites. If you switch machines, install `gcloud` and authenticate again before running any scripts.

If the project was already provisioned from another machine:

```bash
# 1. Install Google Cloud CLI on this machine
# https://cloud.google.com/sdk/docs/install

# 2. Authenticate this machine
gcloud init
gcloud auth application-default login

# 3. (Optional) Cloud SQL Auth Proxy — no longer used by deploy/seeding.
#    The DB is private-IP only, so the proxy only works from inside the VPC.
gcloud components install cloud-sql-proxy
cloud-sql-proxy --version

# 4. Authenticate Docker to Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev # region-specific, replace with the region you will deploy to
```

At this point the machine is ready. Continue with the guide steps in order (local smoke test, setup scripts, and then deployment).

### Required GCP IAM Permissions

The human (or CI service account) running the setup and deployment scripts must have the following roles on the GCP project. The simplest option is `roles/owner` or this 3 roles:

 - Cloud Run Admin
 - Secret Manager Admin
 - Service Account Admin

 For least-privilege setups, grant the specific roles:

| Role | Required for |
|---|---|
| `roles/resourcemanager.projectIamAdmin` | Granting IAM bindings to service accounts in `setup-gcp.js` |
| `roles/iam.serviceAccountAdmin` | Creating the backend service account |
| `roles/cloudsql.admin` | Creating the Cloud SQL instance, database, and setting user passwords |
| `roles/artifactregistry.admin` | Creating the Artifact Registry repository |
| `roles/run.admin` | Deploying Cloud Run services and jobs |
| `roles/secretmanager.admin` | Creating and versioning secrets in Secret Manager |
| `roles/storage.admin` | Creating and configuring the GCS bucket |
| `roles/serviceusage.serviceUsageAdmin` | Enabling GCP APIs |
| `roles/cloudbuild.builds.editor` | Creating Cloud Build triggers |

---

## File Structure Convention

Each app should have an `ops/` directory mirroring this layout:

```
apps/<your-app>/
├── backend/
│   └── Dockerfile                     # Multi-stage build (see Step 1)
├── frontend/
│   └── src/services/GraphQLClientService.ts
└── ops/
    ├── README.md                      # This guide
    ├── cloudbuild.yaml                # Cloud Build CI/CD pipeline
    ├── nginx/
    │   └── prod-test.conf             # nginx config for local smoke testing
    └── scripts/
        ├── setup-gcp.js               # One-time infrastructure setup
        ├── setup-secrets.js           # Secret Manager credential management
      ├── setup-trigger.js           # Cloud Build trigger setup / update
        ├── deploy.js                  # Manual deployment script
        └── test-prod-local.js         # Local production smoke test
```

The scripts in `ops/scripts/` have been pre-configured for **project-management-app**. No manual variable substitution is needed.

---

## ops/deploy.env

`ops/deploy.env` stores the non-secret identifiers every deploy script needs (`APP_NAME`, `PROJECT_ID`, `REGION`, etc.). It is **committed to git** — new team members running `deploy.js` get the right defaults without hunting through scripts.

Secrets (`DB_PASSWORD`, `JWT_SECRET`, `SEED_USER_PASS`) are **never** written here. They live only in Secret Manager / Cloud SQL after `setup-secrets.js` runs. Prompts for them still appear every time `setup-secrets.js` runs standalone. When `setup-gcp.js` chains into `setup-secrets.js`, the DB password is passed in-memory via environment variable so you type it only once.

| Key                       | Required by                       | Pre-filled at `cli create`? |
|---------------------------|------------------------------------|-----------------------------|
| `APP_NAME`                | every script                       | yes (from the app dir name) |
| `REGION`                  | every script                       | `us-central1`               |
| `AR_REPO`                 | every script                       | `drumr-apps`               |
| `DB_INSTANCE_NAME`        | `setup-gcp`, `setup-trigger`, `deploy` | `<APP_NAME>-db`         |
| `DB_NAME`                 | `setup-gcp`, `deploy`              | `<APP_NAME>`                |
| `DB_USER`                 | `setup-gcp`                        | `postgres` / `root`         |
| `BACKEND_MAX_INSTANCES`   | `setup-trigger`, `deploy`          | `1`                         |
| `BRANCH`                  | `setup-trigger`                    | `develop`                   |
| `REPO_NAME`               | `setup-trigger`                    | `<APP_NAME>`                |
| `PROJECT_ID`              | every script                       | **no** (prompts on first run) |
| `REPO_OWNER`              | `setup-trigger`                    | **no** (prompts on first run) |
| `SEED_USER_EMAIL`         | `deploy`                           | **no** (default `sys@app.com`) |

To edit values later, open `ops/deploy.env` in a text editor. The next script run picks up your changes silently.

---

## Script Execution Order

The scripts are designed to be chained automatically. Running `setup-gcp.js` offers, at the end, to launch the next script in the chain. The happy path is:

```
setup-gcp  →  setup-secrets  →  (optional) setup-trigger  →  deploy
```

Each script:
- Reads **ops/deploy.env** on start (silent reuse if values are present; interactive prompt for missing keys).
- Prints a summary and waits for Enter before doing anything.
- Writes any newly-collected non-secret values back to `ops/deploy.env` after confirmation.
- Ends with a numbered-choice prompt offering the next script in the chain. Pick Enter for the default, a number for an alternate, or anything else to exit.

You can still run any script standalone — each handles "missing value" by prompting, exactly like first-run. Set individual env vars on the command line to override (e.g. `REGION=europe-west1 node ops/scripts/deploy.js`).

See [ops/deploy.env](#opsdeployenv) below for the full list of stored keys.

---

## Process Summary

Use this as the high-level checklist for a new deployment setup:

1. Create or select the target GCP project, enable billing, set it as active, and authenticate your machine with `gcloud init` and `gcloud auth application-default login`.
2. Review the generated `ops/` files, confirm the resource names for `project-management-app`, and validate the generated backend Dockerfile.
3. Run `node ops/scripts/test-prod-local.js` from the app root and verify the production Docker stack works locally before creating cloud resources.
4. Run `node ops/scripts/setup-gcp.js` once to provision the shared GCP infrastructure for the app.
5. Run `node ops/scripts/setup-secrets.js` to store the database password and JWT secret in Secret Manager.
6. Run `node ops/scripts/setup-trigger.js` if you want automated deploys from GitHub.
7. Run `node ops/scripts/deploy.js` for the first deployment, confirm schema sync succeeds, and verify the backend and frontend are reachable.
8. If you want a custom domain, run `node ops/scripts/setup-domain.js` — see [Step 7](#step-7--dns--https-setup-optional) for details.

---

## GCP Resource Naming Reference

This app uses `APP_NAME=project-management-app` for the app/workspace identity and `RESOURCE_PREFIX=project-mgmt` for deployed GCP resource names. The deploy, trigger, and Cloud Build scripts must keep those two values aligned.

### Variable mapping

| Variable | Description | Value for project-management-app |
|---|---|---|
| `RESOURCE_PREFIX` | Prefix used for deploy-time GCP resources. Keep it lowercase, hyphen-separated, and unique within the project. | `project-mgmt` |
| `DB_INSTANCE_NAME` | Name of the Cloud SQL instance. One instance can host multiple databases. | `project-mgmt-db` |
| `DB_NAME` | Database name. PostgreSQL database inside the instance. Used as `DB_NAME` env var at runtime. | `project_management_app` |
| `DB_USER` | PostgreSQL user the backend connects as. | `postgres` | superuser is used for simplicity |
| `AR_REPO_NAME` | Shared Docker registry across all apps in the project. | `drumr-apps` |
| `BACKEND_SA_NAME` | Backend service account | Runtime identity for Cloud Run. Granted minimum roles. | `project-mgmt-backend` |
| `BACKEND_SERVICE` | Cloud Run service | The deployed backend service. Also used as the Docker image name. | `project-mgmt-backend` |
| `DB_SECRET_NAME` | Cloud SQL `postgres` password in Secret Manager. | `project-mgmt-db-password` |
| `JWT_SECRET_NAME` | JWT signing key in Secret Manager. | `project-mgmt-jwt-secret` |


---

## Step 1 — Backend Dockerfile

The `backend/Dockerfile` has been generated for your app. It uses a two-stage build:

1. **Stage 1 (builder):** Resolves the `@drumr/framework-backend` dependency, installs all backend dependencies (`npm install`), compiles TypeScript (`npm run build`), then prunes dev dependencies. When building from inside the monorepo (via `deploy.js` or Cloud Build), a pre-packed local artifact (`backend/.docker/framework-backend.local.tgz`) is used instead of the published npm package. When building standalone (no local artifact present), the Dockerfile falls back to the `dev` npm tag automatically.
2. **Stage 2 (runtime):** Copies only `dist/` and `node_modules/`. Exposes port 8080. Starts with `node dist/src/App.js`.

### Build context

The build context is the **app root directory** (the folder containing `backend/` and `frontend/`):

```bash
# Run from your app root
docker build \
  -f backend/Dockerfile \
  -t REGION-docker.pkg.dev/PROJECT_ID/drumr-apps/project-management-app-backend:latest \
  .
```

The Cloud Build pipeline and `deploy.js` enforce this automatically.

---

## Step 2 — Local Production Smoke Testing

Before touching GCP, run the production containers locally. This catches environment-specific bugs that only appear in production builds — minified bundles, URL routing, Docker runtime config — without creating any cloud resources.

There are two local smoke-test modes:

1. Backend-only mode (default): backend + DB on port 3000.
2. Full-stack mode (optional): backend + DB + nginx/frontend on port 8080.

Full-stack mode topology:

```
Browser
  └─► nginx :8080
        ├─ /graphql  →  backend:3000  (Node.js container)
        ├─ /auth/*   →  backend:3000
        └─ /**       →  React SPA (frontend/dist/)
              backend:3000
                └─ mainDs-db:5432  (PostgreSQL 15)
```

### Quick start

Run from the **app root** (the directory containing `backend/`, `frontend/`, and `ops/`):

```bash
node ops/scripts/test-prod-local.js
```

Default endpoint (backend-only mode):

- **http://localhost:3000/graphql**

To also run nginx/frontend on port 8080:

```bash
docker compose --profile frontend \
  -f docker-compose.yml \
  -f docker-compose.prod-test.yml \
  up --build
```

Then open **http://localhost:8080** in your browser.

If your app was generated before this profile was introduced, add the `frontend` service from `docker-compose.prod-test.yml.template` and create `ops/nginx/prod-test.conf`.

The script performs these steps in order:

1. **Framework build** — skipped in standalone mode (framework is an npm dependency); runs `pnpm run build:all` only when inside the framework monorepo
2. Metadata sync — runs the local monorepo CLI when available, or `npx @drumr/cli sync-metadata` in standalone mode
3. `npm run build` (in `frontend/`) — produces a minified production bundle in `frontend/dist/`
4. `docker compose up --build` — builds the backend image and starts backend + DB (default mode)

In monorepo mode, skip rebuilding the framework if only app code changed:
```bash
SKIP_FRAMEWORK_BUILD=1 node ops/scripts/test-prod-local.js
```

### Manual step-by-step

Run from the **app root**:

```bash
# 1. (Monorepo only) Build the framework and CLI from source
#    Skip this in standalone mode — the framework is in node_modules
# pnpm run build:all

# 2. Regenerate view registry and GraphQL types
# Monorepo
node ../../cli/bin/run.js sync-metadata
# Standalone
# npx @drumr/cli sync-metadata

# 3. Build the production frontend bundle
(cd frontend && npm run build)

# 4. Start backend + DB (default)
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod-test.yml \
  up --build

# Open http://localhost:3000/graphql

# 5. Optional: Start full stack with frontend/nginx profile
docker compose --profile frontend \
  -f docker-compose.yml \
  -f docker-compose.prod-test.yml \
  up --build

# Open http://localhost:8080
```

To tear it down and clean up volumes:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod-test.yml \
  down -v
```

### What to verify

| Check | How |
|---|---|
| Backend is reachable | Open `http://localhost:3000/graphql` |
| App loads at `http://localhost:8080` | No blank page, no console errors on startup |
| Login works | Authenticate with the seeded user (`sys@app.com`) |
| Toolbar buttons navigate correctly | Click every toolbar button — a `View class "X" is not registered` error means class name minification is breaking the view registry |
| Dashboard loads without errors | Open the dashboard — a `Failed to construct 'URL': Invalid URL` error means `GraphQLClientService.baseUrl` is a relative path that `graphql-request` cannot handle |
| Create / update forms submit | Submit a create form — `Runtime Object type "ExpectedErrorType" is not a possible type` means the GraphQL union type is missing `ExpectedErrorType` in the schema |
| Backend logs look clean | `docker compose logs backend` — no startup crashes |

### Iterating quickly

After fixing a frontend issue (run from app root):

```bash
(cd frontend && npm run build)

docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod-test.yml \
  restart frontend
```

After fixing a backend issue (run from app root):

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod-test.yml \
  up --build backend
```

---

## Step 3 — One-Time GCP Infrastructure Setup

Run once per GCP project. The script is idempotent — safe to re-run.

Run from the **app root**:

```bash
node ops/scripts/setup-gcp.js

# Override project or region:
PROJECT_ID=my-project REGION=europe-west1 node ops/scripts/setup-gcp.js
```

### What it creates

| Resource | Example name | Notes |
|---|---|---|
| APIs enabled | Cloud Run, Cloud SQL, Artifact Registry, Cloud Build, Secret Manager, Cloud Storage (+ `compute.googleapis.com` in `prod` mode) | ~1 minute on first run |
| Artifact Registry repo | `drumr-apps` | Shared Docker registry across all apps in the project |
| Cloud SQL instance | `<app>-db` | PostgreSQL 15, `db-f1-micro` tier |
| Cloud SQL database | `<your_db_name>` | Created inside the instance |
| Cloud SQL user | `postgres` | Password set interactively |
| Backend service account | `<app>-backend@PROJECT.iam.gserviceaccount.com` | Runtime identity for Cloud Run |
| VPC network + subnet | `<app>-vpc` / `<app>-subnet` (`10.10.0.0/24`) | Dedicated network for the private-IP DB connection (Direct VPC egress) |
| Private Service Access | `<app>-psa` range + servicenetworking peering | Lets Cloud SQL allocate a private IP inside the VPC |
| IAM bindings (backend SA) | `roles/cloudsql.client`, `roles/secretmanager.secretAccessor`, `roles/compute.networkUser` (on the subnet) | Minimum required at runtime + Direct VPC egress |
| IAM bindings (Cloud Build SA) | `roles/run.admin`, `roles/iam.serviceAccountUser`, `roles/secretmanager.secretAccessor`, `roles/artifactregistry.writer`, `roles/cloudsql.client`, `roles/storage.objectAdmin`, `roles/compute.networkUser` (on the subnet) (+ `roles/compute.loadBalancerAdmin` in `prod` mode) | Required for automated CI/CD |
| GCS bucket (files) | `<configured GCS_BUCKET>` | Private bucket for app-managed file uploads |
| GCS bucket (frontend, `prod` only) | `<project>-<prefix>-frontend` | Hosts the React SPA static assets behind the load balancer |
| Load balancer resources (`prod` only) | URL map, backend bucket, NEG, forwarding rules | External HTTP(S) LB routing traffic to GCS (SPA) and Cloud Run (API) |
| Security hardening | — | Default VPC + firewall rules deleted (a dedicated `<app>-vpc` is created for DB connectivity); OS Login enabled; Uniform Bucket Access enforced; Cloud SQL has **no public IP** and SSL mode `ENCRYPTED_ONLY` |

### After running

The script prints the Cloud Run service URL. Note it — this is the app's public URL in `simple` mode. In `prod` mode, the public URL is the load balancer IP (run `setup-domain.js` to attach a custom domain with SSL).

---

## Step 4 — Secrets Management

Run after `setup-gcp.js`. Can be re-run at any time to rotate credentials.

Run from the **app root**:

```bash
node ops/scripts/setup-secrets.js

# Override project:
PROJECT_ID=my-project node ops/scripts/setup-secrets.js
```

The script prompts for:

| Secret name | What to enter |
|---|---|
| `<app>-db-password` | The password you set on the Cloud SQL `postgres` user during `setup-gcp.js` |
| `<app>-jwt-secret` | Any long random string — press Enter to auto-generate |

Both secrets are created in Secret Manager and the backend service account is granted access to each.

### Rotating secrets later

Re-run the script — it adds a new secret version automatically. Cloud Run picks up the new version on the next cold start. To force immediate pickup:

```bash
gcloud run services update <app>-backend \
  --region=REGION \
  --no-traffic \
  --project=PROJECT_ID
```

---

## Step 5 — Cloud Build Trigger (Automated Deploys)

### Connect the GitHub repository (one-time)

Before creating the trigger, connect your repo to Cloud Build:

```
https://console.cloud.google.com/cloud-build/triggers/connect
```

Or via CLI:

```bash
gcloud builds connections create github <CONNECTION_NAME> --region=$REGION
gcloud builds repositories create <REPO_NAME> \
  --remote-uri=https://github.com/<ORG>/<REPO>.git \
  --connection=<CONNECTION_NAME> \
  --region=$REGION
```

### Create the trigger

Use the setup script (recommended). It is idempotent: if the trigger already exists, it updates it in place.

```bash
node ops/scripts/setup-trigger.js
```

What the script does:

- Prompts for repo owner and repo name
- Uses `develop` as the default branch
- Accepts a plain branch name and always converts it to an anchored regex (`^branch$`), so users do not need to type `^` and `$`
- Sets the Cloud Run backend max instances substitution to `1` by default (override with `BACKEND_MAX_INSTANCES` if needed)
- Sets trigger description and service account (required by current Cloud Build trigger API)
- Uses `RESOURCE_PREFIX` for deployed GCP resource names when they intentionally differ from `APP_NAME` (for this app: `project-mgmt` vs `project-management-app`)
- Creates `<app>-deploy-develop` by default and updates it if it already exists

Non-interactive example:

```bash
PROJECT_ID="your-project-id" \
REGION="us-central1" \
APP_NAME="project-management-app" \
RESOURCE_PREFIX="project-mgmt" \
REPO_OWNER="your-github-org" \
REPO_NAME="deployment-support" \
BRANCH="develop" \
BACKEND_MAX_INSTANCES="1" \
TRIGGER_SERVICE_ACCOUNT="projects/your-project-id/serviceAccounts/project-mgmt-backend@your-project-id.iam.gserviceaccount.com" \
TRIGGER_DESCRIPTION="Auto-deploy project-management-app on develop" \
node ops/scripts/setup-trigger.js
```

If your project uses Cloud Build 2nd-gen repository connections, pass the repository resource directly:

```bash
PROJECT_ID="your-project-id" \
REGION="us-central1" \
APP_NAME="project-management-app" \
REPOSITORY="projects/<PROJECT_ID>/locations/us-central1/connections/<CONNECTION>/repositories/<REPO>" \
BRANCH="develop" \
node ops/scripts/setup-trigger.js
```

You can also run trigger setup as part of `setup-gcp.js` by opting in when prompted, or by setting `SETUP_TRIGGER=true` in non-interactive runs.

### cloudbuild.yaml structure

The `cloudbuild.yaml` uses substitution variables so the same file works for any project. The pipeline:

1. **build-framework** — installs monorepo dependencies and runs `pnpm run build:all` to build framework + CLI from source
2. **pack-backend-artifact** — packs `core/backend` into `backend/.docker/framework-backend.local.tgz` (used by the Dockerfile instead of a published npm package); depends on `build-framework`
3. **pull-backend-cache** — pulls `:latest` from Artifact Registry (cache layer; runs in parallel with other steps)
4. **build-frontend** — installs app dependencies, runs `sync-metadata` via the local CLI binary, builds the SPA; depends on `build-framework` (runs in parallel with `pack-backend-artifact` and `pull-backend-cache`). **Must complete before `build-backend`** because in `simple` mode the frontend dist is baked into the Docker image.
5. **build-backend** — builds the Docker image from the app root with `--cache-from`; depends on `pull-backend-cache`, `pack-backend-artifact`, and `build-frontend`
6. **push-backend** — pushes `:COMMIT_SHA` and `:latest` tags; depends on `build-backend`
7. **schema-sync** — creates/updates and executes the `<app>-migrate` Cloud Run Job (`DB_SYNCHRONIZE=true`); depends on `push-backend`
8. **deploy-backend** — deploys the Cloud Run service (sets `DRUMR_SKIP_UI=true` in `prod` mode so the backend does not serve the SPA); depends on `schema-sync`
9. **deploy-frontend-prod** — uploads the SPA to the GCS bucket; depends on `build-frontend` and `deploy-backend`; skipped if `_FRONTEND_HOSTING != prod`

> In `simple` mode, step 9 is skipped — the SPA is already baked into the container image. Steps 7 and 9 can run in parallel after their respective dependencies complete.

---

## Step 6 — Manual Deployment

Run from the **app root**:

```bash
# Deploy HEAD
node ops/scripts/deploy.js

# Deploy a specific tag
node ops/scripts/deploy.js v1.2.3
```

The script:

By default, `deploy.js` sets the backend Cloud Run service to `--max-instances=1`. Override it with `BACKEND_MAX_INSTANCES=<n>` when a higher cap is intentional.

If your production resources use a shorter slug than the app folder name, set `RESOURCE_PREFIX` in `ops/deploy.env`. `deploy.js`, `setup-trigger.js`, and `cloudbuild.yaml` must all agree on that prefix.

| Step | What happens |
|---|---|
| 0 | (Monorepo only) Builds framework + CLI from source; generates metadata (`sync-metadata` via local CLI or `@drumr/cli`); compiles backend + frontend |
| 1 | `docker build` with `--cache-from :latest` |
| 2 | `docker push` (`:SHA` and `:latest`) |
| 3 | Creates/updates and executes the `<app>-migrate` Cloud Run Job (runs schema sync **and** seeds the default admin user in-region, idempotently) |
| 4 | `gcloud run deploy <app>-backend` (Direct VPC egress → private IP) |
| 5 | Deploys frontend: uploads to GCS bucket (`prod` mode) / skipped — SPA is baked into the backend image (`simple` mode) |

---

## Step 7 — DNS & HTTPS Setup (Optional)

> **You need to own a domain before this step.** Without a custom domain, the app is reachable at the default Cloud Run URL (e.g. `https://<hash>-uc.a.run.app`).

> **This step can be done any time after `deploy.js`** — even weeks after the first deployment.

Run from the **app root**:

```bash
node ops/scripts/setup-domain.js

# Or pass values inline:
DOMAIN=app.yourdomain.com node ops/scripts/setup-domain.js
```

### `simple` mode — Cloud Run domain mapping

In `simple` mode `setup-domain.js` automatically:

1. Checks that your domain (or its base domain) is verified with Google.
2. Creates a Cloud Run domain mapping (`gcloud beta run domain-mappings create`).
3. Prints the DNS records to add with your registrar.
4. SSL is provisioned automatically after DNS propagates — **15 min to 24 h**.

**If your domain is not yet verified**, the script prints the verification command:

```bash
gcloud domains verify yourdomain.com
```

Then re-run `setup-domain.js` once verification is complete.

**Add the DNS records at your provider:**

```bash
# GCP Cloud DNS example
gcloud dns record-sets create app.yourdomain.com. \
  --zone=YOUR_ZONE_NAME --type=CNAME --ttl=300 \
  --rrdatas=ghs.googlehosted.com.
```

For other registrars, use the exact records printed by `setup-domain.js`.

**Verify SSL after propagation:**

```bash
curl -I https://app.yourdomain.com/graphql
```

### `prod` mode — External Load Balancer SSL

In `prod` mode `setup-domain.js` creates a Google-managed SSL certificate and attaches it to the existing HTTPS proxy:

1. Point your domain's `A` record at the load balancer IP printed by the script.
2. The script creates the SSL certificate and HTTPS forwarding rule.
3. SSL provisioning completes after DNS propagates — **15 min to 24 h**.

Check certificate status:

```bash
gcloud compute ssl-certificates describe <prefix>-ssl \
  --global --format=value(managed.status)
```

---

## Networking

The networking layer is fully provisioned by `setup-gcp.js`. No manual network configuration is required after running that script.

### What was set up

**`simple` mode:**

```
Internet → Cloud Run (<app>-backend)
             ├── /graphql, /auth/**, /files/**, /data/**  →  API handlers
             └── /**                                      →  React SPA (express.static dist/ui/)
```

**`prod` mode:**

```
Internet → External HTTP(S) Load Balancer
             ├── /graphql, /auth/**, /files/**, /data/**  →  Cloud Run (via serverless NEG)
             └── /**                                      →  GCS bucket (React SPA static assets)
```

| Component | Mode | Purpose |
|---|---|---|
| Cloud Run service | both | API handlers; also serves SPA in `simple` mode |
| GCS bucket (frontend) | `prod` | Hosts React SPA static assets behind the load balancer |
| External HTTP(S) LB | `prod` | Routes API traffic to Cloud Run and static traffic to GCS |

### Cloud SQL connectivity

Cloud Run connects to Cloud SQL over the instance's **private IP** using **Direct VPC egress** — the service is attached to a dedicated VPC/subnet and reaches the database directly, with no Cloud SQL Auth Proxy and no public IP. The connection is:

- **Private** — the instance has **no public IP** (`--no-assign-ip`); it is reachable only from inside the VPC via Private Service Access (VPC peering).
- **Encrypted** in transit — the app connects with TLS (`DB_SSL=true` → `ssl: { rejectUnauthorized: false }`), and the instance enforces `--ssl-mode=ENCRYPTED_ONLY`.
- **Direct (TCP)** — `DB_HOST=<private IP>` (no `/cloudsql/...` socket). The runtime/migrate Cloud Run resources set `--network=<vpc> --subnet=<subnet> --vpc-egress=private-ranges-only` (so internet egress keeps its default path — **no Cloud NAT** is required).

Why: in-region, the direct private-IP path is ~2× faster per query round-trip than the Auth Proxy (~3.2 ms → ~1.6 ms), and it removes the ~$7/mo public-IP charge. The private IP is discovered by `setup-gcp.js` (saved as `DB_PRIVATE_IP` in `deploy.env`) and re-discovered at build time by `cloudbuild.yaml`.

```bash
# Inspect the instance's IPs (expect a PRIVATE entry, and no PRIMARY/public one)
gcloud sql instances describe <app>-db --project=PROJECT_ID --format='json(ipAddresses)'
```

### Verifying the networking setup

```bash
# Check Cloud Run service status and URL
gcloud run services describe <app>-backend --region=REGION --format='value(status.url)'

# List any Cloud Run domain mappings (simple mode)
gcloud beta run domain-mappings list --region=REGION --project=PROJECT_ID
```

---

## Frontend Hosting

The React SPA is built with UmiJS (`npm run build` → `frontend/dist/`) and served according to the active `FRONTEND_HOSTING` mode.

### URL routing

**`simple` mode** — Cloud Run serves everything:

| Path pattern | Destination |
|---|---|
| `/graphql`, `/auth/**`, `/files/**`, `/data/**` | API handlers (Express routes) |
| `/**` (default) | React SPA (`dist/ui/index.html`, served via `express.static`) |

**`prod` mode** — Load balancer routes by path:

| Path pattern | Destination |
|---|---|
| `/graphql`, `/auth/**`, `/files/**`, `/data/**` | Cloud Run backend (via serverless NEG) |
| `/**` (default) | GCS bucket (React SPA static assets) |

### Manual frontend deploy

In `simple` mode the frontend is baked into the Docker image — trigger a full redeploy:

```bash
node ops/scripts/deploy.js
```

In `prod` mode, deploy only the frontend (from the app root):

```bash
# Monorepo: build the framework first (run from the monorepo root)
pnpm run build:all

# Then from the app root:
cd frontend && npm run build && cd ..

node ops/scripts/deploy.js  # or run deploy-frontend-prod.js directly
```

---

## Database Schema Sync

TypeORM's `synchronize: true` is **disabled in production** to prevent accidental table drops. Schema updates are handled by a dedicated Cloud Run Job before each deployment:

```
Cloud Run Job: <app>-migrate
  Image: same backend image, new tag
  Env: DB_SYNCHRONIZE=true, NODE_ENV=migration
  Runs once → exits after schema is in sync
  → Production service deploys after job exits 0
```

The job is created on first run and updated on every subsequent deploy. On the very first deployment to a fresh database, the schema-sync job creates all tables — no manual SQL needed.

---

## Default Admin User

`deploy.js` seeds a default admin user on the first deployment (idempotent — skipped if the user already exists).

The script prompts interactively for the seed credentials:

- **Email** — defaults to `sys@app.com` (press Enter to accept or type a different address)
- **Password** — type a password, or press Enter twice to auto-generate a random one (printed once at the end of the deploy output)

To skip the prompts (useful for CI or scripted deployments), pass the credentials as environment variables:

```bash
SEED_USER_EMAIL=admin@example.com SEED_USER_PASS=changeme node ops/scripts/deploy.js
```

The seed runs **in-region inside the migration job** (not locally): `deploy.js` stores the seed password in Secret Manager (`<app>-seed-admin-pass`) and the migrate job receives `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD`. The framework creates the admin (role `system`) when `NODE_ENV=migration` and those vars are set, idempotently skipping if the user already exists — so seeding works against the private-IP-only database without any public IP or local proxy. **Change the password immediately after first login.**

---

## Custom Environment Variables

Your backend reads config via `process.env.*`. To add a new variable that ships to Cloud Run on deploy:

1. Add it to `backend/.env`. Example:
   ```
   FEATURE_FLAG_NEW_DASHBOARD=true
   STRIPE_WEBHOOK_TOLERANCE=300
   ```
2. Run `node ops/scripts/deploy.js` from the app root. The script reads `backend/.env`, strips the reserved keys (below), creates or rotates one Secret Manager secret per remaining key, and injects them into Cloud Run via `--set-secrets`.

The per-secret sync is intentionally serial today. That keeps the CLI output easy to follow and makes a failed `gcloud` call attributable to a single secret. If deploy latency becomes a problem, this can be parallelized later.

### Reserved keys (always overridden by deploy)

These keys in `backend/.env` are for local development only. On deploy, they are replaced:

| Key              | Production source                          |
|------------------|--------------------------------------------|
| `HOST`           | Cloud Run (`0.0.0.0`)                      |
| `PORT`           | Cloud Run (container gets `$PORT` at runtime) |
| `DB_HOST`        | Cloud SQL **private IP** (`DB_PRIVATE_IP`) |
| `DB_PORT`        | `5432`                                     |
| `DB_SSL`         | `true` (TLS to the private IP)             |
| `DB_USER`        | Hardcoded in deploy script                 |
| `DB_NAME`        | Hardcoded in deploy script                 |
| `DB_SYNCHRONIZE` | `false` on deploy; `true` on schema-sync job |
| `NODE_ENV`       | `production`                               |
| `DB_PASSWORD`    | Secret Manager (`<app>-db-password`)       |
| `JWT_SECRET`     | Secret Manager (`<app>-jwt-secret`)        |
| `STORAGE_TYPE`   | Deploy configuration (`ops/deploy.env`)    |
| `GCS_BUCKET`     | Deploy configuration (`ops/deploy.env`)    |
| `DRUMR_SKIP_UI` | `true` in `prod` mode so the backend does not serve the SPA; absent in `simple` mode (lets the framework serve `dist/ui/` from inside the container) |

Editing these in `backend/.env` does not change what runs in production. The deploy script logs a warning for every reserved key it drops.

### `.env` is gitignored — devs coordinate

`backend/.env` is not committed. If two developers' `.env` files diverge, their manual deploys will publish different app-secret sets to the same Cloud Run service. `deploy.js` uses `--set-secrets`, which **replaces** the app-secret mapping for that service and job — so Dev B's deploy can remove a key Dev A introduced if it is absent locally. Coordinate within the team before adding or removing runtime secrets.

Removing a key from `backend/.env` stops injecting it into Cloud Run on the next manual deploy, but the old Secret Manager entry is intentionally left behind. That avoids destructive cleanup during normal deploys, at the cost of possible orphaned secrets over time.

### CI preserves custom secrets, but does not create them

Google Cloud Build runs `ops/cloudbuild.yaml`, which has no access to any developer's `backend/.env`. That means CI cannot create a newly added app secret on its own.

When you add a new runtime secret:

1. Add it to `backend/.env`.
2. Run `node ops/scripts/deploy.js` once from a machine that has that `.env` file.
3. After that first manual sync, CI deploys preserve the secret because `cloudbuild.yaml` uses `--update-secrets` rather than `--set-secrets`.

CI still re-applies only the reserved non-secret env vars via `--update-env-vars`. Human deploys via `deploy.js` remain authoritative for the full runtime secret set.

---

## Logging & Observability

Cloud Run services automatically ship all stdout/stderr to **Cloud Logging** — no configuration is required. Logs are available immediately after the first request.

### View backend logs

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="<app>-backend"' \
  --project=PROJECT_ID \
  --limit=50 \
  --format='table(timestamp, severity, textPayload)'
```

### Stream live logs

```bash
gcloud beta run services logs tail <app>-backend --region=REGION
```

### Useful log filters

| What to find | Filter |
|---|---|
| All backend logs | `resource.type="cloud_run_revision" resource.labels.service_name="<app>-backend"` |
| Errors only | `resource.type="cloud_run_revision" resource.labels.service_name="<app>-backend" severity>=ERROR` |
| Schema sync job | `resource.type="cloud_run_job" resource.labels.job_name="<app>-migrate"` |
| DB connection errors | `resource.type="cloud_run_revision" textPayload:"connection refused" OR textPayload:"authentication failed"` |
| Specific request | `resource.type="cloud_run_revision" httpRequest.requestUrl:"/graphql"` |

Copy these filters into the [Cloud Console Logs Explorer](https://console.cloud.google.com/logs/query).

### Cloud Monitoring — uptime check

Create an uptime check to monitor backend availability and receive alerts if the service goes down:

```bash
gcloud monitoring uptime create \
  --display-name="<app>-backend uptime" \
  --resource-type=uptime-url \
  --uri="https://YOUR_CLOUD_RUN_OR_CUSTOM_DOMAIN/graphql" \
  --check-interval=300 \
  --project=PROJECT_ID
```

> Replace the URL with your Cloud Run URL or custom domain if configured. Attach a notification channel in [Cloud Console → Monitoring → Alerting](https://console.cloud.google.com/monitoring/alerting).

### Cloud Monitoring — error rate alert

Create a log-based metric and alert policy to notify when backend errors spike:

```bash
# Create a log-based metric for backend errors
gcloud logging metrics create <app>-backend-errors \
  --description="Count of ERROR+ logs from the backend" \
  --log-filter='resource.type="cloud_run_revision" resource.labels.service_name="<app>-backend" severity>=ERROR' \
  --project=PROJECT_ID

# Create an alert policy (fires if >5 errors in 5 minutes)
gcloud alpha monitoring policies create \
  --policy='{
    "displayName": "<app>-backend error spike",
    "conditions": [{
      "displayName": "Error log count",
      "conditionThreshold": {
        "filter": "metric.type=\"logging.googleapis.com/user/<app>-backend-errors\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 5,
        "duration": "300s",
        "aggregations": [{"alignmentPeriod": "300s", "perSeriesAligner": "ALIGN_RATE"}]
      }
    }],
    "alertStrategy": {"autoClose": "604800s"},
    "combiner": "OR",
    "enabled": true
  }' \
  --project=PROJECT_ID
```

> Attach a notification channel (email, Slack, PagerDuty) in [Cloud Console → Monitoring → Alerting](https://console.cloud.google.com/monitoring/alerting) after creating the policy.

---

## IAM & Service Accounts Reference

### Runtime service account (`<app>-backend`)

| Role | Purpose |
|---|---|
| `roles/compute.networkUser` (on the subnet) | Direct VPC egress to the Cloud SQL private IP |
| `roles/cloudsql.client` | Cloud SQL IAM (kept for admin/proxy tooling; the runtime path is a direct private-IP TCP connection) |
| `roles/secretmanager.secretAccessor` | Read DB password and JWT secret at container startup |

### Cloud Build service account (CI/CD)

| Role | Purpose |
|---|---|
| `roles/run.admin` | Deploy Cloud Run services and jobs |
| `roles/iam.serviceAccountUser` | Act as the backend SA when deploying Cloud Run |
| `roles/secretmanager.secretAccessor` | Read secrets referenced in `cloudbuild.yaml` |
| `roles/artifactregistry.writer` | Push Docker images to Artifact Registry |
| `roles/cloudsql.client` | Execute the schema-sync Cloud Run Job |
| `roles/storage.objectAdmin` | Write app-managed file uploads to the GCS bucket |
| `roles/compute.loadBalancerAdmin` | (`prod` mode only) Manage load balancer resources during frontend deploy |

---

## Ongoing Operations

### Roll back to a previous revision

```bash
# List recent revisions
gcloud run revisions list --service=<app>-backend --region=REGION

# Send 100% traffic to a previous revision
gcloud run services update-traffic <app>-backend \
  --to-revisions=<app>-backend-00005-xyz=100 --region=REGION
```

### Scale to zero immediately

```bash
gcloud run services update <app>-backend \
  --min-instances=0 --region=REGION
```

### Connect to Cloud SQL from your local machine

```bash
# Start proxy
cloud-sql-proxy PROJECT:REGION:<app>-db --port=5432 &

# Connect
psql -h 127.0.0.1 -U postgres -d <your_db_name>
```

---

## Troubleshooting

### Backend fails to connect to Cloud SQL

**Symptom:** connection timeouts, `ETIMEDOUT`, or `no pg_hba.conf entry` against the private IP.

The runtime connects directly to the instance's private IP over Direct VPC egress with TLS. Check, in order:

1. The service has Direct VPC egress on the right network, and `DB_HOST` is the **private IP**:
   ```bash
   gcloud run services describe <app>-backend --region=REGION \
     --format='yaml(spec.template.metadata.annotations, spec.template.spec.containers[0].env)'
   # expect run.googleapis.com/network-interfaces with <app>-subnet,
   # vpc-access-egress=private-ranges-only, DB_HOST=<10.x.x.x>, DB_SSL=true
   ```
2. The instance actually has a private IP and the VPC peering is up:
   ```bash
   gcloud sql instances describe <app>-db --project=PROJECT_ID --format='json(ipAddresses)'
   gcloud services vpc-peerings list --network=<app>-vpc --project=PROJECT_ID
   ```
3. The deploying/runtime SAs have `roles/compute.networkUser` on the subnet:
   ```bash
   gcloud compute networks subnets get-iam-policy <app>-subnet --region=REGION --project=PROJECT_ID
   ```
4. If you see a TLS error, confirm `DB_SSL=true` (the app sends `ssl: { rejectUnauthorized: false }`) and the instance is `--ssl-mode=ENCRYPTED_ONLY`.

> Note: `connect ENOENT /cloudsql/...` (a unix-socket error) means the service is still on the old
> Auth Proxy path — redeploy with the updated `deploy.js` / `cloudbuild.yaml`.

### Cloud Run service fails to start

**Symptom:** Deployment succeeds but health check fails → rollback

1. Check startup logs: `gcloud beta run services logs tail <app>-backend --region=REGION`
2. Verify all secrets exist: `gcloud secrets list --project=PROJECT_ID`

**Symptom:** `password authentication failed for user "postgres"`

The DB password and the Secret Manager secret are out of sync:

```bash
NEW_PASS="$(openssl rand -base64 24)"

gcloud sql users set-password postgres \
  --instance=<app>-db \
  --password="$NEW_PASS" \
  --project=PROJECT_ID

echo -n "$NEW_PASS" | gcloud secrets versions add <app>-db-password \
  --data-file=- --project=PROJECT_ID
```

Then redeploy.

### Schema sync job exits non-zero

**Symptom:** `<app>-migrate` job execution fails

1. Check job logs:
   ```bash
   gcloud logging read \
     'resource.type="cloud_run_job" resource.labels.job_name="<app>-migrate"' \
     --limit=20 --format='value(textPayload)'
   ```
2. TypeORM exits 0 even when schema is already up to date — non-zero indicates a real error
3. Verify the job's `DB_HOST` is the instance **private IP**, `DB_SSL=true`, and the job has Direct VPC egress (`--network`/`--subnet`) on the `<app>-vpc`/`<app>-subnet`

### Docker build fails: `cannot find module '@drumr/framework-backend'`

The Docker build context must be the **app root**, not `backend/`:

```bash
# Run from your app root (the directory containing backend/ and frontend/)
docker build -f backend/Dockerfile .
#                                   ^ app root
```

### Docker push fails: Unauthenticated request

**Symptom:** `Unauthenticated requests do not have permission "artifactregistry.repositories.uploadArtifacts"`

Configure `gcloud` as the Docker credential helper (runs once per machine):

```bash
gcloud auth configure-docker us-central1-docker.pkg.dev
```

If the error persists, ensure you are logged in with an account that has `roles/artifactregistry.writer`:

```bash
gcloud auth login
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### Cloud SQL Proxy is not recognized on local machine

**Symptom:** `"cloud-sql-proxy" is not recognized as an internal or external command`

Install the component and open a new terminal:

```bash
gcloud components install cloud-sql-proxy
cloud-sql-proxy --version
```

On Windows, restart your terminal (or VS Code) after install so `PATH` is refreshed.

### simple mode: SPA returns 404 on `/`

**Symptom:** Cloud Run returns 404 for the app root when `FRONTEND_HOSTING=simple`.

1. Verify `DRUMR_SKIP_UI` is **not** set on the Cloud Run service:
   ```bash
   gcloud run services describe <app>-backend --region=REGION \
     --format='value(spec.template.spec.containers[0].env)'
   ```
   If it is set to `true`, remove it:
   ```bash
   gcloud run services update <app>-backend --region=REGION \
     --remove-env-vars=DRUMR_SKIP_UI --project=PROJECT_ID
   ```
2. Verify the Docker image contains `dist/ui/index.html`:
   ```bash
   docker run --rm \
     REGION-docker.pkg.dev/PROJECT_ID/drumr-apps/<app>-backend:latest \
     ls dist/ui/
   ```
   If `dist/ui/` is missing, the frontend build did not complete before `docker build`. In Cloud Build, confirm `build-frontend` is listed as a dependency of `build-backend` in `cloudbuild.yaml`. Rebuild and push the image.

### SSL certificate stuck in PROVISIONING

**`simple` mode (Cloud Run domain mapping):**

**Symptom:** `gcloud beta run domain-mappings describe` shows the mapping in `PENDING_VERIFICATION` or the certificate in `PROVISIONING` for more than 2 hours.

1. Verify the DNS record resolves to the correct value:
   ```bash
   dig +short app.yourdomain.com
   ```
2. Use [dnschecker.org](https://dnschecker.org) to confirm the record has propagated globally.
3. If the domain itself is not verified with Google, run `gcloud domains verify yourdomain.com` and complete verification before re-running `setup-domain.js`.

**`prod` mode (External LB managed certificate):**

1. Verify the `A` record resolves to the load balancer IP:
   ```bash
   dig +short app.yourdomain.com
   ```
2. Check certificate status:
   ```bash
   gcloud compute ssl-certificates describe <prefix>-ssl \
     --global --format=value(managed.status,managed.domainStatus)
   ```
3. Certificate provisioning begins only after DNS resolves correctly worldwide. If propagation is confirmed, wait another 30 minutes.

---

## Security Hardening

`setup-gcp.js` applies the following GCP Security Command Center (SCC) remediations automatically during infrastructure setup:

| SCC Finding | Action taken by `setup-gcp.js` |
|---|---|
| SSL not enforced (Cloud SQL) | Instance created with `--ssl-mode=ENCRYPTED_ONLY`; the app connects with TLS (`DB_SSL=true`) |
| Cloud SQL public IP | Instance created with **no public IP** (`--no-assign-ip`); reachable only over its private IP inside a dedicated VPC (Private Service Access) |
| Default network present | Default VPC network deleted; a dedicated `<app>-vpc` is created for private DB connectivity |
| Open SSH / RDP / ICMP / internal ports | All four default firewall rules deleted before network removal |
| OS login disabled | `enable-oslogin=TRUE` set as project-level metadata |
| Uniform bucket level access (Cloud Build cache) | `constraints/storage.uniformBucketLevelAccess` org policy enforced at the project level |

All hardening steps use `allowFailure: true` — if a resource was already removed or the org policy requires elevated permissions, the script logs the step and continues safely.

> **Applying SSL to an existing database:** `--ssl-mode=ENCRYPTED_ONLY` is set at creation time. If the database was already provisioned before this change, patch it manually:
> ```bash
> gcloud sql instances patch <instance-name> --ssl-mode=ENCRYPTED_ONLY --project=PROJECT_ID
> ```

### Acknowledged Exceptions

The following SCC findings are intentionally left open in development environments.

**1. Allowed Ingress Org Policy (Medium)**

Cloud Run is deployed with `--allow-unauthenticated` for direct developer access to `*.run.app` URLs during testing.

**2. Auto Backup Disabled (Medium)**

The Cloud SQL instance is created with `--no-backup` to reduce storage costs for non-critical test data.

> The previous "SQL Public IP" exception no longer applies — the instance is now private-IP only.

### Production Readiness

When deploying with sensitive or business-critical data, you must:

- Enable automated database backups and point-in-time recovery (remove `--no-backup`)
- Restrict Cloud Run ingress to an internal load balancer protected by Cloud Armor
- Consider full server-certificate verification for the DB TLS connection (the default uses `rejectUnauthorized: false`, which encrypts in transit but does not verify the server cert; acceptable for a VPC-internal private IP)
