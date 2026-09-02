---
title: "REST API & Webhooks Reference"
description: Granular, comprehensive developer reference for Salamandr's REST API — authentication, scoped API keys, granular module endpoints, input parameters, JSON payloads, error handling, and webhooks.
---

Salamandr exposes a comprehensive JSON REST API for integrating external systems, synchronizing customer records, automating support triage, and managing platform resources programmatically.

- **Base URL:** `https://helpdesk.yourcompany.com/api/v1`
- **Protocol:** HTTPS (TLS 1.2+)
- **Data Format:** `application/json`
- **Character Encoding:** UTF-8

---

## 1. Authentication & Global Security

All private endpoints require an `Authorization` header containing a valid Bearer token:

```http
Authorization: Bearer <API_TOKEN_OR_SESSION_KEY>
```

### Scoped API Keys (Enterprise)

In **Admin Panel &rarr; Settings &rarr; API Keys**, administrators can issue programmatic API keys with restricted permissions:

| Scope Name | Read Actions | Write / Mutating Actions |
|---|---|---|
| `tickets:read` | List tickets, view messages, download attachments | — |
| `tickets:write` | — | Create/update tickets, post replies, add internal notes |
| `users:read` | List users, view customer profiles | — |
| `users:write` | — | Create/update customer profiles, change roles |
| `organizations:read` | List and view customer organizations | — |
| `organizations:write`| — | Create/update/delete organizations |
| `tags:read` / `write` | List and view tags | Create, update, assign, or delete tags |
| `kb:read` / `write` | Read internal KB articles and documents | Publish articles, upload documents, crawl URLs |
| `reporting:read` | Query report metrics and analytics data | — |
| `admin` | Full unrestricted administrative access across all tenant resources |

### Rate Limiting Headers

```http
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 118
X-RateLimit-Reset: 1724457600
```

When rate limits are exceeded, the server responds with `HTTP 429 Too Many Requests` and a `Retry-After` header.

### Standard Error Envelope

```json
{
  "error": {
    "code": "resource_not_found",
    "message": "Ticket #1042 was not found in this tenant",
    "status": 404,
    "details": {}
  }
}
```

---

## 2. Authentication & Sessions

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `POST` | `/auth/login` | Authenticate staff or customer | Public (CSRF) |
| `POST` | `/auth/login/2fa` | Complete 2FA TOTP verification challenge | Public (CSRF) |
| `POST` | `/auth/register` | Register customer portal account | Public (CSRF) |
| `POST` | `/auth/forgot-password` | Request password reset email | Public (CSRF) |
| `POST` | `/auth/reset-password` | Set new password using reset token | Public (CSRF) |
| `POST` | `/auth/logout` | Invalidate active user session | Public (CSRF) |
| `GET` | `/auth/csrf` | Fetch anti-CSRF token | Public |
| `GET` | `/auth/me` | Fetch authenticated user profile | Authenticated |
| `PATCH`| `/auth/me` | Update authenticated user profile | Authenticated |
| `PATCH`| `/auth/me/password` | Change authenticated user password | Authenticated |
| `GET` | `/2fa` | Check 2FA enrolment status | Authenticated |
| `POST` | `/2fa/setup` | Generate TOTP secret and QR URI | Authenticated |
| `POST` | `/2fa/confirm` | Activate TOTP 2FA | Authenticated |
| `POST` | `/2fa/disable` | Disable 2FA with password confirmation | Authenticated |

#### Input Payloads

##### `POST /auth/login`
```json
{
  "email": "agent@yourcompany.com",
  "password": "SecretPassword123!"
}
```

##### `POST /auth/login/2fa`
```json
{
  "challenge_token": "ch_981240182470129",
  "code": "582019"
}
```

##### `PATCH /auth/me`
```json
{
  "name": "Sarah Miller",
  "avatar_url": "https://cdn.yourcompany.com/avatars/smiller.jpg",
  "locale": "en",
  "timezone": "America/New_York"
}
```

