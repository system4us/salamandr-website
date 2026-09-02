---
title: "Building a CRM Connector Plugin"
description: A complete, architecture-driven guide to building a modular WebAssembly CRM plugin in Rust and TypeScript, cleanly separating Manifest, Logic, and Visual Presentation layers.
---

This guide walks you through building a production-grade **CRM Connector Plugin** for Salamandr. It demonstrates how to integrate external CRM platforms (HubSpot, Salesforce, Pipedrive, Zoho, or proprietary in-house systems) into the agent's **Context Rail**.

Salamandr executes plugins as sandboxed **WebAssembly (WASM)** modules under a zero-trust security model. To build scalable and maintainable plugins, you should cleanly decouple the codebase into three distinct architectural layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. MANIFEST LAYER                               │
│                   Strict Security Contract                             │
│       (manifest.toml: Allowed hosts, encrypted keys, scopes)           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Sandboxed execution & grant checks
┌───────────────────────────────────▼────────────────────────────────────┐
│                         2. LOGIC LAYER                                 │
│                   CRM Client & Data Transformations                    │
│      (HTTP fetching, auth headers, error mapping, models/DTOs)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Pure data structs
┌───────────────────────────────────▼────────────────────────────────────┐
│                         3. VISUAL PRESENTATION LAYER                   │
│                   Context Rail UI & Action Forms                       │
│    (ContextBlock: Key/Value fields, badges, deep links, form inputs)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Can Plugin Files Be Separated into Logic and Visual Modules?

**Yes, absolutely.** A common mistake is putting all API calls, JSON serialization, UI block building, and action handlers into a single file (`lib.rs` or `index.ts`). 

Separating **Logic** from **Visual Presentation** provides significant benefits:
- **Testability**: You can unit test your CRM HTTP client without instantiating UI blocks, and unit test UI view builders with mock data structs.
- **Maintainability**: When the CRM API schema changes, you only touch the logic layer (`client` / `models`). When you want to redesign how cards and badges appear in the ticket sidebar, you only touch the presentation layer (`views`).
- **Reusability**: Shared utility functions (currency formatting, date parsing, URL encoding) stay isolated from core business logic.

### Instant Scaffolding with `salamandrsdk new -split`

You don't need to create these files manually. The `salamandrsdk` CLI can scaffold this exact modular structure with a single command:

```sh
# Scaffold a modular Rust plugin
npx salamandrsdk new -name acme-crm -lang rust -split

# Scaffold a modular TypeScript (AssemblyScript) plugin
npx salamandrsdk new -name acme-crm -lang ts -split
```

### Recommended File Structure

#### In Rust:
```
my-crm-plugin/
├── manifest.toml        # 1. Manifest Layer (Security & Scopes)
├── Cargo.toml
├── fixtures.json        # Offline test fixtures
└── src/
    ├── lib.rs           # Plugin entrypoints & wiring (plugin! macro)
    ├── models.rs        # 2. Logic Layer: DTOs & CRM data structures
    ├── client.rs        # 2. Logic Layer: HTTP requests, Auth, Error mappings
    ├── views.rs         # 3. Visual Layer: ContextBlock builder & field layout
    └── actions.rs       # Action Handlers: Mutation logic & host signatures
```

#### In TypeScript / AssemblyScript:
```
my-crm-plugin/
├── manifest.toml        # 1. Manifest Layer (Security & Scopes)
├── package.json
├── asconfig.json
├── fixtures.json        # Offline test fixtures
├── tests/
│   └── plugin.test.js   # Unit & mock host tests
└── assembly/
    ├── index.ts         # Plugin entrypoints & wiring (plugin({...}))
    ├── models.ts        # 2. Logic Layer: Interfaces & JSON parsers
    ├── client.ts        # 2. Logic Layer: HTTP requests & API communication
    ├── views.ts         # 3. Visual Layer: ContextBlock builder & UI layout
    └── actions.ts       # Action Handlers: Note creation & status updates
```

---

## 1. The Manifest Layer (`manifest.toml`)

The `manifest.toml` is the immutable security contract between your plugin and Salamandr. The WebAssembly runtime (`wazero`) verifies and enforces every scope at runtime.

