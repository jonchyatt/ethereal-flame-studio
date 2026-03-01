# Cloud Sidecar Hosting Research

**Purpose:** Find the best hosting option for a lightweight, always-on Node.js sidecar service (Ring camera integration)
**Researched:** 2026-03-01
**Overall Confidence:** HIGH (multiple authoritative sources cross-referenced)

## Requirements Recap

| Requirement | Detail |
|-------------|--------|
| Runtime | Node.js (Express, ~50MB memory) |
| Connections | WebSocket (Ring event subscriptions, must stay alive) |
| Storage | Persist a refresh token (~1KB file, rotates hourly) |
| API | Respond to HTTPS from Vercel-hosted Jarvis |
| Uptime | 24/7, minimal downtime |
| Budget | As cheap as possible, single user, personal project |

---

## Quick Comparison Matrix

| Platform | Monthly Cost | Free Tier | Always-On | WebSocket | Persistent Storage | HTTPS/Domain | US Region | **Verdict** |
|----------|-------------|-----------|-----------|-----------|-------------------|-------------|-----------|-------------|
| **Oracle Cloud (ARM)** | **$0** | Forever free | Yes* | Yes | Yes (boot volume) | Yes | Yes | **BEST FREE** |
| **Fly.io** | **~$2-4** | No (legacy only) | Yes | Yes | Yes (volumes) | Yes | Yes | **BEST PAID** |
| **Hetzner + Coolify** | **~$4-5** | No | Yes | Yes | Yes (full VPS) | Yes (Coolify) | No (EU only) | **BEST VALUE VPS** |
| **Railway** | **~$5-7** | Trial only | Yes | Yes | Yes (volumes) | Yes | Yes | Good PaaS |
| **Vultr** | **$2.50-3.50** | No | Yes | Yes | Yes (full VPS) | Manual | Yes | Cheapest US VPS |
| **DigitalOcean** | **$4** | No | Yes | Yes | Yes (full VPS) | Manual | Yes | Reliable VPS |
| **AWS Lightsail** | **$3.50-5** | No | Yes | Yes | Yes (full VPS) | Yes | Yes | AWS simplicity |
| **Render** | **$7+** | Sleeps | Yes (paid) | Yes | Yes (disks) | Yes | Yes | Easy but pricey |
| **Heroku** | **$7** | No | Yes (Basic) | Yes | **NO** (ephemeral) | Yes | Yes | **DISQUALIFIED** |
| **Linode/Akamai** | **$5** | No | Yes | Yes | Yes (full VPS) | Manual | Yes | Solid VPS |
| **AWS EC2 Free** | **$0** (12mo) | 12 months | Yes | Yes | Yes (EBS) | Manual | Yes | Temporary |
| **Koyeb** | $0 | Sleeps (1hr) | **NO** | Partial | **NO** on free | Yes | Yes | **DISQUALIFIED** |
| **Northflank** | $0 | Sandbox | Yes | Yes | 2GB | Yes | Yes | Decent free |
| **GCP Cloud Run** | **~$65** | Per-request | **NO** (idle=$65/mo) | Yes | No (stateless) | Yes | Yes | **DISQUALIFIED** |
| **Azure ACI** | **~$33** | No | Yes | Yes | Limited | Yes | Yes | Way too expensive |
| **Cloudflare DO** | **~$5+** | $5 min | Sort of | Yes | SQLite | Yes | Global | Wrong paradigm |
| **Glitch** | **$8** | Sleeps (5min) | Yes (Pro) | Yes | Yes | Yes | Yes | Overpriced |
| **Replit** | **$5-10** | No | Yes (Reserved VM) | Yes | Yes | Yes | Yes | IDE tax |
| **Zeabur** | **$5+** | Serverless only | Paid only | Unknown | Paid only | Yes | Yes | Not ideal |
| **Back4App** | **$0-25** | 0.25 CPU | Unknown | Unknown | Unknown | Yes | Yes | Unclear fit |
| **PikaPods** | N/A | N/A | N/A | N/A | N/A | N/A | N/A | **Pre-built apps only** |
| **Dokku** | VPS cost | N/A (self-hosted) | Yes | Yes | Yes | Yes (Traefik) | VPS-dependent | Adds to VPS |
| **Porter.run** | **$200+** | Trial only | Yes | Yes | Yes | Yes | Yes | **ABSURDLY EXPENSIVE** |

