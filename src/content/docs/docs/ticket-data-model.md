---
title: "Ticket types, custom fields & tags"
description: Shaping what a ticket actually captures — ticket types, custom fields on tickets/customers/organizations, and the tag vocabulary.
---

Before routing rules and SLA policies mean anything, a ticket needs somewhere to put the
information specific to *your* support process — a warranty claim needs a serial number, a
B2B helpdesk needs an account tier. Three tools shape that.

## Ticket types

**Admin Panel → Ticket Types.** A type is a name, a sort position, and (for exactly one type)
a "default" flag — the type a ticket gets when nothing else picks one. Routing rules and SLA
policies can both key off type, so "Bug" and "Billing Question" behaving completely differently
downstream is a couple of clicks, not a code change.

## Custom fields

**Admin Panel → Custom Fields.** A field belongs to one of three entities — **tickets**,
**customers**, or **organizations** — and is one of seven types: text, multi-line text, number,
date, checkbox, dropdown, or multiselect (the last two need at least one option defined before
they'll save). A dropdown/multiselect field on tickets works the same way ticket type does for
routing and SLA purposes — it's just data until a rule references it.

## Tags

**Tags** are a free-form label vocabulary, created on the fly: an agent typing an unknown tag
name into a ticket creates it, case-insensitively, so "Bug" and "bug" can't silently become two
different tags. There's no separate "tag admin" screen to pre-populate — the vocabulary grows
from actual usage, and existing tags are simply suggested as an agent types. Tags are also what
[macros](../configuration/) can add or remove as part of applying one.
