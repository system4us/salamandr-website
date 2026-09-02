---
title: "The ticket detail page"
description: A full tour of where agents spend most of their day — the conversation, the properties rail, the context rail, and side conversations into your team chat.
---

An agent spends the overwhelming majority of their day on one screen: a single ticket, open.
Everything else — the list, the filters, the dashboards — exists to get them here faster. This
page is a full tour of what's actually on it.

## Layout at a glance

Four regions, three of them collapsible and independently remembered (each rail's open/closed
state persists per browser, so an agent who never uses side conversations can keep that rail
shut without it reopening on every ticket):

```
┌─────────────────────────────┬───────────┬───────────┬───────────┐
│  Subject · #1234             │           │           │           │
│  Requester · Org · History   │ Properties│  Context  │   Side    │
├───────────────────────────── │   rail    │   rail    │   conv.   │
│  Conversation timeline       │           │           │   rail    │
│  (messages + events, mixed)  │ status    │ CRM /     │           │
│                               │ priority  │ issue     │ Slack /   │
│                               │ assignee  │ tracker   │ Mattermost│
│                               │ team      │ panels    │ thread    │
│                               │ type      │           │           │
│                               │ custom    │ e-commerce│ reply     │
│                               │ fields    │ (Ent.)    │ box       │
├───────────────────────────── │           │           │           │
│  Reply composer               │ tags      │ AI-assist │           │
│  (reply / note, attachments, │ time      │ (KB ask)  │           │
│  canned responses, meeting,  │ links     │           │           │
│  file request)                │ summary   │           │           │
└─────────────────────────────┴───────────┴───────────┴───────────┘
```

Only staff (admin/agent) sessions see the three rails at all — a customer viewing their own
ticket in the [self-service portal](../channels/) sees the conversation and a read-only
status/priority/type summary, nothing else.

## The header

Subject line (editable inline, with a **"Suggest with AI"** button — useful for a ticket that
arrived with a generic auto-filled subject like "WhatsApp: hola" and nothing more descriptive),
the ticket number, the requester's name and organization (each a link to a full customer/org
detail modal), a **view history** link (every other ticket this requester has filed), and — for
staff — an on-demand **sentiment indicator**: click to have the tenant's configured AI provider
rate the conversation positive/neutral/negative from the customer's own messages. It can also
fire automatically when a ticket resolves, if the tenant opted into that.

A thin **SLA burn bar** runs along the top of the header when the ticket has a due date — filled
proportionally to how much of the SLA window is gone, colored from calm to hot, so an agent
reads urgency at a glance without doing the due-date math themselves.

## The conversation

Messages and ticket events (status changes, assignments, tag edits, an internal note, a chat
thread opening) are interleaved into one chronological timeline — not two separate lists an
agent has to mentally merge. A few things distinguish one entry from another at a glance:

- **Internal notes** (`is_private`) render in a distinct warm tint — never visible to the
  customer, used for "here's what I actually think is going on" between agents.
- **Meeting summaries** carry their own pill and can be tied to a specific scheduled meeting,
  so "what did we agree on that call" has a real answer in the thread instead of living only in
  someone's memory.
- **Attachments** render inline when they're images, playable when they're audio, and as a
  download chip otherwise. Staff can **forward an attachment straight to a connected cloud
  storage provider** (Enterprise) with one click, right from the message it arrived on.

The view auto-refreshes every 20 seconds while the tab is visible, and immediately on a push
notification for that specific ticket — an agent doesn't need to reload to see a customer's
reply land, or a teammate's side-conversation answer show up.

## The composer

Below the conversation, one composer does several jobs depending on what's toggled:

- **Reply or internal note** — a plain switch, not two different screens.
- **Attachments**, drag-and-drop or picked.
- **Canned responses** — insert a saved reply body as a starting point.
- **Macros** — see [Staff, teams & routing](../configuration/) — bundle a reply with
  property changes and tags in one click.
- **Schedule a meeting** or **mark this reply as a meeting's summary**, without leaving the
  ticket.
- **Open a file request** (Enterprise) — send the customer a tokenised upload link for a file
  too large or too sensitive for an email attachment.

### Property changes stage, they don't apply immediately

This is the one mechanic worth understanding before anything else on the page: changing the
status, priority, assignee, team, type or a custom field in the Properties rail doesn't save
right away. It **stages** as a pending change — shown with an explicit "applies with your next
reply" banner and a **Discard** link — and commits together with whatever the agent sends next,
reply or internal note. Closing a ticket alongside a curt one-line reply, with no explanation,
is exactly the failure mode this prevents: the property change and the message that justifies it
are inseparable by construction, not by agent discipline.

