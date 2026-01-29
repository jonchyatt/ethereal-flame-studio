# Blotato API Guide for Multi-Platform Social Media Posting

> **Purpose**: Phase 5 n8n integration for automated multi-platform video posting workflow

---

## Table of Contents

1. [API Overview](#1-api-overview)
2. [Authentication](#2-authentication)
3. [API Endpoints](#3-api-endpoints)
4. [Supported Platforms](#4-supported-platforms)
5. [Platform-Specific Requirements](#5-platform-specific-requirements)
6. [Video Upload Requirements](#6-video-upload-requirements)
7. [Rate Limits](#7-rate-limits)
8. [n8n Integration](#8-n8n-integration)
9. [Pricing Tiers](#9-pricing-tiers)
10. [Gotchas and Limitations](#10-gotchas-and-limitations)
11. [Example API Calls](#11-example-api-calls)

---

## 1. API Overview

**Base URL**: `https://backend.blotato.com/v2`

The Blotato API enables publishing and scheduling posts to 9+ social media platforms. It supports:
- Text posts
- Images
- Videos/Reels
- Carousels/Slideshows
- Stories
- Threads (multi-post sequences)

**Key Feature**: Direct URL media support - pass publicly accessible media URLs directly without pre-uploading.

---

## 2. Authentication

### API Key Generation
1. Go to Blotato Settings
2. Navigate to API section
3. Click "Generate API Key"
4. Copy the key securely

### Request Headers

```http
Content-Type: application/json
blotato-api-key: YOUR_API_KEY
```

**Note**: API access is limited to paying subscribers only (not available on free trial).

### Error Handling
- `401 Unauthorized`: Invalid or missing API key
- `429 Rate Limited`: Exceeded request limits

---

## 3. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v2/posts` | POST | Publish/schedule posts |
| `/v2/media` | POST | Upload media (optional) |
| `/v2/videos/creations` | POST | Create AI-generated video |
| `/v2/videos/creations/:id` | GET | Check video creation status |
| `/v2/videos/:id` | DELETE | Delete a video |

### Primary Endpoint: Publish Post

```
POST https://backend.blotato.com/v2/posts
```

---

## 4. Supported Platforms

| Platform | Identifier | Thread Support | Special Requirements |
|----------|------------|----------------|---------------------|
| X (Twitter) | `twitter` | Yes | Premium for 25k chars |
| LinkedIn | `linkedin` | No | Page ID for company posts |
| Facebook | `facebook` | No | Page ID required |
| Instagram | `instagram` | No | Reels/Stories support |
| TikTok | `tiktok` | No | Privacy/disclosure flags required |
| YouTube | `youtube` | No | Title, privacy status required |
| Pinterest | `pinterest` | No | Board ID required |
| Threads | `threads` | Yes | Reply control options |
| Bluesky | `bluesky` | Yes | Minimal config needed |

---

## 5. Platform-Specific Requirements

### Twitter/X
```json
{
  "targetType": "twitter"
}
```
- **Character Limit**: 280 (standard), 25,000 (Premium)
- **Video**: MP4, H.264, 30-60 FPS, max 512 MB, 0.5-140 seconds
- **Images**: JPG/PNG/GIF/WEBP, max 5 MB, up to 4 per tweet
- Supports threads via `additionalPosts`

### LinkedIn
```json
{
  "targetType": "linkedin",
  "pageId": "optional-company-page-id"
}
```
- **Character Limit**: 3,000
- **Video**: MP4, 75 KB-500 MB, 3s-30min, up to 60 FPS
- **Images**: JPG/GIF/PNG, max 5 MB

### Facebook
```json
{
  "targetType": "facebook",
  "pageId": "required-page-id",
  "mediaType": "video" | "reel",
  "link": "optional-url-preview"
}
```
- **Character Limit**: 63,206
- **Video**: MP4/MOV, max 4 GB, 3s-240min
- **Images**: JPEG/PNG/GIF/BMP/TIFF, max 30 MB

### Instagram
```json
{
  "targetType": "instagram",
  "mediaType": "reel" | "story",
  "altText": "optional-accessibility-text",
  "collaborators": ["handle1", "handle2"],
  "coverImageUrl": "optional-cover-image-url"
}
```
- **Character Limit**: 2,200
- **Video**: MP4/MOV, max 100 MB, 3s-15min (Reels)
- **Aspect Ratios**: 4:5 to 1.91:1 (1:1 recommended)
- **Images**: JPEG/PNG, max 8 MB
- **Carousel**: 2-10 items

### TikTok
```json
{
  "targetType": "tiktok",
  "privacyLevel": "PUBLIC_TO_EVERYONE" | "SELF_ONLY" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR",
  "disabledComments": false,
  "disabledDuet": false,
  "disabledStitch": false,
  "isBrandedContent": false,
  "isYourBrand": false,
  "isAiGenerated": true,
  "title": "optional-title-under-90-chars",
  "autoAddMusic": false,
  "videoCoverTimestamp": 1000
}
```
- **Character Limit**: 2,200
- **Video**: MP4/WebM/MOV, H.264/H.265, max 4 GB, up to 10 min
- **Required Fields**: All boolean flags above are REQUIRED

### YouTube
```json
{
  "targetType": "youtube",
  "title": "required-video-title",
  "privacyStatus": "public" | "private" | "unlisted",
  "shouldNotifySubscribers": true,
  "isMadeForKids": false,
  "containsSyntheticMedia": true
}
```
- **Video**: MP4 recommended, H.264/AAC-LC, 16:9, up to 256 GB/12 hours
- **Title Limit**: 100 characters
- **Description Limit**: 5,000 characters

### Pinterest
```json
{
  "targetType": "pinterest",
  "boardId": "required-board-id",
  "title": "optional-pin-title",
  "altText": "optional-alt-text",
  "link": "optional-destination-url"
}
```
- **Text Limits**: Title 100 chars, Description 800 chars
- **Video**: MP4/MOV, H.264/H.265, 4s-5min, max 2 GB
- **Images**: PNG/JPEG, max 20 MB
- **Carousel**: 2-5 images

### Threads
```json
{
  "targetType": "threads",
  "replyControl": "everyone" | "accounts_you_follow" | "mentioned_only"
}
```
- **Character Limit**: 500
- **Video**: MP4/MOV, H.264/HEVC, max 1 GB, 1s-5min, 9:16 recommended
- **Images**: JPEG/PNG, max 8 MB
- **Carousel**: 2-20 items
- Supports threads via `additionalPosts`

### Bluesky
```json
{
  "targetType": "bluesky"
}
```
- **Character Limit**: 300
- **Images**: Up to 4, 1080x1080 (square), 1200x627 (landscape), or 627x1200 (portrait)
- Supports threads via `additionalPosts`

---

## 6. Video Upload Requirements

### General Blotato Limits
- **Duration**: 4 seconds minimum, 5 minutes maximum (Blotato-generated)
- **File Size**: Maximum 2 GB (upload endpoint: 200 MB)
- **Default Aspect Ratio**: 9:16 for TikTok/YouTube Shorts/Instagram Reels

### Platform-Specific Video Specs

| Platform | Format | Max Size | Duration | Aspect Ratio | Resolution |
|----------|--------|----------|----------|--------------|------------|
| Twitter | MP4 | 512 MB | 0.5-140s | 16:9, 1:1, 9:16 | 720-1280px |
| LinkedIn | MP4 | 500 MB | 3s-30min | 16:9, 1:1, 9:16 | 256-4096px |
| Facebook | MP4/MOV | 4 GB | 3s-240min | 16:9, 1:1, 9:16 | 256-4096px |
| Instagram | MP4/MOV | 100 MB | 3s-15min | 4:5 to 1.91:1 | 320-1440px |
| TikTok | MP4/WebM/MOV | 4 GB | Up to 10min | 9:16 | 360-4096px |
| YouTube | MP4 | 256 GB | Up to 12hrs | 16:9 | Up to 4K |
| Pinterest | MP4/MOV | 2 GB | 4s-5min | Various | Min 240p |
| Threads | MP4/MOV | 1 GB | 1s-5min | 9:16 rec | Max 1920px |

### Recommended Video Settings
- **Format**: MP4
- **Codec**: H.264 (video), AAC-LC (audio)
- **Frame Rate**: 30-60 FPS
- **For Vertical Content**: 1080x1920 (9:16)
- **For Square Content**: 1080x1080 (1:1)

---

## 7. Rate Limits

| Operation | Limit |
|-----------|-------|
| Publish Post | 30 requests/minute |
| Upload Media | 10 requests/minute |
| TikTok Posts | Up to 900/month (Starter plan) |
| Twitter | 100 requests/24 hours (platform limit) |

---

## 8. n8n Integration

### Installation

**Cloud n8n:**
1. Navigate to Admin Panel > Settings
2. Enable "Verified Community Nodes"
3. Open any workflow
4. Click "+" icon, search "Blotato"
5. Click Install

**Self-Hosted n8n:**
1. Set environment variable: `N8N_ENABLE_COMMUNITY_NODES=true`
2. Restart n8n instance
3. Settings > Community Nodes > Install Blotato

### Available Nodes

1. **Media Upload Node**
   - Source: URL or binary data
   - Formats: JPG, PNG, GIF, MP4, MOV

2. **Post Publish Node**
   - Platform selection
   - Caption/hashtag support
   - Scheduling
   - Platform-specific options

3. **Social Accounts Node**
   - Retrieve connected account IDs
   - Filter by platform

### Credentials Setup
1. In n8n: Credentials > New > Blotato API
2. Enter your Blotato API key
3. Optionally add social account IDs for quick reference

### Workflow Pattern
```
Media Upload Node → Social Accounts Node → Post Publish Node (loop per platform)
```

### Official Workflow Templates
- [Multi-platform video publishing from Google Sheets](https://n8n.io/workflows/4227)
- [Auto-publish social videos to 9 platforms](https://n8n.io/workflows/3522)
- [Generate & auto-post AI videos with Veo3](https://n8n.io/workflows/5035)
- [GPT-4 + Veo 3.1 video creation workflow](https://n8n.io/workflows/10358)

### Technical Requirements
- n8n version: 1.80.0+
- Node.js: 18.10+

---

## 9. Pricing Tiers

| Plan | Price | AI Credits | Social Accounts | API Access |
|------|-------|------------|-----------------|------------|
| Free Trial | $0/7 days | 60 | Unlimited | No |
| Starter | $29/month | 1,250 | 20 | Yes |
| Creator | $97/month | 5,000 | 40 | Yes |
| Agency | $499/month | 28,000 | Unlimited | Yes |

### Plan Features

**Starter ($29/month)**
- 1,250 AI credits (~178 thirty-second videos)
- 20 social accounts
- Unlimited AI writing
- n8n & Make integration
- Up to 900 TikTok posts/month
- Weekly office hours

**Creator ($97/month)**
- 5,000 AI credits
- 40 social accounts
- Everything in Starter
- Faster video processing
- Unlimited viral post database
- Automation troubleshooting support

**Agency ($499/month)**
- 28,000 AI credits
- Unlimited social accounts
- Everything in Creator
- Dedicated video processing
- 1:1 monthly strategy calls
- Dedicated support channel

### Additional Options
- Credit Pack: $6.99 for 1,000 credits
- Credits rollover monthly (unless refunded)
- No long-term commitment
- 30-day money-back guarantee

---

## 10. Gotchas and Limitations

### General Limitations
- **API not on free trial**: Must have paid subscription
- **No video clipping**: API is for posting, not editing
- **Processing queue**: Successful API response doesn't mean instant posting
- **Failed posts dashboard**: Check `https://my.blotato.com/failed`

### Common Errors

| Issue | Solution |
|-------|----------|
| API key failures | Check for whitespace, verify key is populated |
| Invalid JSON | Validate at jsonlint.com before sending |
| Aspect ratio rejection | Match platform specs exactly |
| Carousel failures | Validate template parameters, check AI credits |

### Platform-Specific Gotchas

**TikTok**
- All boolean flags (disabledComments, etc.) are REQUIRED
- Upload media first, use Blotato URLs (not external)
- Title defaults to first 90 chars of text if not provided

**Instagram**
- Collaborator handles should NOT include @ symbol
- Cover image max 8 MB
- New accounts must be "warmed up" first

**Threads**
- Requires linked Instagram account
- New accounts need warming up with manual posts first
- May fail on fresh/bot-like accounts

**Facebook**
- Use official n8n/Make nodes instead of manual ID copying
- Page ID is REQUIRED

**YouTube**
- `containsSyntheticMedia` flag recommended for AI content
- Verified accounts get longer upload limits

### Best Practices
1. **Test with short scripts first** for avatar videos
2. **Warm up new accounts** before connecting to Blotato
3. **Check credits in Settings** before creating AI videos
4. **Use API dashboard** to debug failed requests: `my.blotato.com/api-dashboard`
5. **Keep topic lists externally** to avoid AI repeating content

---

## 11. Example API Calls

### Basic Video Post to Single Platform (TikTok)

```bash
curl -X POST "https://backend.blotato.com/v2/posts" \
  -H "Content-Type: application/json" \
  -H "blotato-api-key: YOUR_API_KEY" \
  -d '{
    "post": {
      "accountId": "your-tiktok-account-id",
      "content": {
        "text": "Check out this amazing ethereal flame effect! #digitalart #vfx #tutorial",
        "mediaUrls": ["https://your-storage.com/video.mp4"],
        "platform": "tiktok"
      },
      "target": {
        "targetType": "tiktok",
        "privacyLevel": "PUBLIC_TO_EVERYONE",
        "disabledComments": false,
        "disabledDuet": false,
        "disabledStitch": false,
        "isBrandedContent": false,
        "isYourBrand": false,
        "isAiGenerated": true
      }
    }
  }'
```

### Scheduled Post to YouTube

```bash
curl -X POST "https://backend.blotato.com/v2/posts" \
  -H "Content-Type: application/json" \
  -H "blotato-api-key: YOUR_API_KEY" \
  -d '{
    "post": {
      "accountId": "your-youtube-account-id",
      "content": {
        "text": "Full tutorial on creating ethereal flame effects in Blender.",
        "mediaUrls": ["https://your-storage.com/video.mp4"],
        "platform": "youtube"
      },
      "target": {
        "targetType": "youtube",
        "title": "Ethereal Flame Effect Tutorial - Blender VFX",
        "privacyStatus": "public",
        "shouldNotifySubscribers": true,
        "isMadeForKids": false,
        "containsSyntheticMedia": true
      }
    },
    "scheduledTime": "2026-02-01T15:00:00Z"
  }'
```

### Instagram Reel with Cover Image

```bash
curl -X POST "https://backend.blotato.com/v2/posts" \
  -H "Content-Type: application/json" \
  -H "blotato-api-key: YOUR_API_KEY" \
  -d '{
    "post": {
      "accountId": "your-instagram-account-id",
      "content": {
        "text": "Creating magic with particles and flames. Full process in bio!\n\n#blender #vfx #3dart #tutorial #ethereal #flames #digitalart",
        "mediaUrls": ["https://your-storage.com/reel.mp4"],
        "platform": "instagram"
      },
      "target": {
        "targetType": "instagram",
        "mediaType": "reel",
        "altText": "Ethereal flame effect created in Blender showing particle system animation",
        "coverImageUrl": "https://your-storage.com/cover.jpg"
      }
    }
  }'
```

### Twitter Thread

```bash
curl -X POST "https://backend.blotato.com/v2/posts" \
  -H "Content-Type: application/json" \
  -H "blotato-api-key: YOUR_API_KEY" \
  -d '{
    "post": {
      "accountId": "your-twitter-account-id",
      "content": {
        "text": "Just finished this ethereal flame effect in Blender. Here is a thread on how I made it. (1/3)",
        "mediaUrls": ["https://your-storage.com/preview.mp4"],
        "platform": "twitter",
        "additionalPosts": [
          {
            "text": "Step 1: Create a particle system with volumetric emission. The key is using a gradient texture mapped to particle age. (2/3)",
            "mediaUrls": ["https://your-storage.com/step1.jpg"]
          },
          {
            "text": "Step 2: Add turbulence and adjust the flame colors from yellow core to red edges. Full tutorial dropping tomorrow! (3/3)",
            "mediaUrls": ["https://your-storage.com/step2.jpg"]
          }
        ]
      },
      "target": {
        "targetType": "twitter"
      }
    }
  }'
```

### Upload Media First (Optional)

```bash
# Step 1: Upload media
curl -X POST "https://backend.blotato.com/v2/media" \
  -H "Content-Type: application/json" \
  -H "blotato-api-key: YOUR_API_KEY" \
  -d '{
    "url": "https://your-storage.com/video.mp4"
  }'

# Response: {"url": "https://database.blotato.com/path-to-media"}

# Step 2: Use returned URL in post
```

### Multi-Platform Post (n8n Workflow Pattern)

In n8n, you would create separate Post Publish nodes for each platform, all fed from the same media source. The workflow structure:

```
[Trigger] → [Upload Media] → [Get Account IDs] → [Split by Platform] →
  → [Post to TikTok]
  → [Post to Instagram]
  → [Post to YouTube]
  → [Post to Twitter]
  → [Post to LinkedIn]
  → [Post to Threads]
```

---

## Quick Reference: Account IDs

To get your account IDs for API calls:
1. Go to Blotato Dashboard
2. Navigate to Social Accounts
3. Each connected account shows its ID
4. Or use the Social Accounts API/n8n node to retrieve programmatically

---

## Resources

- [API Quickstart](https://help.blotato.com/api/start)
- [API Reference](https://help.blotato.com/api/api-reference)
- [Publish Post Endpoint](https://help.blotato.com/api/api-reference/publish-post)
- [Media Requirements](https://help.blotato.com/api/media)
- [Platform Requirements](https://help.blotato.com/tips-and-tricks/social-platform-requirements)
- [n8n Node Documentation](https://help.blotato.com/api/n8n/n8n-blotato-node)
- [n8n Integration Page](https://n8n.io/integrations/blotato/)
- [Failed Posts Dashboard](https://my.blotato.com/failed)
- [API Dashboard](https://my.blotato.com/api-dashboard)
- [Pricing](https://www.blotato.com/pricing)
