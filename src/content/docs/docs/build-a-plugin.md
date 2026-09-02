---
title: "Build a plugin"
description: A complete, from-scratch walkthrough of writing a Salamandr extension — the manifest, the code, testing without a server, and installing it.
---

A plugin is a small sandboxed WebAssembly binary that answers one question when an agent opens
a ticket — *"who is this person in my system?"* — and renders the answer in the ticket sidebar.
You don't need the Salamandr source to write one, and you don't need permission from this
project either: an admin installs whatever binary they choose to trust, the same way they'd
install any other piece of software.

There are two official SDKs — **Rust** and **AssemblyScript** (TypeScript that compiles to
WebAssembly) — implementing the exact same contract: same ABI, same manifest format, same wire
protocol. A plugin built with either is indistinguishable to the server. This page walks through
the Rust SDK; everything below has a direct AssemblyScript equivalent if TypeScript is your
language of choice.

## What a plugin can actually do

Everything is opt-in, one capability per line in your manifest, approved explicitly by whoever
installs your plugin:

| Capability | Function | Needs |
|---|---|---|
| One outbound HTTP call at a time | `http_fetch` | `scopes.http_hosts` |
| Tenant-supplied config and secrets | `get_config` | `scopes.config_keys` |
| A small private key/value store | `kv_get` / `kv_set` / `kv_delete` / `kv_list` | `scopes.kv` |
| The tenant's own helpdesk data | `core::*` | `scopes.core` |
| Upload a file the host handed you | `http_upload` | `scopes.http_hosts` |
| Your own installation's identity and delivery URLs | `self_info` | nothing |
| Write to the server log | `log` | nothing |

**There is nothing else.** No filesystem, no environment variables, no sockets, no clock but the
host's own, no WASI — a plugin compiles to freestanding `wasm32-unknown-unknown`, so there's no
operating-system surface for the sandbox to have to close off. That's what turns installing a
third-party binary from a leap of faith into something an admin can actually review: read the
five-line manifest, know exactly what it can reach.

## Set up the project

```sh
rustup target add wasm32-unknown-unknown   # once
cargo new --lib my-plugin && cd my-plugin
```

```toml
# Cargo.toml
[lib]
crate-type = ["cdylib"]          # not rlib — an rlib exports nothing a host can call

[dependencies]
salamandr-plugin-sdk = "0.3"
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[profile.release]
opt-level = "z"
lto = true
strip = true
panic = "abort"
```

The smallest possible plugin is genuinely small:

```rust
// src/lib.rs
use salamandr_plugin_sdk::{plugin, ContextBlock, ContextRequest, ContextResult};

fn fetch_context(req: ContextRequest) -> ContextResult {
    let Some(email) = req.primary_email() else { return Ok(vec![]) };
    Ok(vec![ContextBlock::new("My CRM").field("Email", email)])
}

plugin! {
    name: "my-plugin",
    version: env!("CARGO_PKG_VERSION"),
    context_ops: {
        "fetch_context" => fetch_context,
    }
}
```

```sh
cargo build --release --target wasm32-unknown-unknown
# -> target/wasm32-unknown-unknown/release/my_plugin.wasm
```

That compiles and installs, but it doesn't do anything useful yet. The rest of this page builds
a real one — a CRM connector that looks a requester up by email, shows their plan and lifetime
value, and lets an agent log a note back into the vendor's system — line by line.

## The manifest

`manifest.toml` ships next to your `.wasm` and **is the entire security contract**. Nothing
outside `[scopes]` is reachable at runtime, and the host enforces that on every single call, not
just at install. Ask for the least that makes your plugin work — every line here is one a
stranger's admin has to read and personally decide to trust.

