---
created: 2026-02-04T15:45
title: Knowledge Hub Integration (Notion + NotebookLM + Google Drive)
area: feature
files:
  - src/lib/jarvis/intelligence/tools.ts
  - src/lib/jarvis/notion/NotionClient.ts
---

## Problem

When the user finds something relevant (file, picture, idea, article, video), they shouldn't have to decide WHERE it goes. Currently:

- Files might go to Google Drive
- Articles might go to Notion Knowledge Base
- Research might benefit from NotebookLM AI analysis
- Project-related items need linking to Notion Projects

The user wants Jarvis to intelligently route content to the right destination(s) automatically.

## Solution

### Intelligent Capture Flow

```
User: "Save this article about solar panels for my home renovation project"

Jarvis determines:
├── Content type: Article (URL)
├── Related project: Home Renovation (Notion)
├── Routing:
│   ├── Google Drive → Store if PDF/file
│   ├── Notion → Add to Knowledge Base, link to project
│   └── NotebookLM → Add to project notebook for AI synthesis
```

### Content Routing Logic

| Content Type | Primary Destination | Also Sync To |
|--------------|---------------------|--------------|
| Files (PDF, docs) | Google Drive | Notion (link) + NotebookLM |
| Articles/URLs | Notion Knowledge Base | NotebookLM |
| Images | Google Drive | Notion (embed) |
| Ideas/notes | Notion | NotebookLM (if research-related) |
| Videos | Notion (link) | NotebookLM (transcript if available) |

### Retrieval Flow

```
User: "What do I know about solar panel options?"

Jarvis:
├── Queries Notion (saved articles, notes)
├── Queries NotebookLM (AI-synthesized insights)
└── Returns combined knowledge
```

### New Tools Required

- `smart_capture` - Analyze content, determine routing, save to all destinations
- `query_knowledge` - Cross-query Notion + NotebookLM for a topic
- `sync_to_notebooklm` - Push Notion content to NotebookLM notebook
- `get_notebooklm_insights` - Pull AI analysis from NotebookLM

### Integration Points

- Google Drive API (already have rclone in main project)
- NotebookLM API (need to research - may require Playwright automation)
- Notion Knowledge Base (part of current work)

### Dependencies

- Complete Notion Panel + Tutorial System first
- Knowledge cluster implementation (Notes, References, Topics)
- Google Drive auth setup

## Notes

- NotebookLM may not have a public API - might need Playwright automation like Notion panel
- Consider NotebookLM's "Deep Dive" audio feature for voice-first Jarvis experience
- This is a future phase after core 6 clusters are implemented
