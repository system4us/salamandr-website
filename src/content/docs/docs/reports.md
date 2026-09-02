---
title: "Operational Reports & Built-in Metrics"
description: Operational queue health, agent productivity leaderboards, SLA compliance tracking, and CSAT customer satisfaction metrics.
---

Salamandr provides real-time operational reports to help team leads and support managers track daily queue volume, agent throughput, and SLA compliance.

---

## 1. Core Operational Metric Groups

The reporting engine groups built-in presets into four operational categories:

### A. Queue Health
- **Backlog Trend (`backlog_open`):** Daily snapshot of open and pending tickets over 90 days.
- **Net Flow (`net_backlog_change`):** Created vs. resolved delta indicating whether the queue is growing or shrinking.
- **Open Tickets by Agent (`tickets_open` &rarr; `agent`):** Workload distribution across staff.
- **Overdue Tickets by Team (`tickets_overdue` &rarr; `team`):** Unresolved tickets that exceeded SLA targets.
- **Median Open Age (`median_open_age_seconds` &rarr; `priority`):** Identifies stale tickets lingering in the queue.

### B. Staff Productivity
- **Resolved by Agent (`tickets_resolved` &rarr; `agent`):** Total tickets resolved per staff member with period comparison.
- **First Response Time (`median_first_response_seconds` &rarr; `agent`):** Speed to first public reply.
- **Logged Hours & Billable Time (`logged_hours`, `billable_hours`):** Total hours recorded by agents and billed to organizations.
- **Touches per Ticket (`touches_per_ticket` &rarr; `team`):** Number of agent interactions required before resolution.

### C. Quality & SLA Commitments
- **SLA Resolution Compliance (`sla_compliance_pct`):** Percentage of tickets resolved within SLA target windows.
- **First Response Compliance (`first_response_compliance_pct`):** Percentage of tickets meeting first-reply commitments.
- **Reopen Rate (`reopen_rate_pct`):** Percentage of resolved tickets reopened by subsequent customer replies.
- **First Contact Resolution (`first_contact_resolution_pct`):** Tickets resolved in a single customer-agent interaction.
- **CSAT Satisfaction Average (`csat_avg`):** Average rating score from 1 to 5 stars.

### D. Inbound Demand
- **Volume by Channel (`tickets_created` &rarr; `channel`):** Breakdown across WhatsApp, Email, Telegram, Live Chat, and Webforms.
- **Arrival Heatmap (`tickets_created` &rarr; `hour_of_week`):** Hourly traffic density grid mapping peak arrival periods.
- **Volume by Tag / Type (`tickets_created` &rarr; `tag`, `type`):** Distribution of inquiries across technical categories.

---

## 2. Personal Agent Dashboard (`GET /reports/me`)

Every staff agent can view their own personal performance summary without requiring Enterprise permissions:
- Tickets resolved today and this week.
- Average personal first response time.
- Assigned open ticket count and personal CSAT rating.

---

## 3. REST API Reference

### Get Aggregate Metrics Overview
```http
GET /api/v1/reports/overview?from=2026-08-01T00:00:00Z&to=2026-08-23T23:59:59Z&tz=Europe/Madrid
Authorization: Bearer <API_TOKEN>
```

### List Reporting Presets Catalog
```http
GET /api/v1/reports/catalog
Authorization: Bearer <API_TOKEN>
```
