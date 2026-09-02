---
title: "Inbound Webhooks & Event-Driven Plugins"
description: "Comprehensive guide to receiving real-time external push notifications and webhooks in Salamandr WebAssembly plugins."
---

While `fetch_context` pulls data from external systems when an agent opens a ticket, modern integrations often need to react to **real-time push notifications from outside vendors**:

* **Issue & Task Trackers (Jira, Trello, Linear, GitHub)**: A card moves to "Done" or an issue is closed externally, automatically resolving the linked support ticket.
* **Payment & ERP Systems (Stripe, QuickBooks, SAP)**: An invoice is paid or a subscription cancels, immediately adding a timeline note or updating ticket priority.
* **Monitoring & Alerting (Datadog, Zabbix, AWS CloudWatch)**: An incident fires or recovers, auto-creating or updating an outage ticket.
* **CRMs (HubSpot, Salesforce)**: A lead stage changes or an account owner reassigns.

Salamandr provides a **generic, secure public inbound webhook engine** (`webhook_receive`) available to plugins of any `kind`.

---

## 1. How Inbound Webhooks Work

Salamandr assigns a unique, unguessable public endpoint for each installed extension:

```
https://helpdesk.yourcompany.com/api/v1/integrations/extensions/hook/{TOKEN}
```

```
┌────────────────────────┐         ┌────────────────────────┐         ┌───────────────────────────┐
│ EXTERNAL VENDOR        │         │ SALAMANDR CORE HOST    │         │ WASM GUEST PLUGIN         │
│ (Trello / Stripe / ...)│         │                        │         │ (webhook_receive)         │
└───────────┬────────────┘         └───────────┬────────────┘         └─────────────┬─────────────┘
            │                                  │                                    │
            │  1. POST /api/v1/integrations/   │                                    │
            │     extensions/hook/{TOKEN}      │                                    │
            │─────────────────────────────────>│                                    │
            │                                  │  2. Resolves tenant & plugin       │
            │                                  │     from {TOKEN}                   │
            │                                  │  3. Hands raw WebhookRequest       │
            │                                  │───────────────────────────────────>│
            │                                  │                                    │──┐ 4. Verifies signature
            │                                  │                                    │  │ 5. Executes core_call
            │                                  │  6. Returns WebhookResponse        │<─┘    to update ticket
            │                                  │<───────────────────────────────────│
            │  7. Returns HTTP 200 / 503       │                                    │
            │<─────────────────────────────────│                                    │
```

### Architectural Principles

1. **Zero-Trust Host & Vendor Neutrality**: The Salamandr host does **not** parse or interpret the vendor payload. It passes the raw request bytes directly to your WebAssembly plugin.
2. **Two-Phase Routing & RLS Isolation**: The URL token authenticates which tenant and plugin own the route. Once resolved, the entire execution runs within that tenant's strict Row-Level Security (RLS) boundary.
3. **Sender Verification Inside WASM**: The URL token proves the route, but not who sent the HTTP request. Your plugin reads its configured secret (`get_config("webhook_secret")`) and verifies HMAC signatures in the request headers.

---

## 2. Declaring Webhooks in `manifest.toml`

To activate the inbound webhook endpoint, declare `webhook = true` in `scopes` and add `"webhook_receive"` to `entrypoints`:

```toml
# manifest.toml
name = "trello-sync"
version = "0.1.0"
kind = "tasklist"
description = "Sync Trello card updates to Salamandr tickets in real time"

entrypoints = [
    "fetch_context",
    "webhook_receive",    # 1. Inbound webhook entrypoint
]

[[config_fields]]
key = "api_key"
label = "API Key"
type = "text"
required = true

[[config_fields]]
key = "webhook_secret"
label = "Webhook Signing Secret"
type = "password"
description = "Shared secret to verify HMAC signatures sent by the vendor"
required = false

[scopes]
http_hosts = ["api.trello.com"]
config_keys = ["api_key", "webhook_secret"]

# 2. Grant the webhook scope (required when implementing webhook_receive)
webhook = true

# 3. Core permissions to update tickets or read links upon webhook delivery
core = ["tickets:write", "external_links:read", "users:read"]
```