```toml
name = "acme-crm"
version = "0.1.0"
kind = "crm"
author = "Integration Engineering Team"
description = "Displays customer account tier, ARR, and owner from Acme CRM, with one-click note logging and plan updates."

# All callable entrypoints exported by the WASM binary
entrypoints = [
  "fetch_context",
  "log_note",
  "update_customer_plan"
]

[scopes]
# Whitelist of external domains this plugin is permitted to dial via http_fetch
http_hosts = ["api.acme-crm.com"]

# Encrypted configuration keys configured by the tenant administrator
config_keys = ["api_key"]

# Granular access to helpdesk core data
core = ["users:read", "tickets:read"]
```

:::note[Security Contract Invariants]
- If your code attempts an outbound HTTP request to a domain not listed in `http_hosts`, the host aborts the call immediately.
- If your plugin queries `get_config("stripe_key")` but only declared `["api_key"]` in `config_keys`, the host returns an authorization error.
:::

---

## 2. How to Think About Data Display (Visual Layer Principles)

The Context Rail is designed for **3-Second Operational Triage**. When an agent opens a ticket, they need immediate answers to three questions:
1. *Who is this customer, and how valuable is their account?* (ARR / Plan / Tier)
2. *Who owns this relationship on our sales/CS team?* (Account Executive / CSM)
3. *Is there an ongoing deal or critical commercial context?* (Active renewal / Open deal)

```
┌────────────────────────────────────────────────────────┐
│ 🏢 Acme CRM                                           │
├────────────────────────────────────────────────────────┤
│ Name:           Ada Lovelace                           │
│ Company:        Analytical Engines Ltd                 │
│ Plan:           Enterprise VIP                         │
│ Lifetime Value: $12,500.00                             │
│ Account Owner:  Carlos Benitez                         │
│                                                        │
│ 🔗 [ Open Contact in Acme CRM ]                        │
│                                                        │
│ ⚡ [ Log Account Note ]       ⚡ [ Update Plan ]        │
└────────────────────────────────────────────────────────┘
```

### Visual Best Practices:
* **Format values cleanly**: Never display raw numbers (`12500.5`) when currency (`$12,500.50`) is expected.
* **Use `.field_opt()`**: Omit optional fields (e.g., `Company` or `Deal Stage`) when null rather than rendering `"Company: N/A"` or `"None"`.
* **Provide deep links**: Add `.action("Open in CRM", url)` so agents can jump directly to the CRM record in one click.
* **Keep actions focused**: Render interactive modal forms for frequent workflows (logging a note, updating status) without leaving Salamandr.

---

## 3. Implementing the Plugin in Rust (Modular Architecture)

Let's implement the complete CRM connector following the multi-file architecture.

### Step 3.1: Data Models (`src/models.rs`)

Define strongly-typed structs representing external CRM entities:

```rust
// src/models.rs
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct CrmContact {
    pub id: String,
    pub full_name: String,
    #[serde(default)]
    pub company: Option<String>,
    #[serde(default)]
    pub plan: Option<String>,
    #[serde(default)]
    pub account_owner: Option<String>,
    #[serde(default)]
    pub lifetime_value: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct ContactSearchResponse {
    #[serde(default)]
    pub results: Vec<CrmContact>,
}
```

---

### Step 3.2: The Logic Layer (`src/client.rs`)

The client encapsulates HTTP communication, authentication headers, and status code mapping:

```rust
// src/client.rs
use crate::models::{ContactSearchResponse, CrmContact};
use salamandr_plugin_sdk::{http_fetch, HttpRequest, OpError};

const API_BASE: &str = "https://api.acme-crm.com/v1";

pub struct CrmClient<'a> {
    api_key: &'a str,
}

impl<'a> CrmClient<'a> {
    pub fn new(api_key: &'a str) -> Self {
        Self { api_key }
    }

    /// Searches for a contact by email address.
    pub fn find_contact_by_email(&self, email: &str) -> Result<Option<CrmContact>, OpError> {
        let url = format!("{API_BASE}/contacts?email={}", percent_encode(email));
        let req = HttpRequest::get(url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Accept", "application/json");

        let resp = http_fetch(req)?;

        match resp.status {
            200 => {
                let parsed: ContactSearchResponse = serde_json::from_str(&resp.body)
                    .map_err(|e| OpError::Other(format!("Failed to parse CRM response: {e}")))?;
                Ok(parsed.results.into_iter().next())
            }
            // 404 means the requester simply does not exist in the CRM
            404 => Ok(None),
            401 | 403 => Err(OpError::NotConfigured),
            429 => Err(OpError::RateLimited {
                retry_after: resp.header("Retry-After").map(str::to_string),
            }),
            status if status >= 500 => Err(OpError::Transient(format!("CRM returned server error: HTTP {status}"))),
            status => Err(OpError::Other(format!("CRM API error: HTTP {status}"))),
        }
    }

    /// Creates a note associated with a contact.
    pub fn post_note(&self, contact_id: &str, content: &str) -> Result<(), OpError> {
        let payload = serde_json::json!({
            "contact_id": contact_id,
            "content": content,
        });

        let req = HttpRequest::post(format!("{API_BASE}/contacts/{contact_id}/notes"), payload.to_string())
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json");

        let resp = http_fetch(req)?;
        match resp.status {
            200 | 201 => Ok(()),
            401 | 403 => Err(OpError::NotConfigured),
            status => Err(OpError::Other(format!("Failed to log note in CRM: HTTP {status}"))),
        }
    }

    /// Updates customer plan.
    pub fn update_plan(&self, contact_id: &str, new_plan: &str, actor_email: &str) -> Result<(), OpError> {
        let payload = serde_json::json!({
            "plan": new_plan,
            "updated_by": actor_email,
        });

        let req = HttpRequest::patch(format!("{API_BASE}/contacts/{contact_id}"), payload.to_string())
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json");

        let resp = http_fetch(req)?;
        match resp.status {
            200 | 204 => Ok(()),
            401 | 403 => Err(OpError::NotConfigured),
            status => Err(OpError::Other(format!("Failed to update plan in CRM: HTTP {status}"))),
        }
    }
}

fn percent_encode(raw: &str) -> String {
    let mut out = String::with_capacity(raw.len());
    for byte in raw.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => out.push(byte as char),
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}
```

---

### Step 3.3: The Visual Presentation Layer (`src/views.rs`)

The presentation layer consumes data models and produces the declarative `ContextBlock` structure for the Context Rail:

```rust
// src/views.rs
use crate::models::CrmContact;
use salamandr_plugin_sdk::{Action, ContextBlock, ContextRequest};

pub fn build_contact_block(contact: &CrmContact, email: &str, req: &ContextRequest) -> ContextBlock {
    let display_name = if contact.full_name.is_empty() { email } else { &contact.full_name };
    let formatted_ltv = contact.lifetime_value.map(|val| format!("${:.2}", val));

    ContextBlock::new("Acme CRM")
        // Render informational fields
        .field("Name", display_name)
        .field_opt("Company", contact.company.clone())
        .field_opt("Plan Tier", contact.plan.clone())
        .field_opt("Account Owner", contact.account_owner.clone())
        .field_opt("Lifetime Value", formatted_ltv)
        .field("Ticket Context", format!("Ticket #{}", req.ticket_number))

        // Deep Link directly to CRM record
        .action("Open Contact in Acme CRM", format!("https://app.acme-crm.com/contacts/{}", contact.id))

        // Action 1: Interactive Note Form
        .run(
            Action::run("Log Account Note", "log_note")
                .param("contact_id", contact.id.clone())
                .textarea("note_body", "Note Content", true)
                .placeholder("Enter details for the sales/account executive...")
                .confirm("This will log a public note on the customer's CRM profile. Continue?"),
        )

        // Action 2: Update Customer Plan Form
        .run(
            Action::run("Update Plan Tier", "update_customer_plan")
                .param("contact_id", contact.id.clone())
                .input("plan_name", "New Plan (Starter, Pro, Enterprise)", true)
                .confirm("Are you sure you want to update this customer's subscription tier?"),
        )
}
```

