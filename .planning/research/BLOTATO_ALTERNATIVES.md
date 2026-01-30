# Blotato Alternatives Research

> **Status**: TO BE RESEARCHED
> **Priority**: Phase 6 consideration
> **Cost motivation**: Blotato is $29-97/month - can we replicate with custom code?

---

## Background

Blotato was researched as an option for multi-platform social media posting (see `BLOTATO_API_GUIDE.md`), but this was **never actually discussed with the user**. The research was done proactively.

The user's position: **Blotato is the easiest option, but we should explore doing everything it does without the monthly cost using clever code.**

---

## What Blotato Does

1. **Single API for 9+ platforms**: Twitter/X, Instagram, TikTok, YouTube, LinkedIn, Facebook, Pinterest, Threads, Bluesky
2. **Handles platform-specific formatting**: Different caption limits, aspect ratios, required fields
3. **Manages OAuth tokens**: Refreshes tokens, handles auth flows
4. **Rate limit management**: Queues posts to respect platform limits
5. **n8n integration**: Official community node

---

## DIY Alternative Research Needed

### Per-Platform Direct API Feasibility

| Platform | API Access | Difficulty | Notes |
|----------|------------|------------|-------|
| YouTube | Easy | Low | Already have OAuth setup via n8n |
| TikTok | Hard | High | Strict audit process, limited access |
| Instagram | Medium | Medium | Business account required, Graph API |
| Twitter/X | Medium | Medium | v2 API, rate limits |
| LinkedIn | Medium | Medium | Page posting, token management |
| Facebook | Medium | Medium | Page API, similar to Instagram |
| Threads | ? | ? | Relatively new API |
| Pinterest | ? | ? | Needs research |
| Bluesky | Easy | Low | Open protocol (AT Protocol) |

### Key Challenges to Solve

1. **OAuth Token Management**
   - Each platform has different token refresh cycles
   - Need secure storage and auto-refresh
   - Some require re-auth periodically

2. **Platform-Specific Formatting**
   - Caption length limits vary (280 to 63,000 chars)
   - Hashtag strategies differ
   - Video format requirements differ
   - Some need cover images, some auto-generate

3. **Rate Limiting**
   - Each platform has different limits
   - Need queuing/scheduling to avoid hitting limits
   - Some platforms count API calls, others count posts

4. **Video Processing**
   - Some platforms accept direct URL upload
   - Others require chunked upload
   - File size limits vary (100MB to 256GB)

### Potential Architecture

```
[Render Complete]
       |
       v
[Post Scheduler Service]
       |
       +---> [YouTube Direct] (already done via n8n)
       |
       +---> [Platform Adapter Layer]
                |
                +---> Twitter Client
                +---> Instagram Client
                +---> TikTok Client (if feasible)
                +---> LinkedIn Client
                +---> Bluesky Client
```

### Cost/Benefit Analysis Needed

**Blotato Cost**: $29-97/month = $348-1164/year

**DIY Cost**:
- Development time: ? hours
- Maintenance: ongoing
- Platform API changes: need to keep up
- Some platforms may require business verification

**Questions to Answer**:
1. How many platforms do we actually need?
2. Is YouTube + 1-2 others sufficient for MVP?
3. Which platforms have the most accessible APIs?
4. What's the minimum viable multi-platform setup?

---

## Recommended Next Steps

1. **Start with YouTube only** (already working via n8n)
2. **Add Bluesky** - open protocol, easy to implement
3. **Research TikTok API access** - is it even feasible for small creators?
4. **Evaluate Instagram Graph API** - business account requirements
5. **Decide on Twitter/X** - API pricing changes made it expensive

---

## Resources to Research

- TikTok for Developers: https://developers.tiktok.com/
- Instagram Graph API: https://developers.facebook.com/docs/instagram-api/
- Twitter API v2: https://developer.twitter.com/en/docs/twitter-api
- Bluesky AT Protocol: https://atproto.com/
- LinkedIn Marketing API: https://docs.microsoft.com/en-us/linkedin/marketing/

---

*Created: 2026-01-30*
*Status: Awaiting research and user input on platform priorities*