> [!IMPORTANT]
> The `webhook = true` scope and `"webhook_receive"` entrypoint must agree: if one is present without the other, Salamandr will refuse the manifest at installation time.

---

## 3. Implementing `webhook_receive` in Rust

In Rust, import `WebhookRequest`, `WebhookResponse`, and `WebhookResult` from `salamandr_plugin_sdk`.

Register `webhook_receive` in the **`context_ops`** block of `plugin!`:

```rust
// src/lib.rs
use salamandr_plugin_sdk::{
    core_call, get_config, plugin, ContextRequest, ContextResult, OpError,
    WebhookRequest, WebhookResponse, WebhookResult,
};
use serde_json::json;

pub fn webhook_receive(req: WebhookRequest) -> WebhookResult {
    // -------------------------------------------------------------------------
    // Phase 1: Handle Setup Handshakes & Challenge Verification
    // Several vendors (Meta, Slack, Trello, Stripe) verify endpoints using GET
    // or a challenge token parameter before delivering events.
    // -------------------------------------------------------------------------
    if req.method == "GET" {
        if let Some(challenge) = req.query_param("challenge") {
            return Ok(WebhookResponse::text(challenge));
        }
        return Ok(WebhookResponse::text("Webhook endpoint active."));
    }

    // -------------------------------------------------------------------------
    // Phase 2: Verify Sender Signature (HMAC / Header)
    // -------------------------------------------------------------------------
    if let Some(secret) = get_config("webhook_secret")? {
        if !secret.trim().is_empty() {
            let signature = req.header("X-Trello-Webhook-Signature").unwrap_or("");
            if !verify_hmac_signature(&req.body, &secret, signature) {
                // Return 401 Unauthorized if the signature is invalid
                return Ok(WebhookResponse::status(401));
            }
        }
    }

    // -------------------------------------------------------------------------
    // Phase 3: Parse Event Payload
    // -------------------------------------------------------------------------
    let payload: serde_json::Value = serde_json::from_str(&req.body)
        .map_err(|e| OpError::Other(format!("Invalid JSON payload: {e}")))?;

    let action_type = payload["action"]["type"].as_str().unwrap_or("");
    let card_id = payload["action"]["data"]["card"]["id"].as_str().unwrap_or("");
    let card_name = payload["action"]["data"]["card"]["name"].as_str().unwrap_or("");

    // -------------------------------------------------------------------------
    // Phase 4: Act on Salamandr Helpdesk (e.g. Add Timeline Note or Close Ticket)
    // -------------------------------------------------------------------------
    if action_type == "updateCard" && !card_id.is_empty() {
        // Find which support tickets are linked to this external card
        let links = core_call("external_links", "list_by_external_key", json!({
            "provider": "trello-sync",
            "external_key": card_id,
        }))?;

        if let Some(ticket_ids) = links["ticket_ids"].as_array() {
            for t_id in ticket_ids {
                let ticket_id_str = t_id.as_str().unwrap_or("");
                
                // Add an automated system timeline note to the ticket
                core_call("tickets", "add_internal_note", json!({
                    "ticket_id": ticket_id_str,
                    "body": format!("🔔 **Trello Update**: Card '{card_name}' was modified in Trello."),
                }))?;
            }
        }
    }

    // -------------------------------------------------------------------------
    // Phase 5: Acknowledge Delivery
    // Return HTTP 200 to inform the vendor the event was successfully processed.
    // -------------------------------------------------------------------------
    Ok(WebhookResponse::default())
}

fn verify_hmac_signature(_body: &str, _secret: &str, _signature: &str) -> bool {
    // Implement vendor-specific hash comparison (e.g. HMAC-SHA256)
    true
}

// Register operations in the plugin macro
plugin! {
    name: "trello-sync",
    version: env!("CARGO_PKG_VERSION"),
    context_ops: {
        "fetch_context"   => fetch_context,
        "webhook_receive" => webhook_receive, // Must be in context_ops
    }
}
```