##### `PATCH /auth/me/password`
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewSecurePassword456!"
}
```

---

## 3. Tickets Management

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `GET` | `/tickets` | List tickets with multi-field filtering & pagination | `tickets:read` |
| `GET` | `/tickets/stream` | Real-time SSE ticket update feed | `tickets:read` (Staff) |
| `GET` | `/tickets/filter-values` | Autocomplete values for query builder | `tickets:read` (Staff) |
| `POST` | `/tickets` | Create a new support ticket | `tickets:write` |
| `GET` | `/tickets/{id}` | Get ticket details & custom fields | `tickets:read` |
| `PATCH`| `/tickets/{id}` | Update status, priority, assignee, team | `tickets:write` (Staff) |
| `POST` | `/tickets/{id}/snooze` | Snooze ticket until a timestamp | `tickets:write` (Staff) |
| `POST` | `/tickets/{id}/merge` | Merge ticket into a target parent ticket | `tickets:write` (Staff) |
| `POST` | `/tickets/bulk` | Execute batch update across multiple tickets | `tickets:write` (Staff) |
| `POST` | `/tickets/{id}/subject/suggest` | AI-suggested ticket subject | `tickets:write` (Staff) |
| `POST` | `/tickets/{id}/sentiment/analyze` | AI sentiment and urgency score calculation | `tickets:write` (Staff) |

#### Input Parameters & Payloads

##### `GET /tickets` (Query Parameters)
- `status_id` (*UUID*): Filter by status
- `priority_id` (*UUID*): Filter by priority
- `assigned_agent_id` (*UUID*): Filter by assigned staff agent
- `team_id` (*UUID*): Filter by support department
- `channel` (*string*): `email`, `whatsapp`, `telegram`, `webchat`, `instagram`, `messenger`, `line`, `webform`, `api`
- `sort_by` (*string*): `created_at`, `updated_at`, `sla_due_at`, `ticket_number`
- `sort_dir` (*string*): `asc`, `desc`
- `page` (*integer*): Page number (Default: `1`)
- `page_size` (*integer*): Page size (Default: `20`, Max: `100`)
- `conditions` (*JSON array*): Advanced query builder filters

##### `POST /tickets`
```json
{
  "subject": "Wireless ECG telemetry signal failure",
  "requester_id": "u_89104",
  "type_id": "8f3b2c1a-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
  "body": "The wireless ECG unit is displaying error code E-14 during transmission.",
  "custom_fields": {
    "device_serial": "SN-90281-C",
    "hospital_unit": "ICU-3"
  }
}
```

##### `PATCH /tickets/{id}`
```json
{
  "status_id": "status_resolved_uuid",
  "priority_id": "priority_high_uuid",
  "assigned_agent_id": "u_1001",
  "team_id": "t_201",
  "subject": "Wireless ECG telemetry signal failure (Resolved)",
  "summary": "Replaced telemetry antenna and verified signal sync.",
  "custom_fields": {
    "resolution_code": "HARDWARE_REPLACED"
  }
}
```

##### `POST /tickets/{id}/snooze`
```json
{
  "until": "2026-08-25T09:00:00Z"
}
```

##### `POST /tickets/{id}/merge`
```json
{
  "target_ticket_id": "7a2e2f5f-7b2c-5b5f-0c1f-2f1b7e3f0b02",
  "reason": "Duplicate inquiry from same customer regarding telemetry monitor."
}
```

##### `POST /tickets/bulk`
```json
{
  "ticket_ids": [
    "6f1d1f4e-6a1b-4a4f-9b0e-1f0b6d2f9a01",
    "7a2e2f5f-7b2c-5b5f-0c1f-2f1b7e3f0b02"
  ],
  "status_id": "status_resolved_uuid",
  "priority_id": "priority_normal_uuid",
  "assigned_agent_id": "u_1001",
  "add_tags": ["batch-processed"],
  "remove_tags": ["pending-triage"]
}
```

---

## 4. Messages, Attachments & Collision Prevention

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `GET` | `/tickets/{id}/messages` | List conversation messages & internal notes | `tickets:read` |
| `POST` | `/tickets/{id}/messages` | Post customer reply or private internal note | `tickets:write` |
| `POST` | `/tickets/{id}/messages/{msgId}/attachments` | Upload file attachment to message | `tickets:write` |
| `POST` | `/tickets/{id}/messages/{msgId}/dispatch` | Dispatch pending message to channel | `tickets:write` |
| `GET` | `/attachments/{attachmentId}` | Download attachment binary file | `tickets:read` |
| `GET` | `/attachments/{attachmentId}/stream` | Stream media attachment (video/audio) | `tickets:read` |
| `POST` | `/inline-images` | Upload inline image for rich text editor | `tickets:write` |
| `POST` | `/tickets/{id}/reply-lock` | Acquire exclusive composer lock | `tickets:write` (Staff) |
| `DELETE`| `/tickets/{id}/reply-lock`| Release composer lock | `tickets:write` (Staff) |
| `GET` | `/tickets/{id}/collaborators` | List staff/customer CC collaborators | `tickets:read` |
| `POST` | `/tickets/{id}/collaborators` | Add collaborator to ticket | `tickets:write` (Staff) |
| `DELETE`| `/tickets/{id}/collaborators/{userId}` | Remove collaborator | `tickets:write` (Staff) |
| `GET` | `/tickets/{id}/events` | Chronological audit timeline of ticket events | `tickets:read` |
| `GET` | `/tickets/{id}/links` | List linked tickets | `tickets:read` (Staff) |
| `POST` | `/tickets/{id}/links` | Link ticket to another ticket ID | `tickets:write` (Staff) |
| `DELETE`| `/tickets/{id}/links/{linkId}` | Remove ticket link association | `tickets:write` (Staff) |

#### Input Payloads

##### `POST /tickets/{id}/messages`
```json
{
  "body": "Hi Maria, our field engineer has replaced the receiver antenna.",
  "is_private": false
}
```
*Note: Set `"is_private": true` to record an internal note visible only to staff agents.*

##### `POST /tickets/{id}/collaborators`
```json
{
  "user_id": "u_89104"
}
```

##### `POST /tickets/{id}/links`
```json
{
  "target_ticket_id": "7a2e2f5f-7b2c-5b5f-0c1f-2f1b7e3f0b02"
}
```

---

## 5. Time Tracking API

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `GET` | `/tickets/{id}/time-entries` | List billable time entries on ticket | `time_entries:read` (Staff) |
| `POST` | `/tickets/{id}/time-entries` | Log billable time spent on ticket | `time_entries:write` (Staff) |
| `PATCH`| `/time-entries/{entryId}` | Update logged time entry | `time_entries:write` (Staff) |
| `DELETE`| `/time-entries/{entryId}` | Delete logged time entry | `time_entries:delete` (Staff) |

#### Input Payloads

##### `POST /tickets/{id}/time-entries`
```json
{
  "duration_minutes": 45,
  "description": "On-site telemetry calibration and testing",
  "is_billable": true
}
```

##### `PATCH /time-entries/{entryId}`
```json
{
  "duration_minutes": 60,
  "description": "Extended calibration and clinical verification",
  "is_billable": true
}
```

---

## 6. Tags & Vocabulary API

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `GET` | `/tags` | List all tags in the tenant vocabulary | `tags:read` |
| `POST` | `/tags` | Create a new tag | `tags:write` |
| `PATCH`| `/tags/{id}` | Update tag name or hex color | `tags:write` |
| `DELETE`| `/tags/{id}` | Delete tag from vocabulary | `tags:delete` |
| `GET` | `/tickets/{id}/tags` | List tags applied to ticket | `tags:read` |
| `PUT` | `/tickets/{id}/tags` | Replace full tag list on ticket | `tags:write` |
| `GET` | `/users/{id}/tag-profile` | Derived tag profile for customer | `tags:read` |
| `GET` | `/organizations/{id}/tag-profile` | Derived tag profile for organization | `tags:read` |

#### Input Payloads

##### `POST /tags`
```json
{
  "name": "telemetry-ecg",
  "color": "#E8890B"
}
```

##### `PUT /tickets/{id}/tags`
```json
{
  "tag_ids": [
    "tag_101_uuid",
    "tag_102_uuid"
  ]
}
```

---

## 7. Saved Queue Filters, Macros & Canned Responses

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `GET` | `/saved-filters` | List agent's saved queue views | Staff |
| `POST` | `/saved-filters` | Save new queue filter view | Staff |
| `PATCH`| `/saved-filters/{id}` | Update saved queue filter | Staff |
| `DELETE`| `/saved-filters/{id}` | Delete saved queue filter | Staff |
| `GET` | `/macros` | List automation macros | `macros:read` |
| `POST` | `/macros` | Create one-click automation macro | `macros:write` |
| `PATCH`| `/macros/{id}` | Update macro action set | `macros:write` |
| `DELETE`| `/macros/{id}` | Delete automation macro | `macros:delete` |
| `GET` | `/canned-responses` | List canned response templates | `canned_responses:read` |
| `POST` | `/canned-responses` | Create canned response snippet | `canned_responses:write` |
| `PATCH`| `/canned-responses/{id}` | Update canned response snippet | `canned_responses:write` |
| `DELETE`| `/canned-responses/{id}` | Delete canned response snippet | `canned_responses:delete` |

#### Input Payloads

##### `POST /saved-filters`
```json
{
  "name": "Urgent ICU Tickets",
  "conditions": [
    { "field": "priority", "operator": "eq", "value": "urgent" },
    { "field": "tag", "operator": "contains", "value": "icu" }
  ]
}
```

##### `POST /macros`
```json
{
  "name": "Resolve and Tag Telemetry",
  "actions": [
    { "type": "set_status", "value": "status_resolved_uuid" },
    { "type": "add_tag", "value": "telemetry-resolved" },
    { "type": "post_reply", "value": "Diagnostic run completed and issue resolved." }
  ]
}
```

##### `POST /canned-responses`
```json
{
  "title": "Holter Reset Instructions",
  "shortcut": "!holter-reset",
  "body": "Please hold the sync button for 5 seconds until the LED turns solid blue."
}
```

---

## 8. Customer Directory & Users API

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `GET` | `/users` | List staff roster or customer directory | `users:read` |
| `POST` | `/users` | Create staff agent or customer user | `users:write` |
| `GET` | `/users/{id}` | Get user details and contact information | `users:read` |
| `PATCH`| `/users/{id}` | Update name, phone, notes, VIP status, custom fields | `users:write` |
| `PATCH`| `/users/{id}/role` | Change user role (`admin`, `agent`, `customer`) | `users:write` |
| `PATCH`| `/users/{id}/organization` | Assign customer to an organization | `users:write` |
| `POST` | `/users/{id}/invite` | Send or resend portal/staff invitation email | `users:write` |
| `GET` | `/users/{id}/tickets` | List tickets requested by user | `users:read` |
| `GET` | `/users/seats` | Active agent count vs licensed seat limit | `users:write` |
| `GET` | `/users/instance-seat-quota` | Fleet seat quota for instance | `users:write` |
| `PUT` | `/users/instance-seat-quota` | Update fleet seat quota for instance | `users:write` |
| `GET` | `/customers/{id}/consent` | List channel messaging consent status | Staff |
| `PUT` | `/customers/{id}/consent` | Record customer channel opt-in/opt-out | Staff |

#### Input Payloads

##### `POST /users`
```json
{
  "email": "maria@health.org",
  "name": "Maria Gonzalez",
  "role": "customer",
  "password": "TemporaryPassword123!",
  "phone": "+15550192834"
}
```

##### `PATCH /users/{id}`
```json
{
  "name": "Maria Gonzalez",
  "phone": "+15550192834",
  "notes": "Primary clinical contact for ICU ward telemetry",
  "is_vip": true,
  "vip_level": 1,
  "department": "Cardiology",
  "country": "ES",
  "zone": "EMEA",
  "alternate_emails": ["mgonzalez.backup@health.org"],
  "custom_fields": {
    "hospital_account_id": "HOSP-9921"
  },
  "max_concurrent_conversations": 5
}
```

##### `PATCH /users/{id}/organization`
```json
{
  "organization_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c"
}
```

##### `PUT /customers/{id}/consent`
```json
{
  "channel": "whatsapp",
  "consent_status": "opted_in",
  "notes": "Consent granted verbally over phone during support call"
}
```

---

## 9. Support Teams & Department Rosters

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `GET` | `/teams` | List support teams and departments | `teams:read` |
| `GET` | `/teams/mine` | List teams current agent belongs to | `teams:read` |
| `GET` | `/teams/{id}` | Get team details | `teams:read` |
| `POST` | `/teams` | Create support team | `teams:write` |
| `PATCH`| `/teams/{id}` | Update support team name or routing | `teams:write` |
| `GET` | `/teams/{id}/members` | List agent members of team | `teams:read` |
| `POST` | `/teams/{id}/members` | Add agent to team | `teams:write` |
| `DELETE`| `/teams/{id}/members/{userId}` | Remove agent from team | `teams:delete` |

#### Input Payloads

##### `POST /teams`
```json
{
  "name": "Clinical Engineering Tier-2",
  "description": "Hardware and telemetry diagnostic response team"
}
```

##### `POST /teams/{id}/members`
```json
{
  "user_id": "u_1001"
}
```

---

## 10. Customer Organizations (B2B)

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `GET` | `/organizations` | List customer organizations | `organizations:read` |
| `GET` | `/organizations/filter-values` | Organization filter autocomplete | `organizations:read` |
| `GET` | `/organizations/{id}` | Get organization details and domains | `organizations:read` |
| `POST` | `/organizations` | Create customer organization | `organizations:write` |
| `PATCH`| `/organizations/{id}` | Update organization metadata | `organizations:write` |
| `DELETE`| `/organizations/{id}` | Delete customer organization | `organizations:delete` |
| `GET` | `/organizations/{id}/members` | List customer users belonging to org | `organizations:read` |
| `GET` | `/organizations/{id}/tickets` | List tickets requested by org members | `organizations:read` |

#### Input Payloads

##### `POST /organizations`
```json
{
  "name": "Saint Jude Memorial Hospital",
  "domains": ["stjude.org", "health.stjude.org"],
  "notes": "Enterprise Tier-1 Healthcare Account",
  "custom_fields": {
    "facility_code": "SJM-01",
    "sla_tier": "Platinum"
  }
}
```

##### `PATCH /organizations/{id}`
```json
{
  "name": "Saint Jude Memorial Hospital (Main Campus)",
  "domains": ["stjude.org", "health.stjude.org", "stjude-research.org"],
  "notes": "Updated domains list"
}
```

---

## 11. Agent Skills & Routing Rules

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `GET` | `/skills` | List agent skills vocabulary | `skills:read` |
| `POST` | `/skills` | Create skill category | `skills:write` |
| `PATCH`| `/skills/{id}` | Update skill | `skills:write` |
| `DELETE`| `/skills/{id}` | Delete skill | `skills:delete` |
| `GET` | `/users/{id}/skills` | List skills assigned to agent | `skills:read` |
| `POST` | `/users/{id}/skills/{skillId}` | Assign skill to agent | `skills:write` |
| `DELETE`| `/users/{id}/skills/{skillId}` | Remove skill from agent | `skills:delete` |
| `GET` | `/routing-rules` | List automated ticket routing rules | `routing_rules:read` |
| `GET` | `/routing-rules/{id}` | Get routing rule details | `routing_rules:read` |
| `POST` | `/routing-rules` | Create routing rule | `routing_rules:write` |
| `PATCH`| `/routing-rules/{id}` | Update routing rule conditions & actions | `routing_rules:write` |
| `DELETE`| `/routing-rules/{id}` | Delete routing rule | `routing_rules:delete` |

#### Input Payloads

##### `POST /skills`
```json
{
  "name": "Cardiology Telemetry",
  "description": "Diagnostics and telemetry receivers calibration"
}
```

##### `POST /routing-rules`
```json
{
  "name": "Route ICU Telemetry Tickets",
  "priority_order": 1,
  "is_active": true,
  "conditions": [
    { "field": "channel", "operator": "eq", "value": "whatsapp" },
    { "field": "custom_fields.hospital_unit", "operator": "contains", "value": "ICU" }
  ],
  "actions": [
    { "type": "set_team", "value": "team_cardiology_uuid" },
    { "type": "set_priority", "value": "priority_urgent_uuid" },
    { "type": "require_skill", "value": "skill_cardiology_uuid" }
  ]
}
```

---

## 12. SLAs, Ticket Types, Custom Fields & Business Hours

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `GET` | `/meta/statuses` | List ticket status vocabulary | Authenticated |
| `PATCH`| `/meta/statuses/{id}` | Toggle status properties (e.g. pause SLA) | Admin |
| `GET` | `/meta/priorities` | List ticket priority vocabulary | Authenticated |
| `GET` | `/sla-policies` | List SLA response/resolution policies | `sla_policies:read` |
| `PATCH`| `/sla-policies/{priorityId}` | Upsert SLA deadline targets for priority | `sla_policies:write` |
| `GET` | `/ticket-types` | List custom ticket types | `ticket_types:read` |
| `POST` | `/ticket-types` | Create custom ticket type | `ticket_types:write` |
| `PATCH`| `/ticket-types/{id}` | Update custom ticket type | `ticket_types:write` |
| `DELETE`| `/ticket-types/{id}` | Delete custom ticket type | `ticket_types:delete` |
| `GET` | `/custom-fields` | List custom fields schema | `custom_fields:read` |
| `POST` | `/custom-fields` | Create custom field (text, select, bool, date) | `custom_fields:write` |
| `PATCH`| `/custom-fields/{id}` | Update custom field configuration | `custom_fields:write` |
| `DELETE`| `/custom-fields/{id}` | Delete custom field | `custom_fields:delete` |
| `GET` | `/business-hours` | Get operational business hours schedule | `business_hours:read` |
| `PUT` | `/business-hours` | Update operational business hours schedule | `business_hours:write` |
| `GET` | `/business-hours/holidays` | List configured holiday closures | `business_hours:read` |
| `POST` | `/business-hours/holidays` | Add holiday calendar closure | `business_hours:write` |
| `DELETE`| `/business-hours/holidays/{id}` | Remove holiday calendar closure | `business_hours:delete` |

#### Input Payloads

##### `PATCH /sla-policies/{priorityId}`
```json
{
  "first_response_time_minutes": 15,
  "next_response_time_minutes": 60,
  "resolution_time_minutes": 240,
  "respect_business_hours": true
}
```

##### `POST /custom-fields`
```json
{
  "entity": "ticket",
  "key": "device_serial",
  "label": "Medical Device Serial Number",
  "field_type": "text",
  "is_required": true,
  "staff_only": false
}
```

##### `PUT /business-hours`
```json
{
  "timezone": "Europe/Madrid",
  "schedule": {
    "monday": { "open": "08:00", "close": "18:00", "is_closed": false },
    "tuesday": { "open": "08:00", "close": "18:00", "is_closed": false },
    "wednesday": { "open": "08:00", "close": "18:00", "is_closed": false },
    "thursday": { "open": "08:00", "close": "18:00", "is_closed": false },
    "friday": { "open": "08:00", "close": "18:00", "is_closed": false },
    "saturday": { "is_closed": true },
    "sunday": { "is_closed": true }
  }
}
```

---

## 13. Visual Bot Flows & Automated Triage

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `GET` | `/bot-flows` | List configured visual decision-tree bot flows | `bot_flows:read` |
| `GET` | `/bot-flows/{id}` | Get bot flow graph nodes and edges | `bot_flows:read` |
| `POST` | `/bot-flows` | Create visual decision-tree bot flow | `bot_flows:write` |
| `PATCH`| `/bot-flows/{id}` | Update bot flow nodes, choices & routing | `bot_flows:write` |
| `DELETE`| `/bot-flows/{id}` | Delete bot flow | `bot_flows:delete` |
| `POST` | `/bot-flows/{id}/duplicate` | Duplicate bot flow graph | `bot_flows:write` |
| `GET` | `/bot-flow-sessions` | List customer bot execution sessions | `bot_flows:read` |
| `GET` | `/bot-flow-sessions/{id}` | View full transcript of customer bot conversation | `bot_flows:read` |

#### Input Payloads

##### `POST /bot-flows`
```json
{
  "name": "WhatsApp Clinical Equipment Triage",
  "channel": "whatsapp",
  "is_active": true,
  "nodes": [
    {
      "id": "node_welcome",
      "type": "message",
      "data": { "text": "Welcome to Clinical Support. What equipment do you need help with?" }
    },
    {
      "id": "node_choice",
      "type": "buttons",
      "data": {
        "options": [
          { "label": "Holter ECG", "target_node": "node_ecg" },
          { "label": "Telemetry Monitor", "target_node": "node_telemetry" },
          { "label": "Other Equipment", "target_node": "node_agent" }
        ]
      }
    }
  ]
}
```

---

## 14. Customer Channels & Webhooks API

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `POST/GET`| `/integrations/whatsapp/webhook` | WhatsApp Cloud API webhook | Public |
| `POST` | `/integrations/telegram/webhook/{tokenHash}` | Telegram Bot webhook delivery | Public |
| `POST/GET`| `/integrations/messenger/webhook` | Meta Messenger webhook | Public |
| `POST/GET`| `/integrations/instagram/webhook` | Meta Instagram webhook | Public |
| `POST` | `/integrations/line/webhook` | LINE Messaging webhook | Public |
| `GET` | `/channel-sources` | List all connected channel instances | `channel_sources:read` |
| `PATCH`| `/channel-sources/{id}` | Update channel source configuration | `channel_sources:write` |
| `DELETE`| `/channel-sources/{id}` | Disconnect and remove channel source | `channel_sources:delete` |
| `GET` | `/integrations/whatsapp/templates` | List approved WhatsApp templates | `whatsapp_templates:read` |
| `POST` | `/integrations/whatsapp/templates` | Create WhatsApp template for Meta review | `whatsapp_templates:write` |
| `POST` | `/integrations/whatsapp/templates/send` | Send approved template message to customer | `tickets:write` (Audited) |
| `POST` | `/webforms` | Create hosted web form | `channel_sources:write` |

#### Input Payloads

##### `POST /integrations/whatsapp/templates/send`
```json
{
  "ticket_id": "6f1d1f4e-6a1b-4a4f-9b0e-1f0b6d2f9a01",
  "template_name": "device_maintenance_update",
  "language_code": "en",
  "components": [
    {
      "type": "body",
      "parameters": [
        { "type": "text", "text": "Maria" },
        { "type": "text", "text": "SN-90281-C" }
      ]
    }
  ]
}
```

##### `POST /webforms`
```json
{
  "title": "Hospital Equipment Incident Report",
  "fields": [
    { "name": "name", "type": "text", "required": true },
    { "name": "email", "type": "email", "required": true },
    { "name": "device_serial", "type": "text", "required": true },
    { "name": "issue_description", "type": "textarea", "required": true }
  ]
}
```

---

## 15. Website Live Chat & Console API

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `GET` | `/webchat/visitors` | List active website visitors | `webchat_console:read` |
| `GET` | `/webchat/conversations` | List live chat conversations | `webchat_console:read` |
| `GET` | `/webchat/conversations/{id}` | Get live chat conversation | `webchat_console:read` |
| `GET` | `/webchat/conversations/{id}/messages` | List live chat messages | `webchat_console:read` |
| `POST` | `/webchat/conversations/{id}/reply` | Agent reply to live chat | `webchat_console:write` |
| `POST` | `/webchat/conversations/{id}/claim` | Claim conversation lock | `webchat_console:write` |
| `POST` | `/webchat/conversations/{id}/release` | Release conversation lock | `webchat_console:write` |
| `POST` | `/webchat/conversations/{id}/end` | End live chat session | `webchat_console:write` |
| `GET` | `/webchat/stream` | Real-time SSE stream of live chat events | `webchat_console:read` |
| `POST` | `/webchat/presence` | Send agent presence heartbeat | `webchat_console:write` |
| `DELETE`| `/webchat/presence` | Set agent presence to offline | `webchat_console:delete` |
| `GET` | `/webchat/blocks` | List blocked IP / visitor IDs | `webchat_console:read` |
| `POST` | `/webchat/blocks` | Block abusive visitor | `webchat_console:write` |
| `DELETE`| `/webchat/blocks/{id}` | Unblock visitor | `webchat_console:delete` |
| `GET` | `/webchat/widgets/{id}` | Get live chat widget configuration | `channel_sources:read` |
| `POST` | `/webchat/widgets` | Create live chat widget instance | `channel_sources:write` |

#### Input Payloads

##### `POST /webchat/conversations/{id}/reply`
```json
{
  "message": "Hello! I am reviewing your diagnostic telemetry log now."
}
```

##### `POST /webchat/blocks`
```json
{
  "visitor_id": "vis_991048201",
  "reason": "Spam bot traffic",
  "expires_in_hours": 72
}
```

---

## 16. Knowledge Base & Local AI RAG API

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `GET` | `/kb-categories/public` | List public Help Center categories | Public (Tenant) |
| `GET` | `/kb-articles/public` | List published Help Center articles | Public (Tenant) |
| `GET` | `/kb-articles/public/{locale}/{slug}` | View published article content | Public (Tenant) |
| `POST` | `/kb-articles` | Create knowledge base article | `kb:write` |
| `PATCH`| `/kb-articles/{id}` | Update article markdown or visibility | `kb:write` |
| `DELETE`| `/kb-articles/{id}` | Delete knowledge base article | `kb:delete` |
| `GET` | `/kb-documents` | List uploaded RAG source documents | `kb_documents:read` |
| `POST` | `/kb-documents` | Ingest document (PDF/Word/Excel/MD) for local RAG | `kb_documents:write` |
| `POST` | `/kb-documents/ask` | Ask semantic question to local RAG index | `kb_documents:read` |
| `POST` | `/kb-documents/crawl` | Start web crawler on documentation URL | `kb_documents:write` |

#### Input Payloads

##### `POST /kb-articles`
```json
{
  "category_id": "cat_89104",
  "title": "How to Reset Holter ECG Telemetry Receiver",
  "slug": "reset-holter-ecg-telemetry",
  "body": "To reset the telemetry receiver:\n1. Hold sync for 5s\n2. Wait for solid blue LED\n3. Power cycle receiver.",
  "is_published": true,
  "locale": "en"
}
```

##### `POST /kb-documents/ask`
```json
{
  "query": "What is the procedure for resetting Holter ECG error E-14?",
  "top_k": 3
}
```

---

## 17. WebAssembly Extensions & Context Rail

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `GET` | `/tickets/{id}/extension-context/{provider}` | Query live context block from WASM plugin | `extension_context:read` |
| `POST` | `/tickets/{id}/extension-actions/{provider}` | Run interactive action in WASM plugin | `extension_context:write` (Audited) |
| `POST` | `/tickets/{id}/extension-link/{provider}` | Bind ticket to external entity ID | `extension_context:write` (Audited) |
| `DELETE`| `/tickets/{id}/extension-link/{provider}` | Unlink ticket from external entity | `extension_context:write` |
| `POST` | `/tickets/{id}/storage-file-requests/{provider}` | Generate tokenized file request link | `extension_context:write` (Audited) |
| `GET` | `/extensions` | List installed WASM plugins | `extensions:read` |
| `POST` | `/extensions` | Upload & install WASM plugin binary | `extensions:write` |
| `PATCH`| `/extensions/{id}/config` | Update plugin encrypted secrets & config | `extensions:write` |
| `DELETE`| `/extensions/{id}` | Uninstall plugin binary | `extensions:delete` |

#### Input Payloads

##### `POST /tickets/{id}/extension-actions/{provider}`
```json
{
  "op": "order_device_maintenance",
  "params": {
    "patient_id": "PAT-44091",
    "device_serial": "SN-90281-C"
  },
  "inputs": {
    "fault_description": "Telemetry monitor fails to establish sync during ECG transmission."
  }
}
```

##### `POST /tickets/{id}/extension-link/{provider}`
```json
{
  "external_id": "PAT-44091"
}
```

##### `POST /tickets/{id}/storage-file-requests/{provider}`
```json
{
  "title": "Telemetry Diagnostic Dump Request",
  "description": "Please upload the exported .bin logs from your Holter monitor.",
  "max_file_size_bytes": 104857600,
  "allowed_extensions": ["bin", "log", "zip"]
}
```

---

## 18. Meetings, Calendars & Video Sync

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `GET` | `/meetings` | List scheduled meetings | `meetings:read` |
| `POST` | `/meetings` | Book a meeting with calendar invite & video room | `meetings:write` |
| `GET` | `/meetings/availability` | Check agent availability across calendar sync | `meetings:read` |
| `GET` | `/meetings/{id}` | Get meeting details | `meetings:read` |
| `PATCH`| `/meetings/{id}` | Reschedule meeting | `meetings:write` |
| `POST` | `/meetings/{id}/cancel` | Cancel meeting and notify attendees | `meetings:write` |
| `DELETE`| `/meetings/{id}` | Delete meeting record | `meetings:delete` |
| `GET` | `/meetings/feed/{token}` | Public iCal (.ics) calendar feed | Public |

#### Input Payloads

##### `POST /meetings`
```json
{
  "ticket_id": "6f1d1f4e-6a1b-4a4f-9b0e-1f0b6d2f9a01",
  "title": "Holter Telemetry Calibration Session",
  "starts_at": "2026-08-28T14:00:00Z",
  "duration_minutes": 30,
  "provider": "google_meet",
  "attendees": [
    { "name": "Maria Gonzalez", "email": "maria@health.org" }
  ]
}
```

---

## 19. ChatOps Mirroring (Slack, Teams, Discord, Mattermost)

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `GET` | `/tickets/{id}/thread-notes` | List chat thread notes mirrored from Slack/Teams | `chatops:read` |
| `POST` | `/tickets/{id}/thread-notes` | Post reply from ticket into team chat thread | `chatops:write` |
| `POST` | `/tickets/{id}/chat-thread` | Manually spawn chat thread for ticket | `chatops:write` |
| `GET` | `/integrations/chat/{provider}/routes` | List per-team channel routing bindings | `chatops_integrations:read` |
| `PUT` | `/integrations/chat/{provider}/routes` | Bind support team to specific chat channel | `chatops_integrations:write` |

#### Input Payloads

##### `POST /tickets/{id}/thread-notes`
```json
{
  "body": "Engineering confirmation: Hotfix patch v4.2.1 deployed to ICU subnet."
}
```

##### `PUT /integrations/chat/{provider}/routes`
```json
{
  "team_id": "team_cardiology_uuid",
  "channel_id": "C019284710",
  "channel_name": "#eng-cardiology-support"
}
```

---

## 20. Reporting, Analytics & BI (Enterprise)

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `GET` | `/reports/overview` | Tenant-wide aggregate metrics overview | `reporting:read` (Enterprise) |
| `GET` | `/reports/volume` | Inbound/outbound ticket volume by bucket | `reporting:read` (Enterprise) |
| `GET` | `/reports/agents` | Agent leaderboard (solved, response time, CSAT) | `reporting:read` (Enterprise) |
| `GET` | `/reports/sla-breaches` | Log of all SLA target breach incidents | `reporting:read` (Enterprise) |
| `GET` | `/reports/csat-ratings` | Individual customer satisfaction ratings log | `reporting:read` (Enterprise) |
| `GET` | `/reports/me` | Logged-in agent's personal performance summary | Staff (Free) |
| `GET` | `/reports/catalog` | Multi-dimensional query metric catalog | `reporting:read` (Enterprise) |
| `GET` | `/reports/run` | Execute custom multi-dimensional query | `reporting:read` (Enterprise) |
| `GET` | `/analytics/overview` | BI business intelligence overview | `reporting:read` (ModuleBI) |
| `GET` | `/analytics/heatmap` | Hourly/daily traffic density heatmap | `reporting:read` (ModuleBI) |

#### Query Parameters: `GET /reports/overview`
- `from` (*string, RFC3339*): Start timestamp (e.g. `2026-08-01T00:00:00Z`)
- `to` (*string, RFC3339*): End timestamp (e.g. `2026-08-23T23:59:59Z`)
- `team_id` (*UUID*): Filter by support department
- `channel` (*string*): Filter by channel
- `tz` (*string*): IANA timezone string (e.g. `Europe/Madrid`, `America/New_York`)

```json
{
  "period": {
    "from": "2026-08-01T00:00:00Z",
    "to": "2026-08-23T23:59:59Z"
  },
  "metrics": {
    "total_tickets_created": 482,
    "total_tickets_resolved": 461,
    "avg_first_response_time_seconds": 380,
    "avg_resolution_time_seconds": 14200,
    "sla_compliance_rate": 0.982,
    "csat_average_score": 4.88,
    "csat_response_rate": 0.42
  }
}
```

---

## 21. Real-Time Outbound Webhooks

Salamandr delivers transactional, HMAC-SHA256-signed HTTP POST webhooks for lifecycle events across tickets, automated routing rules, SLA monitors, CSAT surveys, customer directories, B2B organizations, and WASM extensions.

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `GET` | `/webhook-endpoints` | List outbound webhook delivery endpoints | `webhook_endpoints:read` |
| `POST` | `/webhook-endpoints` | Register outbound webhook endpoint | `webhook_endpoints:write` (Enterprise) |
| `PATCH`| `/webhook-endpoints/{id}` | Update webhook target URL, active status, headers, or subscribed events | `webhook_endpoints:write` |
| `DELETE`| `/webhook-endpoints/{id}` | Delete webhook subscription | `webhook_endpoints:delete` |
| `POST` | `/webhook-endpoints/{id}/regenerate-secret` | Rotate webhook HMAC signing secret | `webhook_endpoints:write` |
| `GET` | `/webhook-endpoints/{id}/deliveries` | List delivery log history, response latencies, and HTTP status codes | `webhook_endpoints:read` |
| `POST` | `/webhook-endpoints/{id}/deliveries/{id}/retry` | Manually retry a failed or dead-lettered webhook HTTP delivery | `webhook_endpoints:write` |
| `POST` | `/webhook-endpoints/{id}/test` | Send synchronous signed test ping payload to endpoint | `webhook_endpoints:write` |

#### Input Payloads

##### `POST /webhook-endpoints`
```json
{
  "name": "Production SIEM & Data Lake Relay",
  "url": "https://api.yourcompany.com/webhooks/salamandr",
  "event_types": [
    "ticket.created",
    "ticket.message_created",
    "ticket.routed",
    "ticket.status_changed",
    "ticket.priority_changed",
    "ticket.sla_breached",
    "ticket.first_response_breached",
    "ticket.next_response_breached",
    "ticket.sla_warning",
    "ticket.csat_rating_submitted",
    "ticket.extension_action",
    "customer.created",
    "customer.updated",
    "organization.created",
    "organization.updated",
    "extension.installed"
  ],
  "is_active": true,
  "headers": {
    "X-Custom-Auth": "secret-auth-token-12345",
    "X-Environment": "production"
  }
}
```

##### Response (`201 Created` / `POST /webhook-endpoints`):
> **Note:** The unmasked `secret` (e.g. `whsec_...`) is only returned upon endpoint creation or secret rotation (`/regenerate-secret`). Subsequent `GET` or `PATCH` calls return a masked secret (`whsec_••••1234`).

```json
{
  "id": "e3b0c442-98fc-1c14-9afb-f4c8996fb924",
  "name": "Production SIEM & Data Lake Relay",
  "url": "https://api.yourcompany.com/webhooks/salamandr",
  "event_types": [
    "ticket.created",
    "ticket.message_created",
    "ticket.routed"
  ],
  "is_active": true,
  "secret": "whsec_3fa85f64d9d34e9e8f1b6a7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e",
  "headers": {
    "X-Custom-Auth": "secret-auth-token-12345"
  },
  "created_at": "2026-08-29T16:00:00Z",
  "updated_at": "2026-08-29T16:00:00Z"
}
```

##### `POST /webhook-endpoints/{id}/test` Response:
```json
{
  "delivery_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "status_code": 200,
  "duration_ms": 142,
  "success": true
}
```

---

### Event Catalog (All 26 Supported Event Types)

#### 1. Ticket Lifecycle & Workflow Events

| Event Name | Trigger Condition | Payload Summary |
|---|---|---|
| `ticket.created` | New ticket created across any channel (web, email, chat, WhatsApp, API) | Complete ticket snapshot (subject, requester, priority, channel, initial body) |
| `ticket.message_created` | Customer reply, agent response, or private internal note posted | Ticket ID, message ID, author ID/name, `is_agent`, `is_private`, plain text & HTML bodies |
| `ticket.routed` | Automated routing rule assigned ticket to an agent or team | Ticket ID & number, `trigger_event` (`ticket_created`, `ticket_updated`, `time_trigger`), `rule_id`, `rule_name`, assigned `agent_id`/`agent_name` or `team_id`/`team_name` |
| `ticket.status_changed` | Ticket workflow status updated | Ticket ID, `from` status, `to` status, actor ID & name |
| `ticket.priority_changed` | Ticket urgency/priority reclassified | Ticket ID, `from` priority, `to` priority, actor ID & name |
| `ticket.type_changed` | Ticket classification category updated | Ticket ID, `from` type, `to` type, actor ID & name |
| `ticket.assignee_changed` | Assigned agent seat modified | Ticket ID, `from` agent, `to` agent, actor ID & name |
| `ticket.team_changed` | Assigned support team modified | Ticket ID, `from` team, `to` team, actor ID & name |
| `ticket.collaborator_added` | Collaborator (agent or customer) invited to ticket thread | Ticket ID, `from` (empty), `to` (collaborator name/email), actor ID & name |
| `ticket.collaborator_removed` | Collaborator removed from ticket thread | Ticket ID, `from` (collaborator name/email), `to` (empty), actor ID & name |
| `ticket.merged_into` | Ticket merged into a primary parent ticket | Ticket ID, `from` (current ticket), `to` (target primary ticket), actor ID & name |
| `ticket.merged_from` | Primary ticket absorbed a secondary ticket | Ticket ID, `from` (source ticket merged in), `to` (primary ticket), actor ID & name |

#### 2. SLA & Escalation Events

| Event Name | Trigger Condition | Payload Summary |
|---|---|---|
| `ticket.sla_breached` | Total resolution SLA deadline breached | Ticket ID, `from` (breached deadline ISO timestamp), `to` (empty), actor `null` |
| `ticket.first_response_breached` | First response time commitment missed | Ticket ID, `from` (breached deadline ISO timestamp), `to` (empty), actor `null` |
| `ticket.next_response_breached` | Subsequent customer reply response deadline missed | Ticket ID, `from` (breached deadline ISO timestamp), `to` (empty), actor `null` |
| `ticket.sla_warning` | Ticket entered the warning threshold window before SLA breach | Ticket ID, `from` (impending deadline ISO timestamp), `to` (empty), actor `null` |

#### 3. CSAT & Extension Action Events

| Event Name | Trigger Condition | Payload Summary |
|---|---|---|
| `ticket.csat_rating_submitted` | Customer submitted a CSAT satisfaction survey rating | Ticket ID, numerical `score` (1–5), optional `comment`, optional `reason` |
| `ticket.extension_action` | Staff member triggered an action from a WASM extension sidebar panel | Ticket ID, `from` (extension & action name), `to` (action execution summary), actor ID & name |

#### 4. Customer Directory Events

| Event Name | Trigger Condition | Payload Summary |
|---|---|---|
| `customer.created` | New customer profile registered (portal signup, staff intake, or inbound message) | Full current customer snapshot: ID, email, name, phone, organization ID, `is_vip`, custom fields |
| `customer.updated` | Customer contact info, VIP status, organization link, or custom fields modified | Full updated customer snapshot with all current attributes |

#### 5. B2B Organization Events

| Event Name | Trigger Condition | Payload Summary |
|---|---|---|
| `organization.created` | New corporate client account created | Full organization snapshot: ID, name, primary domain, website, custom fields |
| `organization.updated` | Organization domains, website, or custom metadata updated | Full updated organization snapshot with all current attributes |

#### 6. WASM Extension Lifecycle Events

| Event Name | Trigger Condition | Payload Summary |
|---|---|---|
| `extension.installed` | New WASM extension or integration connector installed in tenant | Extension ID, name, extension kind (e.g. `webhook_relay`, `chatops`, `context_tool`) |
| `extension.uninstalled` | WASM extension removed from tenant | Extension ID, name, extension kind |
| `extension.enabled` | WASM extension activated by tenant administrator | Extension ID, name, extension kind |
| `extension.disabled` | WASM extension disabled by tenant administrator | Extension ID, name, extension kind |

---

### Payload Examples

#### `ticket.created`
```json
{
  "ticket_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
  "ticket_number": 1042,
  "subject": "Unable to connect to laboratory telemetry monitor",
  "requester_id": "a9b8c7d6-e5f4-3a2b-1c0d-9e8f7a6b5c4d",
  "requester_name": "Dr. Sarah Connor",
  "requester_email": "sarah.connor@hospital.org",
  "organization_name": "Saint Jude Memorial Hospital",
  "channel": "web",
  "status_name": "Open",
  "priority_name": "High",
  "type_name": "Incident",
  "team_id": "e4f5a6b7-c8d9-0e1f-2a3b-4c5d6e7f8a9b",
  "team_name": "Biomedical Engineering",
  "assignee_name": "Alex Mercer",
  "sla_due_at": "2026-08-29T20:00:00Z",
  "body": "The ECG monitor in ICU-3 is intermittently dropping packet frames.",
  "body_html": "<p>The ECG monitor in ICU-3 is intermittently dropping packet frames.</p>"
}
```

#### `ticket.routed`
```json
{
  "ticket_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
  "ticket_number": 1042,
  "trigger_event": "ticket_created",
  "rule_id": "d1e2f3a4-b5c6-7d8e-9f0a-1b2c3d4e5f6a",
  "rule_name": "Route ICU Telemetry to On-Duty Biomed Team",
  "team_id": "e4f5a6b7-c8d9-0e1f-2a3b-4c5d6e7f8a9b",
  "team_name": "Biomedical Engineering"
}
```

#### `ticket.status_changed` / State Change Events
```json
{
  "ticket_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
  "from": "Open",
  "to": "In Progress",
  "actor_id": "a9b8c7d6-e5f4-3a2b-1c0d-9e8f7a6b5c4d",
  "actor_name": "Alex Mercer"
}
```

#### `ticket.csat_rating_submitted`
```json
{
  "ticket_id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
  "score": 5,
  "comment": "Fast and competent resolution of our ICU telemetry issue.",
  "reason": "Quick Resolution"
}
```

#### `customer.created` / `customer.updated`
```json
{
  "id": "a9b8c7d6-e5f4-3a2b-1c0d-9e8f7a6b5c4d",
  "email": "maria@health.org",
  "name": "Maria Gonzalez",
  "phone": "+15550192834",
  "organization_id": "f5e4d3c2-b1a0-9f8e-7d6c-5b4a3f2e1d0c",
  "is_vip": true,
  "custom_fields": {
    "department": "Cardiology",
    "country": "ES",
    "vip_level": 1
  }
}
```

#### `organization.created` / `organization.updated`
```json
{
  "id": "f5e4d3c2-b1a0-9f8e-7d6c-5b4a3f2e1d0c",
  "name": "Saint Jude Memorial Hospital",
  "domain": "stjude.org",
  "website": "https://www.stjude.org",
  "custom_fields": {
    "facility_code": "SJM-01",
    "contract_tier": "Platinum"
  }
}
```

#### `extension.installed` / `extension.enabled`
```json
{
  "id": "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b",
  "name": "Jira Service Desk Sync",
  "kind": "webhook_relay"
}
```

---

### Delivery Headers & Security

Every outbound HTTP request delivered to your endpoint includes the following standard headers:

| Header Name | Description | Example |
|---|---|---|
| `Content-Type` | MIME payload format | `application/json` |
| `X-Salamandr-Event` | The exact event type name | `ticket.routed` |
| `X-Salamandr-Delivery-Id` | Unique UUID assigned to this delivery attempt | `f47ac10b-58cc-4372-a567-0e02b2c3d479` |
| `X-Salamandr-Signature` | HMAC-SHA256 signature of the raw JSON request body | `sha256=d3b07384d113edec49eaa6238ad5ff00...` |

In addition, any static custom headers configured on the webhook endpoint (e.g. `X-API-Key`, `Authorization`) are included verbatim with each dispatch.

#### Signature Verification Example (Node.js / TypeScript)

```typescript
import crypto from "crypto";

