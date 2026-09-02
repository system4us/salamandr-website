---
title: "Tags & Tag Profiles"
description: Categorizing tickets with color-coded tags, automated keyword tagging, and derived customer/organization tag profiles.
---

**Tags** are lightweight labels attached to tickets to assist in queue filtering, macro automation, analytics grouping, and customer profiling.

---

## 1. Tag Vocabulary Management

- **Global Vocabulary:** Controlled list of tags created and color-coded by administrators in **Admin Panel &rarr; Tags**.
- **Hex Color Coding:** Tags display distinct accent badges across the ticket list and conversation header for visual identification.
- **Access Control:** Agents can apply existing tags to tickets during triage; only administrators (or custom roles with `tags:edit` permissions) can modify or delete tag definitions.

---

## 2. Derived Customer & Organization Tag Profiles

Salamandr automatically calculates **Derived Tag Profiles** for contacts and customer organizations:

- Analyzes the frequency of tags applied across all historical tickets for a customer.
- Surfaces top issue categories in the customer sidebar (e.g. *70% Telemetry, 20% Billing, 10% Firmware*).
- Allows agents to instantly understand customer pain points without reading dozens of past conversations.

---

## 3. REST API Reference

### Create Tag
```http
POST /api/v1/tags
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "name": "telemetry-ecg",
  "color": "#E8890B"
}
```

### Assign Tags to Ticket
```http
PUT /api/v1/tickets/{id}/tags
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "tag_ids": [
    "tag_101_uuid",
    "tag_102_uuid"
  ]
}
```

### Get Customer Derived Tag Profile
```http
GET /api/v1/users/{id}/tag-profile
Authorization: Bearer <API_TOKEN>
```
