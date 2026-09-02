---
title: "Directory: customers & organizations"
description: The CRM side of Salamandr — customer records, organizations, VIP flags, and the fields that feed routing rules.
---

**Admin Panel → Directory** (also reachable to any agent, not just admins) has two tabs:
customers and organizations. Every person who's ever filed a ticket has a record here, and
every organization they belong to has one too — both share the same advanced-filter,
column-picker and saved-view machinery the [ticket list](../ticket-detail-page/) uses, so
building a segment like "VIP customers in Germany with no ticket in 30 days" is the same
mechanic either place.

## Customers

A customer record holds:

- **Name, email, phone**, plus **alternate emails** — other addresses the same human is known
  by. This is what lets a context-tool [plugin](../build-a-plugin/) resolve "who is this" from
  more than one address, and what threading uses to recognize a reply from a second inbox as the
  same person.
- **Department, country, zone** — free text, yours to define. Their entire purpose is
  [routing rules](../configuration/): "requester department equals Billing" is a real
  condition a rule can match on.
- **VIP** (a flag) and **VIP level** (a number) — also routing-rule material, and independent of
  any vendor's own VIP concept (the built-in HubSpot connector reads *HubSpot's* deal-amount
  signal for its own VIP badge — a different, external notion of VIP from this native flag).
- **Guest** and **Active** flags.
- **Organization** and, if they belong to one, **org admin** — a customer-side role, unrelated to
  Salamandr's own staff roles, that lets *this specific person* self-serve their organization's
  [SSO settings](../access-control/) from their own portal once a tenant admin has opted the
  organization into that.
- **Custom fields** (see [Ticket types, fields & tags](../ticket-data-model/) — customers are
  one of the three entities a custom field can belong to) and **notes** (free text).
- A **tag profile** — not tags applied to the customer directly, but derived live from every tag
  on every ticket they've filed. There's nothing to maintain here; it just reflects reality.

The same underlying form edits a customer and a staff account (admin/agent) — see
[Staff, teams & routing](../configuration/) for the invite flow. What's customer-specific
(VIP, org admin, department/country/zone) simply doesn't render for a staff row, and vice versa
(a staff row's "max concurrent conversations" cap doesn't render for a customer).

## Organizations

An organization holds a name, domain, website, phone, address and notes, plus:

- **"Members can see all tickets for this organization"** — off by default. Turn it on and any
  customer in the org can read every ticket filed by anyone else in it, not just their own. This
  is deliberately a read-only grant: editing a ticket's properties, and dispatching a reply on a
  message you didn't author, both stay staff-only regardless of this setting (see the ticket
  detail page's [property-staging](../ticket-detail-page/) behavior — none of it is reachable
  by a customer session, org-shared ticket or not).
- **SSO self-service** — the tenant admin's opt-in that lets the organization's own org-admin
  customer configure [customer-organization SSO](../access-control/) without a staff member
  doing it for them.
- **Custom fields** (entity `organization`) and a **tag profile**, derived the same way a
  customer's is — from every ticket anyone in the organization filed.
- A **Zabbix host-group link** (Enterprise) — a one-time, manual bridge from this organization to
  a Zabbix host group, so the [MSP connector](../extension-kinds/) knows which monitored
  environment belongs to which customer organization. Nothing infers this automatically; an
  agent sets it once.

Organization membership itself is assigned from the customer's side (the Organization picker on
a customer's own record) — there's no separate "add member" action on the organization.

## Filtering and saved views

Both tabs' advanced filters key off the fields above directly — name/email/phone/department/
country/zone as text, VIP/active/guest as booleans, VIP level as a number, organization and tags
as pickers, created-date as a date range. Any combination can be saved as a personal view from
the same **Saved Filters** menu the ticket list uses, and columns are pickable independently of
which filter is applied.
