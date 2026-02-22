# Claude Code Migration Brief: Jarvis -> Agent Zero Backbone (True Integration)

**Date:** 2026-02-22
**Audience:** Claude Code (implementation agent)
**Purpose:** Execute the migration of Jarvis into an Agent Zero-powered architecture using a phased plan with explicit file paths and clear acceptance gates.

---

## Mission (Read This First)

Migrate Jarvis from a Notion-centric + prior Atlas-era architecture into a **Jarvis UX + Agent Zero orchestration + local canonical datastore** architecture.

This is **not** a "replace Jarvis with Agent Zero" rewrite.

**Target architecture:**
- **Jarvis** = UX/product layer (voice/orb/panel/dashboard/tutorials/control surfaces)
- **Agent Zero** = always-on orchestration/automation brain (scheduler, multi-agent delegation, summaries, tool execution)
- **Local datastore (SQLite first)** = canonical source of truth for Jarvis data
- **Notion** = temporary import/sync bridge during migration (then optional/legacy)

---

## Authoritative Source Files (Read in This Order, Full Paths)

### Primary Jarvis migration handoff (authoritative summary)
1. `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\docs\plans\2026-02-22-agent-zero-feasibility-and-migration-handoff.md`

### Jarvis source planning docs (authoritative product + data scope)
2. `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\docs\plans\2026-02-04-notion-panel-tutorial-system-design.md`
3. `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\docs\plans\2026-02-04-notion-database-discovery.md`

### Agent Zero Hub references (runtime + current Jarvis placeholder project)
4. `C:\Users\jonch\Projects\agent-zero-hub\docker-compose.yml`
5. `C:\Users\jonch\Projects\agent-zero-hub\usr\projects\jarvis\.a0proj\project.json`
6. `C:\Users\jonch\Projects\agent-zero-hub\usr\projects\jarvis\.a0proj\knowledge\main\AGENT-ZERO-FEASIBILITY-HANDOFF-2026-02-22.md`
7. `C:\Users\jonch\Projects\agent-zero-hub\AGENT-ZERO-DEEP-KNOWLEDGE.md`

### Jarvis Agent Zero / Telegram planning context (reuse concepts, do not re-invent)
8. `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\.planning\PROJECT.md`

---

## Critical Constraints (Do Not Violate)

1. **Do not replace Jarvis UX with Agent Zero UI**
   - Jarvis remains the product-facing interface.

2. **Do not use Agent Zero memory as the canonical database**
   - Use a real local datastore (`SQLite` first).

3. **Do not big-bang migrate all Notion databases**
   - Start with the 5 already-integrated domains (Tasks, Bills/Budgets, Projects, Goals, Habits).

4. **Do not silently expand scope into "full Notion replacement" before local parity on top 5**
   - Stage the migration.

5. **Do not assume Agent Zero Docker is zero-risk**
   - Review host mounts carefully before granting write access.

6. **Do not break existing Jarvis Telegram flows**
   - Reuse them as control/notification interfaces where possible.

---

## Path Mapping (Use Explicit Paths)

### Host paths (Windows)
- Jarvis repo root:
  - `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis`
- Ethereal Flame Studio repo root:
  - `C:\Users\jonch\Projects\ethereal-flame-studio`
- Agent Zero Hub repo root:
  - `C:\Users\jonch\Projects\agent-zero-hub`

### Agent Zero container paths (from current Docker compose)
- Ethereal Flame Studio mounted read-only in Agent Zero:
  - Host: `C:\Users\jonch\Projects\ethereal-flame-studio`
  - Container: `/home/user/projects/ethereal-flame`
- Jarvis inside container (read-only under current compose):
  - Container path: `/home/user/projects/ethereal-flame/jarvis`
- Agent Zero `usr` volume:
  - Host: `C:\Users\jonch\Projects\agent-zero-hub\usr`
  - Container: `/a0/usr`

### Important implication

Current `Agent Zero` compose appears to mount `C:\Users\jonch\Projects\ethereal-flame-studio` as **read-only**.

If Agent Zero itself is expected to write to Jarvis files during integration/testing, update:
- `C:\Users\jonch\Projects\agent-zero-hub\docker-compose.yml`

Prefer a **safe writable migration mount** (specific folder) over broad writable repo access.

---

## Migration Strategy (Phased, Exact Execution Order)

## Phase M0: Lock Architecture + Create Migration Workspace (No behavior changes yet)

### Goal
Freeze the architecture decision and prepare a structured migration workspace for implementation.