export function verifySalamandrWebhook(rawBody: string, headerSignature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(headerSignature));
}
```

#### Signature Verification Example (Python 3)

```python
import hmac
import hashlib

def verify_salamandr_webhook(raw_body_bytes: bytes, header_signature: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(secret.encode("utf-8"), raw_body_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header_signature)
```

---

### Retry Policy & Delivery Management

- **Transactional Enqueue:** Outbound webhook rows are enqueued inside the exact same database transaction that produces the business domain mutation (`webhook.EnqueueTx`), guaranteeing that events are never lost and never published for rolled-back operations.
- **Exponential Retry Ladder:** If your receiving server returns a non-2xx status code or times out, delivery is automatically retried across 5 scheduled intervals:
  1. 1 minute
  2. 5 minutes
  3. 30 minutes
  4. 2 hours
  5. 6 hours
- **Manual Retries:** Exhausted / dead-lettered deliveries can be manually retried at any time via the Admin Panel UI or via `POST /webhook-endpoints/{id}/deliveries/{id}/retry`.

---

## 22. System Administration, RBAC & Archiving

| Method | Endpoint | Description | Scope |
|---|---|---|---|
| `GET` | `/audit-log` | Query immutable administrative audit trail | `audit_log:read` (Enterprise) |
| `GET` | `/branding` | Get Help Center branding settings | `branding:read` |
| `PATCH`| `/branding` | Update Help Center branding, logos, accent colors | `branding:write` |
| `GET` | `/csat/settings` | Get CSAT survey triggers & questions | `csat_settings:read` |
| `PATCH`| `/csat/settings` | Update CSAT survey configuration | `csat_settings:write` |
| `POST` | `/mail-settings` | Add IMAP/SMTP mailbox connection | `mail_settings:write` |
| `POST` | `/mail-settings/test-imap` | Test IMAP inbound mail connectivity | `mail_settings:write` |
| `POST` | `/mail-settings/test-smtp` | Test SMTP outbound mail delivery | `mail_settings:write` |
| `POST` | `/osticket-import/test-connection` | Test database connection to osTicket | `osticket_import:write` |
| `POST` | `/osticket-import` | Start background migration job from osTicket | `osticket_import:write` |
| `GET` | `/license` | View active license status, edition & seat capacity | `license:read` |
| `POST` | `/license` | Upload & activate cryptographically signed `.lic` file | `license:write` |
| `GET` | `/api-keys` | List active programmatic API keys | `api_keys:read` |
| `POST` | `/api-keys` | Generate new scoped API key with expiration | `api_keys:write` (Enterprise) |
| `DELETE`| `/api-keys/{id}` | Revoke programmatic API key | `api_keys:delete` |
| `GET` | `/roles` | List all system and custom staff roles | Admin |
| `POST` | `/roles` | Create custom staff role | Admin (ModuleRBAC) |
| `PUT` | `/roles/{id}/permissions` | Set granular resource permission matrix | Admin (ModuleRBAC) |
| `GET` | `/ticket-archiver/status` | Get data lake Parquet archiving status | Admin (ModuleArchiver) |
| `POST` | `/ticket-archiver/run` | Trigger manual cold archive job to S3 | Admin (ModuleArchiver) |
| `GET` | `/healthz` | HTTP liveness probe endpoint | Public |
| `GET` | `/readyz` | PostgreSQL & Redis readiness probe endpoint | Public |
| `GET` | `/metrics` | Prometheus metrics scrape endpoint | Public / Network Guard |

#### Input Payloads

##### `POST /api-keys`
```json
{
  "name": "Billing Integration Service",
  "scopes": ["tickets:read", "tickets:write", "users:read"],
  "expires_in_days": 90
}
```

##### `POST /roles`
```json
{
  "name": "Clinical Field Supervisor",
  "description": "Can reassign tickets, review audit trails, and manage tags"
}
```

##### `PUT /roles/{id}/permissions`
```json
{
  "permissions": {
    "tickets": ["list", "view", "edit"],
    "tags": ["list", "edit", "delete"],
    "audit_log": ["list"],
    "users": ["list", "view"]
  }
}
```
