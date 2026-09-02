---
title: "Build a Task & Issue Tracker Plugin: Dynamic Modals & Cascading Forms"
description: "Comprehensive guide to building tasklist and issue tracker plugins in WebAssembly with dynamic creation modals, cascading dropdowns, search-as-you-type linking, and interactive checklists."
---

Salamandr integrates seamlessly with external task and issue trackers—such as **Trello, Jira, GitHub Issues, Linear, Asana, and Redmine**—without requiring native backend Go modifications or custom database tables.

When an agent works on a support ticket, they can:
1. **Search & Link** an existing external card/issue directly from the ticket sidebar.
2. **Open a Dynamic Modal** to create a new external card/issue with typed, cascading form fields (e.g. selecting a Board dynamically populates its Lists and Labels).
3. **View & Check off Subtasks** directly inside the ticket rail.

This guide explains the architecture and step-by-step implementation of task and issue tracker plugins using the Salamandr WebAssembly SDK in both **Rust** and **TypeScript / AssemblyScript**.

---

## 1. Architectural Overview & The Dynamic Form Engine

Instead of executing arbitrary client-side JavaScript or rendering insecure iframes, Salamandr uses a **declarative, sandboxed form engine**:

```
┌─────────────────┐       ┌────────────────────────┐       ┌───────────────────────────┐
│ AGENT / BROWSER │       │ SALAMANDR CORE HOST    │       │ WASM GUEST (Trello / Jira)│
└────────┬────────┘       └───────────┬────────────┘       └─────────────┬─────────────┘
         │                            │                                  │
         │  1. Clicks "Create Card"   │                                  │
         │───────────────────────────>│                                  │
         │                            │  2. GET /extension-ops/          │
         │                            │     {provider}/create_form_op    │
         │                            │─────────────────────────────────>│
         │                            │  3. Returns FieldSpec[] schema   │
         │                            │<─────────────────────────────────│
         │  4. Renders Creation Modal │                                  │
         │<───────────────────────────│                                  │
         │                            │                                  │
         │  5. Selects "Board A"      │                                  │
         │───────────────────────────>│  6. GET list_lists(board_id)     │
         │                            │─────────────────────────────────>│
         │                            │  7. Returns options [{val, lbl}] │
         │                            │<─────────────────────────────────│
         │  8. Fills form & Submits   │                                  │
         │───────────────────────────>│  9. POST /tickets/{id}/          │
         │                            │     extension-create/{provider}  │
         │                            │─────────────────────────────────>│
         │                            │                                  │──┐ Calls Vendor API
         │                            │                                  │  │ to create record
         │                            │  10. Returns CreateResult        │<─┘
         │                            │<─────────────────────────────────│
         │                            │──┐ Auto-links ticket ID to       │
         │                            │  │ external record in database   │
         │  11. Closes Modal, audits  │<─┘                               │
         │      event, updates rail   │                                  │
         │<───────────────────────────│                                  │
```

---

## 2. The Manifest Layer (`manifest.toml`)

The `manifest.toml` declares the capabilities and operations that activate the UI buttons in the ticket detail view:

```toml
# manifest.toml
name = "trello"
version = "0.1.0"
kind = "tasklist"
author = "Acme Dev"
description = "Trello tasklist connector — link cards or create new cards from tickets"

entrypoints = [
    "fetch_context",
    "link_card",
    "unlink_card",
    "list_boards",
    "list_lists",
    "list_labels",
    "create_card_form",
    "create_card",
    "search_cards",
    "add_comment",
    "toggle_item",
]

# read_ops: Allow-list of read-only entrypoints callable directly by staff UI
read_ops = ["list_boards", "list_lists", "list_labels", "create_card_form", "search_cards"]

# Special lifecycle hooks recognized by Salamandr:
link_op        = "link_card"         # POST /tickets/{id}/extension-link/trello
unlink_op      = "unlink_card"       # DELETE /tickets/{id}/extension-link/trello
create_op      = "create_card"       # POST /tickets/{id}/extension-create/trello
create_form_op = "create_card_form"  # Supplies the dynamic creation form schema
search_op      = "search_cards"      # Supplies search-as-you-type picker for linking

[[config_fields]]
key = "api_key"
label = "Trello API Key"
type = "text"
required = true

[[config_fields]]
key = "token"
label = "Member Token"
type = "password"
required = true

[scopes]
http_hosts = ["api.trello.com"]
config_keys = ["api_key", "token"]
# core permissions allow reading/writing external ticket links without a custom DB table
core = ["external_links:read", "external_links:write", "tickets:write", "users:read"]
```

