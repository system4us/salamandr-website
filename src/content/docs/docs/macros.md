---
title: "Macros & Canned Responses"
description: Accelerating agent workflows with staged multi-action macros, keyboard-navigated canned response templates, and dynamic variable interpolation.
---

Repetitive support workflows cost agents hours of manual effort. Salamandr provides **Canned Responses** (reusable text templates with dynamic variable interpolation) and **Macros** (reusable multi-step property and reply bundles).

---

## 1. Canned Responses (Saved Reply Templates)

Canned responses (`internal/cannedresponse`) are admin-curated `{title, body}` reply templates that agents can instantly search, preview, and insert into the ticket composer.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Canned Response Picker Modal (⚡)                    │
├────────────────────────────────────────────────────────────────────────┤
│ [ 🔍 Search by title or body snippet...              12 results ]      │
├───────────────────────────────┬────────────────────────────────────────┤
│ 1. Password Reset Procedure   │ LIVE PREVIEW (Variables Resolved)      │
│    Hi {{customer_name}}, to...│ ────────────────────────────────────── │
│                               │ Hi John Doe,                           │
│ 2. Return Authorization (RMA) │                                        │
│    Please print the RMA doc...│ To reset your hospital telemetry       │
│                               │ workstation access, please follow      │
│ 3. ECG Calibration Steps      │ the security instructions below for    │
│    Step 1: Check lead V1...   │ Ticket #1042.                          │
│                               │                                        │
│ 4. Firmware Update Guide      │ Best regards,                          │
│    Ensure battery is > 50%... │ Sarah Connor · Senior Clinical Lead    │
├───────────────────────────────┴────────────────────────────────────────┤
│ Press [Enter] or double-click to insert response             [ Cancel ]│
└────────────────────────────────────────────────────────────────────────┘
```

### Key Workflow Features:
- **Instant Discovery & Keyboard Navigation:**
  - Click the **⚡ Canned Responses** button in the composer toolbar or press the configured shortcut to open the modal.
  - Search matches both template titles and HTML-stripped body text in real-time.
  - Use <kbd>&uarr;</kbd> and <kbd>&darr;</kbd> arrow keys to navigate suggestions, <kbd>Enter</kbd> or double-click to insert, and <kbd>Esc</kbd> to dismiss.
- **Dynamic Variable Interpolation:**
  Templates can embed dynamic placeholder tokens that resolve automatically against the active ticket and logged-in agent session at insertion time:

| Variable Token | Resolved Content | Description |
|---|---|---|
| `{{customer_name}}` | Jane Doe | Requester's full name (falls back to email prefix if name is unset) |
| `{{ticket_number}}` | 1042 | The unique sequential ticket reference number |
| `{{ticket_subject}}` | Telemetry Signal Drop | Ticket subject line |
| `{{agent_name}}` | Carlos Ruiz | Full name of the responding staff member |
| `{{agent_title}}` | Senior Biomedical Engineer | Job title configured in the agent's profile |
| `{{agent_email}}` | cruiz@hospital.org | Agent's direct email address |
| `{{agent_phone}}` | +1 (555) 019-2834 | Direct phone extension from profile |

:::tip[Safe Variable Resolution]
If an agent inserts a canned response before ticket properties have loaded or if a variable is mistyped, the interpolation engine retains the literal token (e.g. `{{customer_name}}`) in the composer rather than silently stripping it. This makes missing context immediately apparent before sending.
:::

---

## 2. One-Click Macros

A **Macro** (`internal/macro`) bundles a pre-composed reply body with simultaneous ticket property modifications (status, priority, ticket type, team assignment, agent assignment) and tags.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Agent Selects Macro                             │
│                  "Resolve & Tag Telemetry Fixed"                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐
│  1. Stage Property     │  │  2. Insert Reply Body  │  │  3. Additive Tags      │
│     Modifications      │  │     Into TipTap Editor │  │     Set Union Merge    │
│                        │  │                        │  │                        │
│ • Status -> Resolved   │  │ "Diagnostic sweep has  │  │ PUT /tickets/:id/tags  │
│ • Priority -> Normal   │  │ completed and signal   │  │                        │
│ • Type -> Incident     │  │ lock is verified."     │  │ Merged:                │
│                        │  │                        │  [telemetry, resolved]    │
│ (Banner: Applies with  │  │ (Agent can edit and    │  │                        │
│  next reply)           │  │  customize text)       │  │ (Applied immediately)  │
└────────────────────────┘  └────────────────────────┘  └────────────────────────┘
```

### The Staged Property Architecture

Unlike traditional helpdesks that immediately execute macros on the server, Salamandr uses a **client-side staged property architecture**:

1. **Why Property Changes Stage:**
   - In customer support, changing a ticket's status to *Resolved* immediately dispatches a customer-facing notification email.
   - If a macro applied the status change immediately on the server before the agent finished composing or reviewing their explanation, the customer would receive a premature, context-free "Your ticket was resolved" alert.
   - Therefore, property changes (`status_id`, `priority_id`, `type_id`, `team_id`, `assigned_agent_id`) are placed into the ticket detail's **staged patch**.