### Actions
1. Read all authoritative source files listed above (in order).
2. Confirm the migration target architecture in a short implementation note.
3. Create a migration folder in Jarvis for artifacts and progress tracking (if missing).
4. Inventory current Jarvis code/layout and identify the actual runtime components that will connect to Agent Zero.
5. Document the existing Telegram control path in Jarvis with exact code/module references.

### Deliverables
- `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\docs\migration\README.md` (create if missing)
- `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\docs\migration\M0-ARCHITECTURE-LOCK.md`
- `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\docs\migration\M0-TELEGRAM-INVENTORY.md`
- `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\docs\migration\M0-CODEBASE-INVENTORY.md`

### Acceptance gate
- Architecture statement matches the handoff doc exactly (Jarvis UX + Agent Zero orchestration + local DB + Notion bridge).
- Telegram path is documented with code references, not just prose.

---

## Phase M1: Canonical Local Data Model (Top 5 Domains Only)

### Goal
Define and implement the **local source of truth** for the 5 already-integrated Jarvis domains:
- Tasks
- Bills/Budgets
- Projects
- Goals
- Habits

### Actions
1. Use the Notion discovery doc and Jarvis planning docs to define the minimum viable schema for local parity.
2. Create a `SQLite` schema and migration scripts.
3. Define stable IDs and mapping fields for Notion-origin records.
4. Create import scaffolding (dry-run first) from Notion to SQLite.
5. Build validation reports (counts, sample records, field completeness).

