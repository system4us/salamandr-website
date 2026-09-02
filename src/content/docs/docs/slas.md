---
title: "SLA Policies & Business Hours"
description: Multi-metric Service Level Agreements (First Response, Next Response, Resolution), business hours calendars, holiday pauses, and breach tracking.
---

Salamandr features a **multi-metric SLA engine** that calculates response and resolution commitments independently, accounting for operating hours, timezones, and customizable pause states.

---

## 1. Multi-Metric Commitments

Unlike legacy helpdesks that track only a single deadline, Salamandr evaluates three distinct SLA targets per priority:

1. **First Response Time:** Maximum minutes between ticket creation and the first public staff reply.
2. **Next Response Time:** Maximum minutes between subsequent customer replies and agent follow-ups.
3. **Resolution Time:** Total duration permitted to transition the ticket to `resolved` or `closed`.

---

## 2. Priority Matrix & Default Targets

| Priority | First Response Target | Next Response Target | Resolution Target | Business Hours |
|---|---|---|---|---|
| **Urgent** | 15 minutes | 30 minutes | 4 hours (240 min) | 24/7 (Calendar) |
| **High** | 1 hour (60 min) | 2 hours (120 min) | 8 hours (480 min) | Business Hours |
| **Normal** | 4 hours (240 min) | 8 hours (480 min) | 24 hours (1440 min)| Business Hours |
| **Low** | 8 hours (480 min) | 24 hours (1440 min)| 48 hours (2880 min)| Business Hours |

---

## 3. Per-Ticket-Type Overrides

The priority matrix above is the tenant-wide default, but not every ticket type should race against the same clock — a *Change Request* and a *Password Reset* filed at the same priority rarely deserve the same resolution target.

Any ticket type can override the matrix for one or more priorities in **Admin Panel &rarr; Ticket Types &rarr; [Type Name] &rarr; SLA**:

- A priority left untouched for a type keeps inheriting the tenant-wide default — overriding is opt-in per priority, not an all-or-nothing switch per type.
- Overrides apply from ticket creation onward; retyping an existing ticket does not retroactively move its deadline, only a priority change does.
- Clearing an override reverts that type/priority combination back to the tenant default immediately for new tickets.

```http
PATCH /api/v1/ticket-types/{typeId}/sla-policies/{priorityId}
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "resolve_hours": 4,
  "first_response_minutes": 15,
  "next_response_minutes": 30,
  "warn_percent": 80
}
```

```http
DELETE /api/v1/ticket-types/{typeId}/sla-policies/{priorityId}
Authorization: Bearer <API_TOKEN>
```

---

## 4. Business Hours & Holiday Schedules

- **Operating Hours:** Define open/close hours per day of the week with custom timezone offsets (e.g. Monday–Friday 09:00–18:00 `Europe/Madrid`).
- **Weekend / Overnight Freezing:** SLA countdown timers pause automatically when outside working hours.
- **Holiday Calendar:** Register company holidays and public observances in **Admin Panel &rarr; Business Hours &rarr; Holidays**. SLA timers pause completely during holiday dates.

---

## 5. Pausing SLAs on External Pending States

When waiting for customer feedback, vendor RMA, or third-party bug fixes, keeping the SLA timer running produces false breach metrics.

Administrators can flag any custom status as **Pauses SLA** in **Admin Panel &rarr; Ticket Statuses &rarr; [Status Name] &rarr; Pause SLA**:
- Statuses like `Pending Customer Response` or `Waiting on Vendor` freeze active SLA timers.
- When the customer replies or the status changes back to `Open`, the SLA timer resumes with remaining time preserved.

---

---

## 6. SLA Webhook Events & Escalations

Salamandr's background escalation worker emits transactional outbound webhooks when SLA deadlines are missed or approaching, allowing real-time alerting into incident response systems (PagerDuty, Opsgenie, VictorOps):

| Webhook Event | Condition | Target Alert |
|---|---|---|
| `ticket.first_response_breached` | First response time elapsed without public staff reply | Re-dispatch on-duty queue lead |
| `ticket.next_response_breached` | Subsequent customer reply waiting time exceeded | Alert assigned team lead |
| `ticket.sla_breached` | Total resolution deadline elapsed without ticket resolution | Page incident response manager |
| `ticket.sla_warning` | Ticket approaches configured warning threshold | Notify assigned agent of impending breach |

Payload contains the `ticket_id`, the target breached ISO deadline timestamp in `from`, and `actor_id: null` (indicating a background automated timer event).

---

## 7. REST API Reference

### Update SLA Policy for Priority
```http
PATCH /api/v1/sla-policies/{priorityId}
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "first_response_time_minutes": 15,
  "next_response_time_minutes": 30,
  "resolution_time_minutes": 240,
  "respect_business_hours": false
}
```

### Configure Business Hours
```http
PUT /api/v1/business-hours
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

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