```toml
# Lowercase letters, digits, "_" and "-"; 2-64 chars. Re-installing under
# the same name replaces the existing extension in place (its stored
# config survives) instead of creating a second one, and leaves it
# disabled so the admin re-consents to whatever the new manifest asks for.
name = "hello-crm"
version = "0.1.0"

# One of: crm, erp, msp, field_service, issue_tracker, tasklist, storage,
# custom. Informational only — groups the extension in the admin UI and
# never changes what the runtime allows.
kind = "crm"

author = "Your Name"
description = "Shows a requester's Acme CRM contact and their recent ticket count."

# Every operation the binary implements. fetch_context is mandatory for a
# community extension — it's what the ticket sidebar calls. The host asks
# the binary itself what it registered (the `describe` export the plugin!
# macro generates) and refuses an install where the two disagree — a typo
# here, or a stale manifest after you rename a function, fails loudly at
# install time instead of silently doing nothing.
entrypoints = ["fetch_context", "log_note"]

[scopes]
# Hosts http_fetch may dial. Exact match, or one leading "*." wildcard:
# "*.acme-crm.com" matches "eu.api.acme-crm.com", not "acme-crm.com"
# itself. Omit this table entirely and the plugin has no network access
# at all.
http_hosts = ["api.acme-crm.com"]

# Config/secret keys the tenant fills in (encrypted at rest) that
# get_config may read. A key not listed here can't be read even if the
# tenant sets it under that name some other way.
config_keys = ["api_key"]

# core = ["users:read", "tickets:read"]   -- see the table below
```

A few rules worth knowing before you hit them the hard way:

- **Unknown fields are rejected outright**, not silently ignored — a typo'd scope name fails at
  install rather than granting nothing and leaving you to wonder why a call is refused.
- **`entrypoints` must match what the binary registered, in both directions.** Claim an op the
  binary doesn't have, or hide one it does, and install is refused.
- **`http_hosts` wildcards** are host-only and case-insensitive; never applied to the path.
- **Re-installing under the same `name`** keeps stored config but re-requires the enable
  consent — a version bump that adds a scope doesn't silently start using it.

### Core scopes: what your plugin can read and write in the helpdesk itself

`core` entries are `<resource>:read` or `<resource>:write` — **neither implies the other**, so a
plugin that tags tickets doesn't thereby get to read every ticket in the tenant.

| Resource | Read | Write |
|---|---|---|
| `tickets` | `get`, `list_by_requester`, `list_by_organization`, `messages` | `add_note`, `create`, `update` |
| `tags` | `list`, `for_ticket` | `add_to_ticket`, `remove_from_ticket` |
| `users` | `list`, `get`, `by_email` | `upsert` |
| `organizations` | `list`, `get`, `by_domain`, `members` | `upsert` |
| `teams` | `list`, `members` | — |
| `ticket_types` / `ticket_statuses` / `ticket_priorities` | `list` | — |
| `sla_policies` | `list`, `for_priority` | — |
| `custom_fields` | `list` | — |
| `business_hours` | `get` | — |

Reads are scoped to the tenant by row-level security, the same as everything else in the
product. Writes go through the same domain services the Admin Panel itself uses — a tag your
plugin adds writes the identical audit event an agent's would.

## `fetch_context`: the operation that matters

Every community plugin implements it; installing without it is refused. This is what the ticket
sidebar calls the moment an agent opens a ticket.

```rust
fn fetch_context(req: ContextRequest) -> ContextResult
```

**In** — `ContextRequest { ticket_type_id: Option<String>, candidate_emails: Vec<String> }`. The
addresses are the requester's own plus any alternates the helpdesk knows for the same human,
primary first. That's the only identity signal you get: a context tool never creates tickets, so
there's no per-vendor id on the ticket to look up by yet.

**Out** — `Vec<ContextBlock>`: one titled group of label/value pairs per match, plus optional
deep links and actions.

```rust
use salamandr_plugin_sdk::{core, get_config, http_fetch, HttpRequest, OpError};

const API_BASE: &str = "https://api.acme-crm.com/v1";

fn fetch_context(req: ContextRequest) -> ContextResult {
    // A key declared in the manifest but never filled in by the tenant is
    // Ok(None) — a real, expected state, not a bug. `?` on a host call
    // works because HostError converts into OpError.
    let Some(api_key) = get_config("api_key")? else {
        return Err(OpError::NotConfigured);
    };

    for email in req.emails() {
        if let Some(contact) = find_contact(&api_key, email)? {
            return Ok(vec![block_for(&contact, email, &req)]);
        }
    }
    Ok(vec![])
}
```

**`Ok(vec![])` is the right answer for "this requester isn't in my system."** `Err` means *I
could not answer* — unconfigured, or the vendor is down — and shows up as a logged failure the
plugin's author can go look at. Getting this distinction backwards either shows every requester
a blank panel for no reason, or hides a real outage as if it were simply "nothing found."

Building the block itself is declarative:

```rust
fn block_for(contact: &Contact, email: &str, req: &ContextRequest) -> ContextBlock {
    ContextBlock::new("Acme CRM")
        .field("Name", if contact.full_name.is_empty() { email } else { &contact.full_name })
        .field_opt("Company", contact.company.clone())          // skipped when None or blank
        .field_opt("Plan", contact.plan.clone())
        .field_opt("Lifetime value", contact.lifetime_value.map(|v| format!("${v:.2}")))
        .field("Raised on", format!("Ticket #{}", req.ticket_number))
        .action("Open in Acme CRM", format!("https://app.acme-crm.com/contacts/{}", contact.id))
}
```

Every enabled extension's blocks are concatenated into one sidebar list, so title yours after
the vendor ("Acme CRM"), not something generic like "Contact." Formatting is entirely yours —
nothing downstream reformats a value, so render money, dates and numbers the way an agent should
actually read them.

Reading a vendor's HTTP response means treating its status code as *your* business, not the
host's:

```rust
fn find_contact(api_key: &str, email: &str) -> Result<Option<Contact>, OpError> {
    let url = format!("{API_BASE}/contacts?email={}", percent_encode(email));
    let resp = http_fetch(HttpRequest::get(url).header("Authorization", format!("Bearer {api_key}")))?;

    // http_fetch only errors when the *call* itself failed. A 4xx/5xx is a
    // successful round trip carrying a status.
    match resp.status {
        200 => {
            let found: ContactSearch = serde_json::from_str(&resp.body)
                .map_err(|e| OpError::Other(format!("unreadable CRM response: {e}")))?;
            Ok(found.results.into_iter().next())
        }
        404 => Ok(None),
        401 | 403 => Err(OpError::NotConfigured),
        429 => Err(OpError::RateLimited { retry_after: resp.header("Retry-After").map(str::to_string) }),
        status if status >= 500 => Err(OpError::Transient(format!("Acme CRM returned {status}"))),
        status => Err(OpError::Other(format!("Acme CRM returned {status}"))),
    }
}
```

## Actions: writing back

A block can do more than display information. An **executable action** renders as a button in
the expanded context view: the agent fills in whatever fields you declared, confirms, and the
host calls your operation — which writes into the vendor's system under the agent's name.

Build the action at the same place you build the block, because that's where the vendor's own
ids already are — the agent's browser has no way to learn a CRM contact id on its own, and
re-resolving one on every click would spend a second vendor round trip for nothing:

```rust
ContextBlock::new("Acme CRM")
    .field("Name", "Ada Lovelace")
    .run(
        Action::run("Log a note for the account owner", "log_note")
            .param("contact_id", contact.id.clone())
            .textarea("body", "Note", true)
            .placeholder("What should the account owner know about this ticket?")
            .confirm("This writes into Acme CRM. Continue?"),   // optional
    )
```

The handler's signature is fixed the same way `fetch_context`'s is:

```rust
fn log_note(req: ActionRequest) -> ActionResult {
    let Some(api_key) = get_config("api_key")? else { return Err(OpError::NotConfigured) };
    let contact_id = req.param("contact_id")?;
    let body = req.input("body")?;

    let payload = serde_json::json!({
        "contact_id": contact_id,
        // req.signature() is the host's own stamp — who ran this, from
        // which ticket, when. Sign what you write with it: a note whose
        // author is "the integration" leaves nobody to ask a follow-up.
        "body": format!("{body}\n\n— {}", req.signature()),
    });
    let resp = http_fetch(
        HttpRequest::post(format!("{API_BASE}/notes"), payload.to_string())
            .header("Authorization", format!("Bearer {api_key}"))
            .header("Content-Type", "application/json"),
    )?;
    match resp.status {
        200 | 201 => Ok(ActionOutcome::new("Note logged in Acme CRM")
            .url(format!("https://app.acme-crm.com/contacts/{contact_id}"))),
        401 | 403 => Err(OpError::NotConfigured),
        status => Err(OpError::Other(format!("Acme CRM returned {status}"))),
    }
}
```

Two things separate an action from a read, and both are the host's doing, not a convention
you're trusted to remember: it must be registered in the `action_ops` block below — nothing
outside that block is reachable from a button click — and the request always carries the
signature the host itself stamped, never one the browser could forge.

## Wiring it together: `ops` vs `context_ops` vs `action_ops`

```rust
plugin! {
    name: "hello-crm",
    version: env!("CARGO_PKG_VERSION"),
    context_ops: {
        "fetch_context" => fetch_context,
    },
    action_ops: {
        "log_note" => log_note,
    }
}
```