2. **Atomic Dispatch:**
   - The ticket view displays a visible staging banner (*"Pending changes will apply with your next reply"* with a *Discard* option).
   - When the agent clicks **Send Reply** or **Add Note**, the staged property updates commit atomically inside the same API call as the message.
3. **Additive Tag Union:**
   - Tags defined in `add_tags` are merged immediately via a set union with the ticket's existing tags (`PUT /api/v1/tickets/{id}/tags`). Tagging is additive, customer-invisible, and non-destructive.

---

## 3. REST API Reference

### Canned Responses API

#### 1. List Canned Responses
```http
GET /api/v1/canned-responses
Authorization: Bearer <API_TOKEN>
```

#### Response:
```json
[
  {
    "id": "11a12345-6789-abcd-ef01-234567890abc",
    "title": "Holter ECG Reset Instructions",
    "body": "<p>Hi {{customer_name}},</p><p>Please hold the sync button on your Holter recorder for 5 seconds until the LED turns solid blue.</p><p>Best regards,<br>{{agent_name}}</p>",
    "created_by": "22b12345-6789-abcd-ef01-234567890abc",
    "created_at": "2026-08-15T08:30:00Z",
    "updated_at": "2026-08-15T08:30:00Z"
  }
]
```

#### 2. Create Canned Response
```http
POST /api/v1/canned-responses
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "title": "Telemetry Antenna Replacement Notice",
  "body": "<p>Hello {{customer_name}},</p><p>A replacement antenna module has been dispatched for Ticket #{{ticket_number}}.</p>"
}
```

#### 3. Update Canned Response
```http
PUT /api/v1/canned-responses/11a12345-6789-abcd-ef01-234567890abc
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "title": "Telemetry Antenna Replacement Notice (Updated)",
  "body": "<p>Hello {{customer_name}},</p><p>A replacement antenna module and calibration adapter have been dispatched for Ticket #{{ticket_number}}.</p>"
}
```

#### 4. Delete Canned Response
```http
DELETE /api/v1/canned-responses/11a12345-6789-abcd-ef01-234567890abc
Authorization: Bearer <API_TOKEN>
```

---

### Macros API

#### 1. List Macros
```http
GET /api/v1/macros?active=true
Authorization: Bearer <API_TOKEN>
```

#### Response:
```json
[
  {
    "id": "33c12345-6789-abcd-ef01-234567890abc",
    "name": "Resolve & Tag Clinical Incident",
    "description": "Sets status to Resolved, assigns incident classification, and inserts signoff text",
    "body_html": "<p>Clinical diagnostic verification has completed successfully. Closing ticket.</p>",
    "body_text": "Clinical diagnostic verification has completed successfully. Closing ticket.",
    "status_id": "44d12345-6789-abcd-ef01-234567890abc",
    "priority_id": null,
    "type_id": "55e12345-6789-abcd-ef01-234567890abc",
    "team_id": null,
    "assigned_agent_id": null,
    "add_tags": ["telemetry-verified", "clinical-signoff"],
    "is_active": true,
    "sort_order": 1,
    "created_at": "2026-08-10T14:20:00Z",
    "updated_at": "2026-08-10T14:20:00Z"
  }
]
```

#### 2. Create Macro
```http
POST /api/v1/macros
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "name": "Escalate to Level 3 Biomedical",
  "description": "Reassigns to Level 3 Engineering, sets priority to Urgent, and tags with escalation",
  "body_html": "<p>Escalating hardware telemetry diagnostics to Senior Level 3 Engineering team.</p>",
  "body_text": "Escalating hardware telemetry diagnostics to Senior Level 3 Engineering team.",
  "status_id": null,
  "priority_id": "88a12345-6789-abcd-ef01-234567890abc",
  "type_id": null,
  "team_id": "99b12345-6789-abcd-ef01-234567890abc",
  "assigned_agent_id": null,
  "add_tags": ["tier-3-escalated", "hardware-review"],
  "is_active": true,
  "sort_order": 5
}
```

#### 3. Update Macro
```http
PUT /api/v1/macros/33c12345-6789-abcd-ef01-234567890abc
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "name": "Resolve & Tag Clinical Incident (v2)",
  "body_html": "<p>All clinical diagnostic checks passed. System marked operational.</p>",
  "add_tags": ["telemetry-verified", "clinical-signoff", "qa-passed"],
  "clear_actions": false
}
```

:::note[Clearing Action Fields on Update]
To clear previously set property targets (e.g. removing a preset status or team from a macro), pass `"clear_actions": true` in the `PUT` payload.
:::

#### 4. Delete Macro
```http
DELETE /api/v1/macros/33c12345-6789-abcd-ef01-234567890abc
Authorization: Bearer <API_TOKEN>
```
