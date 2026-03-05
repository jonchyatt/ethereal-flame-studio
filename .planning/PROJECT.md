# Ethereal Flame Studio

## What This Is

An audio-reactive video generation engine that transforms audio files (meditation, music) into high-fidelity 360° VR and flat social media videos. Users upload audio, select a visual template, and the system renders publication-ready videos with auto-generated descriptions, then hands off to n8n for automated social media posting. Now moving to a full cloud production stack so the entire workflow runs on the web.

## Core Value

**Phone to published video without touching a computer.** A creator should be able to upload audio from their phone, pick a preset, and have a finished video posted to YouTube/social media — fully automated.

## Current Milestone: v3.0 Floating Widget Design System

**Goal:** Replace the deeply nested AdvancedEditor with Photoshop-style free-floating widget panels for one-click access to any control, plus template actions and render target splitting.

**Target features:**
- Free-floating draggable/resizable widget panels on the Design screen
- 18 parameter groups consolidated into 9 focused widget components
- Widget toolbar with open/close toggles for all widgets
- Z-order management (click-to-front) and minimize-to-title-bar
- Widget positions/sizes persist across page refreshes (localStorage)
- Workspace layouts: save/load/delete named widget arrangements
- Template action buttons ("Use in Render", "Use in Experience")
- Render target split: processing target vs save destination
- Mobile fallback to scrollable sheets instead of floating widgets
- Lazy-loaded widget content (closed widgets = zero bundle cost)

**Architecture (approved):**
- react-rnd for drag + resize (15KB gzipped, touch support, bounds)
- Z-index range z-[75]-z-[85] (above panels z-50, below modals z-100)
- Workspace layouts in localStorage (independent from visual templates)
- Widget content reads directly from useVisualStore with individual selectors

## Requirements

### Validated

- ✓ Visual engine with Flame + Mist modes — v1.0/Phase 1
- ✓ Dual-layer particle system with lifetime curves — v1.0/Phase 1
- ✓ Star Nest skybox with 20+ presets — v1.0/Phase 1
- ✓ Audio FFT analysis with frequency band separation — v1.0/Phase 1
- ✓ Template system with 6 presets + save/load — v1.0/Phase 2
- ✓ Rendering pipeline (1080p, 4K, 360 mono/stereo) — v1.0/Phase 3
- ✓ Headless CLI rendering with Puppeteer + FFmpeg — v1.0/Phase 3
- ✓ VR spatial metadata injection — v1.0/Phase 3
- ✓ Batch queue with BullMQ + Redis + SQLite — v1.0/Phase 4
- ✓ Whisper transcription microservice — v1.0/Phase 4
- ✓ Google Drive sync + Sheets export + ntfy — v1.0/Phase 4
- ✓ Cloudflare Tunnel remote access — v1.0/Phase 5
- ✓ n8n YouTube auto-upload workflow — v1.0/Phase 5
- ✓ Audio prep pipeline (ingest, edit, preview, save) — v1.0/Audio Prep MVP

### Active

- [ ] Free-floating draggable/resizable widget panels (react-rnd)
- [ ] 9 standalone widget components extracted from AdvancedEditor
- [ ] Widget toolbar with open/close toggles
- [ ] Z-order management, minimize, persist positions
- [ ] Workspace layouts (save/load/delete named arrangements)
- [ ] Template action buttons ("Use in Render", "Use in Experience")
- [ ] Render target split (processing target + save destination)
- [ ] Mobile fallback to scrollable sheets

### Out of Scope

- Real-time live streaming — batch rendering only
- Mobile native app — web-based, mobile-friendly
- Multi-user accounts — single creator workflow initially
- Cloud-synced workspace layouts — localStorage is sufficient for single user
- Collaborative editing — single creator workflow
- Plugin system for custom widgets — not needed at current scale

## Context

**v1.0 Complete:** Phases 1-5 shipped the full local pipeline (phone → render → YouTube).

**v2.0 Complete:** Phases 12-18 shipped the full cloud production stack (Vercel + Render + Turso + R2 + Modal).

**Current pain point:** The AdvancedEditor (2,293 lines) buries controls 5-7 clicks deep in nested accordion panels. Users want Photoshop-style free-floating panels with one-click access to any control.

**Critical files to decompose:**
- `src/components/ui/AdvancedEditor.tsx` (2,293 lines → 9 widget components)
- `src/components/ui/ControlPanel.tsx` (407 lines → widget toolbar)
- `src/components/ui/TemplateCard.tsx` (112 lines → action buttons)
- `src/components/ui/CreateOverlay.tsx` (409 lines → render target)
- `src/components/ui/RenderDialog.tsx` (~1,700 lines → render target)

## Constraints

- **Tech Stack**: Next.js + Three.js + Zustand + Tailwind — consistent with existing code
- **react-rnd**: Only new dependency for drag/resize (15KB gzipped)
- **No UI libraries**: Hand-built Tailwind (no MUI, Radix, etc.)
- **Mobile support**: Widgets must fall back to scrollable sheets on mobile
- **Bundle size**: Closed widgets must not contribute to bundle (lazy loading)
- **Resolution**: Must support up to 8K for VR master output

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js + Three.js stack | Same as reference code, web-accessible, proven for 3D | ✓ Good |
| Two visual modes (Mist + Flame) | Different aesthetic needs for different content | ✓ Good |
| Vercel for web + Render for worker | Each platform's strength, no hosting migration | ✓ Good |
| Turso over Postgres | SQLite-compatible (zero migration), already set up, serverless | ✓ Good |
| R2 over Vercel Blob | Free egress, cheaper storage, S3-compatible | ✓ Good |
| Turso polling over Redis queue | Simpler, cheaper ($0 vs $10/mo), sufficient at launch volume | ✓ Good |
| Storage adapter pattern | Keep local dev working, swap to R2 in production | ✓ Good |
| react-rnd for widgets | 15KB gzipped, handles touch, bounds, edge cases | — Pending |
| z-[75]-z-[85] for widgets | Above panels z-50, below modals z-100 | — Pending |
| 18 groups → 9 widgets | Logical grouping reduces clutter while keeping discoverability | — Pending |
| localStorage for workspaces | Independent from visual templates, single-user sufficient | — Pending |

---
*Last updated: 2026-03-05 after v3.0 milestone start*
