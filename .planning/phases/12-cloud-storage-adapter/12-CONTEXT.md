# Phase 12: Cloud Storage Adapter - Context

**Gathered:** 2026-02-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Unified storage interface that stores audio assets and rendered videos in Cloudflare R2 (production) or local filesystem (development) via the same code path. Assets are accessible via time-limited signed URLs. Existing local development workflow continues unchanged.

</domain>

<decisions>
## Implementation Decisions

### Upload flow
- Direct browser-to-R2 upload via presigned URLs (not API-proxied)
- Maximum file size: 500 MB
- Upload progress bar shown to the user during upload
- API route generates presigned URL, browser sends file directly to R2

### Download link behavior
- Signed URLs valid for 7 days — all file types (audio assets, rendered videos, previews)
- Same duration policy for everything — no per-type differentiation
- URLs are primarily for internal pipeline consumption (app streaming, worker-to-Modal, automation)
- Manual download is an escape hatch, not the primary flow
- No explicit "share" UI — pipeline handles distribution (R2 -> Google Drive -> YouTube)

### R2 bucket layout
- Single bucket for all files (audio assets + rendered videos)
- Default R2 endpoint (no custom domain)

### Claude's Discretion
- Bucket name convention
- Key structure within the bucket (optimize for the operational environment)
- URL caching strategy (fresh vs cached signed URLs)
- CORS configuration details
- Error handling for failed uploads/downloads

</decisions>

<specifics>
## Specific Ideas

- User reminded that rendered videos flow through an automated pipeline (R2 -> Google Drive -> YouTube channel), not manual downloads
- User values understanding trade-offs before making decisions — explain the "why" behind limits
- The 500 MB limit was chosen because the downside is negligible (R2 storage is cheap, free egress) and it future-proofs for long uncompressed WAV files

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-cloud-storage-adapter*
*Context gathered: 2026-02-20*