#### Advanced Layouting: 12-Column Grids, KPI Cards, and Interactive Tables

Salamandr plugins can also render multi-column responsive grids, prominent KPI metric cards, and interactive tables with expandable drill-down rows:

```rust
// Advanced views with Grid layout and interactive master-detail tables
use salamandr_plugin_sdk::{ContextBlock, InteractiveTableData, TableRowData};

pub fn build_deals_dashboard() -> ContextBlock {
    let mut table = InteractiveTableData {
        columns: vec!["Deal Name".into(), "Amount".into(), "Stage".into()],
        rows: vec![
            TableRowData::new(vec!["Enterprise Renewal".into(), "$45,000".into(), "Negotiation".into()])
                .id("deal_101")
                .detail_title("Deal #101 Details")
                .detail_field("Close Probability", "85%")
                .detail_field("Assigned Rep", "Carlos Benitez")
                .detail_action("Open in CRM", "https://app.acme-crm.com/deals/101"),
            TableRowData::new(vec!["AI Assist Expansion".into(), "$12,500".into(), "Proposal".into()])
                .id("deal_102")
                .detail_title("Deal #102 Details")
                .detail_field("Close Probability", "60%"),
        ],
    };

    ContextBlock::new("Acme CRM — Deals Dashboard")
        .grid(12) // Switch from vertical stack to 12-column CSS Grid
        .field_kpi_span("Pipeline MRR", "$57,500", 4)
        .field_kpi_span("Open Deals", "2 Active", 4)
        .field_kpi_span("Win Probability", "78% Avg", 4)
        .field_interactive_table("Active Pipeline", table)
}
```

---

### Step 3.4: Action Handlers (`src/actions.rs`)

Action handlers receive user input and execute mutations using the CRM client. They leverage the host's immutable audit stamp (`req.signature()`) for end-to-end accountability:

```rust
// src/actions.rs
use crate::client::CrmClient;
use salamandr_plugin_sdk::{get_config, ActionOutcome, ActionRequest, ActionResult, OpError};

pub fn handle_log_note(req: ActionRequest) -> ActionResult {
    let Some(api_key) = get_config("api_key")? else {
        return Err(OpError::NotConfigured);
    };

    let contact_id = req.param("contact_id")?;
    let note_body = req.input("note_body")?;

    if note_body.trim().is_empty() {
        return Err(OpError::Other("Note content cannot be empty.".into()));
    }

    // req.signature() includes Agent Name, Email, Ticket #, and Timestamp
    let stamped_note = format!("{}\n\n— Logged via Salamandr by: {}", note_body.trim(), req.signature());

    let client = CrmClient::new(&api_key);
    client.post_note(&contact_id, &stamped_note)?;

    Ok(ActionOutcome::new("Note successfully logged in Acme CRM")
        .url(format!("https://app.acme-crm.com/contacts/{contact_id}")))
}

pub fn handle_update_plan(req: ActionRequest) -> ActionResult {
    let Some(api_key) = get_config("api_key")? else {
        return Err(OpError::NotConfigured);
    };

    let contact_id = req.param("contact_id")?;
    let new_plan = req.input("plan_name")?;

    let client = CrmClient::new(&api_key);
    client.update_plan(&contact_id, new_plan.trim(), &req.actor.email)?;

    Ok(ActionOutcome::new(format!("Customer plan updated to '{}' in Acme CRM", new_plan.trim())))
}
```

---

### Step 3.5: Wiring Everything Together (`src/lib.rs`)

`src/lib.rs` ties the modules together and registers the entrypoints via the `plugin!` macro:

