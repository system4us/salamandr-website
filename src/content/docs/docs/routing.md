---
title: "Automated Routing Rules & Triggers"
description: Complete architectural specification and configuration guide for Salamandr's event-driven routing rules, time-based triggers, condition evaluation, and automated actions.
---

Salamandr's **Trigger & Routing Engine** (`internal/routingrule`) automates ticket triage, team assignments, skill-based distribution, priority escalation, tagging, and automated customer replies. The engine operates across four distinct lifecycle execution events: `ticket_created`, `ticket_updated`, `ticket_replied`, and `time_trigger`.

---

## 1. Lifecycle Trigger Events

Every routing rule is bound to exactly one lifecycle event, each following distinct evaluation semantics:

| Event Type | Trigger Point | Evaluation Strategy | Typical Use Cases |
|---|---|---|---|
| `ticket_created` | Fires synchronously inside `ticket.Service.CreateTicket` during ticket creation | **First match wins** (Exclusive decision — resolves agent, team, or skill candidate) | Department queue routing, VIP customer assignment, language-based distribution |
| `ticket_updated` | Fires post-commit when properties or conversation messages change | **All matches apply** (Executes every matching rule in `sort_order`) | Auto-escalating priority on status change, auto-tagging, posting internal warning notes |
| `ticket_replied` | Fires when a staff member posts a customer-visible reply (private notes never fire it) | **All matches apply** (same evaluation and action set as `ticket_updated`) | Auto-setting status to *Pending Customer* after every staff reply |
| `time_trigger` | Evaluated periodically by `cmd/worker`'s background runner | **All matches apply** (Bounded batch scan with atomic execution claims) | Stale ticket reminders, SLA breach pre-warnings, auto-closing inactive tickets |

### First-Match-Wins vs. All-Matches-Apply

- **`ticket_created` (First Match Wins):** An assignment decision on a brand-new ticket is inherently exclusive—a ticket can only land with one primary agent, team, or skill queue. Rules are evaluated in ascending `sort_order`. The first rule whose conditions evaluate to `true` claims the ticket. If an action cannot be carried out (e.g., skill routing has no eligible agent, or the target team has no agents on shift), the evaluator falls through to the next rule. If no rule matches, the ticket remains unassigned in the default queue.
- **`ticket_updated`, `ticket_replied` & `time_trigger` (All Matches Apply):** An update or elapsed time span is an event that multiple independent automations may need to react to simultaneously. For example, when a ticket priority changes to Urgent, one rule can add the `escalated` tag, a second can post an internal note to notify senior staff, and a third can reassign the ticket to the tier-2 team.

### Why `ticket_replied` Is a Separate Event

A staff reply is not folded into `ticket_updated`, even though both act on an existing ticket: replying doesn't route through the general property-update path at all, and a "the agent just answered" rule must not also fire on unrelated edits (a priority bump, a tag change) the way a `ticket_updated` rule would. `ticket_replied` fires only for a **customer-visible** reply from a staff member — an internal private note answers nobody, so it never triggers this event. It shares `ticket_updated`'s full condition and action set (see below).

A brand-new tenant is seeded with one default `ticket_replied` rule, **"Reply sets status to Pending"** — unconditional, `set_status` to whatever status is named *Pending* — so a ticket's status reflects "waiting on the customer" the moment an agent responds, without any setup. Delete or edit it like any other rule.

---

## 2. Time-Based Triggers & Concurrency Control

Time triggers (`time_trigger`) evaluate tickets based on the passage of wall-clock time rather than human action.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        cmd/worker TimeTriggerRunner                    │
│                        (Scans every 60 seconds)                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Filter candidates via SQL (pushes gte hour thresholds)             │
│    SELECT id FROM tickets WHERE ... LIMIT 100                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2. Atomic CAS Claim (Prevents duplicate executions across replicas)    │
│    INSERT INTO routing_rule_executions (tenant_id, rule_id, ticket_id) │
│    VALUES ($1, $2, $3) ON CONFLICT DO NOTHING                         │
└───────────────────────────────────┬────────────────────────────────────┘
                     ┌──────────────┴──────────────┐
              Claim Acquired                 Claim Lost (0 rows)
                     │                             │
                     ▼                             ▼