`fetch_context` goes in `context_ops` — the host decodes its answer straight into its own type.
Putting it in the plain `ops` block instead compiles fine and then fails at install, on
purpose: that block's wire shape (an internally-tagged `{"kind":"ok","data":…}` envelope) exists
only for first-party connectors with a matching Go-side decoder, not for a community plugin.
Writes always go in `action_ops`, never either of the other two — it's the only block the host
will invoke from a click, and it refuses anything not named there.

## Linking, creating, and read-only pickers

Three more entrypoints turn a read-only context tool into something closer to a full issue
tracker: **linking** a ticket to an existing vendor record, **creating** a new one, and a
**picker** endpoint the ticket sidebar's dropdowns call directly.

```toml
entrypoints = ["fetch_context", "log_note", "link_issue", "unlink_issue", "create_issue", "list_projects"]

# Which of the entrypoints above the sidebar's picker endpoint may call
# directly — read-only, never a write.
read_ops = ["list_projects"]

# Name entrypoints already registered under `ops` — all three optional
# and independent; declare only what your connector actually supports.
link_op   = "link_issue"
unlink_op = "unlink_issue"
create_op = "create_issue"

# Names a read_ops entry (plain data, no network call) that answers the
# create form's own field list, so the sidebar renders real typed inputs
# instead of a raw JSON textarea. Must also appear in read_ops.
create_form_op = "create_issue_form"
```

A picker answers `{value, label}` pairs — the one shape every dropdown converges on regardless
of what your vendor's own API calls those fields. Fields can **cascade**: a `select` naming
another field in `depends_on` stays disabled and unfetched until that field has a value, then
calls its own `options_op` with that value as a query param, exactly the way choosing a Jira
project narrows the issue-type list before it's usable. Only one level deep — there's no way to
express "C depends on B depends on A" in this schema.

## Testing without a server

### `cargo test`

On non-wasm targets, the SDK links your plugin against an in-process mock host — your operations
run natively, with your **real manifest's scopes actually enforced**:

```rust
use salamandr_plugin_sdk::testing::MockHost;
use salamandr_plugin_sdk::HttpResponse;

#[test]
fn renders_a_contact() {
    let _host = MockHost::from_manifest(include_str!("../manifest.toml"))
        .config("api_key", "test-key")
        .http(|_| Ok(HttpResponse { status: 200, body: CONTACT.into(), ..Default::default() }))
        .core("users", "by_email", serde_json::json!({"id":"u_1","email":"a@b.com","name":"A","role":"customer"}))
        .install();

    let blocks = fetch_context(request("a@b.com")).expect("fetch_context");
    assert_eq!(blocks[0].title, "Acme CRM");
}
```

A scope you forgot to declare fails **your test**, not a customer's ticket in production.
`MockHost` simulates scopes, config, kv, core and HTTP; it does not simulate the wasm sandbox
itself, the call timeout, or the memory limit — for that, there's `salamandrsdk`.

### `salamandrsdk`: the real runtime, no server needed

`salamandrsdk` runs your compiled `.wasm` under the exact wazero engine, manifest parsing, scope
enforcement and install-time verification the production server uses, against a fixtures file.
Run it with `npx` — nothing to install, and it fetches the binary for your platform:

```sh
npx salamandrsdk run \
          -wasm target/wasm32-unknown-unknown/release/my_plugin.wasm \
          -fixtures fixtures.json -email ada@example.com
```

It is also attached to every tagged release as a plain binary, if you would rather have it on
your PATH than go through `npx`.

### Starting from scratch: `npx salamandrsdk new`

You do not have to write any of the above by hand. The same CLI scaffolds a complete, working
plugin — manifest, source, its own tests against the mock host, fixtures and a README — in
either language:

```sh
npx salamandrsdk new -name acme-crm            # Rust (single-file)
npx salamandrsdk new -name acme-crm -split     # Rust (modular split-code: models, client, views, actions)
npx salamandrsdk new -name acme-crm -lang ts   # TypeScript (AssemblyScript)
npx salamandrsdk new -name acme-crm -lang ts -split  # TypeScript (modular split-code)
```

Pass `-split` whenever you want a production-ready modular layout that separates the CRM HTTP client, data models, UI `ContextBlock` views, and action handlers into dedicated files (see the [CRM Plugin Architecture Guide](../build-crm-plugin/)).

