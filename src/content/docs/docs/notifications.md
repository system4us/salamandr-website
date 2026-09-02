---
title: "Email & Web Push Notifications"
description: Configuring event-driven email notification templates, VAPID browser push notifications, and agent quiet hours schedules.
---

Keeping agents and customers informed of ticket developments requires reliable, multi-channel notification pipelines. Salamandr supports customizable email templates and standard **W3C Web Push** notifications.

---

## 1. Notification Event Templates

Salamandr delivers automated transactional emails for critical lifecycle events:

| Event Identifier | Target Audience | Trigger Condition |
|---|---|---|
| `ticket.created.customer` | Customer | Confirmation email with ticket tracking number |
| `ticket.created.agent` | Assigned Agent / Team | New ticket opened in queue |
| `ticket.assigned` | Assigned Agent | Ticket reassigned to agent |
| `ticket.reply.customer` | Customer | Agent posted a public response |
| `ticket.reply.agent` | Assigned Agent | Customer replied to active thread |
| `ticket.resolved` | Customer | Resolution confirmation with CSAT survey link |
| `sla.warning` | Team Leads / Admins | Ticket approaching SLA deadline |

### Customizing Templates
Navigate to **Admin Panel &rarr; Settings &rarr; Notification Templates** to edit subject lines, HTML bodies, and localized translations.

---

## 2. Desktop Web Push Notifications (VAPID)

Agents can receive native desktop notifications when new tickets arrive or when they are assigned an urgent conversation:

- Operates via standard browser Web Push APIs with VAPID key pairs.
- Functions even when the agent does not have the helpdesk tab actively focused.

---

## 3. Agent Working Hours & Quiet Schedule

To respect staff work-life balance, agents can configure personal notification schedules:
- In **My Profile &rarr; Notification Preferences &rarr; Schedule**:
  - Set active notification windows (e.g. 09:00 to 18:00).
  - Push notifications are silenced automatically outside scheduled hours.

---

## 4. Outbound Webhooks (Enterprise)

Salamandr features a transactional, HMAC-signed outbound webhook engine to stream real-time events into your SIEM, CRM, data warehouse, or automation platforms (e.g. Zapier, n8n):

- **Comprehensive Event Catalog:** Supports **26 granular event types** spanning ticket lifecycle (`ticket.created`, `ticket.routed`, `ticket.status_changed`, `ticket.message_created`), SLA monitoring (`ticket.sla_breached`, `ticket.first_response_breached`, `ticket.next_response_breached`, `ticket.sla_warning`), CSAT feedback (`ticket.csat_rating_submitted`), directory entities (`customer.created`, `customer.updated`, `organization.created`, `organization.updated`), and WASM extension states (`extension.installed`, `extension.enabled`, etc.).
- **Durable Delivery:** Dispatches are enqueued within the same PostgreSQL transaction as the state change (`webhook.EnqueueTx`), eliminating dropped events and ghost notifications from rolled-back operations.
- **Resilient Retry Ladder:** Automatic exponential retries (1m, 5m, 30m, 2h, 6h) with delivery history logs, response time metrics, and manual replay capabilities.
- **Custom Request Headers:** Configure static authorization headers (e.g. `X-API-Key`, `Authorization`) per endpoint.

To register and manage endpoints, navigate to **Admin Panel &rarr; Settings &rarr; Webhook Endpoints** or consult the [REST API & Webhooks Reference](../api-reference/#22-real-time-outbound-webhooks).

---

## 5. REST API Reference

### Update Notification Template
```http
PATCH /api/v1/notification-templates/ticket.reply.customer
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "subject": "Re: [Ticket #{{ticket.number}}] {{ticket.subject}}",
  "body_html": "<p>Hi {{customer.name}},</p><p>{{message.body}}</p>"
}
```
