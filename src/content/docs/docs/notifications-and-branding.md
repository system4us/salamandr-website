---
title: "Notifications, branding & webhooks"
description: Editing the emails customers receive, branding the public Help Center, and pushing ticket events to your own systems.
---

## Notification templates

**Admin Panel → Notification Templates.** One editable email template per lifecycle event —
ticket created, resolved, team changed, and a new message added — so the wording, not just the
trigger, is yours to change. Each customer can also opt out of any of these independently from
their own portal, without affecting anyone else's preferences.

## Branding

**Admin Panel → Branding.** Replaces Salamandr's own logo, title and hero copy with yours on
the public [Help Center](../knowledge-base/) (`/help`) — logo image, site title, hero title
and tagline, and an accent color. Available in **every edition**, including Community; the one
thing gated to Enterprise is removing the "Powered by Salamandr" attribution itself, which is
computed at render time rather than read from a stored flag — a Community build can't turn it
off by editing the database directly.

## Outbound webhooks (Enterprise)

**Admin Panel → Webhook Endpoints.** Register a URL and Salamandr POSTs an HMAC-SHA256-signed payload
there whenever a subscribed event happens — supporting 26 distinct event types across tickets (`ticket.created`, `ticket.message_created`, `ticket.routed`, `ticket.status_changed`, etc.), SLA monitoring (`ticket.sla_breached`, `ticket.first_response_breached`, `ticket.next_response_breached`, `ticket.sla_warning`), CSAT surveys (`ticket.csat_rating_submitted`), directory entities (`customer.created`, `customer.updated`, `organization.created`, `organization.updated`), and WASM extensions (`extension.installed`, `extension.enabled`, etc.). Delivery is retried on a backoff ladder (1 minute, 5, 30, 2 hours, 6 hours) if
your endpoint is down, with manual retry and test send capabilities in the Admin Panel.

Only the tenant-configurable "send this to a URL I set up" admin feature is Enterprise-gated —
the underlying event-publishing mechanism itself runs in every edition, since [team chat
mirroring](../chatops/) and notification templates both depend on it. For complete payload schemas and signature verification examples, see the [REST API & Webhooks Reference](../api-reference/#22-real-time-outbound-webhooks).
