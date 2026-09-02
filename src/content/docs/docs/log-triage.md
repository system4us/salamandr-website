---
title: "AI Log Triage"
description: Automated first-pass triage of uploaded log bundles — filtered excerpt extraction, issue-tracker and knowledge-base grounding, screenshot OCR, and per-tenant tuning.
---

Salamandr's **Log Triage Engine** (`internal/logtriage`) gives agents an automated first read on a customer's uploaded log bundle: it filters the noise out of a raw `.zip`, grounds the remaining excerpt against your connected issue tracker and internal knowledge base, and posts findings straight to the ticket thread — before an agent opens the file.

```
┌────────────────────────────────────────────────────────────────────────┐
│                  Salamandr Log Triage Pipeline                         │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Agent-created file request → customer uploads a .zip                │
│ 2. cmd/worker claims candidate (1 min poll, CAS claim, batch of 10)    │
│ 3. Two-pass filtered extraction (error patterns + time window)         │
│ 4. Ground against: issue tracker · internal KB · attachment OCR text   │
│ 5. Tenant's configured AI provider → structured findings (JSON)        │
│ 6. Findings posted as a system note + shown in the ticket sidebar      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1. What Triggers Triage

A log bundle only becomes a triage candidate when **all** of the following hold:

- The file was uploaded through a **file request an agent explicitly created** on the ticket (the storage-connector file-request flow) — an ad hoc attachment or a webhook-delivered file never qualifies.
- The filename ends in `.zip` (case-insensitive).
- The tenant has **AI triage enabled** (see [Configuration](#4-per-tenant-tuning) below).

This is deliberately narrower than the general ticket-attachment upload path (which is capped at 10MB) — a log bundle is something an agent asked for, specifically to diagnose an issue.

---

## 2. Filtered Excerpt Extraction

Sending a whole log archive to an LLM is neither cheap nor useful. `internal/logtriage` streams the zip (no full extraction to disk) and pulls out two independently budgeted excerpts:

| Pass | What it matches | Context kept | Default budget |
|---|---|---|---|
| **Error pattern** | Lines matching `error`, `fatal`, `panic`, `exception`, `traceback`, `stack trace` (case-insensitive), plus any tenant-defined extra patterns | 5 lines of leading context, up to a 500-line stack-trace-aware trailing window | 60 KB |
| **Time window** | Lines with a parseable timestamp (RFC3339, SQL-style, or syslog) within **±30 minutes** of the ticket's creation time | — | 20 KB |

Repeated identical lines are collapsed into a single `(repeated N times)` marker rather than padding the excerpt.

---

## 3. Grounding the Findings

Before calling the AI provider, Salamandr assembles context from three sources — each is optional and simply omitted if not configured, never a hard failure:

- **Issue tracker search** — via the generic `internal/extension` connector registry: any installed connector of kind `issue_tracker` exposing a `search_issues` op is queried with keywords pulled from the matched error lines (falling back to the customer's own words if the excerpt had no error-pattern hits). Matches are cited by id (e.g. `acme/app#42`) only when the model judges them a real match, not a title coincidence. **Redmine** is the only issue tracker connector shipped built-in; GitHub, Jira, or Linear grounding is available by installing a WASM extension of kind `issue_tracker` that implements `search_issues`.
- **Internal knowledge base** — a semantic search (`internal/kbdoc`) against your indexed KB chunks, using the customer's conversation text as the query. Relevant articles are numbered and injected into the prompt; the model is told to cite `[N]` when an existing runbook already covers the issue.
- **Ticket context** — the customer-visible conversation transcript, any linked chat-relay side-conversation notes (Slack/Mattermost/Teams/Zulip), and OCR'd text from any image attachments on the ticket (see below), all capped at 4,000 characters combined.

### Screenshot OCR

If the customer attached a screenshot of an error dialog, its text is extracted separately (`internal/ocr`, wrapping **Tesseract**, English+Spanish) on its own 1-minute background scan, independent of log triage, and folded into the ticket context under an `[OCR text from ticket attachments]` header. Supported formats: PNG, JPEG, TIFF, BMP (not GIF/WebP), capped at 20 MB per image and 20,000 extracted characters, 30-second timeout per image.

The assembled excerpt, tracker/KB context, and prompt are sent to the tenant's **configured AI provider** — Ollama, OpenRouter, OpenAI, Anthropic, or Gemini, whichever the tenant has set up under AI Provider settings (there is no triage-specific model; it reuses the same provider/model as the rest of AI-assist). The provider returns structured JSON — one or more findings, each with a severity, probable cause, supporting evidence, suggested next steps, and whether it appears to match what the customer reported.

---

## 4. Per-Tenant Tuning

Under **Admin → Integrations → AI Provider**, enabling the **"Run AI triage on uploaded log bundles"** checkbox reveals an expandable **Log Triage Tuning** panel:

- **Extra error patterns** — newline-separated list (up to 25), each tried as a regular expression first, falling back to a literal match if it doesn't compile. Use this to catch product-specific error codes the built-in pattern set won't recognize (e.g. `ORA-00060`).
- **Excerpt size limit** — total bytes for the filtered excerpt (overrides the built-in 60KB/20KB split, clamped to 8KB–512KB, split 3:1 between the error and time-window passes). Leave blank for the default.
- **Additional prompt instructions** — free text appended to the triage prompt (e.g. "always flag payment-gateway timeouts as critical"). This guides interpretation only — it cannot make the model fabricate or override the quoted excerpt evidence.

---

## 5. Agent Experience

Findings appear in the **ticket detail sidebar** (`LogTriagePanel`) as soon as processing finishes — the panel polls every 15 seconds while a candidate is pending or processing. Each finding shows a severity pill (critical/high/medium/low), probable cause, the evidence line, and suggested next steps; additional findings from the same upload collapse under "N other finding(s)."

An agent can **Retry** a failed candidate (resets it to pending for the next worker pass) or **Dismiss** a completed one (stays visible, collapsed, once acknowledged).

---

## 6. REST API Reference

### List Triage Candidates for a Ticket
```http
GET /api/v1/tickets/{ticket_id}/log-triage
Authorization: Bearer <API_TOKEN>
```

### Retry a Failed Candidate
```http
POST /api/v1/tickets/{ticket_id}/log-triage/{candidate_id}/retry
Authorization: Bearer <API_TOKEN>
```

### Dismiss a Candidate
```http
POST /api/v1/tickets/{ticket_id}/log-triage/{candidate_id}/dismiss
Authorization: Bearer <API_TOKEN>
```

### Admin: AI Provider & Triage Settings
```http
GET /api/v1/ai-settings
PATCH /api/v1/ai-settings
POST /api/v1/ai-settings/test
POST /api/v1/ai-settings/models
Authorization: Bearer <API_TOKEN>
```
