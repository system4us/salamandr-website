---
title: "Website live chat"
description: Embedding the live chat widget, the security model behind an unauthenticated public endpoint, and the real-time agent console.
---

A small, dependency-free chat widget you embed on your own site — every edition, no premium
gate. A visitor types with no account; their message becomes a ticket, and a reply from that
ticket goes straight back into their chat window.

## Setting up a widget

**Admin Panel → Sources → Website chat.** A tenant can run more than one widget (a support
site and a sales site, say), each with its own settings:

- **Allowed origins** — see [the security model](#the-security-model-allowed-origins) below;
  nothing else here matters if this is wrong.
- **Title, greeting, accent color, position, locale** — the widget's language follows the page
  it's embedded on, then the visitor's browser; setting a locale here overrides both.
- **Require name / require email** — what the pre-chat form asks for before a visitor can type.
- **Offline message** and an optional **business hours** check, so the widget can say honestly
  that nobody's around right now instead of implying someone is.
- **Proactive chat** — after a configurable delay (and optionally only on pages matching a URL
  pattern, like `/pricing`), the widget opens itself with a message instead of waiting to be
  clicked.
- **Privacy**: an **idle timeout** (default 30 minutes) that ends a conversation nobody's
  touched, a **retention window** (default 90 days) that scrubs a finished conversation's
  identifying context — address, user agent, referrer, page trail — while leaving the ticket and
  its messages alone, and toggles for whether the visitor's **IP** and **page trail** are stored
  at all.

Saving gives you an **embed snippet** — one `<script>` tag to paste before `</body>` on your
site. The widget itself has no external dependencies and makes no requests to any third party;
every call goes back to the origin it was loaded from.

## The security model: allowed origins

Every widget endpoint has to be reachable by a stranger's browser with no login — so "may this
page talk to this widget" has exactly one signal available: which site the request came from.
**An empty allowed-origins list denies everything**, on purpose — a widget you've created but not
yet configured is inert, not open. One origin per line; a leading `*.` wildcard is supported for
subdomains. Two things worth being precise about, because the feature is easy to over-trust:

- **It stops embedding, not scripted abuse.** Origin is a browser-set header no page script can
  forge, so it reliably stops someone else putting your widget on *their* site in front of *their*
  visitors — the actual attack. It's not a request signature, so a script hitting the API
  directly (no browser, no Origin header worth trusting) isn't stopped by this; that's what the
  separate per-visitor/IP/tenant rate limits are for. Neither substitutes for the other.
- **It's not a same-origin guarantee for you.** Listing a domain you don't fully control
  allowlists whoever does.

## How a chat becomes a ticket

A visitor's first message creates a placeholder guest account (an address like
`<visitor-id>@webchat.invalid`) and a ticket, same as any other channel. If they later fill in a
real name and email — through the pre-chat form or mid-conversation — that placeholder is
promoted in place, or, if the typed address already belongs to a customer, the conversation is
repointed onto that existing account instead of leaving two addresses for the same person.

## The live chat console

**Admin Panel → Live Chat**, Olark-shaped: a queue of active conversations on the left, the open
one on the right. Two lists that look similar and aren't:

- **Presence** — everyone currently on your site right now, refreshed every ten seconds. Most
  visitors here have said nothing; it's "who's browsing," not "who's chatting."
- **Conversations** — the durable half, each backed by a real ticket the moment a visitor writes
  something. The queue you actually work is conversations with a ticket, not the full presence
  list.

Everything that needs to feel instant — a new message, someone starting to type, a chat ending —
arrives over one held connection (server-sent events) instead of polling, so a reply appears the
moment it's sent rather than on the next refresh tick. A new conversation plays a chime, so a
console open on a background tab still gets your attention.

From an open conversation you can **claim** it (so it stops showing as unclaimed to other
agents) or **release** it back, see the visitor's **page trail** — what they were looking at
before and during the chat — right above the transcript, send an **invite** to someone still
just browsing to start a proactive chat with them, **block** a visitor (by browser or by address)
if the conversation turns abusive, **erase** their context to answer a privacy request without
touching the ticket record itself, or **end** the chat outright.

"An agent is available," as far as the widget is concerned, means **the console is open** on at
least one agent's screen right now — not that someone happens to be logged in. That check, and
the business-hours check above, both fail open: if either can't be evaluated, the widget assumes
someone's there rather than telling a real visitor nobody is.

## Attachments and ratings

Files move both ways — a visitor can attach a file to a message (5MB limit, type-checked allowlist), and an agent can send one back. When `CLAMAV_ADDR` is configured, visitor uploads are scanned in real-time by ClamAV before hitting storage; infected files or scanner timeouts fail-closed and reject the upload.

When a chat ends, the widget can offer a satisfaction rating; declining to close the chat window immediately is deliberate, so the rating prompt and the "chat ended" state never race each other.