It builds, tests and runs before you change a line; then you replace the fictional vendor with
yours.

```
plugin:     hello-crm 0.1.0
built with: salamandr-plugin-sdk 0.3.0 (ABI 1)
implements: fetch_context
scopes:     http=api.acme-crm.com  config=api_key  core=users:read,tickets:read
ok: manifest and binary agree

calling fetch_context with {"candidate_emails":["ada@example.com"]}
http GET https://api.acme-crm.com/v1/contacts?email=ada%40example.com -> fixture 200

result:
[{"title":"Acme CRM","fields":[…],"actions":[…]}]
```

`fixtures.json` supplies what the host would otherwise read from a real tenant's database or the
internet:

```json
{
  "config": { "api_key": "test-key" },
  "core":   { "users/by_email": {"id":"u_1","email":"ada@example.com","name":"Ada","role":"customer"} },
  "http":   [ { "url_contains": "/contacts", "status": 200, "body": "{\"results\":[]}" } ]
}
```

Anything unfixtured is reported as a named failure rather than a silent empty answer —
`-allow-net` lets an unmatched call through to the real internet instead, and `-op`/`-input`
call something other than `fetch_context` if you need to exercise an action or a picker.

## Installing

There's no marketplace and no submission process. The trust boundary is deliberately "an admin
chose to install *this specific binary* after reading the scopes it asks for" — the same posture
as installing any other piece of third-party software.

```sh
# 1. Install (as an admin session). The extension arrives disabled.
curl -X POST https://helpdesk.example.com/api/v1/extensions \
  -F manifest=@manifest.toml -F wasm=@my_plugin.wasm

# 2. Fill in the config your manifest declared.
curl -X PATCH https://helpdesk.example.com/api/v1/extensions/$ID/config \
  -H 'Content-Type: application/json' -d '{"values": {"api_key": "…"}}'

# 3. Enable it — this step is the admin's explicit consent to the scopes.
curl -X PATCH https://helpdesk.example.com/api/v1/extensions/$ID/enabled \
  -H 'Content-Type: application/json' -d '{"enabled": true}'

# Optional: restrict it to specific ticket types.
curl -X PATCH https://helpdesk.example.com/api/v1/extensions/$ID/ticket-types \
  -H 'Content-Type: application/json' -d '{"ticket_type_ids": ["…"]}'
```

Every one of those steps also has a form in the Admin Panel's Integrations grid — the curl
commands above are what that UI calls, not a separate path.

## Limits and the sandbox

| | |
|---|---|
| Call timeout | 5s per operation, including your HTTP call |
| Memory | 256 pages (16 MB) |
| HTTP request | 256 KB body, 10s timeout |
| HTTP response | 2 MB |
| Log line | 4 KB |
| Config key | 128 chars |
| KV key / value | 256 chars / 64 KB |
| Core request | 64 KB; pages default 50, max 200 |
| Core: tags per call | 20 |
| Core: note body | 16 KB |
| Upload (manifest + wasm) | 20 MB |

A fresh module instance is created **per call** — no state survives between calls, and none
leaks between tenants. There's no fuel metering, so a tight compute loop that never yields is
bounded only by the call timeout — don't write one.

## Versioning

A minor/patch SDK release (new wrappers, new core resources) never breaks an existing plugin. A
**major** release means the guest ABI itself changed, and the server simply refuses a binary
built against an ABI it no longer speaks — rebuild against the new SDK and you're done. Keeping
`entrypoints` in sync with your `plugin!` block is checked for you at install; keeping your
manifest's scopes in sync with what your code actually calls is checked by
`MockHost::from_manifest` in your own tests, before anyone else ever sees a mismatch.

## Writing a plugin without either SDK

The ABI is small and neither SDK is privileged — any language that compiles to freestanding
`wasm32` (TinyGo, C, Zig) works if the binary exports:

```
alloc(size u32) -> ptr u32
dealloc(ptr u32, size u32)
handle(op_ptr u32, op_len u32, in_ptr u32, in_len u32) -> u64   // (out_ptr<<32 | out_len)
describe() -> u64                                                // optional
```

and imports its host functions from a module named `salamandr`. Every value crossing the
boundary is a JSON envelope — `{"ok":true,"data":…}` or `{"ok":false,"error":"…","code":"…"}`.
Skipping `describe` only costs you the install-time entrypoint check; everything else still
works.
