# Local Security Camera Systems Research

**Purpose:** Comprehensive guide for replacing Ring with a locally-run, subscription-free security camera system that integrates with Jarvis
**Researched:** 2026-03-01
**Requested by:** Jonathan (wife wants to ditch Ring)
**Overall Confidence:** HIGH (multiple authoritative sources cross-referenced)

---

## Table of Contents

1. [Executive Summary & Recommendation](#1-executive-summary--recommendation)
2. [Camera Brand Deep Dive](#2-camera-brand-deep-dive)
3. [NVR Software Comparison](#3-nvr-software-comparison)
4. [Smart Doorbell Replacements](#4-smart-doorbell-replacements)
5. [Integration with Jarvis](#5-integration-with-jarvis)
6. [Recommended Setups (3 Tiers)](#6-recommended-setups-3-tiers)
7. [The Wife Test](#7-the-wife-test)
8. [Network Architecture](#8-network-architecture)
9. [Migration Plan from Ring](#9-migration-plan-from-ring)
10. [Sources](#10-sources)

---

## 1. Executive Summary & Recommendation

### The Short Version

**Use Reolink PoE cameras + Frigate NVR + Reolink PoE Doorbell.**

This gives you:
- Zero subscription fees, forever
- Full local control of all footage
- RTSP streams for Frigate AI detection
- REST API + MQTT for Jarvis integration
- A mobile app your wife can use without touching a terminal
- 4K video quality that matches or exceeds Ring
- A PoE doorbell that replaces Ring Doorbell with two-way audio and smart detection

### Why Reolink Over Everything Else

| Factor | Reolink | Amcrest | UniFi | Tapo | Eufy |
|--------|---------|---------|-------|------|------|
| RTSP support | Yes (all PoE models) | Yes (most models) | Via NVR only (port 7441) | Yes (wired models) | Partial (wired only, flaky) |
| Frigate compatibility | Excellent (via go2rtc) | Excellent (Dahua rebrand) | Poor (proprietary ecosystem) | Good | Poor |
| Mobile app quality | Good (4/5) | Decent (3/5) | Excellent (5/5) | Good (4/5) | Good (4/5) |
| No cloud required | Yes | Yes | Yes (but needs $200+ NVR) | Yes | Mostly |
| PoE doorbell | Yes ($93) | Yes ($155, chime issues) | Yes ($300+) | No PoE doorbell | No PoE doorbell |
| Price per camera | $55-120 | $60-130 | $129-300 | $35-60 | $80-200 |
| Lock-in concerns | None | None (but newer models losing features) | HIGH (proprietary NVR required) | None | Some (cloud creep) |

**Reolink wins because:** Best price-to-quality ratio, proven Frigate integration, PoE doorbell option, no proprietary lock-in, and a mobile app good enough for a non-technical spouse. The RTSP stream requires go2rtc (bundled with Frigate) for stability, but this is a one-time config.

---

## 2. Camera Brand Deep Dive

### 2.1 Reolink -- RECOMMENDED

**Confidence: HIGH** -- verified via official product pages, Frigate docs, community discussions, pricing confirmed on reolink.com

#### Camera Lineup

| Model | Type | Resolution | Key Features | Price | RTSP | ONVIF | PoE |
|-------|------|-----------|--------------|-------|------|-------|-----|
| **RLC-810A** | Outdoor Bullet | 4K 8MP | Person/vehicle/pet detection, IP67, IR night vision 100ft | $90 | Yes | Yes | Yes |
| **RLC-520A** | Outdoor Dome | 5MP | Person/vehicle detection, IP67, IR night vision 100ft | $55 | Yes | Yes | Yes |
| **CX410** | Outdoor Bullet | 2K 4MP | F1.0 aperture, TRUE color night vision, siren, 2-way talk | $72 | Yes | Yes | Yes |
| **CX810** | Outdoor Bullet | 4K 8MP | F1.0 aperture, color night vision, HDR, siren, 2-way talk | $120 | Yes | Yes | Yes |
| **RLC-820A** | Outdoor Turret | 4K 8MP | Person/vehicle/pet detection, IP67, IR night vision | $80 | Yes | Yes | Yes |
| **E1 Zoom** | Indoor PTZ | 4K 8MP | 3x optical zoom, auto-tracking, Wi-Fi 6, pet/baby detection | $80 | Yes | Via NVR | No (plug-in) |
| **E1** | Indoor PTZ | 4MP | 360 pan/tilt, person/pet detection, Wi-Fi, 2-way talk | $40 | Yes | Via NVR | No (plug-in) |
| **Video Doorbell PoE** | Doorbell | 5MP 2K+ | 180 diagonal, person/package detection, 2-way talk, chime | $93 | Yes | Yes | Yes |
| **Video Doorbell WiFi** | Doorbell | 5MP 2K+ | Same as PoE but WiFi, requires existing doorbell wiring | $120 | Yes | Yes | No |

#### RTSP/Frigate Integration Details

**Critical note:** Plugging Reolink RTSP directly into Frigate causes smearing, lag, and dropped connections. The fix is go2rtc (bundled with Frigate since v0.12). Configure the stream once in go2rtc, then Frigate reads from that stable local stream.

**Frigate configuration for Reolink:**
```yaml
go2rtc:
  streams:
    front_yard:
      - rtsp://admin:PASSWORD@CAMERA_IP:554/h264Preview_01_main
    front_yard_sub:
      - rtsp://admin:PASSWORD@CAMERA_IP:554/h264Preview_01_sub

cameras:
  front_yard:
    ffmpeg:
      inputs:
        - path: rtsp://127.0.0.1:8554/front_yard
          roles:
            - record
        - path: rtsp://127.0.0.1:8554/front_yard_sub
          roles:
            - detect
    detect:
      width: 640
      height: 480
      fps: 5
```

**For 8MP+ cameras:** RTSP must be used (HTTP-FLV not supported at these resolutions). H.264 encoding is recommended over H.265 for Frigate compatibility.

**RTSP ports:** May be disabled by default. Enable via Reolink Client > Device Settings > Network > Advanced > Port Settings.

#### Local Storage Options
- microSD card (up to 512GB per camera)
- Reolink NVR (RLN8-410: 8-channel, 2TB HDD, ~$300)
- NAS via RTSP/ONVIF
- Frigate NVR (recommended for AI detection)

#### Mobile App Quality
- iOS: 4.4/5 stars on App Store
- Android: 4.2/5 on Google Play
- Live view, playback, push notifications, two-way audio
- Multiple users supported
- "My octogenarian mother uses it daily on her iPad with zero issues" -- community review
- Known issues: occasional slow loading on some cameras, periodic glitches

#### Cloud Subscription
- **Not required.** All cameras work fully locally with microSD, NVR, or NAS
- Optional Reolink Cloud available ($4/month or $11/month) but adds no features the local setup lacks
- No features are locked behind a subscription

#### Proprietary Lock-in
- **None.** Standard RTSP/ONVIF protocols. Works with any compatible NVR software
- Cameras are not locked to Reolink NVRs

---

### 2.2 Amcrest -- STRONG ALTERNATIVE (especially for doorbell)

**Confidence: HIGH** -- Amcrest cameras are rebranded Dahua, which is Frigate's primary recommended brand

#### Camera Lineup

| Model | Type | Resolution | Key Features | Price | RTSP | ONVIF | PoE |
|-------|------|-----------|--------------|-------|------|-------|-----|
| **IP8M-2496EB-V2** | Outdoor Bullet | 4K 8MP | IR night vision 98ft, IP67, microSD | $80 | Yes | Yes | Yes |
| **IP5M-T1179EW-AI-V3** | Outdoor Turret | 5MP | Person/vehicle detection, IR 98ft, IP67 | $70 | Yes | Yes | Yes |
| **IP5M-W1150EW-AI** | Outdoor Wedge | 5MP | Person/vehicle detection, 130 FOV, night vision 98ft | $65 | Yes | Yes | Yes |
| **IP8M-DLB2998W-AI** | Outdoor Dual-Lens | 4K 8MP | 180 panoramic, 2x 4MP lenses, color night | $130 | Yes | Yes | Yes |
| **IP4M-1041W** | Indoor PTZ | 4MP | Pan/tilt, 2-way audio, Wi-Fi | $45 | Yes | Yes | No |
| **AD410** | Doorbell | 4MP | Person detection, 164 FOV, 2-way audio, IP65 | $155 | Yes | Yes | No (WiFi) |
| **AD110-SH** | Doorbell | 1080P | Budget doorbell, PIR detection, WiFi | $80 | Yes | Yes | No (WiFi) |

#### RTSP/Frigate Integration Details

**Amcrest is a rebranded Dahua, and Dahua is Frigate's #1 recommended camera brand.** The RTSP URL format follows the Dahua pattern:

```
rtsp://USERNAME:PASSWORD@CAMERA_IP:554/cam/realmonitor?channel=1&subtype=0  (main stream)
rtsp://USERNAME:PASSWORD@CAMERA_IP:554/cam/realmonitor?channel=1&subtype=1  (sub stream)
```

**Doorbell chime issue (AD410 + Frigate):** When Frigate connects via go2rtc, the backchannel enables "intercom mode" which disables the doorbell chime. Fix:
```yaml
go2rtc:
  streams:
    front_doorbell:
      - 'rtsp://admin:PASSWORD@CAMERA_IP:554/cam/realmonitor?channel=1&subtype=0#backchannel=0'
```
Adding `#backchannel=0` to the RTSP URL resolves this completely.

#### Lock-in Concerns

**WARNING:** Newer Amcrest models (post-2024) have been removing HTTP API access and some ONVIF features to push cloud services. When buying Amcrest, verify the specific model supports RTSP/ONVIF before purchasing. The older models (IP8M, IP5M series) are generally safe. Newer "smart home" branded models (A40 series) are cloud-first and lack NVR integration.

---

### 2.3 Hikvision & Dahua -- TECHNICALLY BEST but US REGULATORY RISK

**Confidence: HIGH** -- verified via NDAA documentation, FCC enforcement actions, Frigate recommendations

#### Why They're the Best Technically

Frigate's documentation lists Dahua as the primary recommended camera brand. Hikvision and Dahua produce the highest quality, most compatible IP cameras in the world. Their ONVIF implementation is rock-solid, RTSP streams are stable, and the image quality per dollar is unmatched.

#### Why You Should NOT Buy Them

**NDAA Section 889** explicitly bans Hikvision and Dahua products from US government use, federal contractors, and grant recipients. While there is **no federal law prohibiting consumer/private use**, the regulatory environment is tightening:

- **FCC ban expanded (October 2025):** Closed major loopholes, caused widespread retailer delistings
- **Major retailers stopped carrying them:** Increasingly difficult to source through authorized channels
- **Parts and support drying up:** Replacement parts and system expansions becoming harder to source
- **Security concerns are real:** Both companies have documented vulnerabilities and ties to Chinese government

**Bottom line:** Technically excellent cameras, but buying them is swimming against the regulatory current. Parts availability will only get worse. Choose Amcrest instead -- they're rebranded Dahua with US-based support and no regulatory risk.

---

### 2.4 UniFi Protect (Ubiquiti) -- PREMIUM BUT LOCKED ECOSYSTEM

**Confidence: HIGH** -- verified via Ubiquiti product pages, community forums, Home Assistant integration docs

#### Camera Lineup

| Model | Type | Resolution | Price |
|-------|------|-----------|-------|
| G5 Flex | Indoor | 1080P | ~$79 |
| G5 Bullet | Outdoor | 2K 5MP | ~$129 |
| G5 Dome | Indoor | 2K 4MP | ~$129 |
| G5 Turret Ultra | Outdoor | 4K 8MP | ~$129 |
| G5 Pro | Outdoor | 4K 8MP | ~$299 |
| G6 Bullet | Outdoor | 4K 8MP | ~$199 |
| G4 Doorbell Pro | Doorbell | 5MP | ~$299 |

#### The Good

- **Best mobile app in the business** -- UniFi Protect app is gorgeous, responsive, and genuinely wife-friendly
- **No subscription fees** -- all AI detection, recording, and cloud features are included with hardware
- **Excellent build quality** -- enterprise-grade hardware
- **Local processing** -- all AI runs on the NVR device
- **Official API** -- Settings > Control Plane > Integrations for API key generation

#### The Bad -- Proprietary Lock-in

**This is the dealbreaker for a Jarvis integration:**

- **Requires Ubiquiti NVR hardware:** UniFi Dream Machine Pro ($379), UDR ($229), or Cloud Key Gen2 Plus (~$200) to run Protect
- **Cameras adopted into Protect lose direct RTSP access:** The camera no longer serves RTSP on port 554. Instead, the NVR provides RTSPS on port 7441 or RTSP on 7447
- **No third-party cameras:** You cannot add Reolink/Amcrest cameras to UniFi Protect
- **No ONVIF interop:** Once adopted, cameras only work within the UniFi ecosystem
- **API is undocumented:** Ubiquiti does not publish official API docs. Community libraries (`hjdhjd/unifi-protect`) reverse-engineer it
- **Price premium:** $129-299 per camera + $200-379 NVR = expensive for the feature set

#### Verdict

UniFi Protect is the best "appliance" experience -- plug in cameras, open app, done. But the proprietary lock-in makes it the wrong choice for a developer who wants programmatic access to feeds, Frigate integration, and custom AI processing. You'd be paying a premium to fight the ecosystem.

**Choose UniFi ONLY IF:** Wife-friendliness is the absolute top priority AND you accept you can't easily integrate with Frigate or custom software.

---

### 2.5 TP-Link Tapo -- BEST BUDGET OPTION

**Confidence: MEDIUM** -- verified via TP-Link product pages, community Frigate integration reports

#### Camera Lineup

| Model | Type | Resolution | Price | RTSP | ONVIF | PoE |
|-------|------|-----------|-------|------|-------|-----|
| **C320WS** | Outdoor | 2K 4MP | $60 | Yes | Yes | No (WiFi, wired power) |
| **C210** | Indoor PTZ | 2K 3MP | $35 | Yes | Yes (Profile S) | No (plug-in) |
| **C110** | Indoor | 2K 3MP | $25 | Yes | Yes | No (plug-in) |
| **C510W** | Outdoor PTZ | 2K | $55 | Yes | Yes | No (WiFi) |
| **D225** | Doorbell | 2K | $80 | Yes | Unknown | No (wired AC) |

#### RTSP/Frigate Integration

- RTSP works but requires enabling "Third Party Compatibility" in the Tapo app first
- A separate camera account (username/password) must be created in the app for RTSP access
- ONVIF Profile S only (no 2-way audio via ONVIF, though go2rtc can handle Tapo's proprietary 2-way audio)
- WiFi-only cameras can be less stable than PoE for continuous RTSP streaming

#### Key Limitation

**No PoE cameras.** All Tapo cameras are WiFi or plug-in powered. This means:
- Less reliable for outdoor use (WiFi can drop)
- More complex wiring (need power outlets near each camera)
- Not as clean an installation as PoE (single Ethernet cable for power + data)

#### Verdict

Tapo is the undisputed budget king. A C210 indoor camera at $35 with RTSP is incredible value. But the lack of PoE and WiFi-only connectivity makes them less ideal for a serious security setup. Good for supplementing a Reolink system with cheap indoor cameras.

---

### 2.6 Eufy -- AVOID FOR THIS USE CASE

**Confidence: HIGH** -- verified via community reports, Home Assistant forums

#### Why Avoid

1. **RTSP support is unreliable:** Battery cameras do NOT support RTSP. Wired cameras support it but the stream disables itself after a few minutes of inactivity, requiring manual re-enabling
2. **2022 cloud scandal:** Eufy was caught uploading footage to the cloud despite marketing "100% local storage." Trust was permanently damaged
3. **Not ONVIF compliant:** No standard protocol interop
4. **Frigate integration is poor:** Home Assistant community reports describe it as hacky and unstable
5. **Cloud creep:** Newer features increasingly require cloud connectivity

**Exception:** The Eufy S330 (eufyCam 3) system works well as a standalone product with local storage on a HomeBase. If your wife just wants cameras that "work" and you never want to integrate with Jarvis, Eufy is fine. But for a developer wanting programmatic access -- avoid.

---

### 2.7 Wyze -- AVOID FOR THIS USE CASE

**Confidence: HIGH** -- verified via Wyze forums, firmware release notes

#### Why Avoid

1. **RTSP requires custom firmware:** Not available on the current Wyze Cam v4. Only v2, v3, and Pan v3 got RTSP firmware in early 2026
2. **Installing RTSP firmware disables Wyze app features:** You lose cloud features, person detection, and future updates
3. **Cloud-first architecture:** Wyze cameras are designed around their cloud service
4. **$25 cameras are tempting but false economy:** The time spent fighting RTSP firmware issues exceeds the cost savings over a Reolink RLC-520A ($55) that just works

---

### 2.8 Lorex -- VIABLE BUT NO ADVANTAGE OVER REOLINK

**Confidence: MEDIUM** -- verified via Lorex product pages, community reports

#### Overview

- ONVIF G, S, and T compliant
- RTSP support on all IP cameras
- Local NVR recording, no subscription required
- Newer models (2023+) are ONVIF Profile S compliant
- 4K options available
- Price range: $80-200 per camera

#### Why Not Recommended Over Reolink

- Similar quality at higher prices
- Less community documentation for Frigate integration
- Lorex NVR ecosystem is slightly proprietary (they don't advertise ONVIF support even though it exists)
- Fewer model options for indoor PTZ and doorbell

---

## 3. NVR Software Comparison

### 3.1 Frigate NVR -- RECOMMENDED

**Confidence: HIGH** -- 15K+ GitHub stars, actively maintained, verified via official docs

| Feature | Details |
|---------|---------|
| **License** | Free, open source (MIT) |
| **Platform** | Docker on Linux (any x86 or ARM system) |
| **AI Detection** | Real-time person/vehicle/animal/package detection |
| **Accelerator Support** | Hailo-8/8L (recommended), Google Coral USB, NVIDIA GPU, Intel OpenVINO |
| **Camera Protocol** | RTSP via go2rtc (handles Reolink, Amcrest, Dahua, Tapo, etc.) |
| **Recording** | 24/7 continuous or motion-triggered, local storage |
| **API** | Full REST API + MQTT event publishing |
| **UI** | Web-based dashboard with live view, event timeline, snapshots, clips |
| **Mobile App** | Via Home Assistant app (or direct web UI) |
| **False Alarm Rate** | Very low with proper AI accelerator (motion > YOLO filter > only real events) |

#### Frigate REST API (Key Endpoints)

```
GET  /api/events                          # List all events (filterable)
GET  /api/events/<id>                     # Get event details
GET  /api/events/<id>/snapshot.jpg        # Get event snapshot
GET  /api/events/<id>/clip.mp4            # Get event video clip
GET  /api/events/<id>/thumbnail.jpg       # Get event thumbnail
GET  /api/events/summary                  # Summary of all events
GET  /api/<camera>/latest.jpg             # Latest camera snapshot
GET  /api/stats                           # System statistics
GET  /api/config                          # Current configuration
POST /api/events/<id>/retain              # Retain an event
DELETE /api/events/<id>                    # Delete an event
```

#### Frigate MQTT Topics (Event Integration)

```
frigate/events                            # All detection events (JSON payload)
frigate/<camera_name>/motion              # Motion state (ON/OFF)
frigate/<camera_name>/<object_name>       # Object count per camera
frigate/<camera_name>/status/detect       # Detection status
frigate/available                         # System online/offline
frigate/stats                             # System statistics
```

**Event payload example:**
```json
{
  "type": "new",
  "before": { ... },
  "after": {
    "id": "1234567890.123456-abc123",
    "camera": "front_door",
    "label": "person",
    "score": 0.92,
    "start_time": 1709312400.0,
    "end_time": null,
    "snapshot": { "frame_time": 1709312400.5 },
    "has_clip": true,
    "has_snapshot": true
  }
}
```

#### Recommended Hardware for Frigate

| Component | Recommendation | Price | Notes |
|-----------|---------------|-------|-------|
| **Server (Best)** | Beelink EQ13 (Intel N100) | ~$150-200 | Dual NICs, low power (~15W), recommended by Frigate docs |
| **Server (Budget)** | Raspberry Pi 5 (8GB) | ~$80 | Works but tighter on resources |
| **Server (Existing)** | Any x86 PC/NAS | $0 | Use what you have |
| **AI Accelerator (Best)** | Hailo-8L M.2 module | ~$50-75 | Frigate's new recommended accelerator |
| **AI Accelerator (Alt)** | Google Coral USB | ~$35-60 | Still works well, no longer recommended for NEW installs |
| **Storage** | 512GB-1TB SSD | ~$40-80 | For recordings (SSD preferred over HDD for continuous writes) |
| **Storage (Budget)** | 256GB SSD | ~$25 | ~5-7 days of 4-camera recording |

**Note on Coral:** Frigate docs now say "The Coral is no longer recommended for new Frigate installations, except in deployments with particularly low power requirements." Hailo-8/8L or Intel OpenVINO (built into N100 iGPU) are now preferred. However, Coral USB still works perfectly and is cheaper.

---

### 3.2 Blue Iris -- WINDOWS ALTERNATIVE

**Confidence: HIGH** -- widely used, verified pricing

| Feature | Details |
|---------|---------|
| **License** | $70 one-time (supports up to 64 cameras) |
| **Platform** | Windows 10/11 only |
| **AI Detection** | Via plugins (DeepStack, CodeProject.AI) |
| **Camera Protocol** | RTSP, ONVIF, HTTP |
| **Recording** | Continuous, motion-triggered, scheduled |
| **API** | HTTP API for snapshots, status, alerts |
| **UI** | Windows desktop app + web viewer |
| **Mobile App** | Blue Iris app (iOS/Android) -- basic but functional |

#### Pros Over Frigate
- More user-friendly initial setup (Windows GUI vs YAML config)
- Mature software (15+ years)
- Wider camera compatibility out of the box

#### Cons vs Frigate
- Requires Windows (always-on Windows PC)
- $70 license cost vs free
- AI detection requires separate plugin setup
- Higher power consumption (full Windows PC vs mini PC running Linux)
- Less active development community
- No native MQTT integration

#### Verdict
Good if Jonathan already has a Windows PC running 24/7. Otherwise, Frigate is better for a developer wanting API/MQTT integration with Jarvis.

---

### 3.3 Synology Surveillance Station -- IF YOU OWN A SYNOLOGY NAS

**Confidence: HIGH** -- verified via Synology product pages, pricing confirmed

| Feature | Details |
|---------|---------|
| **License** | 2 cameras free, then ~$50-60 per additional camera license (one-time) |
| **Platform** | Synology NAS only |
| **AI Detection** | Basic (less capable than Frigate or Blue Iris) |
| **Camera Protocol** | RTSP, ONVIF |
| **Recording** | Continuous, motion-triggered, scheduled |
| **UI** | Web-based, polished |
| **Mobile App** | DS Cam (iOS/Android) -- good quality |

#### Cost for 6 Cameras
- 2 free licenses included
- 4 additional licenses: ~$200 (4-pack at ~$50/license)
- Total: ~$200 (assumes you already own the NAS)

#### Verdict
Great "set it and forget it" option IF you already own a Synology NAS. The NAS handles everything. However, AI detection is basic compared to Frigate. You could run Frigate on the NAS alongside Surveillance Station (Docker on Synology), but that's complex. If you don't already own a Synology, buying one ($300-600) just for cameras is not the best value.

---

### 3.4 Reolink NVR -- SIMPLEST BUT LIMITED

The Reolink RLN8-410 (8-channel, 2TB HDD, ~$300) is the simplest option: plug cameras in via PoE, they auto-discover. But it only works with Reolink cameras and provides no API for Jarvis integration beyond basic RTSP pass-through.

**Verdict:** Good for the wife's daily use as a standalone viewer, but does NOT replace Frigate for AI detection or Jarvis integration.

---

### 3.5 Shinobi -- NOT RECOMMENDED

Open-source Node.js NVR. Sounds appealing but:
- "Buggy mess" per experienced users
- Person detection difficult to implement
- Poor Home Assistant integration
- Much smaller community than Frigate

**Verdict:** Use Frigate instead.

---

## 4. Smart Doorbell Replacements

### The Ring Doorbell Problem

Ring doorbells do NOT support RTSP or ONVIF. They're entirely cloud-dependent. Replacing Ring means finding a doorbell that:
1. Has RTSP for Frigate integration
2. Has two-way audio
3. Has push notifications (via app or Frigate)
4. Has a physical chime option
5. Is wife-friendly (press button, hear chime, see visitor on phone)

### 4.1 Reolink Video Doorbell PoE -- RECOMMENDED

**Price:** ~$93 (includes Chime V2)
**Resolution:** 5MP 2K+
**Connection:** PoE (single Ethernet cable for power + data)
**RTSP:** Yes
**ONVIF:** Yes
**Two-way audio:** Yes
**Smart detection:** Person, package
**Weather rating:** IP65
**Field of view:** 180 diagonal (4:3 aspect ratio -- shows full body, not just face)
**Chime:** Included Reolink Chime V2
**Smart home:** Google Assistant, Alexa Echo Show
**Pre-roll:** 6 seconds of footage before motion detection trigger

**Why this wins:**
- PoE means reliable connection (no WiFi drops)
- Single cable installation (power + data)
- Works with Frigate via RTSP
- No subscription needed
- $93 is less than one year of Ring Protect Plus ($100/year)
- 4:3 aspect ratio shows full-body view (Ring uses 16:9 which crops the body)

**Wife-friendliness:** Chime rings on button press, push notification to phone, live view in Reolink app, two-way audio via app. Works identically to Ring from the user's perspective.

### 4.2 Reolink Video Doorbell WiFi -- ALTERNATIVE

**Price:** ~$120
**Connection:** WiFi (requires existing doorbell wiring for power, or adapter)
Same features as PoE but over WiFi. Choose this only if running Ethernet to the door is not feasible.

### 4.3 Amcrest AD410 -- GOOD BUT HAS QUIRKS

**Price:** ~$155
**Resolution:** 4MP
**Connection:** WiFi (requires doorbell wiring)
**RTSP:** Yes
**ONVIF:** Yes (button detection works with Frigate)

**The chime problem:** When connected to Frigate via go2rtc, the AD410 enters "intercom mode" and stops ringing the physical chime. Fixable by adding `#backchannel=0` to the RTSP URL, but this disables two-way audio through Frigate (still works via Amcrest app).

**Verdict:** The AD410 is technically the "gold standard for self-hosted doorbells" according to the community, but at $155 (vs Reolink's $93) and with the chime workaround required, the Reolink PoE doorbell is the better value for this use case.

### 4.4 TP-Link Tapo D225 -- BUDGET DOORBELL

**Price:** ~$80
**Resolution:** 2K
**Connection:** Wired AC
**RTSP:** Unknown/Limited
**Two-way audio:** Yes

Passable video quality, good response times, but uncertain Frigate compatibility and no PoE. Not recommended unless budget is extremely tight.

### 4.5 UniFi G4 Doorbell Pro -- PREMIUM BUT LOCKED

**Price:** ~$299 (plus $200+ for NVR)
Beautiful dual-camera doorbell with package detection. But requires UniFi ecosystem, no standard RTSP, and total cost is $500+ for just a doorbell system. Not recommended.

---

## 5. Integration with Jarvis

### 5.1 Architecture Overview

```
+------------------------------------------------------------------+
|                    LOCAL NETWORK                                   |
|                                                                    |
|  [Reolink Cameras]  --RTSP--> [Frigate NVR]                       |
|  (4-8 PoE cameras)            (mini PC + Hailo/Coral)              |
|       |                            |                               |
|       |                            |-- MQTT events                 |
|       |                            |-- REST API (snapshots/clips)  |
|       |                            |-- Web UI (wife's access)      |
|       |                            |                               |
|  [PoE Switch]                [MQTT Broker]                         |
|  (powers cameras)            (Mosquitto)                           |
|                                    |                               |
+------------------------------------------------------------------+
                                     |
                              [Cloudflare Tunnel]
                              or [Tailscale/WireGuard]
                                     |
                              +------v------+
                              | Jarvis API   |
                              | (Vercel)     |
                              +-------------+
```

### 5.2 How Jarvis Gets Data from Frigate

#### Getting Snapshots

**Option A: Frigate REST API (simplest)**
```typescript
// On your local Frigate bridge/sidecar:
const snapshot = await fetch('http://frigate-host:5000/api/front_door/latest.jpg');
const buffer = await snapshot.arrayBuffer();
const base64 = Buffer.from(buffer).toString('base64');
// Send to Jarvis API -> Claude Vision for analysis
```

**Option B: Event-triggered snapshot**
```typescript
// When MQTT event fires:
const eventSnapshot = await fetch(
  `http://frigate-host:5000/api/events/${eventId}/snapshot.jpg`
);
```

#### Getting Motion/Detection Events

**Via MQTT (real-time, preferred):**
```typescript
import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://frigate-host:1883');

client.subscribe('frigate/events');

client.on('message', (topic, message) => {
  const event = JSON.parse(message.toString());
  if (event.after.label === 'person' && event.type === 'new') {
    // New person detected!
    // Grab snapshot, send to Claude for analysis
    const snapshotUrl = `http://frigate-host:5000/api/events/${event.after.id}/snapshot.jpg`;
    analyzeWithClaude(snapshotUrl, event.after.camera);
  }
});
```

**Via REST API (polling, simpler but less real-time):**
```typescript
// Poll every 30 seconds for new events
const events = await fetch(
  'http://frigate-host:5000/api/events?limit=10&after=TIMESTAMP'
);
```

#### Getting Video Clips

```typescript
// Get the video clip for a specific event
const clip = await fetch(
  `http://frigate-host:5000/api/events/${eventId}/clip.mp4`
);
// Could send to Gemini Flash for temporal analysis
```

### 5.3 The Bridge Problem: Vercel to Local Network

**Jarvis runs on Vercel (cloud). Frigate runs on a mini PC (local network).** They can't talk directly. You need a bridge.

#### Option A: Cloudflare Tunnel (RECOMMENDED -- free)

Cloudflare Tunnel (`cloudflared`) creates a secure tunnel from your local network to a Cloudflare-managed domain. No port forwarding, no exposing your home IP.

```bash
# On the Frigate mini PC:
cloudflared tunnel create jarvis-vision
cloudflared tunnel route dns jarvis-vision frigate.yourdomain.com

# Now Jarvis on Vercel can call:
# https://frigate.yourdomain.com/api/events
```

**Cost:** Free (Cloudflare Tunnel is free for personal use)
**Security:** Cloudflare handles TLS, access control, DDoS protection
**Reliability:** Cloudflare's edge network, auto-reconnects

#### Option B: Tailscale (good alternative)

Creates a WireGuard-based mesh VPN. Jarvis's sidecar service (on Fly.io or similar) joins the Tailscale network and can access Frigate directly.

**Cost:** Free for personal use (up to 100 devices)
**Tradeoff:** The Vercel serverless functions themselves can't join Tailscale. You'd need the existing Fly.io sidecar to act as the bridge.

#### Option C: Sidecar Service (already planned)

The Ring sidecar on Fly.io (from doc 04) could also serve as the Frigate bridge:

```
[Frigate Local] --Cloudflare Tunnel--> [Internet] <--HTTPS-- [Fly.io Sidecar]
                                                                    |
                                                              <--HTTPS--
                                                                    |
                                                              [Jarvis on Vercel]
```

But this adds a hop. Cloudflare Tunnel directly to Vercel is simpler.

### 5.4 Revised Architecture (No Ring, All Local)

With Ring removed, the architecture simplifies dramatically:

**BEFORE (with Ring):**
```
Ring Cloud -> ring-client-api -> Sidecar (Fly.io) -> Jarvis (Vercel)
```

**AFTER (with Frigate):**
```
Cameras (local) -> Frigate (local) -> Cloudflare Tunnel -> Jarvis (Vercel)
```

**What this eliminates:**
- ring-client-api dependency (unofficial, could break)
- Token rotation headaches (Ring tokens expire hourly)
- Ring Protect subscription ($4-13/month)
- Sidecar service on Fly.io ($2/month)
- Cloud dependency for your own cameras
- Battery camera snapshot limitations

**What this adds:**
- Mini PC running Frigate (~$150-250 one-time, ~$3/month electricity)
- AI accelerator (~$35-75 one-time)
- PoE switch (~$50-100)
- Ethernet cabling (one-time)

### 5.5 Jarvis Integration Code Pattern

```typescript
// lib/vision/frigate.ts

const FRIGATE_URL = process.env.FRIGATE_BRIDGE_URL; // e.g., https://frigate.yourdomain.com
const FRIGATE_API_KEY = process.env.FRIGATE_API_KEY; // if using Cloudflare Access

export interface FrigateEvent {
  id: string;
  camera: string;
  label: string;       // "person", "car", "dog", "package"
  score: number;        // 0-1 confidence
  start_time: number;
  end_time: number | null;
  has_clip: boolean;
  has_snapshot: boolean;
}

// Get the latest snapshot from a camera
export async function getCameraSnapshot(cameraName: string): Promise<Buffer> {
  const response = await fetch(`${FRIGATE_URL}/api/${cameraName}/latest.jpg`, {
    headers: { 'Authorization': `Bearer ${FRIGATE_API_KEY}` }
  });
  if (!response.ok) throw new Error(`Frigate snapshot failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

// Get recent detection events
export async function getRecentEvents(
  camera?: string,
  label?: string,
  limit = 10
): Promise<FrigateEvent[]> {
  const params = new URLSearchParams();
  if (camera) params.set('camera', camera);
  if (label) params.set('label', label);
  params.set('limit', String(limit));

  const response = await fetch(`${FRIGATE_URL}/api/events?${params}`, {
    headers: { 'Authorization': `Bearer ${FRIGATE_API_KEY}` }
  });
  return response.json();
}

// Get event snapshot for Claude analysis
export async function getEventSnapshot(eventId: string): Promise<Buffer> {
  const response = await fetch(
    `${FRIGATE_URL}/api/events/${eventId}/snapshot.jpg`,
    { headers: { 'Authorization': `Bearer ${FRIGATE_API_KEY}` } }
  );
  return Buffer.from(await response.arrayBuffer());
}

// Get event video clip for Gemini analysis
export async function getEventClip(eventId: string): Promise<Buffer> {
  const response = await fetch(
    `${FRIGATE_URL}/api/events/${eventId}/clip.mp4`,
    { headers: { 'Authorization': `Bearer ${FRIGATE_API_KEY}` } }
  );
  return Buffer.from(await response.arrayBuffer());
}
```

### 5.6 Jarvis Chat Tools (Vision)

```typescript
// Tools that Jarvis would expose in the chat interface:

const visionTools = [
  {
    name: "check_camera",
    description: "Get a live snapshot from a security camera and analyze what's visible",
    input_schema: {
      type: "object",
      properties: {
        camera: {
          type: "string",
          enum: ["front_door", "backyard", "garage", "driveway"],
          description: "Which camera to check"
        }
      },
      required: ["camera"]
    }
  },
  {
    name: "get_security_events",
    description: "Get recent security camera detection events (people, vehicles, animals)",
    input_schema: {
      type: "object",
      properties: {
        camera: { type: "string", description: "Specific camera, or omit for all" },
        type: {
          type: "string",
          enum: ["person", "car", "dog", "cat", "package"],
          description: "Type of detection to filter by"
        },
        hours: { type: "number", description: "How many hours back to look (default 24)" }
      }
    }
  },
  {
    name: "get_event_details",
    description: "Get snapshot and details for a specific security event",
    input_schema: {
      type: "object",
      properties: {
        event_id: { type: "string", description: "The Frigate event ID" }
      },
      required: ["event_id"]
    }
  }
];
```

---

## 6. Recommended Setups (3 Tiers)

### 6.1 Budget Tier: < $500

**4 cameras + doorbell, best bang for buck**

| Item | Model | Qty | Unit Price | Total |
|------|-------|-----|-----------|-------|
| Outdoor cameras | Reolink RLC-520A (5MP dome) | 3 | $55 | $165 |
| Doorbell | Reolink Video Doorbell PoE (5MP) | 1 | $93 | $93 |
| Indoor camera | TP-Link Tapo C210 (2K PTZ) | 1 | $35 | $35 |
| PoE switch | TP-Link TL-SG1005P (5-port PoE) | 1 | $40 | $40 |
| Frigate server | Raspberry Pi 5 (8GB) + case + PSU | 1 | $95 | $95 |
| AI accelerator | Google Coral USB | 1 | $40 | $40 |
| Storage | 256GB NVMe SSD (for Pi 5) | 1 | $25 | $25 |
| **TOTAL** | | | | **$493** |

**Ongoing cost:** ~$3/month electricity. No subscriptions.

**What you get:**
- 3 outdoor cameras covering front door area, backyard, side of house
- 1 PoE doorbell with chime, two-way audio, push notifications
- 1 indoor PTZ camera (nursery, living room, or pet cam)
- AI-powered person/vehicle/animal detection via Frigate
- Full REST API and MQTT for Jarvis integration
- Reolink app for wife's daily use
- Frigate web UI for event review

**What you sacrifice:**
- 5MP instead of 4K on outdoor cameras
- Coral instead of Hailo (still excellent, just older)
- Raspberry Pi may struggle with 4+ cameras at higher resolutions
- Indoor camera is WiFi (not PoE)

---

### 6.2 Mid-Range Tier: < $1,000

**6 cameras + doorbell, better quality and headroom**

| Item | Model | Qty | Unit Price | Total |
|------|-------|-----|-----------|-------|
| Outdoor cameras (key areas) | Reolink RLC-810A (4K 8MP bullet) | 3 | $90 | $270 |
| Outdoor cameras (secondary) | Reolink RLC-520A (5MP dome) | 2 | $55 | $110 |
| Doorbell | Reolink Video Doorbell PoE (5MP) | 1 | $93 | $93 |
| Indoor camera | Reolink E1 Zoom (4K PTZ, Wi-Fi 6) | 1 | $80 | $80 |
| PoE switch | TP-Link TL-SG1008P (8-port PoE) | 1 | $65 | $65 |
| Frigate server | Beelink EQ13 (Intel N100, 16GB RAM, 500GB SSD) | 1 | $180 | $180 |
| AI accelerator | Hailo-8L M.2 module | 1 | $70 | $70 |
| Ethernet cable | Cat6 outdoor-rated, 500ft | 1 | $50 | $50 |
| **TOTAL** | | | | **$918** |

**Ongoing cost:** ~$5/month electricity. No subscriptions.

**What you get:**
- 3x 4K cameras on key positions (front, back, driveway) + 2x 5MP for secondary coverage
- 1 PoE doorbell replacing Ring
- 1 indoor 4K PTZ with auto-tracking and 3x zoom
- Intel N100 handles 6+ cameras easily with hardware decode
- Hailo-8L AI accelerator (Frigate's current recommendation)
- Dual NICs on Beelink allow dedicated camera VLAN (security best practice)
- Frigate + Reolink app for dual access (wife + developer)

**Why N100 over Pi:**
- Hardware video decode handles multiple 4K streams
- Dual NICs allow camera network isolation
- More headroom for future cameras
- Same power consumption (~15W)

---

### 6.3 Premium Tier: < $2,000

**8 cameras + doorbell, best quality + best integration**

| Item | Model | Qty | Unit Price | Total |
|------|-------|-----|-----------|-------|
| Outdoor cameras (premium) | Reolink CX810 (4K, F1.0, color night) | 4 | $120 | $480 |
| Outdoor cameras (coverage) | Reolink RLC-810A (4K 8MP) | 2 | $90 | $180 |
| Doorbell | Reolink Video Doorbell PoE (5MP) | 1 | $93 | $93 |
| Indoor cameras | Reolink E1 Zoom (4K PTZ, Wi-Fi 6) | 2 | $80 | $160 |
| PoE switch | TP-Link TL-SG1016PE (16-port managed PoE+) | 1 | $150 | $150 |
| Frigate server | Beelink EQ13 (N100, 16GB, 500GB) | 1 | $180 | $180 |
| AI accelerator | Hailo-8L M.2 module | 1 | $70 | $70 |
| Additional storage | 1TB NVMe SSD (recordings) | 1 | $70 | $70 |
| UPS | APC BE600M1 (battery backup for NVR + switch) | 1 | $70 | $70 |
| Ethernet cable | Cat6 outdoor-rated, 1000ft | 1 | $80 | $80 |
| Weatherproof junction boxes | Outdoor cable termination | 6 | $8 | $48 |
| Mounting hardware | Brackets, anchors, screws | 1 | $30 | $30 |
| **TOTAL** | | | | **$1,611** |

**Ongoing cost:** ~$7/month electricity. No subscriptions.

**What you get:**
- 4x CX810 with F1.0 aperture (TRUE color night vision -- 4x more light than standard cameras, no IR spotlights needed)
- 2x additional 4K cameras for complete coverage
- 1 PoE doorbell
- 2 indoor 4K PTZ cameras with auto-tracking
- 16-port managed PoE switch with VLAN support
- UPS battery backup (keeps cameras recording during power outages for ~30 minutes)
- 1TB storage (~2 weeks of 8-camera 24/7 recording)
- Full cable management and weatherproofing
- Professional-grade installation materials

**What makes this "premium":**
- CX810's F1.0 aperture means stunning night footage WITHOUT IR (natural-looking color, not washed-out green)
- Managed switch enables VLAN isolation (cameras can't reach the internet, only NVR)
- UPS means recording continues during power outages
- 1TB storage means longer retention
- Two indoor PTZ cameras (one per floor, or nursery + living room)

---

### Cost Comparison: Local vs Ring

| Expense | Ring (8 cameras) | Local Budget | Local Mid | Local Premium |
|---------|-------------------|-------------|-----------|---------------|
| Hardware (one-time) | ~$1,200 | $493 | $918 | $1,611 |
| Year 1 subscription | $200 (Protect Plus) | $0 | $0 | $0 |
| Year 2 subscription | $200 | $0 | $0 | $0 |
| Year 3 subscription | $200 | $0 | $0 | $0 |
| 3-year total | **$1,800** | **$493** | **$918** | **$1,611** |
| 5-year total | **$2,200** | **$493** | **$918** | **$1,611** |
| Electricity (monthly) | ~$0 (cloud) | ~$3 | ~$5 | ~$7 |
| API access | None | Full | Full | Full |
| Cloud dependency | 100% | 0% | 0% | 0% |

**The local system pays for itself vs Ring in 2-3 years, then saves $200/year every year after.**

---

## 7. The Wife Test

### Rating System

Each rating considers: Can a non-technical person use this daily without asking the developer for help?

| Criterion | Reolink + Frigate | UniFi Protect | Ring | Eufy |
|-----------|-------------------|---------------|------|------|
| **Mobile app quality** | 4/5 (Reolink app) | 5/5 (best in class) | 4/5 | 4/5 |
| **Live feed access** | 4/5 (tap camera, see feed) | 5/5 (instant) | 4/5 | 4/5 |
| **Push notifications** | 4/5 (Reolink + Frigate HA) | 5/5 (instant, reliable) | 5/5 | 4/5 |
| **Doorbell two-way audio** | 4/5 (via Reolink app) | 5/5 (via Protect app) | 5/5 | 3/5 |
| **"Just works" factor** | 3/5 (initial setup is dev work) | 5/5 (plug and play) | 5/5 | 4/5 |
| **Ongoing maintenance** | 3/5 (Frigate updates, YAML) | 4/5 (auto-updates) | 5/5 (fully managed) | 4/5 |
| **Overall wife-friendliness** | **3.7/5** | **4.8/5** | **4.7/5** | **3.8/5** |

### The Honest Assessment

**The wife will NOT interact with Frigate.** Frigate is the developer's tool -- YAML configuration, Docker, Linux. The wife interacts with:

1. **Reolink App** -- this is her primary interface. Open app, see cameras, get notifications, talk through doorbell. This works the same as Ring.
2. **Frigate Web UI** -- she could use this for event review (it's a clean web UI), but she probably won't need to.
3. **Home Assistant** (optional) -- if you set up HA with the Frigate integration, the HA app provides a polished mobile experience with Frigate events.

**The pitch to the wife:**
"The Reolink app on your phone works exactly like Ring. You get the same doorbell notifications, same live view, same two-way audio. The only difference is we own all the footage locally and don't pay $200/year. I also get to build cool stuff with the cameras through Jarvis."

**Key requirements for wife acceptance:**
1. Doorbell chime MUST ring when someone presses the button (Reolink PoE doorbell does this)
2. Phone notification MUST appear within seconds of motion (Reolink app does this)
3. Live view MUST load quickly (PoE cameras load faster than WiFi)
4. Two-way audio MUST work from the phone (Reolink app supports this)
5. She MUST NOT need to interact with Docker, YAML, SSH, or terminal (she won't -- Reolink app handles everything she needs)

---

## 8. Network Architecture

### Recommended Network Layout

```
[Internet Router]
       |
[Main Network Switch]
       |
       |--- [Beelink Mini PC (Frigate + Cloudflare Tunnel)]
       |         |
       |    [PoE Switch (Camera VLAN)]
       |         |
       |         |--- Reolink RLC-810A (front yard)
       |         |--- Reolink RLC-810A (backyard)
       |         |--- Reolink RLC-520A (side yard)
       |         |--- Reolink RLC-520A (garage)
       |         |--- Reolink Doorbell PoE (front door)
       |         |--- Reolink CX810 (driveway)
       |
       |--- [WiFi Access Point]
                 |
                 |--- Reolink E1 Zoom (indoor, WiFi)
                 |--- Wife's phone (Reolink app)
                 |--- Jonathan's devices
```

### Security Best Practice: Camera VLAN

The Beelink EQ13 has dual NICs. Use one for the home network, one for the camera network:

- **NIC 1 (eth0):** Home network (192.168.1.x) -- connects to router/internet
- **NIC 2 (eth1):** Camera network (10.0.0.x) -- connects to PoE switch

The cameras can talk to Frigate but NOT to the internet. This prevents:
- Cameras phoning home to Chinese cloud servers
- Camera firmware exploits reaching your home network
- Any cloud dependency whatsoever

---

## 9. Migration Plan from Ring

### Step-by-step

1. **Purchase cameras + Frigate hardware** -- do NOT cancel Ring yet
2. **Set up Frigate on the Beelink** -- install Docker, configure Frigate, connect cameras
3. **Install outdoor cameras** -- mount, run Ethernet, verify RTSP streams in Frigate
4. **Install PoE doorbell** -- replace Ring doorbell, verify chime, notifications, two-way audio
5. **Install indoor cameras** -- plug in, configure WiFi, add to Frigate
6. **Run parallel for 2 weeks** -- keep Ring AND local system running simultaneously
7. **Wife acceptance testing** -- ensure she's comfortable with Reolink app, doorbell works, notifications are timely
8. **Set up Cloudflare Tunnel** -- enable Jarvis access to Frigate API
9. **Cancel Ring Protect subscription** -- once confident
10. **Remove Ring hardware** -- donate, sell, or recycle

### Timeline Estimate

| Phase | Duration | Who |
|-------|----------|-----|
| Research & purchase | 1 week | Jonathan |
| Frigate setup | 1 evening (2-3 hours) | Jonathan |
| Outdoor camera installation | 1 weekend | Jonathan (+ son's help for mounting) |
| Doorbell installation | 1 hour | Jonathan |
| Indoor camera setup | 30 minutes | Jonathan |
| Parallel testing | 2 weeks | Both |
| Ring cancellation | 5 minutes | Jonathan |
| Jarvis integration | 2-3 sessions | Jonathan + Claude |

---

## 10. Sources

### Camera Products & Pricing (HIGH confidence -- verified via official product pages)
- [Reolink RLC-810A](https://reolink.com/product/rlc-810a/) -- $89.99
- [Reolink RLC-520A](https://reolink.com/product/rlc-520a/) -- $54.99
- [Reolink CX810](https://reolink.com/product/cx810/) -- $119.99
- [Reolink Video Doorbell PoE](https://reolink.com/product/reolink-video-doorbell-poe/) -- $93.49
- [Reolink Video Doorbell WiFi](https://reolink.com/product/reolink-video-doorbell-wifi/) -- $119.99
- [Reolink E1 Zoom](https://reolink.com/product/e1-zoom/) -- $79.99
- [Reolink RLN8-410 NVR](https://reolink.com/product/rln8-410/) -- $299.99
- [Reolink Doorbell Store](https://store.reolink.com/us/video-doorbells/)
- [Amcrest AD410](https://amcrest.com/4mp-wifi-camera-doorbell-ad410.html) -- $154.99
- [Amcrest IP5M-T1179EW](https://amcrest.com/ip-cameras.html) -- $69.99
- [TP-Link Tapo C320WS](https://www.tp-link.com/us/home-networking/cloud-camera/tapo-c320ws/) -- $59.99
- [TP-Link Tapo C210](https://www.tapo.com/us/product/smart-camera/tapo-c210/) -- $34.99
- [UniFi Protect Cameras](https://ui.com/physical-security/special-devices/doorbells)

### NVR Software (HIGH confidence -- verified via official documentation)
- [Frigate NVR Docs](https://docs.frigate.video/)
- [Frigate HTTP API](https://docs.frigate.video/integrations/api/)
- [Frigate MQTT](https://docs.frigate.video/integrations/mqtt/)
- [Frigate Hardware Recommendations](https://docs.frigate.video/frigate/hardware/)
- [Frigate Camera Configurations](https://docs.frigate.video/configuration/camera_specific/)
- [Frigate GitHub](https://github.com/blakeblackshear/frigate)
- [Blue Iris Software](https://blueirissoftware.com/) -- $69.95 one-time
- [Synology Surveillance Station Licenses](https://www.synology.com/en-us/products/Device_License_Pack)

### Integration & Architecture (HIGH confidence)
- [Frigate + Reolink Guide 2026](https://corelab.tech/setupfrigate/)
- [Reolink + Frigate Discussion](https://github.com/blakeblackshear/frigate/discussions/5198)
- [Reolink 8MP+ best practices](https://github.com/blakeblackshear/frigate/discussions/19650)
- [Amcrest AD410 chime fix](https://github.com/blakeblackshear/frigate/issues/7093)
- [NetworkChuck Frigate Guide](https://github.com/theNetworkChuck/frigate-nvr-guide)
- [Frigate on Pi 5](https://helgeklein.com/blog/frigate-nvr-with-object-detection-on-raspberry-pi-5-coral-tpu/)
- [Jeff Geerling Pi Frigate](https://www.jeffgeerling.com/blog/2026/upgrading-my-open-source-pi-surveillance-server-frigate)
- [UniFi Protect API](https://github.com/hjdhjd/unifi-protect)

### Regulatory (HIGH confidence)
- [NDAA Hikvision/Dahua Ban](https://ipvm.com/reports/hikua-bans)
- [FCC Hikvision Dahua Ban October 2025](https://systems-integrations.com/fcc-hikvision-dahua-ban-october-2025/)
- [Hikvision NDAA Compliance](https://getsafeandsound.com/blog/hikvision-ndaa-compliant/)

### Comparisons & Reviews (MEDIUM confidence)
- [Reolink vs Amcrest for Self-Hosting](https://webcam.org/blog/reolink-vs-amcrest.html)
- [NVR Comparison (Reolink, Synology, UniFi, Blue Iris, Frigate)](http://www.thesmarthomehookup.com/ultimate-network-video-recorder-nvr-comparison-reolink-annke-synology-surveillance-station-unifi-protect-blue-iris-ring-alarm-lorex-frigate/)
- [Frigate vs Blue Iris](https://www.wundertech.net/frigate-vs-blue-iris/)
- [Best No-Subscription Cameras 2026](https://www.safehome.org/home-security-cameras/best/no-subscription/)
- [Reolink PoE Tier List](https://www.thesmarthomehookup.com/reolink-poe-tier-list-testing-every-reolink-wired-security-camera/)
- [Reolink App Store](https://apps.apple.com/us/app/reolink/id995927563)
- [Best RTSP Doorbell Cameras](https://doorbellexpert.com/best-rtsp-doorbell/)
- [Eufy Camera RTSP Issues](https://community.home-assistant.io/t/eufy-camera-rtsp-stream-is-disabled-after-a-few-minutes-my-findings/581001)
- [Tapo + Frigate Integration](https://www.dima.pm/integrating-tapo-cameras-with-frigate-including-2-way-audio/)

### Hardware (MEDIUM confidence)
- [Google Coral USB](https://www.coral.ai/products/accelerator/)
- [Beelink EQ13 N100](https://www.cnx-software.com/2024/06/06/beelink-eq13-is-an-intel-n200-or-n100-mini-pc-with-an-integrated-power-supply/)

---

## Appendix: FAQ

### "What about power outages?"
Premium tier includes a UPS ($70) that keeps the NVR and PoE switch running for ~30 minutes. Cameras record to the NVR during the outage. Without UPS, cameras stop when power drops (same as Ring, which also stops without power).

### "What about internet outages?"
This is where local wins MASSIVELY over Ring. With Ring, no internet = no recording, no notifications, nothing. With the local system, cameras continue recording to the NVR even without internet. You just lose remote access and Jarvis integration until internet returns.

### "Can the wife still get doorbell notifications without internet?"
The Reolink doorbell chime rings mechanically (built into the chime unit) -- no internet needed. But phone notifications require the Reolink app and internet. Same limitation as Ring.

### "How much storage do I need?"
Rule of thumb: 1 camera at 4K continuous = ~60GB/day. For 6 cameras:
- 256GB SSD: ~2-3 days of continuous recording
- 512GB SSD: ~5-6 days
- 1TB SSD: ~10-12 days
- 2TB HDD: ~20-24 days

With motion-only recording (recommended), multiply these by 3-5x.

### "Do I need Home Assistant?"
No. Frigate runs standalone. Home Assistant adds a polished mobile app experience and automation (e.g., "turn on porch light when person detected at night"), but is not required. The Reolink app handles the wife's daily needs. Frigate's web UI handles event review. Jarvis talks directly to Frigate's API.

### "What if I want to add Ring integration later too?"
The existing research (docs 01-04) covers Ring integration via ring-client-api + sidecar. You could run both systems in parallel -- local cameras via Frigate for primary security, Ring cameras (if you keep any) via the sidecar. The VisionSource abstraction from doc 03 supports multiple sources.

### "Is the Reolink app as good as Ring?"
It's close. Ring's app is slightly more polished, especially for event review and sharing. But Reolink's app handles live view, notifications, two-way audio, and playback well. The 4.4 App Store rating (vs Ring's 4.6) reflects this -- it's good, not perfect. For daily use, most people won't notice a meaningful difference.