```rust
// src/lib.rs
mod actions;
mod client;
mod models;
mod views;

use actions::{handle_log_note, handle_update_plan};
use client::CrmClient;
use salamandr_plugin_sdk::{get_config, plugin, ContextRequest, ContextResult, OpError};
use views::build_contact_block;

pub fn fetch_context(req: ContextRequest) -> ContextResult {
    let Some(api_key) = get_config("api_key")? else {
        return Err(OpError::NotConfigured);
    };

    let client = CrmClient::new(&api_key);

    for email in req.emails() {
        if let Some(contact) = client.find_contact_by_email(email)? {
            return Ok(vec![build_contact_block(&contact, email, &req)]);
        }
    }

    // Requester not found in CRM -> return empty list (not an error)
    Ok(vec![])
}

// Export WebAssembly operations
plugin! {
    name: "acme-crm",
    version: env!("CARGO_PKG_VERSION"),
    context_ops: {
        "fetch_context" => fetch_context,
    },
    action_ops: {
        "log_note" => handle_log_note,
        "update_customer_plan" => handle_update_plan,
    }
}
```

---

## 4. Implementing the Plugin in TypeScript (AssemblyScript)

If your team builds with TypeScript, the `@salamandr/plugin-sdk` follows the identical modular pattern.

### Step 4.1: The Logic Layer (`assembly/client.ts`)

```typescript
// assembly/client.ts
import { HttpRequest, JValue, OpError, httpFetch } from "@salamandr/plugin-sdk";

const API_BASE = "https://api.acme-crm.com/v1";

export class ContactDto {
  id: string = "";
  fullName: string = "";
  company: string = "";
  plan: string = "";
  lifetimeValue: string = "";
}

export class CrmClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  findContactByEmail(email: string): ContactDto | null {
    const url = API_BASE + "/contacts?email=" + encodeURIComponent(email);
    const req = HttpRequest.get(url)
      .header("Authorization", "Bearer " + this.apiKey)
      .header("Accept", "application/json");

    const fetchRes = httpFetch(req);
    if (fetchRes.isErr) return null;

    const res = fetchRes.response!;
    if (res.status === 200) {
      const parsed = JValue.parse(res.body);
      if (!parsed.isObject()) return null;
      const root = parsed.asObject();
      if (!root.has("results")) return null;
      const results = root.getArray("results");
      if (results.length === 0) return null;

      const obj = results[0].asObject();
      const dto = new ContactDto();
      dto.id = obj.getString("id", "");
      dto.fullName = obj.getString("full_name", email);
      dto.company = obj.getString("company", "");
      dto.plan = obj.getString("plan", "Standard");
      dto.lifetimeValue = obj.getString("lifetime_value", "$0.00");
      return dto;
    }
    return null;
  }

  postNote(contactId: string, content: string): boolean {
    const payload = "{\"contact_id\":\"" + contactId + "\",\"content\":\"" + content + "\"}";
    const req = HttpRequest.post(API_BASE + "/contacts/" + contactId + "/notes", payload)
      .header("Authorization", "Bearer " + this.apiKey)
      .header("Content-Type", "application/json");

    const fetchRes = httpFetch(req);
    if (fetchRes.isErr) return false;
    const status = fetchRes.response!.status;
    return status === 200 || status === 201;
  }
}
```

---

### Step 4.2: The Visual Presentation Layer (`assembly/views.ts`)

```typescript
// assembly/views.ts
import { Action, ContextBlock, ContextRequest } from "@salamandr/plugin-sdk";
import { ContactDto } from "./client";

export function renderContactBlock(contact: ContactDto, req: ContextRequest): ContextBlock {
  const block = new ContextBlock("Acme CRM (TypeScript)")
    .field("Name", contact.fullName)
    .field("Plan Tier", contact.plan)
    .field("Lifetime Value", contact.lifetimeValue)
    .field("Ticket Reference", "Ticket #" + req.ticket_number.toString());

  if (contact.company.length > 0) {
    block.field("Company", contact.company);
  }

  block.action("Open in CRM", "https://app.acme-crm.com/contacts/" + contact.id);

  block.run(
    Action.run("Log Account Note", "log_note")
      .param("contact_id", contact.id)
      .textarea("note_body", "Note Content", true)
      .placeholder("Enter note for the account manager...")
  );

  return block;
}
```

---

### Step 4.3: Entrypoints & Wiring (`assembly/index.ts`)