*Oracle "always-on" has a caveat: idle instances can be reclaimed (see details below)

---

## Recommendation: Top 3 Options

### 1st Choice: Fly.io ($2-4/month) -- BEST OVERALL

The sweet spot of cheap, easy, and purpose-built for this use case.

### 2nd Choice: Oracle Cloud Free Tier ($0/month) -- BEST FREE (with caveats)

Genuinely free forever, but requires more setup and has idle reclamation risk.

### 3rd Choice: Vultr or DigitalOcean ($2.50-4/month) -- BEST SIMPLE VPS

A raw VPS you control completely, no platform magic to learn.

---

## Detailed Platform Analysis

---

### TIER 1: MAJOR PLATFORMS

---

#### Fly.io -- RECOMMENDED

**Monthly Cost:** ~$2-4/month
**Free Tier:** No free tier for new accounts (legacy Hobby plan users grandfathered in with 3 free shared VMs). New accounts get a 7-day / 2-hour trial, then pay-as-you-go.

**Pricing Breakdown:**
- shared-cpu-1x, 256MB RAM: **$2.02/month** (running 24/7 in us-east/iad)
- Persistent volume (1GB): **$0.15/month**
- Volume snapshots: First 10GB free, then $0.08/GB/month
- **Total estimate: ~$2.20/month**

**Persistent Storage:** Yes. Fly Volumes are local NVMe-backed persistent storage. Survives restarts and deploys. Mount path persists; rest of filesystem is ephemeral. $0.15/GB/month. Daily snapshots included (5-day retention, configurable to 60 days).

**Custom Domains / HTTPS:** Yes. Free TLS certificates. First 10 single-hostname certs free per org.

**Always-On:** Yes. Machines run until you stop them. No sleeping, no cold starts for always-on machines. You can also configure auto-stop/auto-start (but you would NOT want that for this use case).

**WebSocket Support:** Full native support. Fly.io runs your app as a traditional server -- WebSocket "just works." No proxy timeout on persistent connections. Community examples of long-lived WebSocket apps in production.

**Region:** Yes, multiple US regions (iad, sjc, ord, sea, etc.). Region-specific pricing (iad is 1.0x base).

**Gotchas:**
- Credit card required (no free tier for new accounts)
- Volumes are per-region, per-machine -- cannot share across machines
- Persistent disks bill even when machine is stopped
- Volume data is local to one machine (not replicated) -- hardware failure = data loss (snapshots mitigate)
- $0.005/month minimum charge even for idle volumes

**Why This Wins:**
- Purpose-built for persistent, always-on services
- WebSocket is native (not proxied through a serverless layer)
- ~$2/month is hard to beat for a managed platform
- Simple CLI deployment (`flyctl deploy`)
- No sleeping, no cold starts, no surprises
- Persistent volumes for token storage
- Active community with Ring/IoT-style use cases

