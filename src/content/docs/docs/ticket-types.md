---
title: "Ticket Types"
description: Categorizing incoming requests with custom ticket types (Incident, Problem, Service Request, Change, Feature Inquiry).
---

**Ticket Types** provide high-level taxonomy for customer inquiries and internal IT service requests, separating urgent outages from standard questions or administrative requests.

---

## 1. Standard ITIL & Custom Types

Salamandr ships with customizable ticket types:

- **Incident:** Unplanned interruption or reduction in quality of an IT or medical device service (e.g. *Server crash*, *Telemetry monitor offline*).
- **Service Request:** Formal request from a user for something to be provided (e.g. *Password reset*, *Access request*, *Hardware provisioning*).
- **Problem:** Root cause analysis for one or multiple recurring incidents.
- **Change Request:** Request for modification to IT infrastructure, medical device firmware, or deployment configuration.
- **Inquiry / Question:** General pre-sales or product usage question.

---

## 2. Type-Specific Form Schemas & WASM Plugins

- **Custom Field Association:** Custom fields can be configured to appear only when specific ticket types are selected (e.g. `device_serial` only appears on *Hardware Incidents*).
- **Extension Gating:** WebAssembly plugins can be constrained to execute only on specific ticket types (e.g. *HMS Healthcare Plugin* runs only on *Clinical Incidents*).
- **SLA Overrides:** Each type can override the tenant-wide SLA targets per priority (e.g. *Change Request* gets a longer resolution window than *Incident* at the same priority) — see [SLA Policies &rarr; Per-Ticket-Type Overrides](/docs/slas#3-per-ticket-type-overrides).

---

## 3. REST API Reference

### Create Ticket Type
```http
POST /api/v1/ticket-types
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "name": "Clinical Incident",
  "description": "Hardware and telemetry failures on hospital clinical devices"
}
```

### List Ticket Types
```http
GET /api/v1/ticket-types
Authorization: Bearer <API_TOKEN>
```