## The Properties rail

- **Status, priority, assignee, team, type** — the core fields every routing rule and SLA policy
  can key off (see [Staff, teams & routing](../configuration/)).
- **Custom fields**, filtered to the ones that apply to this ticket's type.
- **Collaborators** — other staff cc'd on the ticket without being the assignee.
- **Tags** — free-form, created on the fly by typing an unknown name.
- **Time tracking** — log minutes spent, against a specific date (so Friday's work logged
  Monday still reports against Friday).
- **Linked tickets** — mark two tickets as related/duplicate/blocking, or merge one into the
  other (messages re-parent, the source closes, both sides keep an audit trail — there's no
  un-merge).
- **Internal summary** — a plain handoff note an agent writes for whoever picks the ticket up
  next; not AI-generated, just a persistent recap field, insertable into a reply.

## The Context rail

Renders only when there's something to show — no empty panel taking up space on a tenant that
hasn't configured anything here:

- **E-commerce context** (Enterprise) — live order/refund/coupon lookups against WooCommerce or
  Shopify, fetched on demand, never synced or cached.
- **Extension context panels** — one per installed CRM/issue-tracker/monitoring connector (the
  15 built-in Enterprise ones, or any community plugin you've written — see [Extension kinds &
  built-in plugins](../extension-kinds/)), each answering *"who is this person, or what's
  linked to this ticket, in that system"*, with clickable deep links and — where the connector
  supports it — a button to link, create, or write back into the vendor's own system.
- **AI-assist** — ask a question in plain language and get an answer drafted from the tenant's
  own uploaded documents and knowledge base articles, retrieved and embedded entirely through a
  local Ollama instance (see [Knowledge base & AI-assist](../knowledge-base/)). Free in every
  edition; the panel simply doesn't render at all if no AI provider is configured, rather than
  showing a button that always fails.

Nothing in this rail ever sends anything to the customer on its own — every answer is inserted
into the reply composer for the agent to read, edit and send, the same "propose, don't act"
shape the macro and summary panels use.

## Side conversations

The feature this page exists to explain in depth: **the ticket's own thread inside your team's
actual chat tool** — Slack, Microsoft Teams, Mattermost, Discord or Zulip (see
[Editions](../editions/) for which of these are Community vs. Enterprise) — with a composer
to answer that thread **without ever leaving the ticket**.

### Why it exists

The realistic alternative is an agent alt-tabbing to Slack, finding the right channel, typing
"hey does anyone know about ticket #4821", getting an answer, and then manually copying that
answer back into the ticket so there's a record of it. Side conversations collapse that into one
screen and make the record automatic — the question and the answer both live in the ticket's own
timeline, not just in a chat channel someone will eventually lose scroll-back access to.

### Opening one

An agent picks:

- **Which provider** — whichever chat integrations the tenant has connected.
- **Which channel** — teams can have their own routing, so "Billing" and "Infra" land in
  different channels automatically rather than the agent hunting for the right one.
- **An optional status to switch to** — specifically one flagged to *pause the SLA clock*, for
  the realistic case of "I can't resolve this until Infra answers, and the customer's SLA
  shouldn't burn while I wait."
- **An opening note**, sent as the thread's first message.

### Reading and replying

Replies from the chat side are captured back automatically and grouped into **turns** —
consecutive messages from the same person collapse into one card instead of a wall of
one-line bubbles, the same way a real chat client would show them. Older history loads on
demand rather than all at once. **@mentions work from inside the ticket** — typing a colleague's
name resolves to their real chat handle, the same as typing it directly in Slack would.

The thread's own state is never hidden: a root post that failed to send, or one still pending
delivery, shows as exactly that rather than silently looking like nothing happened — the retry
happens automatically in the background, and the agent doesn't have to guess whether their
opening question actually reached anyone.

### What this buys you, concretely

- **One tool, not two.** An agent never has to choose between "answer the customer" and "ask a
  teammate" as separate contexts — both happen from the same ticket.
- **The SLA can pause for exactly the reason it should** — waiting on an internal answer, not
  waiting on the customer.
- **Nothing said about a ticket lives only in chat.** Every side-conversation reply is part of
  the ticket's permanent record, searchable and auditable the same as everything else on it —
  the opposite of institutional knowledge trapped in a channel that scrolls away.
