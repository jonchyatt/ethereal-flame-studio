# Notion Database Discovery Report

**Date:** 2026-02-04
**Workspace:** Jarvis Complete Notion Life OS Bundle
**Integration:** Claude Code (`ntn_Dj54656632339...`)
**API Version:** SDK v5 / Notion API 2025-09-03

---

## Overview

This document catalogs every primary database discovered in the Jarvis Complete Notion Life OS Bundle workspace. Database IDs were obtained via the Notion API search endpoint using the `data_source` filter. All IDs listed in the tables below are **data_source_ids** (used for `dataSources.query()`), unless explicitly noted otherwise.

### Key Terminology (SDK v5)

| Term | Purpose | API Method |
|------|---------|------------|
| `database_id` | Container ID. Used as `parent` when creating pages. | `pages.create({ parent: { database_id } })` |
| `data_source_id` | Queryable table ID. Used to read/filter data. | `dataSources.query(data_source_id)` |

These IDs are **not interchangeable**. Use `databases.retrieve(database_id)` to obtain the corresponding `data_source_id` from the returned `data_sources` array.

---

## Already Integrated (5 databases)

These databases are fully working in the current Jarvis implementation.

| Database | database_id (creates) | data_source_id (queries) |
|----------|----------------------|--------------------------|
| Tasks | `26d02093-f0b3-8223-a854-015e521cbd7d` | `81802093-f0b3-82f0-908a-076bdd2c9a71` |
| Bills/Budgets | -- | `0ab02093-f0b3-8219-99da-8722861f036b` |
| Projects | -- | `45602093-f0b3-83e7-8364-07221234b542` |
| Goals | -- | `d7a02093-f0b3-839e-829b-87da54174572` |
| Habits | -- | `23402093-f0b3-82ca-ac92-878c6561ea22` |

> **Note:** Only the Tasks database has a confirmed `database_id`. For the others, the `database_id` must be discovered via `databases.retrieve()` before items can be created.

---

## Newly Discovered Databases

Organized into functional clusters that mirror the Life OS template structure.

### Cluster 1: Daily Action

Core productivity databases for tasks, projects, areas, and habits.

| Database | data_source_id | Status |
|----------|---------------|--------|
| (Complete Life OS) Tasks Database | `81802093-f0b3-82f0-908a-076bdd2c9a71` | KNOWN |
| Projects Database (Complete Life OS) | `45602093-f0b3-83e7-8364-07221234b542` | KNOWN |
| Habits Database | `23402093-f0b3-82ca-ac92-878c6561ea22` | KNOWN |
| Areas Database (Complete Life OS) | `84902093-f0b3-8256-bac7-0782995e45c3` | NEW |
| Daily Habits | `80a02093-f0b3-83a9-8e22-075ade03b260` | NEW |

**Notes:**
- **Areas Database** is the "A" in the P.A.R.A. system (Projects, Areas, Resources, Archive). It categorizes life domains (Health, Finance, Career, etc.) that tasks and projects roll up into.
- **Daily Habits** is a linked log table used for daily habit check-ins. It tracks completions per day, linked back to the parent Habits Database.

---

### Cluster 2: Financial

Budget tracking, income, expenses, and subscriptions.

| Database | data_source_id | Status |
|----------|---------------|--------|
| My Budgets Database | `0ab02093-f0b3-8219-99da-8722861f036b` | KNOWN |
| Subscriptions Database | `2e802093-f0b3-830e-b600-0711d4fa493f` | NEW |
| Income Database | `b7c02093-f0b3-83be-b564-0744bb7ba4ba` | NEW |
| Expenditure Database | `0a502093-f0b3-8354-ba76-87841a6c232e` | NEW |
| Financial Years Database | `87c02093-f0b3-835d-8e7e-07cab3931e2c` | NEW |
| Invoice Items | `e8d02093-f0b3-8384-bb29-876cd5d8a87d` | NEW |

**Notes:**
- **Invoice Items** appears multiple times in the workspace because each budget can have its own linked invoice items view. The ID above is the primary instance.
- **Copy of Income** (`21602093-f0b3-832f-9d28-87e8d7702e64`) exists in the workspace but is a duplicate and should be ignored.

---

### Cluster 3: Knowledge

Notes, journals, CRM, and reference material.

