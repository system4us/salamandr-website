---
title: "The ticket list"
description: Quick filters, the advanced filter builder, columns, sorting, saved views, and bulk actions on the main ticket queue.
---

Every edition, every agent. The list is the same generic filter/sort/column engine behind
[Reports](../reports/) and [Directory](../directory/), pointed at tickets — a filter you
can build here, you can build there, with no separate vocabulary to learn twice.

## Two views, your choice remembered

**Table** (sortable columns, dense) or **Cards** (one ticket per row, easier to scan on a
smaller screen) — a toggle in the bottom bar, remembered per browser. Column choices, filters,
search, sort and quick-filter selection are all remembered the same way, so the list looks the
way you left it the next time you open it.

## Quick filters

A one-click dropdown for the questions asked constantly: **Open**, **Unassigned**, **Breaching
SLA**, **My team's open tickets**, **Closed** (today / this week / this month / this year). These
aren't a separate mechanism — picking one just fills in the same filter conditions the builder
below edits, so "quick filter" and "hand-built filter" are the same thing at different speeds.
Two are worth knowing exactly what they mean:

- **Open/Closed resolve against every status flagged that way**, not a single hardcoded status
  name — a tenant with both "Open" and "Pending" marked as open statuses gets both, so the quick
  filter never quietly misses a status you renamed or added.
- **Breaching SLA** is the same `is_overdue` computed condition the backend's escalation sweep
  itself uses — never a client-side date comparison that could disagree with what actually
  triggers a breach.

## Quick search

The plain text box beside the filters searches **subject and every message body** — customer
replies and internal notes alike — via full-text search, not a substring scan: it matches whole
words with a prefix, so "factur" finds "facturación" but "tura" alone finds nothing. It's sugar
for one filter condition, added on top of whatever the builder already has.

## The advanced filter builder

Compose any number of conditions (all AND'd together) over: status, priority, type, team,
assigned agent, organization, requester email/name, channel (webform, email, telegram, webchat,
…), created/updated/closed dates, SLA due date, overdue, tags, logged time — plus any custom
field your tenant has defined for tickets. Each field only offers the operators that make sense
for its kind (a date field never offers "contains"; text fields autocomplete against real values
already in your data where that's useful, like requester email or channel).

## Columns

**Table view** only — pick which columns show and in what set (ticket #, subject, status,
priority, type, team, assigned agent, requester, organization, channel, tags, time spent, SLA,
created/updated/closed). Custom fields can be added as columns too. The picker is per-browser;
a **saved filter** (below) can also carry its own column set, so switching views can change what
you're looking at, not just which tickets are in it.

## Sort

Click any column header in table view to sort by it; click again to flip direction. Available on
every sortable column, not just the default (created date).

## Saved filters

Save the current conditions and column set under a name — **personal**, and it shows up both in
the filter menu here and as a shortcut in the sidebar's own Views group, so a view you use daily
doesn't need re-building. Saving over a name you already used updates that view in place rather
than creating a duplicate.

## Bulk actions

Check tickets (individually, or the page's select-all) and the bottom bar becomes an action
strip. **One field at a time by design** — status, priority, type, team, or assignee, plus adding
or removing one tag — because a multi-field bulk form invites changing more across dozens of
tickets than you meant to, and every one of these is its own request regardless. Up to 200
tickets per action; the response reports **partial success** honestly (`"14 updated, 2 failed"`)
rather than a flat "done" that hides what didn't take. Behind the scenes, a bulk action runs
through the exact same update path as editing one ticket by hand — audit events, SLA
recalculation, routing rules, webhooks and notifications all fire identically, just across a
selection instead of one ticket at a time.

## What a customer sees

The customer portal's own ticket list is deliberately simpler: no filter builder, no bulk
actions, no column picker — just their own tickets (or, if their organization has opted into
shared visibility, every ticket filed by a fellow member), sorted newest first.
