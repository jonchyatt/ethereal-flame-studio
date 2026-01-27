# n8n Setup for Ethereal Flame Studio

Self-hosted n8n workflow automation with YouTube OAuth for automated video uploads.

## Why Self-Hosted n8n?

YouTube video upload via n8n requires **self-hosted n8n** (not n8n Cloud). This is because Google blocks the OAuth callback URL used by n8n Cloud for upload scopes. Self-hosted n8n allows you to use your own OAuth credentials with a custom callback URL.

## Prerequisites

1. **Docker** installed on your home server
2. **Domain with SSL** (via Cloudflare Tunnel - see REMOTE_ACCESS.md)
3. **Google Cloud Project** (for YouTube OAuth)

## Quick Start

### Step 1: Configure Environment

Copy `.env.example` to `.env` and configure n8n settings:

```bash
# .env

# For local development
N8N_HOST=localhost
N8N_PROTOCOL=http
N8N_WEBHOOK_URL=http://localhost:5678/

# For production (with Cloudflare Tunnel)
N8N_HOST=n8n.yourdomain.com
N8N_PROTOCOL=https
N8N_WEBHOOK_URL=https://n8n.yourdomain.com/

# Authentication (CHANGE THESE!)
N8N_BASIC_AUTH_ACTIVE=true
N8N_USER=admin
N8N_PASSWORD=your_secure_password_here

# Timezone
TZ=America/Los_Angeles
```

### Step 2: Start n8n

```bash
# Start n8n with the automation profile
docker-compose --profile automation up -d n8n

# View logs
docker logs -f ethereal-n8n
```

### Step 3: Access n8n

- Local: http://localhost:5678
- Remote: https://n8n.yourdomain.com (requires Cloudflare Tunnel)

Log in with your `N8N_USER` and `N8N_PASSWORD`.

## Google Cloud Setup for YouTube

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** -> **New Project**
3. Name: `Ethereal Flame Studio`
4. Click **Create**

### Step 2: Enable YouTube Data API v3

1. Go to **APIs & Services** -> **Library**
2. Search for "YouTube Data API v3"
3. Click on it and click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** -> **OAuth consent screen**
2. Select **External** (unless you have Google Workspace)
3. Fill in required fields:
   - App name: `Ethereal Flame Studio`
   - User support email: Your email
   - Developer contact: Your email
4. Click **Save and Continue**
5. **Scopes**: Click **Add or Remove Scopes**
   - Add: `https://www.googleapis.com/auth/youtube.upload`
   - Add: `https://www.googleapis.com/auth/youtube`
6. Click **Save and Continue**
7. **Test users**: Add your Google account email
8. Click **Save and Continue**

**Note:** For testing, your app stays in "Testing" mode with up to 100 test users. For production with unlimited users, you'll need to verify your app with Google.

### Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** -> **Credentials**
2. Click **Create Credentials** -> **OAuth client ID**
3. Application type: **Web application**
4. Name: `n8n YouTube Upload`
5. **Authorized redirect URIs**: Add:
   ```
   https://n8n.yourdomain.com/rest/oauth2-credential/callback
   ```
   (Replace with your actual n8n URL)
6. Click **Create**
7. **Copy the Client ID and Client Secret** - you'll need these in n8n

### Step 5: Add YouTube Credential in n8n

1. Open n8n: https://n8n.yourdomain.com
2. Go to **Settings** (gear icon) -> **Credentials**
3. Click **Add Credential**
4. Search for "YouTube"
5. Select **YouTube OAuth2 API**
6. Fill in:
   - **Credential name**: `YouTube Upload`
   - **Client ID**: Paste from Google Cloud
   - **Client Secret**: Paste from Google Cloud
7. Click **Connect my account**
8. A Google sign-in window will open
9. Select your Google account
10. Click **Allow** to grant permissions
11. You should see "Connected" status
12. Click **Save**

### Step 6: Test the Connection

1. Create a new workflow in n8n
2. Add a **YouTube** node
3. Select your credential
4. Set:
   - Resource: Video
   - Operation: Get All (list videos)
5. Execute the node
6. You should see your YouTube channel's videos

If this works, your YouTube credential is properly configured.

## API Quota Information

YouTube Data API has a default quota of **10,000 units per day**.

| Operation | Quota Cost |
|-----------|------------|
| Video upload | ~1,600 units |
| Video update | ~50 units |
| List videos | ~1 unit |

**This means approximately 6 video uploads per day on the default quota.**

### Requesting Higher Quota

If you need more uploads:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** -> **YouTube Data API v3**
3. Click **Quotas**
4. Click **Request quota increase**
5. Fill out the form explaining your use case

## Volume Mount for Videos

n8n needs read access to rendered videos:

```yaml
# docker-compose.yml (already configured)
n8n:
  volumes:
    - ${RENDER_OUTPUT_DIR:-./output}:/renders:ro
```

When reading files in n8n workflows, use the `/renders/` path:

```
/renders/2026-01-27_meditation_1080p.mp4
```

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `N8N_HOST` | External hostname | `localhost` |
| `N8N_PORT` | Port number | `5678` |
| `N8N_PROTOCOL` | http or https | `http` |
| `N8N_WEBHOOK_URL` | Full webhook base URL | `http://localhost:5678/` |
| `N8N_BASIC_AUTH_ACTIVE` | Enable basic auth | `true` |
| `N8N_USER` | Basic auth username | `admin` |
| `N8N_PASSWORD` | Basic auth password | `changeme` |
| `N8N_PAYLOAD_SIZE_MAX` | Max payload size (MB) | `100` |
| `TZ` | Timezone | `America/Los_Angeles` |

## Quick Commands

```bash
# Start n8n
docker-compose --profile automation up -d n8n

# Stop n8n
docker-compose --profile automation down

# View n8n logs
docker logs -f ethereal-n8n

# Restart n8n
docker-compose --profile automation restart n8n

# Access n8n shell (for debugging)
docker exec -it ethereal-n8n /bin/sh
```

## Troubleshooting

### "Invalid redirect URI" error

Your OAuth redirect URI doesn't match. Ensure:
- n8n is accessible at the exact URL in your Google Cloud credentials
- Protocol matches (https vs http)
- No trailing slash mismatch

### "Access blocked" error

Your Google Cloud app is in testing mode and the user isn't added:
1. Go to OAuth consent screen in Google Cloud
2. Add your email to "Test users"

### n8n shows "Unhealthy"

Check container logs:
```bash
docker logs ethereal-n8n
```

Common issues:
- Port 5678 already in use
- Volume mount permissions

### YouTube upload fails with quota error

You've exceeded your daily quota. Either:
- Wait until tomorrow (quotas reset at midnight Pacific)
- Request a quota increase from Google

---

For workflow setup, see [N8N_WORKFLOWS.md](./N8N_WORKFLOWS.md).