---

## 4. Implementing `webhook_receive` in TypeScript / AssemblyScript

In TypeScript / AssemblyScript, use the `WebhookRequest` and `WebhookResponse` types and register via `.webhookOp("webhook_receive", handler)`:

```typescript
// assembly/index.ts
import {
  coreCall,
  getConfig,
  JValue,
  OpError,
  plugin,
  WebhookRequest,
  WebhookResponse,
  WebhookResult,
} from "@salamandr/plugin-sdk";

export function webhookReceive(req: WebhookRequest): WebhookResult {
  // 1. Challenge Echo for Setup Handshakes
  if (req.method == "GET") {
    const challenge = req.queryParam("challenge");
    if (challenge.length > 0) {
      return WebhookResult.ok(WebhookResponse.text(challenge));
    }
    return WebhookResult.ok(WebhookResponse.text("Webhook active"));
  }

  // 2. Parse Incoming JSON
  const payload = JValue.parse(req.body);
  if (payload == null) {
    return WebhookResult.err(OpError.other("Unreadable JSON payload"));
  }

  const event = payload.getString("event");
  const recordId = payload.getString("record_id");

  // 3. Update Ticket using coreCall
  if (event == "task.completed" && recordId.length > 0) {
    coreCall("tickets", "add_internal_note", JValue.object(
      ["ticket_id", "body"],
      [JValue.quote(recordId), JValue.quote("✅ Linked external task was marked completed.")]
    ));
  }

  // 4. Return HTTP 200 OK
  return WebhookResult.ok(WebhookResponse.default());
}

plugin({
  contextOps: {
    fetch_context: fetchContext,
    webhook_receive: webhookReceive,
  },
});
```

---

## 5. Controlling HTTP Responses & Vendor Retries

`WebhookResponse` allows you to control the exact HTTP status and content type returned to the vendor:

### Acknowledging Delivery (HTTP 200)
```rust
// Return an empty 200 OK
Ok(WebhookResponse::default())

// Return a JSON acknowledgement
Ok(WebhookResponse::json("{\"received\": true}"))

// Return plain text
Ok(WebhookResponse::text("OK"))
```

### Asking the Vendor to Retry (HTTP 503 / 429)
If a temporary dependency is unavailable (e.g. database maintenance or downstream rate limit) and you want the vendor to retry delivery with its exponential backoff:

```rust
// Returns HTTP 503 Service Unavailable -> triggers vendor retry
Ok(WebhookResponse::status(503))
```

### Unrecoverable Errors
If a payload is malformed or invalid, return `Err(OpError::...)`:

```rust
// Logs the failure on the Salamandr server and answers HTTP 200 to stop vendor retry storms
return Err(OpError::Other("Malformed webhook structure".into()));
```

---

## 6. How Admins Retrieve the Webhook URL

Once the plugin is installed and enabled:

1. Navigate to **Admin Panel &rarr; Extensions &rarr; Installed Extensions**.
2. Click on your extension tile.
3. Under the **Webhook Endpoint** section, Salamandr displays the full delivery URL:
   ```
   https://helpdesk.yourcompany.com/api/v1/integrations/extensions/hook/whk_9f82a1b4e7c3...
   ```
4. Copy and paste this URL into your vendor's webhook settings (Trello Power-Up Admin, Stripe Webhook Dashboard, GitHub Webhooks, etc.).
5. If the token is ever compromised, admins can click **"Rotate Token"** to revoke the old URL and generate a fresh one instantly.

---

## 7. Summary & Best Practices

| Best Practice | Description |
|---|---|
| **Always check `req.method == "GET"`** | Allows automatic handshake verification during webhook registration. |
| **Verify Sender Signatures** | Always read `webhook_secret` via `get_config` and compare with headers like `X-Hub-Signature-256`. |
| **Idempotency** | Use `kv_set` with the vendor's event ID to avoid processing duplicate webhook deliveries. |
| **Non-blocking Operations** | Process events cleanly using `core_call` and return HTTP 200 promptly to avoid webhook timeouts. |