### Deliverables
- `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\docs\migration\M1-DATA-MODEL.md`
- `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\docs\migration\M1-NOTION-FIELD-MAPPING.md`
- `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\docs\migration\M1-IMPORT-VALIDATION.md`
- `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\data\jarvis.sqlite` (or app-specific path if the codebase dictates another location)
- `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\db\schema\` (create)
- `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\tools\migration\notion\` (create)

### Implementation requirements
- Import script supports `--dry-run`.
- Import script logs unmapped fields.
- Imported rows include `source_system`, `source_id`, `imported_at`.
- Writes are idempotent (re-running import does not duplicate records).

### Acceptance gate
- All 5 top-level domains import into SQLite in dry-run + real mode.
- Validation report documents record counts and mismatch handling.

---

## Phase M2: Deterministic Jarvis Domain Services (Local-first APIs / CLI)

### Goal
Expose deterministic, testable local operations for the top 5 domains so Agent Zero calls **tools/services**, not ad hoc file edits.

### Actions
1. Build local service layer (or CLI adapters) for:
   - query/add/update tasks
   - projects status updates
   - habits logging + streak queries
   - goals progress updates
   - budgets/bills summaries
2. Add input validation and explicit error responses.
3. Add tests for each operation.
4. Ensure all operations can run without Notion.

### Deliverables
- `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\docs\migration\M2-SERVICE-CONTRACTS.md`
- `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\docs\migration\M2-TEST-PLAN.md`
- Service/CLI code under existing Jarvis app structure (use current project conventions)

### Implementation requirements
- Deterministic return shapes (JSON response contracts)
- No LLM-dependent business logic in this layer
- Clear distinction between read and write actions
- Safe defaults for writes (validate before commit)

### Acceptance gate
- Top 5 domain actions run against local DB only (no Notion dependency).
- Tests cover success + failure paths.

---

## Phase M3: Agent Zero Integration (Jarvis as UX, A0 as Orchestrator)

### Goal
Wire Jarvis to Agent Zero for orchestration, scheduling, summaries, and delegated workflows while preserving Jarvis as the front-end/control layer.

### Actions
1. Update Agent Zero Hub `jarvis` project from placeholder to active project configuration.
   - Review and modify:
   - `C:\Users\jonch\Projects\agent-zero-hub\usr\projects\jarvis\.a0proj\project.json`
2. Add project-specific instructions/skills in Agent Zero for Jarvis local-domain operations.
3. Configure secrets and runtime paths needed for Jarvis integration.
4. Add or document the bridge between Jarvis and Agent Zero:
   - A2A
   - webhook/API
   - or another explicit protocol
5. Reuse existing Jarvis Telegram control path for notifications and remote commands.
6. Add scheduled tasks in Agent Zero for Jarvis briefings/check-ins (and later domain workflows).

### Deliverables
- `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\docs\migration\M3-A0-INTEGRATION.md`
- `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\docs\migration\M3-TELEGRAM-BRIDGE-REUSE.md`
- Agent Zero project files under:
  - `C:\Users\jonch\Projects\agent-zero-hub\usr\projects\jarvis\.a0proj\...`
- Scheduler entries in:
  - `C:\Users\jonch\Projects\agent-zero-hub\usr\scheduler\tasks.json` (if part of this phase)

### Implementation requirements
- Agent Zero calls deterministic Jarvis services/CLIs for data operations.
- Agent Zero memory is used for summaries/preferences/context, not canonical records.
- Notification/reporting path is documented end-to-end.
- If Docker mounts are changed, document exact risk tradeoff and scope.

### Acceptance gate
- Jarvis can trigger at least 3 real workflows through Agent Zero using local DB-backed services.
- Telegram-driven interaction path remains functional (no regression).
- Agent Zero scheduled Jarvis briefing works against local data.

---

## Phase M4: Notion Bridge + Progressive Cutover (Top 5 First)

### Goal
Run Jarvis in a hybrid mode where local DB is canonical and Notion is optional/migrated gradually.

### Actions
1. Implement a Notion bridge layer (import + optional sync) for top 5 domains.
2. Make local DB the read source for Jarvis features migrated in M1/M2.
3. Gate any Notion writes behind explicit sync routines (if needed).
4. Add migration status visibility:
   - domain parity status
   - sync status
   - last import time
5. Prove feature parity on top 5 domains before moving to broader template coverage.

### Deliverables
- `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\docs\migration\M4-HYBRID-MODE.md`
- `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\docs\migration\M4-PARITY-CHECKLIST.md`
- `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\docs\migration\M4-SYNC-OPERATIONS.md`

### Implementation requirements
- Local reads first.
- Sync operations are explicit, logged, and idempotent.
- No silent two-way sync logic without conflict handling.

### Acceptance gate
- Jarvis top-5 workflows operate from local canonical data.
- Notion is no longer required for day-to-day use of those workflows.

---

## Phase M5: Expand Beyond Top 5 (Only After Proven Local Parity)

### Goal
Incrementally migrate the remaining high-value Notion template domains based on actual usage, not template completeness.

### Actions
1. Prioritize domains by real usage frequency (not by template count).
2. Extend schema + services one domain cluster at a time.
3. Reuse the same M1-M4 pattern per cluster.
4. Keep a migration scorecard for each domain.

### Deliverables
- `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\docs\migration\M5-DOMAIN-PRIORITIZATION.md`
- `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\docs\migration\M5-SCORECARD.md`

### Acceptance gate
- Each newly migrated domain has:
  - schema
  - import path
  - local service contract
  - tests
  - parity checklist

---

## Agent Zero Optimization Rules (Best Practical Setup)

### What Agent Zero should do
- orchestrate workflows
- run scheduled jobs
- delegate to sub-agents for specialized tasks
- summarize and prioritize
- interact via Jarvis + Telegram
- trigger deterministic domain operations

### What Agent Zero should NOT be used for
- canonical relational data storage
- unreviewed policy/risk changes
- ad hoc edits to production data files without service contracts
- replacing the Jarvis product UX

### Practical optimization (recommended)
- Keep **local DB + service layer** deterministic and narrow.
- Use Agent Zero for **high-leverage cognition/orchestration**, not low-level persistence.
- Reuse Jarvis Telegram path for remote control and notifications.
- Make every A0-to-Jarvis action observable and logged.

---

## Explicit Work Protocol for Claude Code (Path Reliability + Execution Discipline)

1. **Use full Windows paths** for all file reads/writes in planning and migration docs.
2. **Do not assume relative path resolution** in cross-repo work.
3. **When referring to container paths**, also include the host path equivalent.
4. **Create docs before code for each phase** (M0-M5 deliverables first).
5. **Do not skip acceptance gates**; record pass/fail status in the phase doc.
6. **Document deviations immediately** (if the codebase differs from plan assumptions).
7. **Prefer incremental commits per phase or sub-phase** with clear messages.
8. **Preserve unrelated user changes**; do not revert anything not required for this migration.

---

## Immediate First Task (Start Here)

Execute **Phase M0** only.

Specifically:
1. Read the 8 authoritative files listed above.
2. Create `C:\Users\jonch\Projects\ethereal-flame-studio\jarvis\docs\migration\` if missing.
3. Produce:
   - `M0-ARCHITECTURE-LOCK.md`
   - `M0-TELEGRAM-INVENTORY.md`
   - `M0-CODEBASE-INVENTORY.md`
4. Stop and present findings + proposed M1 schema scope before making data-model code changes.

---

## Success Definition (End State)

Jarvis remains the user-facing product, Agent Zero becomes the always-on orchestration backbone, local structured data replaces Notion as the canonical source of truth (starting with the top 5 domains), and Telegram/Jarvis continue to serve as the practical control surface.