| Database | data_source_id | Status |
|----------|---------------|--------|
| Notes & References Database | `b2302093-f0b3-8320-954f-8745787162d6` | NEW |
| Journal Database | `67d02093-f0b3-820d-b3a3-87741d069927` | NEW |
| CRM Database | `e7102093-f0b3-825b-9b86-8762cef1d754` | NEW |
| Topics / Resources Database | `c7502093-f0b3-8341-a9a6-8708192581bf` | NEW |
| Notebooks Database | `ef502093-f0b3-831e-95fc-87a677c6949d` | NEW |
| Wish List Database | `01302093-f0b3-83c4-a8c4-878122d5f8e0` | NEW |

**Notes:**
- **Notes & References** and **Topics / Resources** serve different purposes: Notes are individual entries, while Topics are categorical collections of resources.
- **Notebooks Database** groups notes into themed collections (like physical notebooks).

---

### Cluster 4: Tracking

Fitness, nutrition, and time tracking.

| Database | data_source_id | Status |
|----------|---------------|--------|
| Workout Sessions | `5de02093-f0b3-8259-9143-8707569ceda8` | NEW |
| Weights Log | `62002093-f0b3-83a4-b2c7-876036bfc0a2` | NEW |
| Cardio Log | `d2602093-f0b3-82ea-b3d8-878d482c846d` | NEW |
| Classes & Sports Log | `65402093-f0b3-826e-baea-8745f1557d1c` | NEW |
| My Fitness Records | `f7402093-f0b3-839e-8940-079eeb8177aa` | NEW |
| Weekly Meal Plan | `56102093-f0b3-83d5-a18c-07da9a50e696` | NEW |
| Recipes Database | `13902093-f0b3-8244-96cd-07f874f9f93d` | NEW |
| Ingredients Database | `0f602093-f0b3-82c2-9343-87252d3c7d1c` | NEW |
| (Complete Life OS) Timesheets Database | `17202093-f0b3-826e-a349-07b1fc367393` | NEW |
| Days | `28302093-f0b3-82bd-a1e5-8797e34e412e` | NEW |

**Notes:**
- **Workout Sessions** is the parent; **Weights Log**, **Cardio Log**, and **Classes & Sports Log** are sub-tables linked to individual sessions.
- **Days** likely serves as a daily rollup/calendar table that other databases reference via relations.
- **Timesheets** tracks time spent on tasks/projects for productivity analysis.

---

### Cluster 5: Planning

Long-term goals, life vision, and self-reflection.

| Database | data_source_id | Status |
|----------|---------------|--------|
| Goals Database | `d7a02093-f0b3-839e-829b-87da54174572` | KNOWN |
| Years | `c5d02093-f0b3-8232-beb7-87b490758850` | NEW |
| My Wheel of Life | `fd702093-f0b3-837f-ba84-072d82325401` | NEW |
| Fear Setting Database | `8dc02093-f0b3-83b4-984f-07457a8ac5d4` | NEW |
| My Dream Setting Table | `24e02093-f0b3-838c-8587-07b80c9ff779` | NEW |
| My Significant Events | `eea02093-f0b3-83ad-9fa3-8702c305f22f` | NEW |

**Notes:**
- **Years** stores year-level planning entries that Goals, Habits, and other databases relate to.
- **Wheel of Life** is a self-assessment tool rating satisfaction across life areas (career, health, relationships, etc.).
- **Fear Setting** is based on Tim Ferriss's fear-setting exercise for decision-making.
- **New Fear Setting** (`de502093-f0b3-83bb-8fb1-076ed6c19815`) also exists but appears to be a newer/alternate template variant. Listed under Utility below.

---

### Cluster 6: Business (Client & Content OS)

Content creation, client management, and social media.

| Database | data_source_id | Status |
|----------|---------------|--------|
| Content Database | `c7102093-f0b3-8266-83c9-078526ce3d3b` | NEW |
| Channels Database | `28b02093-f0b3-8368-a098-0735372ca125` | NEW |
| Tweets Database | `c2902093-f0b3-8398-a6ea-879a93385a6e` | NEW |
| Client Portal Database | `6d502093-f0b3-8330-a254-0752028b5221` | NEW |

**Notes:**
- **Channels Database** stores social media channels and publishing targets.
- **Client Portal Database** manages client-facing project dashboards with shared documents.

---

### Utility / Sub-databases

Supporting databases that serve specialized or linked purposes.

