---
title: "Knowledge Base & Private AI-Assist"
description: Overview of Salamandr's knowledge management ecosystem — customer Help Centers, staff runbooks, and private on-premises AI vector retrieval with pgvector and Ollama.
---

Salamandr provides a unified **Knowledge Base & AI-Assist Engine** designed to keep institutional knowledge organized, accessible to customers, and searchable for agents without sending sensitive data to external AI clouds.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Salamandr Knowledge Ecosystem                        │
├───────────────────────────────────┬────────────────────────────────────┤
│    1. Help Center & Runbooks      │    2. Local AI & Document RAG      │
│       [Read Guide →](help-center) │       [Read Guide →](ai-assist)    │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Public /help self-service       │ • On-premises Ollama integration   │
│ • Internal SOP runbooks for staff │ • Semantic PDF, Word, Excel parser │
│ • Multilingual translation groups │ • Web sources crawler              │
│ • Revision history & snapshots    │ • PostgreSQL pgvector embeddings   │
│ • Hierarchical page trees         │ • Grounded response drafts with    │
│ • Staff article comments          │   exact file citations             │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## Dedicated Guides

Explore the detailed technical documentation for each component:

1. **[Help Center & Articles](help-center):**
   - Public customer portal configuration at `/help`.
   - Category hierarchies, visual branding, and hex color gradients.
   - Multilingual localization with canonical translation groups.
   - Non-destructive article versioning and rollback.
   - Confluence-style hierarchical page trees.
   - Syncing articles from a connected GitHub/GitLab repository.
   - Tree view grouped by visibility & category, with inline recategorize.
   - Internal staff collaboration comments on runbooks.
   - PostgreSQL full-text search (`tsvector` & GIN indexes).
   - Complete REST API reference.

2. **[Local AI & Document RAG](ai-assist):**
   - 100% air-gapped local architecture using self-hosted Ollama (`bge-m3` & `gemma2:9b`).
   - Ingestion of technical manuals, PDF/Word/Excel specifications, and internal wikis.
   - Automated web crawler for internal and partner portals.
   - Semantic chunking (512 tokens with 50-token overlap) and HNSW vector storage in PostgreSQL with `pgvector`.
   - AI response drafting in the ticket detail context rail with direct runbook citations.
   - Strict "Propose, don't act" human-in-the-loop safety posture.
   - Complete REST API reference.

3. **[AI Log Triage](log-triage):**
   - Automated first-pass triage of uploaded log bundles, grounded against your KB and issue tracker.
   - Filtered excerpt extraction, screenshot OCR, per-tenant tuning.
   - Complete REST API reference.