┌────────────────────────────────────────┐   ┌──────────────────────────┐
│ 3. Resolve & Apply Action              │   │ Skip (already executed   │
│    (ApplyTriggerAction)                │   │ by another worker)       │
└────────────────────┬───────────────────┘   └──────────────────────────┘
        ┌────────────┴────────────┐
   Resolution Succeeded     Resolution Failed (e.g., no active agent on shift)
        │                         │
        ▼                         ▼
┌──────────────────────┐   ┌────────────────────────────────────────────┐
│ Keep claim durable;  │   │ Release claim (DELETE FROM executions);    │
│ ticket will not      │   │ ticket will be retried on subsequent ticks │
│ execute rule again   │   └────────────────────────────────────────────┘
└──────────────────────┘
```

### Key Concurrency Invariants:
1. **Deduplication via `routing_rule_executions`:** A time condition (e.g., `hours_since_last_activity >= 48`) remains true indefinitely once met. Without persistent tracking, worker ticks would re-execute actions every minute (bombarding customers with repeated auto-replies). The table primary key `(tenant_id, rule_id, ticket_id)` acts as an atomic claim.
2. **Transient vs. Hard Failure Handling:**
   - If an action **cannot be resolved** (e.g., `assign_by_skill` finds all agents at capacity, or `assign_team` finds no agent on shift), the claim is **released**, allowing the rule another chance on the next scan.
   - If an action is resolved and executed but fails during delivery, the claim is **retained** to prevent cascading retry storms.
3. **SQL Query Pushdown:** For rules with `match_type: "all"`, `gte` conditions on `hours_since_created` and `hours_since_last_activity` are pushed directly into the SQL `WHERE` clause. This prevents large queues from starving older tickets behind query limits.
4. **Wall-Clock vs. Working Hours:** Time trigger hour calculations evaluate wall-clock time (`time.Since`). This ensures escalations for inactive tickets trigger reliably without pausing over weekends unless explicitly handled by SLA policies.

---

## 3. Condition Fields & Operators

Conditions are evaluated using either `all` (`AND` logic) or `any` (`OR` logic).

### Requester & Origin Conditions (All Events)

| Field | Type | Supported Operators | Notes |
|---|---|---|---|
| `requester_email` | *string* | `equals`, `contains` | Case-insensitive email address comparison |
| `requester_email_domain` | *string* | `equals`, `contains` | Matches domain part after `@`. Supports comma-separated lists (e.g., `acme.com, acme.org`) |
| `organization_id` | *UUID* | `equals` | Matches customer's linked organization |
| `department` | *string* | `equals`, `contains` | Matches requester's recorded department |
| `country` | *string* | `equals`, `contains` | ISO country code or name |
| `zone` | *string* | `equals`, `contains` | Regional zone identifier |
| `vip_level` | *integer* | `equals`, `gte`, `lte` | Customer VIP tier (0 = standard, 1+ = VIP) |
| `ticket_type_id` | *UUID* | `equals` | Matches ticket classification type |
| `channel_source_id` | *UUID* | `equals` | Specific inbound channel (e.g., specific WhatsApp number or mailbox) |

### Ticket State Conditions (`ticket_updated`, `ticket_replied` & `time_trigger` Only)

| Field | Type | Supported Operators | Notes |
|---|---|---|---|
| `status_id` | *UUID* | `equals` | Current ticket lifecycle status |
| `priority_id` | *UUID* | `equals` | Current ticket urgency/priority |
| `team_id` | *UUID* | `equals` | Current assigned support team |
| `assignment` | *string* | `equals` | Evaluates assignment state (`assigned` or `unassigned`) |

### Elapsed Time Conditions (`time_trigger` Only)

| Field | Type | Supported Operators | Notes |
|---|---|---|---|
| `hours_since_created` | *integer* | `equals`, `gte`, `lte` | Floored whole hours elapsed since ticket opening |
| `hours_since_last_activity` | *integer* | `equals`, `gte`, `lte` | Floored whole hours elapsed since last message or edit |

---

## 4. Supported Action Types

Actions define what changes or communications occur when a rule triggers:

| Action Type | Supported Events | Payload Target | Behavior |
|---|---|---|---|
| `assign_agent` | `ticket_created`, `ticket_updated`, `ticket_replied`, `time_trigger` | Agent User UUID (`action_target_id`) | Assigns the ticket directly to a specific staff member. |
| `assign_team` | `ticket_created`, `ticket_updated`, `ticket_replied`, `time_trigger` | Team UUID (`action_target_id`) | Assigns to team queue. Verifies that at least one member is active on their notification schedule/shift; falls through if team is unstaffed. |
| `assign_by_skill` | `ticket_created`, `ticket_updated`, `ticket_replied`, `time_trigger` | Skill UUID (`action_target_id`) | Resolves the least-loaded eligible agent who holds the certified skill at execution time. |
| `set_status` | `ticket_updated`, `ticket_replied`, `time_trigger` | Status UUID (`action_target_id`) | Changes ticket status (e.g., moves from *Pending Customer* to *Closed*). |
| `set_priority` | `ticket_updated`, `ticket_replied`, `time_trigger` | Priority UUID (`action_target_id`) | Updates ticket priority (e.g., escalates to *Urgent*). |
| `set_type` | `ticket_updated`, `time_trigger` | Ticket Type UUID (`action_target_id`) | Reclassifies the ticket category. |
| `add_tag` | `ticket_updated`, `ticket_replied`, `time_trigger` | Tag UUID (`action_target_id`) | Adds a tag to the ticket without overwriting existing tags. |
| `remove_tag` | `ticket_updated`, `time_trigger` | Tag UUID (`action_target_id`) | Removes a specific tag if present. |
| `add_private_note` | `ticket_updated`, `ticket_replied`, `time_trigger` | Message string (`action_text`) | Appends an internal staff note (`automation_note`) visible in the ticket conversation. |
| `send_reply` | `ticket_updated`, `ticket_replied`, `time_trigger` | Message string (`action_text`) | Dispatches an automated outbound reply (`automation_reply`) to the customer via the active channel. |
| `snooze` | `time_trigger` | Hours string (`action_text`, 1–8760) | Snoozes the ticket for the specified number of hours. |

:::note[Execution Safety & Audit Integrity]
Every automated action flows through `ticket.Service.ApplyTriggerAction`. This ensures that automated property updates trigger the exact same SLA pauses, webhooks, desktop push notifications, and audit log entries as manual agent actions.

When an automated routing rule performs an assignment (`assign_agent`, `assign_by_skill`, or `assign_team`) that successfully assigns or reassigns a ticket, Salamandr publishes the dedicated **`ticket.routed`** outbound webhook event. This payload contains:
- `ticket_id` & `ticket_number`: Ticket identifier.
- `trigger_event`: Which trigger fired the rule (`ticket_created`, `ticket_updated`, or `time_trigger`).
- `rule_id` & `rule_name`: The routing rule that executed.
- `agent_id` / `agent_name` or `team_id` / `team_name`: The resolved target assignment.

This allows external systems to distinguish automated rule-driven routing from manual agent pickups (e.g. for on-call paging or external routing analytics).
:::

---

## 5. Testing a Rule Before It Runs

Before activating a rule, admins can run a **preview** against a hand-entered synthetic scenario — a requester (email, organization, VIP level, department, country, zone) plus, for events other than `ticket_created`, a synthetic ticket state (status, priority, team, assignment, or elapsed hours for `time_trigger`). No real ticket or customer record is created or touched.

The preview runs through the tenant's real, active rules for the chosen event using the exact same condition-matching and action-resolution code the live evaluator uses — it's a trace of what would actually happen, not a separate reimplementation that could drift out of sync. For each rule it reports:

- **Matched** or not, and an **outcome**: `applied`, `not_matched`, `unavailable` (matched, but the action couldn't be carried out — e.g. no eligible agent for the skill), or `not_reached` (matched, but an earlier rule already won under `ticket_created`'s first-match-wins semantics).
- The concrete **resolved target** for an applied action — e.g. the actual agent `assign_by_skill` would pick, not just the skill named.

Open it from the **Routing Rules** admin section via the *Test rules* button.

### API
```http
POST /api/v1/routing-rules/preview
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "event": "ticket_created",
  "requester_email": "jane@enterprise-client.com",
  "vip_level": "2",
  "department": "Billing"
}
```

#### Response:
```json
[
  {
    "rule_id": "c6a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c",
    "rule_name": "VIP Enterprise Customer SLA Routing",
    "sort_order": 1,
    "matched": true,
    "outcome": "applied",
    "action_type": "assign_by_skill",
    "resolved_target_id": "8f2a1234-5678-abcd-ef01-234567890abc"
  }
]
```

---

## 6. REST API Reference

### 1. List Routing Rules
```http
GET /api/v1/routing-rules
Authorization: Bearer <API_TOKEN>
```

#### Response:
```json
[
  {
    "id": "c6a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c",
    "name": "Auto-escalate Inactive High Priority Tickets",
    "event": "time_trigger",
    "is_active": true,
    "sort_order": 10,
    "match_type": "all",
    "action_type": "set_priority",
    "action_target_id": "99e12345-6789-abcd-ef01-234567890abc",
    "action_text": "",
    "conditions": [
      {
        "id": "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b",
        "field": "priority_id",
        "operator": "equals",
        "value": "88d12345-6789-abcd-ef01-234567890abc"
      },
      {
        "id": "f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c",
        "field": "hours_since_last_activity",
        "operator": "gte",
        "value": "48"
      },
      {
        "id": "a3b4c5d6-e7f8-4a9b-0c1d-2e3f4a5b6c7d",
        "field": "assignment",
        "operator": "equals",
        "value": "unassigned"
      }
    ],
    "created_at": "2026-08-20T10:00:00Z",
    "updated_at": "2026-08-20T10:00:00Z"
  }
]
```

### 2. Create Routing Rule
```http
POST /api/v1/routing-rules
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "name": "VIP Enterprise Customer SLA Routing",
  "event": "ticket_created",
  "is_active": true,
  "sort_order": 1,
  "match_type": "all",
  "action_type": "assign_by_skill",
  "action_target_id": "77c12345-6789-abcd-ef01-234567890abc",
  "conditions": [
    {
      "field": "vip_level",
      "operator": "gte",
      "value": "2"
    },
    {
      "field": "requester_email_domain",
      "operator": "equals",
      "value": "enterprise-client.com, vip-partner.org"
    }
  ]
}
```

### 3. Create Time Trigger with Automated Reply
```http
POST /api/v1/routing-rules
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "name": "Auto-Close Inactive Resolved Tickets (72h)",
  "event": "time_trigger",
  "is_active": true,
  "sort_order": 5,
  "match_type": "all",
  "action_type": "send_reply",
  "action_text": "This ticket has been automatically closed due to 72 hours of inactivity. If you need further assistance, please reply to reopen.",
  "conditions": [
    {
      "field": "status_id",
      "operator": "equals",
      "value": "resolved_status_uuid"
    },
    {
      "field": "hours_since_last_activity",
      "operator": "gte",
      "value": "72"
    }
  ]
}
```

### 4. Update Routing Rule
```http
PUT /api/v1/routing-rules/c6a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "name": "Auto-escalate Inactive High Priority Tickets (Updated)",
  "event": "time_trigger",
  "is_active": true,
  "sort_order": 10,
  "match_type": "all",
  "action_type": "add_private_note",
  "action_text": "Automated alert: High priority ticket unhandled for 48 hours. Notifying queue supervisors.",
  "conditions": [
    {
      "field": "priority_id",
      "operator": "equals",
      "value": "88d12345-6789-abcd-ef01-234567890abc"
    },
    {
      "field": "hours_since_last_activity",
      "operator": "gte",
      "value": "48"
    }
  ]
}
```

### 5. Delete Routing Rule
```http
DELETE /api/v1/routing-rules/c6a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c
Authorization: Bearer <API_TOKEN>
```