---

## 3. Step-by-Step Implementation

### Step 1: Defining the Dynamic Create Form (`create_card_form`)

When the agent clicks **"Create Card"** (or **"Create Issue"**), Salamandr invokes `create_form_op`. The plugin returns a list of `FieldSpec` definitions:

#### In Rust:
```rust
use salamandr_plugin_sdk::{FieldSpec, OpError};

pub fn create_card_form(_input: serde_json::Value) -> Result<Vec<FieldSpec>, OpError> {
    let fields = vec![
        // 1. Board Selector (invokes list_boards read_op)
        FieldSpec::select("board_id", "Board")
            .required()
            .options_op("list_boards"),

        // 2. Cascading List Selector (depends on chosen board_id)
        FieldSpec::select("list_id", "List")
            .required()
            .options_op("list_lists")
            .depends_on("board_id"),

        // 3. Card Title
        FieldSpec::text("name", "Card Title")
            .required()
            .placeholder("e.g. Payment Gateway Failure during Checkout"),

        // 4. Markdown Rich Textarea for Description
        FieldSpec::textarea("desc", "Description")
            .rich_text_format("markdown")
            .placeholder("Detailed steps, logs, or customer context..."),

        // 5. Date Input for Due Date
        FieldSpec::date("due", "Due Date"),

        // 6. Cascading Multi-select for Labels
        FieldSpec::multiselect("labels", "Labels")
            .options_op("list_labels")
            .depends_on("board_id"),

        // 7. Plain Textarea for Initial Checklist Items
        FieldSpec::textarea("check_items", "Checklist Items (one per line)")
            .placeholder("Verify webhook signature\nCheck Stripe error code\nNotify customer"),
    ];

    Ok(fields)
}
```

#### In TypeScript / AssemblyScript:
```typescript
import { JSONResult, JValue } from "@salamandr/plugin-sdk";

export function createCardForm(input: JValue): JSONResult {
  const fields = [
    JValue.object(
      ["key", "label", "kind", "required", "options_op"],
      [JValue.quote("board_id"), JValue.quote("Board"), JValue.quote("select"), "true", JValue.quote("list_boards")]
    ),
    JValue.object(
      ["key", "label", "kind", "required", "options_op", "depends_on"],
      [JValue.quote("list_id"), JValue.quote("List"), JValue.quote("select"), "true", JValue.quote("list_lists"), JValue.quote("board_id")]
    ),
    JValue.object(
      ["key", "label", "kind", "required"],
      [JValue.quote("name"), JValue.quote("Card Title"), JValue.quote("text"), "true"]
    ),
    JValue.object(
      ["key", "label", "kind", "rich_text_format"],
      [JValue.quote("desc"), JValue.quote("Description"), JValue.quote("textarea"), JValue.quote("markdown")]
    ),
    JValue.object(
      ["key", "label", "kind"],
      [JValue.quote("due"), JValue.quote("Due Date"), JValue.quote("date")]
    ),
    JValue.object(
      ["key", "label", "kind", "options_op", "depends_on"],
      [JValue.quote("labels"), JValue.quote("Labels"), JValue.quote("multiselect"), JValue.quote("list_labels"), JValue.quote("board_id")]
    ),
  ];

  return JSONResult.ok("[" + fields.join(",") + "]");
}
```

---

### Step 2: Implementing Cascading Dropdowns (`read_ops`)

When a field with `depends_on` is declared, the frontend disables it until the parent field is populated. Once selected, Salamandr calls the child's `options_op` passing `{ "parent_key": "selected_value" }`.

