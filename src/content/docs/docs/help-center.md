---
title: "Help Center & Knowledge Base"
description: Complete operator and API guide for Salamandr's knowledge management system — multi-language localization, category hierarchies, version history, Confluence-style page nesting, internal runbook comments, and typo-tolerant search.
---

Salamandr includes a native **Knowledge Base & Customer Help Center** (`internal/kb`), providing public customer documentation at `/help` and internal standard operating procedure (SOP) runbooks for staff agents.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Salamandr Knowledge Base Engine                      │
│                            (internal/kb)                               │
├───────────────────────────────────┬────────────────────────────────────┤
│       1. Public Help Center       │      2. Internal Staff Runbooks    │
│   (Self-Service Portal at /help)  │       (Admin & Agent Workspace)    │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Unauthenticated public articles │ • Internal playbooks & runbooks    │
│ • Custom branding & hex gradients │ • Staff discussion comments        │
│ • Multi-language locale switcher  │ • Documented triage SOPs           │
│ • Typo-tolerant full-text search  │ • Auto-indexed for AI-assist RAG   │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 1. Structure & Organization

### Category Taxonomies
Articles are organized into categories with rich visual metadata:
- **Title & Description:** High-level grouping (e.g. *Getting Started*, *Hardware Diagnostics*, *Clinical Systems*).
- **Icons & Cover Images:** Visual badge icons and hero background banners.
- **Custom Hex Color Gradients:** Strict 6-digit hex color format (e.g., `#c1521d`), rendered into inline gradient headers on the `/help` portal.
- **Display Sort Ordering:** Custom ordering of categories and articles within sections.

### Public vs. Internal Visibility
- **Public (`visibility: "public"`):** Published articles appear on your customer-facing `/help` portal, indexable by search engines and served via unauthenticated REST endpoints.
- **Internal (`visibility: "internal"`):** Restricted exclusively to authenticated staff agents. Used for confidential internal engineering runbooks, compliance protocols, and employee onboarding guides.

---

## 2. Multi-Language Localization

Salamandr manages multilingual documentation using **Translation Groups** (`translation_group_id`):

```
                       ┌───────────────────────────────┐
                       │       Translation Group       │
                       │    (UUID: 88a1-2b3c-4d5e)     │
                       └───────────────┬───────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
┌────────────────────────┐ ┌────────────────────────┐ ┌────────────────────────┐
│  English Article (en)  │ │  Spanish Article (es)  │ │ Portuguese (pt-BR)     │
│  slug: /reset-telemetry│ │  slug: /reiniciar-telem│ │ slug: /reiniciar-telem │
│  Version: 3            │ │  Version: 2            │ │ Version: 1             │
└────────────────────────┘ └────────────────────────┘ └────────────────────────┘
```

- **Independent Slugs & Categories:** Each translation maintains localized URLs (e.g., `/help/en/reset-telemetry` vs `/help/es/reiniciar-telemetria`) and category titles.
- **Dynamic Locale Codes:** Supports 2-letter codes (`en`, `es`, `fr`, `de`), region-tagged codes (`pt-BR`, `es-MX`), and script-tagged codes (`zh-Hans`).
- **Translation Creation:** Staff can create translations from the article editor with one click; existing translations remain linked under the canonical group.

---

## 3. Article Versioning & History

Every save operation in Salamandr is non-destructive and versioned (`kb_article_versions`):

1. **Atomic Version Snapshots:** Creating or updating an article automatically saves an immutable snapshot (title, body, author, timestamp) inside the same database transaction.
2. **Version History Inspection:** Staff can view prior revision snapshots, inspect who made edits, and compare text changes.
3. **Non-Destructive Rollback:** Restoring an older version (`RestoreVersion`) does not wipe intervening history—it writes the restored content as a fresh, top-level version snapshot.

---

## 4. Hierarchical Page Nesting (`parent_id`)

Salamandr supports Confluence-style hierarchical page trees:

- **Sub-Articles & Nesting:** Articles can specify a `parent_id` to nest beneath other articles within the same knowledge section.
- **Locale Consistency Invariant:** A child article must share the exact same language/locale as its parent.
- **Cycle Prevention:** The hierarchy validator detects and rejects circular dependencies (e.g., an article attempting to nest beneath its own descendant).

---

## 5. Staff Comments & Internal Collaboration

Staff agents can discuss, review, and annotate articles directly in the internal knowledge workspace (`kb_comments`):

- **Granular RBAC Permission:** Governed by the `kb_comments` resource. Agents without full article editing permissions can still ask questions and leave notes on internal SOPs.
- **Author Ownership:** Comment editing and deletion are restricted to the original author, while administrators retain full moderation control.

---

## 6. PostgreSQL Full-Text Search

Knowledge base search is powered by PostgreSQL `tsvector` indexes (`kb_articles.search_tsv`):

- **Title & Body Indexing:** Full-text queries search both article headlines and Markdown/HTML body text.
- **Prefix Matching:** Words typed into the search bar are transformed into prefix tokens (`factur:* & error:*`), returning instant suggestions as users type.
- **Dual Endpoint Search:** Integrated into both the public `/help` portal search bar and the internal agent command search.