**Sources:**
- [Fly.io Pricing](https://fly.io/docs/about/pricing/)
- [Fly.io Volumes](https://fly.io/docs/volumes/overview/)
- [Fly.io WebSockets](https://fly.io/blog/websockets-and-fly/)

---

#### Render.com

**Monthly Cost:** $7+/month minimum for always-on
**Free Tier:** Free web services exist but sleep after 15 minutes of inactivity. Useless for this use case.

**Pricing Breakdown:**
- Starter instance (always-on): **$7/month** (512MB RAM, 0.5 CPU)
- Persistent disk: **$0.25/GB/month**
- **Total estimate: ~$7.25/month**

**Persistent Storage:** Yes. Persistent disks available on paid services. Survives deploys and restarts. Daily snapshots. BUT: attaching a disk disables zero-downtime deploys (old instance stops before new one starts).

**Custom Domains / HTTPS:** Yes. Automatic TLS. Custom domains included.

**Always-On:** Only on paid plans ($7+/month). Free tier sleeps.

**WebSocket Support:** Full support. No maximum duration enforced for WebSocket connections. Works well.

**Region:** US (Oregon) primary. Multiple regions available on higher plans.

**Gotchas:**
- Free tier is a trap for always-on services (sleeps after 15 min)
- $7/month minimum is 3x the cost of Fly.io for the same use case
- Persistent disk prevents zero-downtime deploys
- Only 1 instance can access a disk (no horizontal scaling with disk)

**Verdict:** Works perfectly but costs 3x what Fly.io charges. No technical advantage to justify the premium.

**Sources:**
- [Render Pricing](https://render.com/pricing)
- [Render WebSockets](https://render.com/docs/websocket)
- [Render Persistent Disks](https://render.com/docs/disks)

---

#### Railway.app

**Monthly Cost:** ~$5-7/month
**Free Tier:** $5 trial credit for new accounts (burns fast with always-on). NOT a free tier -- it's a trial.

**Pricing Breakdown:**
- Hobby plan: **$5/month** base (includes $5 usage credit)
- Compute (50MB RAM, 0.1 vCPU, 24/7): ~$1-2/month of credit usage
- Volume (1GB): ~$0.16/month
- **Total estimate: $5/month** (base fee covers the compute)

**Persistent Storage:** Yes. Volumes available, billed at ~$0.16/GB/month. Only charged for used storage. Live resize without downtime. Hobby plan limited to 5GB max.

**Custom Domains / HTTPS:** Yes. Automatic TLS. Custom domains included.

**Always-On:** Yes. Services run continuously. No sleeping on Hobby plan.

**WebSocket Support:** Full support. HTTP, TCP, gRPC, and WebSockets handled natively.

**Region:** US regions available.

**Gotchas:**
- $5/month minimum even if your app barely uses resources (base fee)
- Trial credit ($5) runs out in days with an always-on service
- Usage is metered per-second -- predictable but needs monitoring
- Hobby plan max 5GB volume

**Verdict:** Good platform, nice DX, but the $5 base fee means you're paying ~$5/month minimum even for a tiny service. Fly.io is cheaper for this specific use case.

**Sources:**
- [Railway Pricing](https://railway.com/pricing)
- [Railway Volumes](https://docs.railway.com/reference/volumes)

---

#### DigitalOcean

**Monthly Cost:** $4-6/month
**Free Tier:** No free tier for Droplets. App Platform has free tier for static sites only.

**Pricing Breakdown (Droplet):**
- Basic Droplet: **$4/month** (512MB RAM, 1 vCPU, 10GB SSD, 500GB transfer)
- **Total: $4/month** (storage included)

**Pricing Breakdown (App Platform):**
- Basic: **$5/month**
- But containers start at ~$25/month on App Platform (2 droplets provisioned under the hood). Avoid App Platform for this.

**Persistent Storage:** Yes. Full VPS -- the entire disk is yours. 10GB SSD at $4 tier.

**Custom Domains / HTTPS:** Manual setup (Let's Encrypt + nginx/Caddy). Not managed like PaaS.

**Always-On:** Yes. It's a VPS -- always running.

**WebSocket Support:** Full support. It's your server, you run what you want.

**Region:** Multiple US regions (NYC, SFO).

**Gotchas:**
- Unmanaged VPS -- you handle OS updates, security patches, process management (PM2/systemd), TLS setup
- Per-second billing as of Jan 2026 (monthly cap at $4)
- No built-in deployment pipeline (you `ssh` and `git pull` or use CI/CD)

**Verdict:** Solid, reliable, and cheap. But requires sysadmin work that Fly.io handles automatically.

**Sources:**
- [DigitalOcean Droplets](https://www.digitalocean.com/pricing/droplets)
- [DigitalOcean Pricing](https://www.digitalocean.com/pricing)

---

#### Heroku -- DISQUALIFIED

**Monthly Cost:** $7/month (Basic dyno)
**Free Tier:** Removed entirely.

**Why Disqualified:** Heroku's filesystem is **ephemeral**. Every restart, deploy, or dyno cycling wipes all files. A refresh token stored as a file would be lost hourly when the dyno cycles, or on any deploy. You'd need to add a database ($5+ for Heroku Postgres Mini) just to store a single token, bringing the total to $12+/month.

The ephemeral filesystem is a fundamental architectural mismatch for this use case. Heroku was designed for stateless 12-factor apps, not persistent sidecar services.

**Sources:**
- [Heroku Dynos (ephemeral filesystem)](https://devcenter.heroku.com/articles/dynos)
- [Heroku Pricing](https://www.heroku.com/pricing/)

---

#### AWS Lightsail

**Monthly Cost:** $3.50-5/month
**Free Tier:** No. (Separate from AWS EC2 free tier.)

**Pricing Breakdown:**
- IPv6-only: **$3.50/month** (512MB RAM, 2 vCPU, 20GB SSD, 1TB transfer)
- IPv4 included: **$5/month** (same specs + public IPv4)

**Persistent Storage:** Yes. Full VPS with 20GB SSD included.

**Custom Domains / HTTPS:** Manual setup. Lightsail has its own load balancer ($18/month) with TLS, but for a single service you'd use Caddy/nginx with Let's Encrypt.

**Always-On:** Yes. VPS, always running.

**WebSocket Support:** Full support. Your server, your rules.

**Region:** All major US regions.

**Gotchas:**
- IPv6-only ($3.50) means some clients may not reach it -- your Vercel app should be fine though
- Overage: $0.09/GB beyond included transfer
- It's still a VPS -- you manage everything
- Pre-configured Node.js blueprint available (nice)
- No managed deployments

**Verdict:** AWS simplicity at a low price. The $3.50 IPv6-only plan is attractive since your Vercel app (the only client) supports IPv6. But it's unmanaged like any VPS.

**Sources:**
- [AWS Lightsail Pricing](https://aws.amazon.com/lightsail/pricing/)

---

#### AWS EC2 Free Tier

**Monthly Cost:** $0 for 12 months, then ~$8.50/month
**Free Tier:** 750 hours/month of t2.micro or t3.micro for 12 months (enough for 24/7).

**Specs:** t2.micro: 1 vCPU, 1GB RAM, 8GB EBS (free). Enough for this sidecar.

**Persistent Storage:** Yes. EBS volume (8GB free tier).

**Why NOT Recommended Long-Term:** After 12 months, t2.micro costs ~$8.50/month on-demand. More expensive than every alternative. Only useful if you're already starting a new AWS account and want a free year.

**Gotchas:**
- Free tier expires after 12 months -- easy to forget and get billed
- Requires AWS knowledge (VPC, security groups, IAM)
- Overengineered for a single sidecar service

**Sources:**
- [AWS Free Tier](https://aws.amazon.com/free/)

---

#### Google Cloud Run -- DISQUALIFIED

**Monthly Cost:** ~$65/month for always-warm
**Free Tier:** Per-request (scales to zero by default).

**Why Disqualified:** Cloud Run is serverless. It scales to zero between requests. To keep a minimum instance warm 24/7, the cost is **~$65/month** (1 vCPU, 512MB). This is absurdly expensive for a 50MB Node.js service. Cloud Run does support WebSockets, but the pricing model is designed for request-response workloads, not persistent connections.

**Sources:**
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Cloud Run Minimum Instances](https://docs.google.com/run/docs/configuring/min-instances)

---

#### Azure Container Instances -- NOT RECOMMENDED

**Monthly Cost:** ~$33/month minimum
**Free Tier:** No.

Minimum allocation is 1 vCPU + 1GB RAM = ~$33/month. Massively overpriced for this workload. Azure's own documentation says VMs are better for always-on scenarios. Skip.

**Sources:**
- [Azure ACI Pricing](https://azure.microsoft.com/en-us/pricing/details/container-instances/)

---

### TIER 2: BUDGET / INDIE PLATFORMS

---

#### Oracle Cloud Free Tier (ARM) -- BEST FREE OPTION

**Monthly Cost:** $0 forever
**Free Tier:** Always Free -- no expiration. Up to 4 ARM OCPUs + 24GB RAM total across all Ampere A1 instances. Also 2 AMD Micro instances (1/8 OCPU, 1GB RAM each).

**What You Get Free:**
- Ampere A1 (ARM): 4 OCPUs, 24GB RAM, 200GB boot volume (splittable across up to 4 instances)
- AMD Micro: 2 instances, 1GB RAM each
- 10TB/month outbound data
- For this sidecar: use 1 OCPU, 1GB RAM -- enormous overkill

**Persistent Storage:** Yes. Full VM with boot volume. 200GB block volume total free.

**Custom Domains / HTTPS:** Manual setup (Caddy/nginx + Let's Encrypt).

**Always-On:** Yes, BUT with a critical caveat: **Oracle may reclaim idle instances** if CPU utilization stays below 20% for 7 consecutive days (95th percentile). A sidecar with WebSocket activity should stay above this threshold, but it's a real risk.

**Mitigation:** Convert to Pay-As-You-Go (PAYG) account -- you won't be charged as long as usage stays within Always Free limits, AND Oracle stops reclaiming idle instances.

**WebSocket Support:** Full support. It's a VM -- you control everything.

**Region:** US regions available (Phoenix, Ashburn).

**Gotchas:**
- **Idle reclamation is the #1 risk.** Must convert to PAYG or ensure consistent CPU usage.
- ARM architecture -- some npm packages with native binaries may not compile. Most pure-JS packages (like ring-client-api) work fine.
- Docker on ARM has known quirks on Oracle Cloud.
- Account creation can be flaky (Oracle sometimes blocks sign-ups from certain regions/IPs).
- Support is essentially non-existent for free tier users.
- Oracle has a reputation for being difficult to work with (billing surprises if you accidentally provision paid resources).

**Verdict:** Unbeatable on price ($0 forever). The hardware is absurdly generous for this use case. The idle reclamation risk is real but mitigable. Worth it if you're comfortable with Linux server administration and converting to PAYG.

**Sources:**
- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- [Always Free Resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm)
- [Oracle idle reclamation](https://blog.51sec.org/2023/02/oracle-cloud-cleaning-up-idle-compute.html)

---

#### Hetzner Cloud

**Monthly Cost:** ~$3.49-3.79/month (EU), no US regions
**Free Tier:** No.

**Cheapest Plans:**
- CX23 (x86): 2 vCPU, 4GB RAM, 40GB SSD -- **EUR 3.49/month** (~$3.80 USD)
- CAX11 (ARM): 2 vCPU, 4GB RAM, 40GB SSD -- **EUR 3.79/month** (~$4.10 USD)

All plans include 20TB traffic, IPv4/IPv6, DDoS protection, firewall.

**Persistent Storage:** Yes. Full VPS.

**Custom Domains / HTTPS:** Manual setup. Or use Coolify (self-hosted PaaS, adds Heroku-like DX with Traefik for auto-TLS).

**Always-On:** Yes. VPS, always running.

**WebSocket Support:** Full support.

**Region:** **EU only** (Falkenstein, Nuremberg, Helsinki, Ashburn planned but not yet). Latency from US East to EU is ~80-100ms -- acceptable for API calls from Vercel (which itself is edge-deployed), but not ideal.

**Gotchas:**
- No US datacenter (yet). Price increases announced for April 2026 (30-40%).
- Unmanaged VPS -- sysadmin required
- With Coolify, you get PaaS DX on a $4 VPS (great value, but adds overhead to learn Coolify)

**Verdict:** Best raw value per dollar in the VPS world. But EU-only is a real downside for a US-based user connecting from Vercel. The price increase in April 2026 narrows the gap with Vultr/DO.

**Sources:**
- [Hetzner Cloud](https://www.hetzner.com/cloud)
- [Hetzner Price Adjustment](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)

---

#### Vultr

**Monthly Cost:** $2.50-3.50/month
**Free Tier:** No.

**Cheapest Plans:**
- IPv6-only: **$2.50/month** (1 vCPU, 512MB RAM, 10GB SSD, 500GB transfer)
- With IPv4: **$3.50/month** (same specs)

**Persistent Storage:** Yes. Full VPS.

**Custom Domains / HTTPS:** Manual setup.

**Always-On:** Yes.

**WebSocket Support:** Full support.

**Region:** 30+ global locations, multiple US regions.

**Gotchas:**
- 512MB RAM is tight but sufficient for a 50MB Node.js service
- $2.50 is IPv6-only (fine for Vercel-to-sidecar communication)
- Unmanaged VPS

**Verdict:** The cheapest US-based VPS that exists. $2.50/month IPv6-only is remarkable. If you want a raw VPS and are comfortable with server management, this is hard to beat on price.

**Sources:**
- [Vultr Pricing](https://www.vultr.com/pricing/)

---

#### Linode / Akamai

**Monthly Cost:** $5/month
**Free Tier:** No.

**Plan:** Nanode 1GB -- 1 vCPU, 1GB RAM, 25GB SSD, 1TB transfer for **$5/month**.

**Everything Else:** Same as any VPS. Full WebSocket support, persistent storage, manual TLS setup. Multiple US regions.

**Verdict:** Reliable, well-known, but $5 is more expensive than Vultr ($2.50-3.50) for comparable specs. No differentiating advantage for this use case.

**Sources:**
- [Linode Pricing](https://www.linode.com/pricing/)

---

#### Koyeb -- DISQUALIFIED FOR FREE TIER

**Monthly Cost:** $0 (free) or ~$2.60/month (Nano paid)
**Free Tier:** 1 vCPU, 512MB RAM -- but **scales to zero after 1 hour of no HTTP traffic**. Cannot be disabled on free tier. WebSocket connections "may only live for a few minutes" on free instances.

**Why Disqualified (Free Tier):** The free tier is fundamentally incompatible with persistent WebSocket connections. The 1-hour sleep timeout would kill Ring event subscriptions. WebSocket connections are short-lived on free instances by design. No persistent volumes on free tier.

**Paid Option:** Nano instance at $0.0036/hour (~$2.60/month) would be always-on, but requires at minimum the Starter plan. Unclear if Starter plan has always-on guarantees without scale-to-zero.

**Verdict:** Free tier is a trap for this use case. Paid tier might work but pricing/behavior is unclear compared to Fly.io's straightforward model.

**Sources:**
- [Koyeb Pricing](https://www.koyeb.com/pricing)
- [Koyeb Scale-to-Zero](https://www.koyeb.com/docs/run-and-scale/scale-to-zero)

---

#### Northflank

**Monthly Cost:** $0 (free sandbox) or pay-as-you-go
**Free Tier:** Developer Sandbox -- 2 free services, 1 free database, 2GB persistent storage, always-on compute. Exact CPU/RAM specs for free services not published.

**Persistent Storage:** 2GB on free tier. $0.15/GB/month on paid.

**Custom Domains / HTTPS:** Yes, included.

**Always-On:** Yes, even on free tier ("no sleeping" is explicitly stated).

**WebSocket Support:** Should work (container-based platform), but not explicitly documented.

**Gotchas:**
- Free tier is labeled "not for production"
- Exact resource limits for free sandbox are opaque
- Relatively unknown platform -- community/support may be thin
- Paid compute starts at $0.01667/vCPU/hour (~$12/month for 1 vCPU)

**Verdict:** Interesting free tier that claims to be always-on. Worth testing, but the opaque resource limits and "not for production" label are concerns. If it works, it's free. If it doesn't, Fly.io is the fallback.

**Sources:**
- [Northflank Pricing](https://northflank.com/pricing)

---

#### Coolify (Self-Hosted PaaS)

**Monthly Cost:** $0 (software) + VPS cost ($3.50-5/month)
**What It Is:** Open-source, self-hosted alternative to Heroku/Vercel. Install on any VPS. Provides: Docker containers, Traefik (auto-TLS), git push deploys, database management, monitoring.

**Best Pairing:** Hetzner CX22 (EUR 3.49/month) or Vultr ($3.50/month) + Coolify.

**Why Consider:** Gives you PaaS developer experience on a $4 VPS. Push to GitHub, auto-deploys. Free TLS via Traefik. Monitor from a web UI. Can host multiple services on one VPS.

**Gotchas:**
- Learning curve to set up initially (30-60 minutes)
- Adds resource overhead (Docker + Traefik + Coolify UI consume ~200-300MB RAM)
- On a 512MB VPS, Coolify itself would consume most of the RAM. Need at least 1GB, ideally 2GB+.
- You're still responsible for OS updates and VPS security

**Verdict:** Great if you plan to host multiple services on one VPS. Overkill for a single sidecar service. Better to just run the Node.js app directly with PM2 + Caddy on a VPS.

**Sources:**
- [Coolify](https://coolify.io/)
- [Coolify on Hetzner](https://docs.hetzner.com/cloud/apps/list/coolify/)

---

#### Dokku (Self-Hosted PaaS)

**Monthly Cost:** $0 (software) + VPS cost
**What It Is:** "The smallest PaaS implementation you've ever seen." Heroku-compatible, single-host, git-push deploys with Docker isolation.

Similar to Coolify but lighter. Requires Ubuntu 22.04/24.04. `git push dokku main` to deploy. Plugins for Redis, Mongo, etc.

**Verdict:** Lighter than Coolify. Good if you want Heroku-style DX on a cheap VPS. Same caveat: overkill for a single service.

**Sources:**
- [Dokku](https://dokku.com/)

---

#### PikaPods -- NOT APPLICABLE

PikaPods only hosts pre-packaged open-source apps (Nextcloud, Gitea, etc.). Does not support custom Node.js applications. Cannot be used for this use case.

---

#### Porter.run -- ABSURDLY EXPENSIVE

Requires a Kubernetes cluster. Minimum ~$200/month AWS cost. Designed for startups, not personal projects. Completely inappropriate.

---

### TIER 3: UNCONVENTIONAL OPTIONS

---

#### Cloudflare Workers + Durable Objects

**Monthly Cost:** $5/month minimum (Workers Paid plan required for Durable Objects)
**Free Tier:** Workers free tier exists but Durable Objects require paid plan.

**Can It Work?**
Durable Objects can maintain persistent WebSocket connections using the WebSocket Hibernation API. They have persistent storage (SQLite-backed as of Jan 2026). In theory, you could build a Ring sidecar as a Durable Object that:
1. Maintains a WebSocket to Ring servers
2. Stores the refresh token in Durable Object storage
3. Responds to HTTP requests from Jarvis

**Why It Probably Won't Work:**
- **ring-client-api is a Node.js library** designed for traditional Node.js runtimes. It uses `rxjs`, native WebSocket APIs, and likely depends on Node.js-specific APIs that may not be available in the Workers runtime, even with `nodejs_compat` flag.
- Workers have **CPU time limits** (30 seconds per request on paid plan). Background processing is limited.
- Durable Objects are designed for coordination, not as general-purpose application servers.
- The "outbound WebSocket" paradigm (connecting TO Ring servers) is different from "inbound WebSocket" (accepting connections from clients). Durable Objects are optimized for the latter.
- Debugging Workers + Durable Objects is significantly harder than debugging a Node.js server.

**Pricing if it worked:**
- $5/month base (Workers Paid)
- Durable Objects: 1M requests included, duration charges with hibernation API are minimal
- **Total: ~$5/month**

**Verdict:** Technically fascinating but practically wrong. The ring-client-api library almost certainly won't work in the Workers runtime without significant porting effort. Even if it did, the debugging and maintenance burden would be enormous compared to a $2/month Fly.io machine running standard Node.js.

**Sources:**
- [Durable Objects Pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Durable Objects WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)

---

#### Replit Deployments

**Monthly Cost:** $5-10/month
**Free Tier:** IDE is free, deployments cost extra.

**Pricing:** Reserved VM (always-on) deployments are billed by CPU/memory reservation. A small app costs $5-10/month.

**Gotchas:**
- Replit is an IDE-first platform -- you're paying for IDE features you don't need
- Deployment reliability has been criticized in community forums
- Not designed for production infrastructure

**Verdict:** More expensive than Fly.io with less reliability. No reason to choose this.

---

#### Glitch

**Monthly Cost:** $8/month (Pro, billed annually)
**Free Tier:** Apps sleep after 5 minutes of inactivity. Unusable for always-on.

**Pro ($8/month):** 5 always-on "boosted" apps with extra memory and disk. Always-on guarantee.

**Gotchas:**
- $8/month is expensive for what you get
- Platform is primarily for creative coding / prototyping
- Performance and reliability lag behind dedicated hosting platforms
- Community is focused on front-end experiments, not production services

**Verdict:** Overpriced for this use case. $8/month for what Fly.io does for $2.

---

#### Back4App Containers

**Monthly Cost:** $0 (free) or $25/month (paid)
**Free Tier:** 0.25 shared CPU, basic resources, no time limit.

**Gotchas:**
- Unclear if free tier is always-on or sleeps
- Paid tier jumps to $25/month (absurd)
- Limited documentation on WebSocket support and persistent storage
- Platform primarily oriented toward Parse Server (BaaS)

**Verdict:** Too opaque to recommend. The free tier might work but the lack of clear documentation is a red flag.

---

#### Zeabur

**Monthly Cost:** $5/month (Developer plan)
**Free Tier:** Static sites and serverless functions only. No always-on containers.

**Verdict:** Free tier doesn't support always-on Node.js. Developer plan at $5/month is same price as Railway but less mature. No advantage.

---

## Token Persistence Strategy by Platform Type

The refresh token rotation is a key requirement. Here's how to handle it on each platform type:

### Managed PaaS (Fly.io, Railway, Render)
- **Fly.io:** Mount a 1GB volume at `/data`. Write token to `/data/ring-token.json`. Survives deploys and restarts.
- **Railway:** Attach a volume. Same approach. Write to volume mount path.
- **Render:** Attach persistent disk. Same approach. Note: disk attachment disables zero-downtime deploys.

### VPS (Vultr, DO, Lightsail, Oracle, Hetzner, Linode)
- Just write to a file anywhere on disk. It's your server. No special configuration needed.
- Use `/var/lib/ring-sidecar/token.json` or similar.

### Heroku (DISQUALIFIED)
- Cannot persist files. Would need a database addon ($5+/month) just for a 1KB token.

### Cloudflare Durable Objects
- Use Durable Object storage (key-value or SQLite). Token persists automatically.

---

## Final Recommendation

### For Jonathan's Use Case: **Fly.io at ~$2/month**

**Why:**

1. **Cheapest managed option** -- ~$2.20/month (256MB shared CPU + 1GB volume)
2. **Zero sysadmin** -- no OS updates, no security patches, no nginx/Caddy config
3. **Native WebSocket** -- Ring subscriptions just work, no proxy issues
4. **Persistent volumes** -- token file survives deploys and restarts
5. **Simple deployment** -- `flyctl deploy` from CLI, or GitHub Actions for auto-deploy
6. **Auto-TLS** -- HTTPS with custom domain, zero configuration
7. **Active community** -- well-documented, widely used for exactly this type of service
8. **Located in US** -- iad (Virginia) region, low latency to Vercel edge

**The Oracle Free Tier alternative** is worth considering if $2/month matters and you're comfortable with:
- Setting up an Ubuntu VM from scratch (nginx/Caddy, PM2, firewall, etc.)
- Converting to PAYG to prevent idle reclamation
- ARM compatibility (ring-client-api should work since it's pure JS/TS)
- Oracle's reputation for unexpected billing if you accidentally provision paid resources

**The VPS alternative** (Vultr at $2.50-3.50) makes sense if:
- You want full control over the OS
- You're comfortable with server administration
- You plan to run multiple services on the same box

### What to Avoid

- **Google Cloud Run** -- $65/month for always-warm. Designed for request-response, not persistent connections.
- **Azure ACI** -- $33/month minimum. Overpriced.
- **Heroku** -- Ephemeral filesystem kills token persistence.
- **Porter.run** -- $200/month. Kubernetes for a 50MB Node.js app? No.
- **Koyeb free tier** -- Sleeps after 1 hour, breaks WebSockets.
- **Cloudflare Workers** -- Wrong runtime for ring-client-api.

---

## Deployment Architecture (Fly.io)

```
[Ring Cloud] <--WebSocket--> [Fly.io Sidecar (us-east)]
                                    |
                              [Volume: /data]
                              token.json (1KB)
                                    |
                              <--HTTPS-->
                                    |
                            [Vercel: Jarvis App]
                            jarvis.whatamiappreciatingnow.com
```

**Fly.io Machine Spec:**
- shared-cpu-1x, 256MB RAM
- 1GB persistent volume mounted at `/data`
- Auto-restart on crash (Fly.io manages this)
- Region: iad (Virginia)
- Custom domain with auto-TLS

**Estimated Monthly Bill:**
| Item | Cost |
|------|------|
| shared-cpu-1x 256MB (730 hrs) | $2.02 |
| 1GB volume | $0.15 |
| Volume snapshots | $0.00 (first 10GB free) |
| Outbound transfer | $0.00 (well under free allowance) |
| TLS certificate | $0.00 |
| **Total** | **~$2.17/month** |
