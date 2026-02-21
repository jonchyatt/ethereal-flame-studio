# Production Deployment Checklist

This checklist provisions the full **Ethereal Flame Studio** cloud stack from scratch. Follow sections in order -- each section produces environment variables needed by subsequent sections.

By the end of this checklist you will have a fully running production system: web app on Vercel, background worker on Render.com, database on Turso, asset storage on Cloudflare R2, and GPU render compute on Modal.

---

## Architecture Overview

| Service        | Role                                     | Tech                          |
| -------------- | ---------------------------------------- | ----------------------------- |
| **Vercel**     | Web app + API routes                     | Next.js (serverless)          |
| **Render.com** | Background CPU worker (audio processing) | Node.js + ffmpeg + yt-dlp     |
| **Turso**      | Job state database                       | SQLite-compatible cloud (libsql) |
| **Cloudflare R2** | Asset and video storage               | S3-compatible object storage  |
| **Modal**      | GPU render compute                       | Python + Puppeteer container  |

**Data flow:**
1. User uploads audio via Vercel -> stored in R2
2. Job created in Turso via API route
3. Render.com worker polls Turso, claims job, processes audio
4. For render jobs: worker dispatches to Modal GPU, Modal uploads output to R2, calls webhook
5. User downloads result via signed R2 URL

---

## Prerequisites

Before you begin, ensure you have:

- [ ] **Node.js 20+** installed (`node --version`)
- [ ] **GitHub account** with access to the `ethereal-flame-studio` repository
- [ ] **Accounts created** on all five services:
  - [Cloudflare](https://dash.cloudflare.com/sign-up) (R2 storage)
  - [Turso](https://turso.tech/) (database)
  - [Render.com](https://render.com/) (worker hosting)
  - [Modal](https://modal.com/) (GPU compute)
  - [Vercel](https://vercel.com/) (web app hosting)

**Install CLI tools:**

```bash
# Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Vercel CLI
npm install -g vercel

# Modal CLI
pip install modal
```

**Optional (for R2 verification):**

```bash
# AWS CLI (used to verify R2 bucket access)
# Install from https://aws.amazon.com/cli/
pip install awscli
```

---

## Environment Variable Tracking

Use this table to record values as you provision each service. You will enter these into Vercel and Render.com later.

| Variable                   | Source        | Value |
| -------------------------- | ------------- | ----- |
| `R2_ACCOUNT_ID`            | Cloudflare R2 |       |
| `R2_ACCESS_KEY_ID`         | Cloudflare R2 |       |
| `R2_SECRET_ACCESS_KEY`     | Cloudflare R2 |       |
| `R2_BUCKET_NAME`           | Cloudflare R2 |       |
| `TURSO_DATABASE_URL`       | Turso         |       |
| `TURSO_AUTH_TOKEN`          | Turso         |       |
| `MODAL_ENDPOINT_URL`       | Modal         |       |
| `MODAL_AUTH_TOKEN`         | Modal         |       |
| `INTERNAL_WEBHOOK_SECRET`  | Generated     |       |
| `NEXT_PUBLIC_APP_URL`      | Vercel        |       |

---

## 1. Cloudflare R2 Bucket

R2 provides S3-compatible object storage with zero egress fees. Audio files, rendered videos, and intermediate assets are stored here.

### 1.1 Create the Bucket

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2 Object Storage** in the left sidebar
3. Click **Create bucket**
4. Name: `ethereal-flame-studio`
5. Location: choose a region close to your users (or leave as automatic)
6. Click **Create bucket**

### 1.2 Create an API Token

1. In the R2 section, click **Manage R2 API Tokens**
2. Click **Create API token**
3. Token name: `ethereal-flame-studio-prod`
4. Permissions: **Object Read & Write**
5. Specify bucket: `ethereal-flame-studio` (do not grant access to all buckets)
6. TTL: No expiration (or set a long expiration and rotate periodically)
7. Click **Create API Token**
8. **Record immediately** (shown only once):
   - `R2_ACCESS_KEY_ID` = Access Key ID
   - `R2_SECRET_ACCESS_KEY` = Secret Access Key
9. Find your Account ID on the R2 overview page (right sidebar) or at the top of any Cloudflare Dashboard page:
   - `R2_ACCOUNT_ID` = your Cloudflare Account ID
10. `R2_BUCKET_NAME` = `ethereal-flame-studio`

### 1.3 CORS Configuration

CORS is **not required** -- the app uses server-side signed URLs for all uploads and downloads. Browsers never access R2 directly.

### Env Vars Produced

| Variable               | Example Value                            |
| ---------------------- | ---------------------------------------- |
| `R2_ACCOUNT_ID`        | `a1b2c3d4e5f6...`                        |
| `R2_ACCESS_KEY_ID`     | `AKIAIOSFODNN7EXAMPLE`                   |
| `R2_SECRET_ACCESS_KEY` | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLE` |
| `R2_BUCKET_NAME`       | `ethereal-flame-studio`                  |

### Verification

```bash
# Using AWS CLI with R2 credentials
export AWS_ACCESS_KEY_ID=<R2_ACCESS_KEY_ID>
export AWS_SECRET_ACCESS_KEY=<R2_SECRET_ACCESS_KEY>

aws s3 ls s3://ethereal-flame-studio \
  --endpoint-url https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com

# Expected: empty listing (no error). If you see "Access Denied", recheck the token scope.
```

---

## 2. Turso Database

Turso provides a globally-distributed SQLite-compatible database. The app uses it to store job state (audio prep, render jobs).

### 2.1 Authenticate

```bash
turso auth login
# Opens browser for authentication
```

### 2.2 Create the Database

```bash
turso db create ethereal-flame-studio
# Creates the database in your nearest region
```

### 2.3 Get Connection Details

```bash
# Get the database URL
turso db show ethereal-flame-studio --url
# Output: libsql://ethereal-flame-studio-<your-account>.turso.io
# Record as TURSO_DATABASE_URL

# Create an auth token
turso db tokens create ethereal-flame-studio
# Output: a long JWT string
# Record as TURSO_AUTH_TOKEN
```

### 2.4 Schema

The schema is **auto-created** on first connection. The app uses Drizzle ORM migrations and the `TursoJobStore` creates the `audio_prep_jobs` table automatically if it does not exist. No manual schema setup is required.

### Env Vars Produced

| Variable             | Example Value                                         |
| -------------------- | ----------------------------------------------------- |
| `TURSO_DATABASE_URL` | `libsql://ethereal-flame-studio-yourname.turso.io`    |
| `TURSO_AUTH_TOKEN`   | `eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...`            |

### Verification

```bash
turso db shell ethereal-flame-studio "SELECT 1"
# Expected output: 1
# If this errors, check that the database was created successfully
```

---

## 3. Modal GPU Endpoint

Modal provides serverless GPU compute for video rendering. The Modal app is located at `modal_app/app.py` in the repository.

### 3.1 Authenticate

```bash
modal setup
# Opens browser for authentication, creates ~/.modal.toml
```

### 3.2 Deploy the Modal App

```bash
# From the repository root
modal deploy modal_app/app.py
# Output will show the deployed endpoint URLs
```

Record the endpoint URLs from the deploy output:
- `MODAL_ENDPOINT_URL` = the submit/render endpoint URL (e.g., `https://yourname--ethereal-submit.modal.run`)
- `MODAL_AUTH_TOKEN` = create a shared secret for authenticating requests to your Modal endpoint

> **Note:** `MODAL_STATUS_URL` is optional. If not set, it is auto-derived from `MODAL_ENDPOINT_URL` by replacing `ethereal-submit` with `ethereal-status`.

### 3.3 Set Modal Secrets

The Modal app needs R2 credentials to upload rendered videos. Set these as Modal secrets:

```bash
modal secret create r2-credentials \
  R2_ACCOUNT_ID=<your-account-id> \
  R2_ACCESS_KEY_ID=<your-access-key-id> \
  R2_SECRET_ACCESS_KEY=<your-secret-access-key> \
  R2_BUCKET_NAME=ethereal-flame-studio
```

### Env Vars Produced

| Variable             | Example Value                                          |
| -------------------- | ------------------------------------------------------ |
| `MODAL_ENDPOINT_URL` | `https://yourname--ethereal-submit.modal.run`          |
| `MODAL_AUTH_TOKEN`   | `your-generated-auth-token`                            |

### Verification

```bash
# Test that the endpoint is reachable
curl -X POST "$MODAL_ENDPOINT_URL" \
  -H "Content-Type: application/json" \
  -d '{"auth_token":"'"$MODAL_AUTH_TOKEN"'","config":{},"job_id":"test-ping"}'

# Expected: A JSON response (even an error response confirms the endpoint is reachable)
# If connection refused or DNS error, the deploy did not succeed
```

---

## 4. Generate Webhook Secret

The webhook secret authenticates callbacks between the worker, Modal, and the Vercel app. It **must be the same value** in Vercel and Render.com.

### Generate

```bash
openssl rand -hex 32
# Example output: a3f7c9e1d4b2...64 hex characters
# Record as INTERNAL_WEBHOOK_SECRET
```

This secret is used by:
- **Worker -> Vercel:** Worker sends job completion webhooks to `/api/webhooks/worker`
- **Modal -> Vercel:** Modal calls the same webhook endpoint when render completes
- **Vercel:** Validates incoming webhooks via `Authorization: Bearer <secret>` with constant-time comparison

### Env Vars Produced

| Variable                  | Example Value                                      |
| ------------------------- | -------------------------------------------------- |
| `INTERNAL_WEBHOOK_SECRET` | `a3f7c9e1d4b28f6...` (64 hex chars)               |

---

## 5. Vercel Project

Vercel hosts the Next.js web application and API routes. It is the primary user-facing service.

### 5.1 Link Project

```bash
# From the repository root
vercel link
# Follow prompts to link to existing project or create a new one
```

### 5.2 Set Environment Variables

Add all environment variables via the Vercel Dashboard or CLI. These must be set for the **Production** environment.

**Via Dashboard:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) > your project
2. Navigate to **Settings** > **Environment Variables**
3. Add each variable below for the **Production** environment

**Via CLI:**

```bash
# Core deployment flag (activates R2 storage + Turso job store automatically)
vercel env add DEPLOY_ENV production

# Cloudflare R2 (from Section 1)
vercel env add R2_ACCOUNT_ID
vercel env add R2_ACCESS_KEY_ID
vercel env add R2_SECRET_ACCESS_KEY
vercel env add R2_BUCKET_NAME

# Turso Database (from Section 2)
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN

# Modal GPU (from Section 3)
vercel env add MODAL_ENDPOINT_URL
vercel env add MODAL_AUTH_TOKEN

# Webhook Secret (from Section 4)
vercel env add INTERNAL_WEBHOOK_SECRET

# App URL (set after first deploy, or use your custom domain)
vercel env add NEXT_PUBLIC_APP_URL
```

**Complete variable list for Vercel:**

| Variable                  | Value / Source                           | Required |
| ------------------------- | ---------------------------------------- | -------- |
| `DEPLOY_ENV`              | `production`                             | Yes      |
| `R2_ACCOUNT_ID`           | From Section 1                           | Yes      |
| `R2_ACCESS_KEY_ID`        | From Section 1                           | Yes      |
| `R2_SECRET_ACCESS_KEY`    | From Section 1                           | Yes      |
| `R2_BUCKET_NAME`          | `ethereal-flame-studio`                  | Yes      |
| `TURSO_DATABASE_URL`      | From Section 2                           | Yes      |
| `TURSO_AUTH_TOKEN`        | From Section 2                           | Yes      |
| `MODAL_ENDPOINT_URL`      | From Section 3                           | Yes      |
| `MODAL_AUTH_TOKEN`        | From Section 3                           | Yes      |
| `INTERNAL_WEBHOOK_SECRET` | From Section 4                           | Yes      |
| `NEXT_PUBLIC_APP_URL`     | Your production URL (e.g., `https://ethereal-flame.vercel.app`) | Yes |

> **Note:** `STORAGE_BACKEND` and `JOB_STORE_BACKEND` are optional. Setting `DEPLOY_ENV=production` automatically selects `r2` for storage and `turso` for the job store.

### 5.3 Deploy

```bash
vercel --prod
```

### 5.4 Record the Production URL

After deploy completes, note the production URL. If you haven't already set `NEXT_PUBLIC_APP_URL`, update it now:

```bash
vercel env add NEXT_PUBLIC_APP_URL
# Enter: https://your-project.vercel.app (or your custom domain)
```

### Verification

1. Visit the production URL in your browser
2. Confirm the app loads without errors
3. Open browser DevTools > Console -- no errors related to missing env vars

---

## 6. Render.com Worker

The Render.com worker is a background service that polls Turso for pending jobs and processes them (audio ingest, preview, save, and render dispatch to Modal).

### 6.1 Create the Service

1. Log into [Render Dashboard](https://dashboard.render.com/)
2. Click **New** > **Background Worker**
3. Connect your GitHub repository (`ethereal-flame-studio`)
4. Configure:

| Setting            | Value                    |
| ------------------ | ------------------------ |
| **Name**           | `ethereal-flame-worker`  |
| **Region**         | Same as your Turso DB    |
| **Runtime**        | Docker                   |
| **Dockerfile Path**| `worker/Dockerfile`      |
| **Docker Context** | `.` (repository root)    |
| **Instance Type**  | Starter ($7/mo)          |
| **Branch**         | `master` (or your deploy branch) |

### 6.2 Set Environment Variables

In the Render service settings, add:

| Variable                  | Value / Source                           | Required |
| ------------------------- | ---------------------------------------- | -------- |
| `TURSO_DATABASE_URL`      | From Section 2 (same as Vercel)          | Yes      |
| `TURSO_AUTH_TOKEN`        | From Section 2 (same as Vercel)          | Yes      |
| `STORAGE_BACKEND`         | `r2`                                     | Yes      |
| `R2_ACCOUNT_ID`           | From Section 1 (same as Vercel)          | Yes      |
| `R2_ACCESS_KEY_ID`        | From Section 1 (same as Vercel)          | Yes      |
| `R2_SECRET_ACCESS_KEY`    | From Section 1 (same as Vercel)          | Yes      |
| `R2_BUCKET_NAME`          | `ethereal-flame-studio`                  | Yes      |
| `INTERNAL_WEBHOOK_SECRET` | From Section 4 (same as Vercel)          | Yes      |
| `NEXT_PUBLIC_APP_URL`     | Your Vercel production URL               | Yes      |
| `MODAL_ENDPOINT_URL`      | From Section 3 (same as Vercel)          | Yes      |
| `MODAL_AUTH_TOKEN`        | From Section 3 (same as Vercel)          | Yes      |

> **Important:** The worker uses `STORAGE_BACKEND=r2` explicitly (not `DEPLOY_ENV`) because it is a standalone Node.js process, not a Next.js app.

### 6.3 Deploy

Click **Create Background Worker** or trigger a manual deploy.

> **Note:** After initial manual setup, subsequent deploys to Render are automated via GitHub Actions (see Section 8). Pushing to `main` triggers the worker deploy automatically.

### Verification

Check the Render service logs. You should see:

```
[Worker] Started, polling every 3000ms
```

If you see `TURSO_DATABASE_URL is required`, the environment variable was not set correctly.

---

## 7. End-to-End Verification

After all services are provisioned, run this smoke test to confirm everything works together.

### 7.1 Upload Test

1. Open the production URL in your browser
2. Upload a short audio file (< 1 MB, any common format: mp3, wav, m4a)
3. Verify the upload completes without errors

**What this tests:** Vercel API routes, R2 storage, Turso job creation

### 7.2 Worker Processing

1. After uploading, check the Render worker logs
2. You should see:
   ```
   [Worker] Claimed job <job-id> (ingest)
   [Worker] Finished job <job-id>
   ```
3. Back in the browser, the job should show as completed

**What this tests:** Turso polling, worker job processing, R2 read/write

### 7.3 Audio Playback

1. After the job completes, play the processed audio in the app
2. Verify audio streams correctly

**What this tests:** R2 signed URL generation, audio streaming

### 7.4 Render Test (Optional)

1. Configure a visual preset and trigger a render
2. Check worker logs for Modal dispatch:
   ```
   [Render] Job <job-id> dispatched to Modal (call_id=..., gpu=true)
   ```
3. After Modal completes, the webhook should update the job:
   ```
   [Webhook] Render complete for job <job-id>
   ```
4. Verify the rendered video is downloadable

**What this tests:** Full pipeline -- Vercel -> Turso -> Worker -> Modal -> R2 -> Webhook -> Download

---

## 8. GitHub Actions CI/CD

After completing the manual setup above, configure GitHub Actions to automate future deployments. Pushing to `main` will automatically deploy both the web app (Vercel) and the worker (Render.com).

### 8.1 Required GitHub Secrets

Add these secrets in your GitHub repository: **Settings** > **Secrets and variables** > **Actions** > **New repository secret**.

| Secret                    | Where to Find It                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `VERCEL_TOKEN`            | Create at [vercel.com/account/tokens](https://vercel.com/account/tokens) -- use "Full Access" scope    |
| `VERCEL_ORG_ID`           | Run `vercel link` then check `.vercel/project.json`, or find in Vercel Dashboard > Team Settings > General > Team ID |
| `VERCEL_PROJECT_ID`       | Run `vercel link` then check `.vercel/project.json`, or find in Vercel Dashboard > Project Settings > General > Project ID |
| `RENDER_DEPLOY_HOOK_URL`  | Render Dashboard > `ethereal-flame-worker` service > **Settings** > **Deploy Hook** > Create and copy the URL |

### 8.2 How It Works

The workflow at `.github/workflows/deploy.yml` runs on every push to `main`:

- **deploy-web** (Vercel): Checks out code, installs Vercel CLI, pulls production environment, builds, and deploys with `vercel deploy --prebuilt --prod`
- **deploy-worker** (Render.com): Sends a POST request to the Render deploy hook URL, triggering a Docker rebuild from `worker/Dockerfile`

Both jobs run **in parallel** -- the web app and worker deploy simultaneously. A concurrency group prevents overlapping deploys from rapid successive pushes.

### 8.3 Verify

1. Push a commit to the `main` branch
2. Go to **GitHub** > **Actions** tab -- confirm the "Deploy" workflow starts
3. Both jobs (deploy-web, deploy-worker) should show green checkmarks
4. Verify in **Vercel Dashboard** that a new production deployment appears
5. Verify in **Render Dashboard** that the worker service shows a new deploy

### Troubleshooting CI/CD

- **Workflow not triggering:** Ensure you are pushing to the `main` branch (not `master` or a feature branch)
- **Vercel deploy fails:** Check that `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` are set correctly in GitHub Secrets
- **Render deploy not starting:** Verify `RENDER_DEPLOY_HOOK_URL` is a valid URL -- test it manually with `curl -X POST "<url>"`

---

## 9. Troubleshooting

### Worker not picking up jobs

- **Check:** `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` must match between Vercel and Render
- **Check:** Worker logs for connection errors
- **Fix:** Copy the exact values from Vercel env vars to Render env vars

### 401 Unauthorized on webhook callbacks

- **Check:** `INTERNAL_WEBHOOK_SECRET` must be identical in Vercel and Render
- **Check:** The webhook validates `Authorization: Bearer <secret>` -- ensure the secret has no trailing whitespace
- **Fix:** Regenerate the secret and set it in both services

### Storage errors (upload/download fails)

- **Check:** All four R2 variables are set: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- **Check:** The API token has Object Read & Write permission on the correct bucket
- **Fix:** Create a new R2 API token with the correct scope

### Modal dispatch fails

- **Check:** `MODAL_ENDPOINT_URL` is the full URL (e.g., `https://...modal.run`)
- **Check:** `MODAL_AUTH_TOKEN` matches what the Modal app expects
- **Check:** Modal app is deployed and running (`modal app list`)
- **Fix:** Redeploy with `modal deploy modal_app/app.py`

### App loads but shows errors in console

- **Check:** `DEPLOY_ENV=production` is set in Vercel
- **Check:** `NEXT_PUBLIC_APP_URL` is set to the correct production URL
- **Fix:** Verify all env vars are set for the Production environment (not just Preview/Development)

### Database schema issues

- The schema auto-creates on first connection. If you see table-not-found errors:
  - **Check:** The `TURSO_DATABASE_URL` points to the correct database
  - **Fix:** The `TursoJobStore` runs `CREATE TABLE IF NOT EXISTS` on initialization -- restart the worker or redeploy Vercel

---

## Quick Reference: All Environment Variables

### Vercel (Web App)

```env
DEPLOY_ENV=production
R2_ACCOUNT_ID=<from-cloudflare>
R2_ACCESS_KEY_ID=<from-cloudflare>
R2_SECRET_ACCESS_KEY=<from-cloudflare>
R2_BUCKET_NAME=ethereal-flame-studio
TURSO_DATABASE_URL=<from-turso>
TURSO_AUTH_TOKEN=<from-turso>
MODAL_ENDPOINT_URL=<from-modal>
MODAL_AUTH_TOKEN=<from-modal>
INTERNAL_WEBHOOK_SECRET=<generated>
NEXT_PUBLIC_APP_URL=<your-production-url>
```

### Render.com (Worker)

```env
STORAGE_BACKEND=r2
R2_ACCOUNT_ID=<from-cloudflare>
R2_ACCESS_KEY_ID=<from-cloudflare>
R2_SECRET_ACCESS_KEY=<from-cloudflare>
R2_BUCKET_NAME=ethereal-flame-studio
TURSO_DATABASE_URL=<from-turso>
TURSO_AUTH_TOKEN=<from-turso>
MODAL_ENDPOINT_URL=<from-modal>
MODAL_AUTH_TOKEN=<from-modal>
INTERNAL_WEBHOOK_SECRET=<generated>
NEXT_PUBLIC_APP_URL=<your-production-url>
```

### Modal (GPU Render)

Set as Modal secrets (see Section 3.3):

```env
R2_ACCOUNT_ID=<from-cloudflare>
R2_ACCESS_KEY_ID=<from-cloudflare>
R2_SECRET_ACCESS_KEY=<from-cloudflare>
R2_BUCKET_NAME=ethereal-flame-studio
```
