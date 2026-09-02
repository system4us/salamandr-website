---
title: "Organizations (B2B Accounts)"
description: Managing customer companies, corporate domain mapping, organization-wide ticket visibility, and custom B2B account fields.
---

In B2B customer support environments, multiple contacts often belong to the same corporate client. Salamandr's **Organizations** model groups users under a unified company account, enabling shared ticket visibility, corporate SLA policies, domain auto-assignment, and dedicated account routing.

---

## 1. Core Capabilities

- **Domain Auto-Assignment:** Automatically assign new incoming customer registrations to an organization based on their email domain (e.g. `@stjude.org` &rarr; *Saint Jude Memorial Hospital*).
- **Shared Ticket Visibility:** Grant designated organization members or managers permission to view all tickets submitted by their colleagues in the Customer Portal.
- **Organization-Level Custom Fields:** Store contract tiers, account manager IDs, CRM sync keys, and physical facility codes.
- **Organization Tag Profiles:** Aggregate telemetry and ticket trends across the entire company account.

---

## 2. Configuring an Organization

1. Navigate to **Directory &rarr; Organizations**.
2. Click **New Organization**.
3. Configure the organization settings:
   - **Name:** Legal or trading company name.
   - **Domains:** Comma-separated list of corporate email domains (e.g. `hospital.org, health.hospital.org`).
   - **Notes:** Internal account context, escalation contacts, or contractual notes.
   - **Custom Fields:** Account IDs, SLA contract tiers (e.g. *Platinum*).

---

## 3. Customer Portal Organization Sharing

When a customer logs into the self-service Customer Portal:
- By default, they see only tickets they requested directly.
- If designated as an **Organization Admin** (`is_org_admin: true`), they can switch their view to **Organization Tickets** to monitor issues filed by all employees within their organization.

---

## 4. Organization Lifecycle Webhooks

Salamandr emits transactional outbound webhooks whenever B2B organizations are created or modified:

| Event Type | Trigger | Payload |
|---|---|---|
| `organization.created` | New B2B organization registered | Full organization snapshot (ID, name, domain, website, custom fields) |
| `organization.updated` | Organization domains, website, or custom metadata updated | Full updated organization snapshot with current state |

Payload example:
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

---

## 5. REST API Reference

### Create Organization
```http
POST /api/v1/organizations
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "name": "Saint Jude Memorial Hospital",
  "domains": ["stjude.org", "health.stjude.org"],
  "notes": "Enterprise Tier-1 Healthcare Account",
  "custom_fields": {
    "facility_code": "SJM-01",
    "contract_tier": "Platinum"
  }
}
```

### List Organization Members
```http
GET /api/v1/organizations/{id}/members
Authorization: Bearer <API_TOKEN>
```

### List Organization Tickets
```http
GET /api/v1/organizations/{id}/tickets
Authorization: Bearer <API_TOKEN>
```