```typescript
// assembly/index.ts
import {
  ActionOutcome,
  ActionRequest,
  ActionResult,
  ContextRequest,
  ContextResult,
  OpError,
  getConfig,
  plugin
} from "@salamandr/plugin-sdk";
import { CrmClient } from "./client";
import { renderContactBlock } from "./views";

export function fetchContext(req: ContextRequest): ContextResult {
  const keyLookup = getConfig("api_key");
  if (keyLookup.isMissing || keyLookup.isErr) {
    return ContextResult.err(OpError.notConfigured());
  }
  const client = new CrmClient(keyLookup.unwrapOr(""));

  const emails = req.emails();
  for (let i = 0; i < emails.length; i++) {
    const contact = client.findContactByEmail(emails[i]);
    if (contact !== null) {
      return ContextResult.ok([renderContactBlock(contact, req)]);
    }
  }

  return ContextResult.ok([]);
}

export function logNote(req: ActionRequest): ActionResult {
  const keyLookup = getConfig("api_key");
  if (keyLookup.isMissing || keyLookup.isErr) {
    return ActionResult.err(OpError.notConfigured());
  }
  const client = new CrmClient(keyLookup.unwrapOr(""));

  const contactId = req.param("contact_id");
  const noteBody = req.input("note_body");
  const stampedContent = noteBody + "\\n\\n— " + req.signature();

  const success = client.postNote(contactId, stampedContent);
  if (success) {
    return ActionResult.ok(new ActionOutcome("Note logged in Acme CRM"));
  }

  return ActionResult.err(OpError.other("Failed to log note in CRM"));
}

plugin({
  contextOps: {
    "fetch_context": fetchContext
  },
  actionOps: {
    "log_note": logNote
  }
});
```

---

## 5. Offline Testing & Verification

Salamandr provides native offline testing tooling so you can verify your manifest permissions and logic without running a live helpdesk server.

### 5.1 Rust Unit Tests with `MockHost`
`MockHost` enforces your **actual `manifest.toml`**:

```rust
// src/lib.rs (tests module)
#[cfg(test)]
mod tests {
    use super::*;
    use salamandr_plugin_sdk::testing::MockHost;
    use salamandr_plugin_sdk::HttpResponse;

    #[test]
    fn test_fetch_context_renders_crm_block() {
        let _host = MockHost::from_manifest(include_str!("../manifest.toml"))
            .config("api_key", "mock-token-123")
            .http(|req| {
                assert!(req.url.contains("ada%40example.com"));
                Ok(HttpResponse {
                    status: 200,
                    body: r#"{"results":[{"id":"c_99","full_name":"Ada Lovelace","company":"Analytical Engines","plan":"Enterprise","lifetime_value":15000.0}]}"#.into(),
                    ..Default::default()
                })
            })
            .install();

        let req = ContextRequest {
            candidate_emails: vec!["ada@example.com".into()],
            ..Default::default()
        };

        let blocks = fetch_context(req).expect("fetch_context should succeed");
        assert_eq!(blocks.len(), 1);
        assert_eq!(blocks[0].title, "Acme CRM");
    }
}
```

### 5.2 CLI Verification with `salamandrsdk`

Test your compiled WebAssembly binary against mock JSON fixtures:

```sh
# Compile to WebAssembly
cargo build --release --target wasm32-unknown-unknown

# Execute inside the exact wazero host runtime
npx salamandrsdk run \
  -wasm target/wasm32-unknown-unknown/release/acme_crm.wasm \
  -fixtures fixtures.json \
  -email ada@example.com
```

---

## 6. Installation & Scope Approval

1. Build the release binary:
   * **Rust**: `cargo build --release --target wasm32-unknown-unknown`
   * **TypeScript**: `npm run build`
2. Open **Admin Panel &rarr; Integrations / Extensions &rarr; Install Extension**.
3. Upload `manifest.toml` and your compiled `.wasm` file.
4. Review the declared permission scopes (`api.acme-crm.com`, config keys).
5. Enter your CRM `api_key` under **Settings** and toggle **Enable Extension**.

When an agent opens any ticket, Salamandr runs the plugin inside the WebAssembly sandbox, instantly streaming the customer's CRM profile and interactive actions directly into the Context Rail.