---

## 7. Syncing Articles from a Git Repository

Instead of (or alongside) editing articles by hand, admins can connect a **GitHub or GitLab repository** as a source of Markdown articles (`internal/kbgit`) — for teams that already keep runbooks as docs-as-code.

- **Setup:** Admin → Knowledge Base → **Connected Git Sources**. Paste a repo URL or `owner/repo` path (a full URL like `https://github.com/owner/repo/tree/main/docs` is auto-parsed into repo/branch/path), pick a category and default visibility, and optionally a personal access token — public repos need none. Provider and locale are fixed after creation; everything else can be edited later.
- **Sync:** pull-only, via the provider's REST API (no git clone, no webhook listener) — runs on creation, on an explicit **Sync now**, or automatically after an edit. Only `.md`/`.markdown` files under the configured path are considered, up to 300 files per sync.
- **Frontmatter:** a leading `---` block maps `title:`, `slug:`, and a per-article `visibility:` override onto the article; missing `title:` falls back to the body's first `# Heading`, then the filename.
- Synced articles are always published — a file already committed to the repo is treated as decided-to-publish, with no separate draft state.
- **Safety:** if a sync run hits any per-file error (e.g. a transient rate limit), Salamandr skips cleaning up "stale" articles for that run entirely, so a partial failure never deletes real content — cleanup only runs after a sync that completed with zero errors.

## 8. Tree View, Grouping & Recategorizing

The article list in **Admin → Knowledge Base** renders as a two-level tree: grouped first by **visibility** (Internal / Public), then by **category** within each, with parent/child article nesting preserved inside each group. Either level can be collapsed independently. Typing into the search box replaces the tree with a flat, relevance-ranked result list instead (a ranked result set doesn't line up with a tree).

- **Inline recategorize:** each row in the tree has a category picker — changing it re-files the article immediately, without opening the full editor.
- **Confirming a visibility change:** switching an *existing* article's visibility from **Internal to Public** in the article editor prompts a confirmation dialog before saving, since it's about to become visible on the unauthenticated `/help` portal. Narrowing from Public to Internal, and setting visibility on a brand-new article, need no confirmation.

## 9. Automatic AI-Assist RAG Synchronization

Whenever an article is published or updated (regardless of whether it is public or internal), Salamandr's `ArticleIndexer` hook (`internal/kbdoc`) automatically segments the article text into semantic chunks and updates vector embeddings in PostgreSQL `pgvector`. Support agents immediately gain access to updated runbook citations during live ticket resolution.

---

## 10. REST API Reference

### Categories API

#### 1. List Categories
```http
GET /api/v1/kb-categories
Authorization: Bearer <API_TOKEN>
```

#### 2. Create Category
```http
POST /api/v1/kb-categories
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "name": "Hardware Troubleshooting",
  "description": "Diagnostic and calibration runbooks for medical telemetry equipment.",
  "icon": "cpu",
  "color": "#c1521d",
  "sort_order": 1
}
```

---

### Articles API

#### 1. Create Article
```http
POST /api/v1/kb-articles
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "category_id": "11a12345-6789-abcd-ef01-234567890abc",
  "title": "Telemetry Transmitter Battery Replacement SOP",
  "slug": "telemetry-transmitter-battery-replacement",
  "body": "## Procedure\n\n1. Power off unit.\n2. Use Phillips #0 screwdriver.\n3. Insert OEM lithium pack.\n4. Calibrate voltage test.",
  "is_published": true,
  "visibility": "internal",
  "locale": "en",
  "parent_id": null
}
```

#### 2. Create Translation for Article
```http
POST /api/v1/kb-articles/22b12345-6789-abcd-ef01-234567890abc/translations
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "category_id": "33c12345-6789-abcd-ef01-234567890abc",
  "title": "Procedimiento de Reemplazo de Batería de Telemetría",
  "slug": "reemplazo-bateria-transmisor-telemetria",
  "body": "## Procedimiento\n\n1. Apagar la unidad.\n2. Utilizar destornillador Phillips #0.\n3. Insertar batería de litio OEM.",
  "is_published": true,
  "visibility": "internal",
  "locale": "es"
}
```

#### 3. View Article Version History
```http
GET /api/v1/kb-articles/22b12345-6789-abcd-ef01-234567890abc/versions
Authorization: Bearer <API_TOKEN>
```

#### 4. Restore Previous Version
```http
POST /api/v1/kb-articles/22b12345-6789-abcd-ef01-234567890abc/versions/v_snapshot_uuid/restore
Authorization: Bearer <API_TOKEN>
```

#### 5. Add Internal Staff Comment
```http
POST /api/v1/kb-articles/22b12345-6789-abcd-ef01-234567890abc/comments
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "body": "Updated step 4 based on revision 2.1 telemetry firmware."
}
```

---

### Public Help Center API (Unauthenticated)

#### 1. List Public Articles by Category & Query
```http
GET /api/v1/kb-articles/public?locale=en&category_id=11a12345-6789-abcd-ef01-234567890abc&q=battery
```

#### 2. Get Public Article by Slug
```http
GET /api/v1/kb-articles/public/en/telemetry-transmitter-battery-replacement
```
