---
title: "Analytics & Custom BI Engine (Enterprise)"
description: Multi-dimensional query builder, two-dimensional cross-tabulation, condition filters, and automated recurring report delivery.
---

Salamandr's **Analytics & Custom BI Engine** (Enterprise) enables support leaders to author custom multi-dimensional queries, cross-tabulate metrics across dimensions, and schedule automated report deliveries.

---

## 1. Multi-Dimensional Query Engine

Unlike static dashboard widgets, the query engine allows arbitrary composition across:

- **Metrics (`metrics`):** `tickets_created`, `tickets_resolved`, `tickets_open`, `tickets_overdue`, `backlog_open`, `net_backlog_change`, `median_first_response_seconds`, `median_resolution_seconds`, `median_open_age_seconds`, `sla_compliance_pct`, `first_response_compliance_pct`, `reopen_rate_pct`, `first_contact_resolution_pct`, `touches_per_ticket`, `logged_hours`, `billable_hours`, `csat_avg`.
- **Primary Dimension (`dimension`):** `agent`, `team`, `priority`, `channel`, `organization`, `tag`, `type`, `organization_vip`, `hour_of_week`.
- **Secondary Dimension (`dimension2`):** Enables 2D cross-tabulation (e.g. `team` &times; `channel`).
- **Time Bucketing (`bucket`):** `hour`, `day`, `week`, `month`, `quarter`, `year`.
- **Filter Conditions (`conditions`):** Reuses the ticket list's advanced filter vocabulary (`status`, `priority`, `channel`, `tags`, `custom_fields`).
- **Period Comparison (`compare: true`):** Calculates percentage change against the immediately preceding time window.

---

## 2. Scheduled Recurring Report Deliveries

Scheduled reports run periodically in the background (`cmd/worker`) and dispatch formatted emails to configured recipients:

1. Build your query in the analytics interface and click **Save Report**.
2. Click **Schedule Delivery**:
   - **Frequency:** `daily`, `weekly`, `monthly`.
   - **Send Time & Timezone:** e.g. *Every Monday at 08:00 AM Europe/Madrid*.
   - **Format:** Inlined HTML table + downloadable CSV attachment.
   - **Recipients:** Comma-separated staff or stakeholder email addresses.

---

## 3. Read-Only Database Replica Support

To prevent complex BI aggregations from impacting real-time ticket triage and message dispatch:
- Configure `DATABASE_RO_URL` in your environment.
- Salamandr routes all heavy reporting queries and CSV exports to your PostgreSQL Read Replica automatically.

This requires the **Scale** license module specifically — a separate entitlement from the Analytics/BI module described above. Without it, `DATABASE_RO_URL` is silently ignored (queries fall back to the primary, logged at `Warn` only) rather than rejected, so confirm the module is on your license before relying on it.

---

## 4. REST API Reference

### Run Multi-Dimensional Query
```http
POST /api/v1/reports/run
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "metric": "median_resolution_seconds",
  "dimension": "team",
  "dimension2": "channel",
  "bucket": "week",
  "from": "2026-08-01T00:00:00Z",
  "to": "2026-08-23T23:59:59Z",
  "tz": "Europe/Madrid",
  "compare": true
}
```

### Save Scheduled Report Delivery
```http
POST /api/v1/reports/saved/{id}/schedule
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "frequency": "weekly",
  "day_of_week": "monday",
  "time": "08:00",
  "tz": "Europe/Madrid",
  "recipients": ["director@yourcompany.com", "lead@yourcompany.com"]
}
```
