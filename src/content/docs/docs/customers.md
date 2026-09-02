---
title: "Customers & Directory"
description: Managing customer profiles, contact information, VIP tiers, alternate email addresses, ticket history, and GDPR consent tracking in Salamandr.
---

The **Customers Directory** is the central repository for all individuals who request support across your channels. Every customer record aggregates their conversation history, assigned organization, contact methods, custom metadata, and communication preferences.

---

## 1. Customer Profile Overview

A customer record consists of:
- **Core Identity:** Full name, primary email address, phone number, and avatar.
- **Organization Link:** Association with a customer company or enterprise account.
- **VIP Classification:** Priority routing tier (`VIP Level 1-3`) ensuring SLA acceleration.
- **Geographic & Routing Metadata:** Department, Country (`ISO 3166-1 alpha-2`), and Regional Zone (e.g. `EMEA`, `LATAM`, `APAC`).
- **Alternate Emails:** Secondary addresses discovered from invoices, e-commerce orders, or alternative domains.
- **Account Type:** Registered user (active password) or Guest (auto-provisioned from inbound email/WhatsApp without a password).

---

## 2. Managing Customers in the UI

1. Navigate to **Directory &rarr; Customers**.
2. Search and filter by name, email, organization, VIP status, or custom fields.
3. Click any customer row to view their **360° Profile**:
   - **Ticket Timeline:** Real-time view of all historical, open, and resolved tickets requested by this customer.
   - **Derived Tag Profile:** Most frequently applied tags across the customer's tickets (e.g. `billing-issue`, `telemetry-ecg`).
   - **Consent Records:** Audit trail of customer channel opt-ins and opt-outs.

---

## 3. VIP Customer Tiers & Accelerated Routing

Customers can be designated as **VIP** to trigger automated routing rules and tighter SLA deadlines:

- **VIP Flag:** Highlights customer tickets with a gold badge in the queue.
- **VIP Level (1-3):** Used in routing rules (`routing_rules`) to route directly to senior agents or specialized account managers.
- **Automatic SLA Escalation:** SLA policies can match VIP status to enforce faster first-response commitments.

---

## 4. GDPR & Channel Messaging Consent

To comply with international privacy regulations (GDPR, LGPD, TCPA), Salamandr tracks granular communication consent per contact per channel:

| Channel | Consent States | Recorded Attribution |
|---|---|---|
| **WhatsApp** | `opted_in`, `opted_out`, `unspecified` | Agent session ID, timestamp, verbal/written notes |
| **Email Marketing / Notifications** | `opted_in`, `opted_out` | Customer portal toggle or agent manual entry |
| **SMS / Phone** | `opted_in`, `opted_out` | Phone intake verification log |

### Recording Consent
Agents can update customer consent directly from the customer profile sidebar:
1. Open the customer's profile.
2. Select **Channel Consent**.
3. Toggle channel state and enter required verification notes (e.g. *"Granted verbally during phone call #1092"*).

---

---

## 5. Customer Lifecycle Webhooks

Salamandr publishes real-time outbound webhooks whenever customer profiles are created or modified, enabling bi-directional synchronization with external CRMs (HubSpot, Salesforce) and ERP databases:

| Event Type | Trigger | Payload |
|---|---|---|
| `customer.created` | New customer registered via portal, API, or message intake | Full customer snapshot (ID, email, name, phone, organization ID, VIP status, custom fields) |
| `customer.updated` | Customer fields, contact info, VIP tier, or organization link modified | Full updated customer snapshot with current state |

Payload example:
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

---

## 6. API Reference

### Create Customer
```http
POST /api/v1/users
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "name": "Maria Gonzalez",
  "email": "maria@health.org",
  "phone": "+15550192834",
  "role": "customer",
  "password": "TemporaryPassword123!"
}
```

### Update Customer Profile
```http
PATCH /api/v1/users/{id}
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "is_vip": true,
  "vip_level": 1,
  "department": "Cardiology",
  "country": "ES",
  "zone": "EMEA",
  "alternate_emails": ["mgonzalez.backup@health.org"]
}
```
