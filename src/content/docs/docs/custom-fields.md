---
title: "Custom Fields"
description: Extending tickets, customers, and organizations with structured custom metadata, validation rules, and staff-only privacy controls.
---

**Custom Fields** allow organizations to capture structured, domain-specific metadata on Tickets, Customer profiles, and Organizations without modifying the core database schema.

---

## 1. Supported Field Types

- **Text:** Short single-line strings (e.g. `order_id`, `device_serial`).
- **Textarea:** Multi-line formatted text blocks (e.g. `environment_details`).
- **Dropdown / Select:** Single option from a predefined list (e.g. `operating_system`, `tier_level`).
- **Boolean / Toggle:** True/false flags (e.g. `is_production_outage`, `requires_nda`).
- **Number / Decimal:** Numeric values (e.g. `affected_user_count`).
- **Date / Timestamp:** Calendar picker inputs (e.g. `warranty_expiration`).

---

## 2. Staff-Only Privacy & Customer Portal Scoping

Custom field definitions include a **Staff Only** toggle:

- **Public Fields (`staff_only: false`):** Rendered on public web forms, visible to customers in their self-service portal, and returned in customer-scoped API queries.
- **Staff-Only Fields (`staff_only: true`):** Visible exclusively to authenticated agents and administrators. Stripped automatically from customer responses to prevent data leaks.

---

## 3. REST API Reference

### Create Custom Field
```http
POST /api/v1/custom-fields
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "entity": "ticket",
  "key": "device_serial",
  "label": "Medical Device Serial Number",
  "field_type": "text",
  "is_required": true,
  "staff_only": false
}
```

### List Custom Fields by Entity
```http
GET /api/v1/custom-fields?entity=ticket
Authorization: Bearer <API_TOKEN>
```