| Database | data_source_id | Purpose |
|----------|---------------|---------|
| Featured Projects | `44602093-f0b3-83f5-9031-07b2a1a2e755` | Portfolio showcase |
| Featured Projects (1) | `bce02093-f0b3-833c-a3c4-07bad96410b6` | Duplicate/linked view |
| My Kit List | `8b402093-f0b3-8385-8007-87a6d1144d4c` | Equipment/gear tracking |
| Portal Shared Documents | `5e102093-f0b3-83a7-a831-07b273eae157` | Client-shared files |
| Portal Project Documents | `0fd02093-f0b3-830d-9e9c-876d3cbde68d` | Client project files |
| B-Roll | `35802093-f0b3-8240-bf39-8724a8c72ff5` | Video footage library |
| Delivery Planning | `fd302093-f0b3-82ab-9f56-87765599983c` | Content delivery schedule |
| New Fear Setting | `de502093-f0b3-83bb-8fb1-076ed6c19815` | Alternate fear-setting template |

---

## Dashboard Pages

These are **page IDs** (not databases). They are the main navigation dashboards that contain inline views of the databases above.

| Dashboard | Page ID |
|-----------|---------|
| My Calendars | `43c02093-f0b3-8323-88a2-81de91017f95` |
| Goal Setting & Yearly Planner | `11902093-f0b3-8278-b669-01d547659a91` |
| Year Summaries | `b4c02093-f0b3-8219-a882-01f0dfd2fe0e` |
| P.A.R.A Dashboard | `e5202093-f0b3-8241-bdcd-81e941a3300a` |
| Tasks & Action View | `06e02093-f0b3-83c3-ba22-0160dc7e87b5` |
| Life Areas | `10e02093-f0b3-8332-9a7c-0101c5b55a70` |
| Projects | `b6202093-f0b3-8247-9b29-816658134677` |
| My Website Portfolio | `25002093-f0b3-8382-9765-81df1fe32f93` |
| Client & Content OS | `0de02093-f0b3-82f7-a59b-81a9c75f2b60` |
| Knowledge Base | `36c02093-f0b3-829c-8866-017811ccd6bc` |
| Journal | `27702093-f0b3-8387-8514-818754defb06` |
| Topics & Resources | `5e702093-f0b3-8251-8b06-81866761bf4d` |
| Notebooks | `54102093-f0b3-83cf-8e04-81b58718b6a2` |
| Wish List | `e6902093-f0b3-83db-a0c5-81ebf29e999f` |
| CRM | `c7002093-f0b3-8219-a50a-01a983579e38` |
| Budgets & Subscriptions | `ab202093-f0b3-828b-8c91-8124057691e4` |
| Habit Tracker | `3cf02093-f0b3-827f-8a94-81f2df387675` |
| Workout Tracker | `4ee02093-f0b3-83c8-b409-01e2185f3b75` |
| Meal Planner | `6de02093-f0b3-8346-85b3-81405306bd89` |
| Perspectives | `25d02093-f0b3-83c2-9fb8-81e06ca04f47` |
| My Timesheets | `76602093-f0b3-8284-a563-8118944fc46b` |

---

## Duplicates to Ignore

The workspace contains a second set of databases from the **Client & Content OS** template copy. These have IDs prefixed with `2f902093` and should be ignored in favor of the primary IDs listed above.

Additionally, the following specific duplicates were identified:

| Database | data_source_id | Reason to Ignore |
|----------|---------------|------------------|
| Copy of Income | `21602093-f0b3-832f-9d28-87e8d7702e64` | Duplicate of Income Database |
| Featured Projects (1) | `bce02093-f0b3-833c-a3c4-07bad96410b6` | Linked view duplicate |

---

## Statistics

| Metric | Count |
|--------|-------|
| Total unique primary databases | ~38 |
| Already integrated in Jarvis | 5 |
| Newly discovered (to integrate) | ~33 |
| Dashboard pages mapped | 21 |
| Template duplicate databases (ignored) | ~55 |

---

## Next Steps

### Immediate (Phase T1 completion)

1. **Connect "Claude Code" integration** to each NEW database that is not yet connected. This requires navigating to the database in the Notion UI and adding the integration via Actions > Connections.

2. **Discover `database_id`s** for databases where we need to create items. Use `databases.retrieve()` on known database_ids or reverse-lookup from data_source_ids.

3. **Map property schemas** for each database -- property names, types, select/multi-select options, relation targets. This is required before building query filters or creating pages.

### Future (Phase T2 integration)

4. **Build domain handlers** for each cluster (financial, knowledge, tracking, planning, business) following the same pattern as the existing Tasks handler.

5. **Define natural language intents** that map to database operations (e.g., "log a workout" -> Workout Sessions, "add a recipe" -> Recipes Database).

6. **Establish cross-database relations** -- understand which databases are linked (e.g., Tasks -> Projects -> Areas, Workout Sessions -> Weights Log) to enable compound queries.
