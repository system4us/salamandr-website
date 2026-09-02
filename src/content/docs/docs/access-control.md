---
title: "Access Control & Custom RBAC Roles"
description: Fine-grained staff permission matrices, row-level ticket visibility scoping, scoped programmatic API keys, and access governance.
---

Salamandr provides a hierarchical access control model combining coarse system roles (`admin`, `agent`, `customer`) with a granular **Role-Based Access Control (RBAC)** permission matrix (Enterprise).

---

## 1. System Roles vs. Custom Roles

- **Administrator (Seeded System Role):** Unrestricted access across all tenant resources and configuration tabs. Administrator roles can never be locked out or deleted.
- **Agent (Seeded System Role):** Access to ticket queues, live chat console, customer directory, internal knowledge base, and personal productivity reports.
- **Customer (Portal Role):** End-users accessing their self-service ticket history. Customers are strictly outside the RBAC staff engine.
- **Custom Roles (Enterprise):** Fine-grained staff roles defining exact resource action grants (`list`, `view`, `edit`, `delete`) and row-level ticket scopes.

---

## 2. Granular Resource Permission Matrix

Custom roles can govern permissions independently across all platform resources:

| Resource Group | Governable Resources | Actions |
|---|---|---|
| **Tickets** | `tickets`, `time_entries`, `tags` | `list`, `view`, `edit`, `delete` |
| **Directory** | `users`, `teams`, `organizations` | `list`, `view`, `edit`, `delete` |
| **Configuration** | `macros`, `canned_responses`, `sla_policies`, `routing_rules`, `custom_fields`, `business_hours`, `ticket_types`, `skills`, `bot_flows`, `mail_settings`, `api_keys`, `webhook_endpoints`, `audit_log`, `license` | `list`, `view`, `edit`, `delete` |
| **Knowledge Base**| `kb` (Articles), `kb_documents` (RAG Index) | `list`, `view`, `edit`, `delete` |
| **Meetings** | `meetings`, `meeting_connectors` (App configs) | `list`, `view`, `edit`, `delete` |
| **Channels** | `channel_sources`, `webchat_console`, `whatsapp_templates`, `telephony` | `list`, `view`, `edit`, `delete` |
| **ChatOps** | `chatops` (Thread notes), `chatops_integrations` | `list`, `view`, `edit`, `delete` |
| **Extensions** | `extensions` (WASM Install/Config), `extension_context` (Sidebar) | `list`, `view`, `edit`, `delete` |
| **Reporting** | `reporting` | `list`, `view`, `edit`, `delete` |

---

## 3. Row-Level Ticket Visibility Scopes

Alongside resource-wide action grants, roles configure row-level **Ticket Scope**:

- **`all` (Unrestricted):** Agent can see every ticket across the entire tenant.
- **`team` (Team Scoped):** Agent can only view tickets assigned to themselves or to any support team they belong to.
- **`assigned` (Personal Queue Only):** Agent can only view tickets directly assigned to their own user ID.
- **`include_unassigned` (Flag):** When set on `team` or `assigned` scopes, permits claiming unassigned tickets that have not yet been routed to a team.

---

## 4. Scoped Programmatic API Keys

Administrators can issue programmatic API keys with restricted permissions in **Admin Panel &rarr; Settings &rarr; API Keys**:

- **Scoped Permissions:** Restricted to specific resource namespaces (e.g. `tickets:read`, `tickets:write`, `users:read`, `reporting:read`).
- **Expiration:** Optional auto-expiry dates (30, 60, 90, 365 days).
- **Audit Attribution:** API operations are attributed directly to the owning staff user in the audit log.

---

## 5. REST API Reference

### Create Custom Role
```http
POST /api/v1/roles
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "name": "Field Service Engineer",
  "description": "Can triage hardware tickets, view telemetry context, and log time."
}
```

### Set Permissions & Ticket Visibility Scope
```http
PUT /api/v1/roles/{id}/permissions
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "ticket_scope": "team",
  "include_unassigned": true,
  "permissions": {
    "tickets": ["list", "view", "edit"],
    "time_entries": ["list", "view", "edit", "delete"],
    "extension_context": ["list", "view", "edit"],
    "tags": ["list", "view", "edit"],
    "users": ["list", "view"],
    "organizations": ["list", "view"]
  }
}
```