#### In Rust:
```rust
use salamandr_plugin_sdk::{get_config, http_fetch, HttpRequest, FieldOption, OpError};
use serde_json::Value;

pub fn list_boards(_input: Value) -> Result<Vec<FieldOption>, OpError> {
    let api_key = get_config("api_key")?.ok_or(OpError::NotConfigured)?;
    let token = get_config("token")?.ok_or(OpError::NotConfigured)?;

    let url = format!("https://api.trello.com/1/members/me/boards?key={api_key}&token={token}&fields=id,name&filter=open");
    let resp = http_fetch(HttpRequest::get(&url))?;

    let boards: Vec<Value> = serde_json::from_str(&resp.body).map_err(|e| OpError::Other(e.to_string()))?;
    Ok(boards.into_iter().map(|b| FieldOption {
        value: b["id"].as_str().unwrap_or("").to_string(),
        label: b["name"].as_str().unwrap_or("").to_string(),
    }).collect())
}

pub fn list_lists(input: Value) -> Result<Vec<FieldOption>, OpError> {
    let board_id = input["board_id"].as_str().unwrap_or("");
    if board_id.is_empty() {
        return Ok(vec![]);
    }

    let api_key = get_config("api_key")?.ok_or(OpError::NotConfigured)?;
    let token = get_config("token")?.ok_or(OpError::NotConfigured)?;

    let url = format!("https://api.trello.com/1/boards/{board_id}/lists?key={api_key}&token={token}&fields=id,name&filter=open");
    let resp = http_fetch(HttpRequest::get(&url))?;

    let lists: Vec<Value> = serde_json::from_str(&resp.body).map_err(|e| OpError::Other(e.to_string()))?;
    Ok(lists.into_iter().map(|l| FieldOption {
        value: l["id"].as_str().unwrap_or("").to_string(),
        label: l["name"].as_str().unwrap_or("").to_string(),
    }).collect())
}
```

---

### Step 3: Search-as-You-Type for Linking (`search_op`)

When an agent types in the search box to link an existing card/issue, Salamandr calls `search_op` with `{ "q": "search term" }`:

```rust
pub fn search_cards(input: Value) -> Result<Vec<FieldOption>, OpError> {
    let query = input["q"].as_str().unwrap_or("").trim();
    if query.is_empty() {
        return Ok(vec![]);
    }

    let api_key = get_config("api_key")?.ok_or(OpError::NotConfigured)?;
    let token = get_config("token")?.ok_or(OpError::NotConfigured)?;

    let encoded_q = percent_encode(query);
    let url = format!("https://api.trello.com/1/search?query={encoded_q}&modelTypes=cards&card_fields=name,shortUrl&key={api_key}&token={token}");
    let resp = http_fetch(HttpRequest::get(&url))?;

    let result: Value = serde_json::from_str(&resp.body).map_err(|e| OpError::Other(e.to_string()))?;
    let cards = result["cards"].as_array().cloned().unwrap_or_default();

    Ok(cards.into_iter().map(|c| FieldOption {
        value: c["id"].as_str().unwrap_or("").to_string(),
        label: c["name"].as_str().unwrap_or("").to_string(),
    }).collect())
}
```

---

### Step 4: Executing Creation & Returning `CreateResult` (`create_op`)

When the agent clicks **"Submit"**, Salamandr passes all form inputs to `create_op`. The plugin creates the external record and returns a typed `CreateResult`:

```rust
use serde::Serialize;

#[derive(Serialize)]
pub struct CreateResult {
    pub key: String,       // External record ID (e.g. "64a9f1...")
    pub title: String,     // Created card name
    pub status: String,    // List or status name (e.g. "In Progress")
    pub assignee: String,  // Assigned member
    pub priority: String,  // Priority level (or empty)
    pub url: String,       // Direct deep link URL
}

pub fn create_card(input: Value) -> Result<CreateResult, OpError> {
    let list_id = input["list_id"].as_str().unwrap_or("");
    let name = input["name"].as_str().unwrap_or("");
    let desc_html = input["desc"].as_str().unwrap_or("");
    
    // Convert rich-text editor HTML to Markdown for Trello
    let desc_md = salamandr_plugin_sdk::richtext_to_markdown(desc_html)
        .unwrap_or_else(|_| desc_html.to_string());

    let api_key = get_config("api_key")?.ok_or(OpError::NotConfigured)?;
    let token = get_config("token")?.ok_or(OpError::NotConfigured)?;

    let url = format!("https://api.trello.com/1/cards?idList={list_id}&key={api_key}&token={token}");
    let body = serde_json::json!({
        "name": name,
        "desc": desc_md,
        "due": input.get("due").and_then(|v| v.as_str()),
    });

    let resp = http_fetch(HttpRequest::post(&url).json(&body))?;
    let card: Value = serde_json::from_str(&resp.body).map_err(|e| OpError::Other(e.to_string()))?;

    Ok(CreateResult {
        key: card["id"].as_str().unwrap_or("").to_string(),
        title: card["name"].as_str().unwrap_or("").to_string(),
        status: "To Do".to_string(),
        assignee: "".to_string(),
        priority: "".to_string(),
        url: card["shortUrl"].as_str().unwrap_or("").to_string(),
    })
}
```

> [!IMPORTANT]
> **Automatic Host Behavior**: When `create_op` succeeds, Salamandr automatically:
> 1. Writes the external link into `external_links` binding the ticket to this card.
> 2. Audits the action on the ticket timeline with the authoring agent's name.
> 3. Immediately triggers `fetch_context` to render the newly linked card in the Context Rail.

---

### Step 5: Rendering the Linked Card with Interactive Tasks (`fetch_context`)

Once linked, `fetch_context` queries the external system and builds the `ContextBlock`. You can include checklist tasks that agents can toggle directly in the sidebar:

```rust
use salamandr_plugin_sdk::{Action, ContextBlock, ContextItem, ContextRequest, ContextResult};

pub fn fetch_context(req: ContextRequest) -> ContextResult {
    // 1. Read the linked card ID for this ticket using host core external_links
    let links = salamandr_plugin_sdk::core_call("external_links", "get", serde_json::json!({
        "ticket_id": req.ticket_id,
        "provider": "trello"
    }))?;

    let Some(card_id) = links.get("external_key").and_then(|v| v.as_str()) else {
        return Ok(vec![]); // Not linked yet
    };

    // 2. Fetch live card data from Trello API
    let card = fetch_trello_card(card_id)?;

    // 3. Build interactive ContextBlock
    let mut block = ContextBlock::new("Trello Card")
        .field("Card", &card.name)
        .field("List", &card.list_name)
        .field_opt("Due Date", card.due_date)
        .action("Open in Trello", &card.short_url)
        .run(
            Action::run("Add Comment", "add_comment")
                .textarea("comment", "Comment Content", true)
        );

    // 4. Attach interactive checklist tasks
    for item in card.checklist_items {
        block = block.item(&item.id, &item.name, item.completed);
    }

    Ok(vec![block])
}
```

When an agent checks a task box in the sidebar, Salamandr automatically invokes the plugin's `toggle_item` action op with `{ "params": { "item_id": "...", "completed": "true" } }`!

---

## 4. Summary Checklist for Task Tracker Plugins

| Requirement | Manifest Entry | Plugin Handler |
|---|---|---|
| **Enable Creation Modal** | `create_op = "create_card"` | `create_card(input) -> CreateResult` |
| **Dynamic Form Inputs** | `create_form_op = "create_card_form"` | `create_card_form() -> Vec<FieldSpec>` |
| **Cascading Dropdowns** | Listed in `read_ops` | `list_lists(input) -> Vec<FieldOption>` |
| **Search-as-you-type Linking** | `search_op = "search_cards"` | `search_cards(input) -> Vec<FieldOption>` |
| **Checklist Item Toggling** | Listed in `entrypoints` | `toggle_item(req) -> ActionResult` |
| **Host Permissions** | `scopes.core = ["external_links:read", "external_links:write"]` | Enabled in `manifest.toml` |
