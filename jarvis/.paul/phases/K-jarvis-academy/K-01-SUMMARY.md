# K-01 Summary: Core Academy Engine

**Status:** COMPLETE
**Date:** 2026-03-01
**Commit:** (pending push)

## What Was Built

Gave Jarvis 3 new Academy tools that read Jonathan's project codebases via GitHub API, plus teaching context in the system prompt. Jarvis can now explain how any part of Visopscreen or Creator Workflow works by reading the actual source code first.

## Files Created (5)

| File | Purpose |
|------|---------|
| `src/lib/jarvis/academy/githubReader.ts` | GitHub REST API client with 5-min cache, 300-line file read limit |
| `src/lib/jarvis/academy/projects.ts` | Project registry with teaching context for Visopscreen + Creator Workflow |
| `src/lib/jarvis/academy/academyTools.ts` | 3 tool definitions: explore, read, search |
| `src/lib/jarvis/academy/toolExecutor.ts` | Routes tool calls to GitHub reader, formats results for Claude |
| `src/lib/jarvis/academy/index.ts` | Barrel exports |

## Files Modified (4)

| File | Change |
|------|--------|
| `src/lib/jarvis/intelligence/tools.ts` | Import + spread academyTools into getAllTools() |
| `src/lib/jarvis/intelligence/chatProcessor.ts` | Import + 5-way routing (academy before Notion catch-all) |
| `src/lib/jarvis/intelligence/systemPrompt.ts` | academyConfigured field + ACADEMY section + capability line |
| `src/lib/jarvis/telegram/context.ts` | Wire isAcademyConfigured() into context builder |

## Also Updated

- `.env.example` — added GITHUB_TOKEN + GITHUB_OWNER section

## Acceptance Criteria

| AC | Status | Notes |
|----|--------|-------|
| AC-1 | PASS | academy_explore_project returns project overview + directory listing |
| AC-2 | PASS | academy_read_files returns code with line numbers, 300-line truncation |
| AC-3 | PASS | academy_search_code returns matching file paths via GitHub Code Search |
| AC-4 | PASS | Graceful degradation without GITHUB_TOKEN (helpful setup message) |
| AC-5 | PASS | System prompt includes ACADEMY section when academyConfigured=true |
| AC-6 | PASS | `npm run build` exits 0, no type errors |
| AC-7 | PASS | Academy tools route via academyToolNames Set, not Notion catch-all |

## Design Decisions Confirmed

- **Zero new npm deps** — GitHub API via native `fetch`
- **In-memory cache** — 5-min TTL, survives within serverless invocation
- **basePath support** — Creator Workflow shares repo with main project
- **No UI changes** — brain-only; chat is the teaching interface
- **No progress DB** — existing memory tools handle recall

## Human Blockers (Before Production)

1. Create GitHub PAT (fine-grained, read-only, scoped to Visopscreen + ethereal-flame-studio)
2. Add `GITHUB_TOKEN` to Vercel env vars
3. Add `GITHUB_OWNER=jonchyatt` to Vercel env vars

## What's Next

| Plan | Name | Scope |
|------|------|-------|
| K-02 | Deep Visopscreen Curriculum | Expanded manifest, topic-to-file mapping, teaching notes |
| K-03 | Creator Workflow + Multi-Domain | Creator expansion, template for adding new projects |
| K-04 | Academy UI + Intelligence | Progress page, DB-backed tracking, teaching effectiveness |
