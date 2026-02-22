# Jarvis Agent Zero Migration

## Overview

Migration from monolithic Notion-dependent architecture to Agent Zero orchestrated system with local SQLite as canonical data store.

## Phase Index

| Phase | Name | Size | Status |
|-------|------|------|--------|
| 0 | Fix Voice 404 | S | Done |
| 1 | Useful Web UI | M | Done |
| 2 | Telegram Polish | S | Done |
| M0 | Architecture Lock | S | Current |
| M1 | Local Data Model | L | Planned |
| M2 | Agent Zero Skills | M | Planned |
| M3 | Agent Zero Integration | L | Planned |
| M4 | Notion Sync Bridge | M | Planned |
| M5 | Expansion | L | Ongoing |

## Documents

- [M0-ARCHITECTURE-LOCK.md](./M0-ARCHITECTURE-LOCK.md) - Architecture decisions + rationale
- [M0-CODEBASE-INVENTORY.md](./M0-CODEBASE-INVENTORY.md) - Runtime components mapped
- [M0-TELEGRAM-INVENTORY.md](./M0-TELEGRAM-INVENTORY.md) - Telegram code path with file:line refs

## Key Principle

Local-first, Notion-second. Agent Zero orchestrates complex reasoning. Simple CRUD stays local and fast.
