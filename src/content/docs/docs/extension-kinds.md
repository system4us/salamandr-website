---
title: "Extension kinds & built-in plugins"
description: The five kinds of WASM extension Salamandr can install, and the 15 ready-made connectors that ship under Enterprise.
---

There are two independent questions about any extension: **what kind of thing does it do**, and
**who wrote and maintains it**. This page covers both — the five functional kinds the plugin
host understands, and the list of connectors this project itself builds, ships and keeps
working, as opposed to one you'd write yourself with the [plugin SDK](../build-a-plugin/).

**The plugin *host* is free in every edition.** Community and Enterprise run the exact same
`internal/extwasm` engine, the exact same sandbox, the exact same install flow. What's
Enterprise is a specific list of pre-built, project-maintained plugins — covered at the bottom
of this page — not the ability to run a plugin at all.

## The five kinds

A manifest's `kind` field does two different jobs depending on which of these five families it
names: for the four listed first below, it's purely **informational** — it groups the extension
in the Admin Panel and changes nothing the runtime allows. For the last three, `kind` also
**changes what the manifest is required to declare** — which entrypoints, which sidecar
database row an install creates, which second enable/disable flag `SetEnabled` has to keep in
sync.

### Context tools

`crm`, `erp`, `msp`, `field_service`, `issue_tracker`, `tasklist`, or `custom` — seven labels for
the same contract: answer *"who is this person, or what's linked to this ticket, in my
system?"* when an agent opens the ticket sidebar. This is what [Build a plugin](../build-a-plugin/)
walks through end to end — `fetch_context`, optionally `action_ops` for writing back, optionally
`link_op`/`create_op`/`read_ops` for binding a ticket to an existing record or creating one.
Every community-authored plugin most people write is this kind.

### Channel

`kind = "channel"` — a ticket-creation channel, the community counterpart to the native
Telegram/WhatsApp-style adapters this project ships directly. Registers `channel_receive` (an
inbound webhook delivery becomes a ticket or a reply) and `channel_send` (an agent's reply goes
back out over the channel). One installed channel plugin can serve **multiple sources** — three
Telegram bots through one installed extension, not three separate installs — each with its own
webhook token and delivery URL via `host_self`.

### Chatops

`kind = "chatops"` — a team-chat mirror, the community counterpart to this project's native
Slack/Mattermost/Discord/Zulip/Teams providers. Every chatops plugin implements
`chatops_post_root`/`chatops_post_reply` (posting a ticket's activity into a thread); how it
*receives* a reply depends on the vendor's own shape:

- **Webhook-delivered** (Slack/Teams-shaped) — `chatops_receive`, an ordinary inbound webhook.
- **Persistent connection** (Mattermost/Zulip/Discord-shaped) — declares
  `scopes.persistent_connection` and implements `persistent_receive` instead. The host holds an
  actual long-lived connection open — a websocket it dials, or a repeated long-poll request —
  and drives the guest with one bounded call per inbound event, so the plugin itself stays just
  as stateless as any other entrypoint. A websocket transport can call `host_ws_send` to push a
  frame onto the socket the host is holding open for it; a long-poll transport needs nothing
  extra — its handler just makes its own blocking HTTP call.

### Connector

`kind = "connector"` — an OAuth meeting/calendar integration, the community counterpart to this
project's native Teams/Zoom/Meet (video) and Outlook/Google Calendar (calendar sync) providers.
A plugin offers the three-method video-conferencing trio
(`connector_create_meeting`/`connector_update_meeting`/`connector_delete_meeting`), declares
`scopes.calendar_sync` and implements its four calendar entrypoints, or both under one installed
instance — a pure calendar-sync plugin never has to fake a video capability it doesn't have.
`kind = "connector"` always requires OAuth (`scopes.oauth = true`, an `[oauth]` table, and
`oauth_client_id`/`oauth_client_secret` in `config_keys`) — `host_oauth_fetch` runs the entire
token exchange host-side, so the guest never sees a client secret or an access token directly.

### Storage

`kind = "storage"` — a cloud storage / file-request connector: an agent binds a ticket to a
folder, sends a file-request link, and the customer's upload lands in that storage. In
principle a community author could implement this kind as an ordinary WASM guest; in practice
every storage connector this project ships is `native = true` — implemented in Go rather than
WASM, because streaming tens of gigabytes through connection pools and vendor SDKs isn't
something a sandboxed guest with a 16MB memory limit and a 5-second call timeout can do. `native`
is refused for any manifest name outside this project's own reserved list — nothing stops a
plugin from *claiming* to be a trusted native connector by name.

## Built-in plugins — Enterprise

These 15 connectors are what "Enterprise adds ready-made connectors" (see
[Editions](../editions/)) actually refers to — pre-built, reviewed, and kept working by this
project, gated behind `license.ModuleCRM`. Community gets the identical plugin host and SDK to
build any of these yourself; what a license buys is not writing and maintaining the integration
code.

| Kind | Connectors |
|---|---|
| CRM | HubSpot |
| MSP / monitoring | Zabbix |
| Issue tracker | Jira, GitHub Issues, Linear, Redmine |
| Task list | Trello, Asana |
| Storage | Dropbox, Box, Google Drive, OneDrive, an S3-compatible bucket, a local/mounted filesystem, FTP/FTPS/SFTP |

A few things worth knowing about how these are built, since they're not a special case of the
plugin system — they're ordinary plugins that happen to ship inside the binary:

- **Same install path as any other plugin.** Enabling one goes through the same manifest-review
  and explicit-scope-consent flow described in [Build a plugin](../build-a-plugin/) — the
  difference is the bytes come from this project instead of a URL or a file you built yourself.
- **The license check runs at install, not just at enable.** An install that could never be
  turned on without a license is refused up front rather than becoming a dead row in the
  extension list.
- **A manifest can't forge one of these names.** Claiming to be `hubspot` without shipping the
  exact bytes this project actually built is refused — the binary is checked by hash, not
  trusted because of what its manifest claims.
- **HubSpot and Zabbix are context tools first**, surfacing in the ticket sidebar like any
  community CRM plugin would; Zabbix additionally runs a preventive-incident webhook that turns
  a monitoring alert straight into a deduplicated ticket, independent of the sidebar panel.
  Jira/GitHub/Linear/Redmine/Trello/Asana add the link/create/picker surface described in [Build
  a plugin](../build-a-plugin/#linking-creating-and-read-only-pickers) on top of the base
  context-tool contract, so an agent can link or open an issue without leaving the ticket.

## Extension Lifecycle & Action Webhooks

Salamandr publishes real-time outbound webhooks for extension management and agent interactions:

- **Lifecycle Events (`extension.*`):** Whenever an extension is added, activated, deactivated, or removed, Salamandr emits `extension.installed`, `extension.enabled`, `extension.disabled`, or `extension.uninstalled` (carrying `{ id, name, kind }`).
- **Interactive Action Events (`ticket.extension_action`):** When a staff agent executes a custom connector action from the context sidebar (e.g. logging a CRM call or syncing to an issue tracker), `ticket.extension_action` publishes the action identifier and execution result into your outbound webhook stream.

## Writing one of your own

If what you need isn't on that list — or you'd rather not wait on a license — the entire path
is open: [Build a plugin](../build-a-plugin/) walks through a complete, working example from
an empty `cargo new` to installing the compiled binary, in Rust or AssemblyScript, with no
Enterprise license and no different API than the connectors above use internally.
