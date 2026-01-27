# Remote Access via Cloudflare Tunnel

Secure access to your home render server from anywhere without exposing ports or using a VPN.

## Overview

Cloudflare Tunnel creates an outbound-only encrypted connection from your server to Cloudflare's edge network. This allows you to access n8n and the render API from your phone or any device, anywhere in the world.

```
[Phone/Browser]
       |
       v (HTTPS)
[Cloudflare Network]
       |
       v (encrypted tunnel)
[cloudflared daemon]
       |
       +--------+--------+
       |        |        |
       v        v        v
    [n8n]   [Render]  [Web UI]
    :5678    :3000     :3001
```

## Prerequisites

1. **Cloudflare Account** (free tier is sufficient)
   - Sign up at: https://dash.cloudflare.com/sign-up

2. **Domain managed by Cloudflare**
   - Add your domain to Cloudflare (DNS must be managed by Cloudflare)
   - Go to: Cloudflare Dashboard -> Websites -> Add site

3. **Docker** installed on your home server
   - The cloudflared container will handle the tunnel

## Setup Steps

### Step 1: Create the Tunnel

1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. Navigate to **Networks** -> **Tunnels**
3. Click **Create a tunnel**
4. Select **Cloudflared** as the connector type
5. Name your tunnel: `ethereal-flame` (or any descriptive name)
6. Click **Save tunnel**

### Step 2: Copy the Tunnel Token

After creating the tunnel, you'll see installation instructions. Look for the token in the Docker command:

```bash
docker run cloudflare/cloudflared:latest tunnel --no-autoupdate run --token <YOUR_TOKEN>
```

Copy the entire token (it's a long base64 string).

### Step 3: Configure Environment Variables

Add the token to your `.env` file:

```bash
# .env
CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoiYWJjZGVm...your_long_token_here
```

### Step 4: Add Public Hostname Mappings

In the Cloudflare Zero Trust Dashboard, configure the tunnel's public hostnames:

1. Click on your tunnel name
2. Go to **Public Hostname** tab
3. Add the following mappings:

| Subdomain | Domain | Service | URL |
|-----------|--------|---------|-----|
| n8n | yourdomain.com | HTTP | n8n:5678 |
| render | yourdomain.com | HTTP | web-ui:3000 |

**Note:** The service URLs use Docker container names because cloudflared runs inside the Docker network.

### Step 5: Start the Tunnel

```bash
# Start n8n and cloudflared together
docker-compose --profile automation --profile remote-access up -d

# Or start just cloudflared (if n8n is already running)
docker-compose --profile remote-access up -d cloudflared
```

### Step 6: Verify the Tunnel

1. In Cloudflare Dashboard, the tunnel should show as **Healthy**
2. Access your services:
   - n8n: `https://n8n.yourdomain.com`
   - Render API: `https://render.yourdomain.com`

## Security Recommendations

### 1. Enable Cloudflare Access (Highly Recommended)

Add an authentication layer in front of your applications:

1. Go to **Access** -> **Applications** in Zero Trust Dashboard
2. Click **Add an application** -> **Self-hosted**
3. Configure:
   - Application name: `Ethereal Flame n8n`
   - Subdomain: `n8n`
   - Domain: `yourdomain.com`
4. Add a policy:
   - Name: `Allow owner`
   - Action: Allow
   - Include: Email is `your@email.com`

This adds a Cloudflare login page before users can access n8n.

### 2. Use Service Tokens for Webhooks

For render server -> n8n webhook communication:

1. Go to **Access** -> **Service Auth** -> **Service Tokens**
2. Create a service token
3. Add the token headers to your webhook configuration:
   - `CF-Access-Client-Id: <client-id>`
   - `CF-Access-Client-Secret: <client-secret>`

### 3. Strong n8n Password

Always set a strong password for n8n basic auth:

```bash
# .env
N8N_USER=admin
N8N_PASSWORD=use_a_strong_password_here
```

### 4. Never Commit Secrets

Ensure your `.gitignore` includes:

```
.env
*.env
```

## Troubleshooting

### Tunnel shows "Disconnected"

Check cloudflared logs:

```bash
docker logs ethereal-cloudflared
```

Common issues:
- Invalid tunnel token
- Network connectivity issues
- Docker network misconfiguration

### "502 Bad Gateway" errors

The service URL might be wrong. Remember:
- Use Docker container names (not localhost)
- Ensure the target service is running
- Check the service port

### Cannot reach services from outside

1. Verify DNS records point to Cloudflare (orange cloud)
2. Check tunnel is healthy in dashboard
3. Verify public hostname mappings are correct

### Authentication issues with Cloudflare Access

If using Cloudflare Access and webhooks fail:
1. Bypass Access for webhook paths using an Access Policy exception
2. Or use Service Tokens for authentication

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `CLOUDFLARE_TUNNEL_TOKEN` | Tunnel authentication token | `eyJhIjoiYWJjZGVm...` |

## Quick Commands

```bash
# Start tunnel
docker-compose --profile remote-access up -d cloudflared

# Stop tunnel
docker-compose --profile remote-access down

# View tunnel logs
docker logs -f ethereal-cloudflared

# Restart tunnel (if connection issues)
docker-compose --profile remote-access restart cloudflared
```

## Cost

Cloudflare Tunnel is **free** on the Cloudflare One free tier, which includes:
- Unlimited tunnels
- Unlimited bandwidth
- 50 users for Cloudflare Access

---

For more information, see the [Cloudflare Tunnel documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/).
