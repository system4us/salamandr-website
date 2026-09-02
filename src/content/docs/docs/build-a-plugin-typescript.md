---
title: "Build a Plugin (TypeScript & AssemblyScript)"
description: A complete, from-scratch walkthrough of writing a Salamandr WebAssembly extension in TypeScript using AssemblyScript and @salamandr/plugin-sdk.
---

This guide walks you through building a custom **Salamandr WebAssembly plugin from scratch using TypeScript (AssemblyScript)**. 

Plugins compile directly into freestanding `.wasm` binaries and run in Salamandr's secure, sandboxed WebAssembly runtime. They allow you to pull customer context from internal databases, CRM systems, ERPs, or APIs directly into the agent's **Context Rail** on demand without modifying the core server.

:::tip[Rust Alternative]
If you prefer writing in Rust, check out the companion guide: [Build a Plugin (Rust)](../build-a-plugin/). Both SDKs compile to identical WebAssembly binaries and support the same ABI.
:::

---

## What an AssemblyScript Plugin Can Do

Salamandr plugins run in a zero-trust sandbox. Every capability must be declared in your `manifest.toml` and approved by the tenant administrator:

| Capability | AssemblyScript SDK Function | Required Manifest Scope |
|---|---|---|
| Outbound HTTP calls | `httpFetch(req)` | `scopes.http_hosts` |
| Encrypted tenant secrets | `getConfig("api_key")` | `scopes.config_keys` |
| Key/Value persistent store | `kvGet` / `kvSet` / `kvDelete` | `scopes.kv = true` |
| Read core helpdesk records | `coreCall("tickets", ...)` | `scopes.core = ["tickets:read"]` |
| Rich formatting | `richtextToMarkdown(html)` | None |
| Server logging | `log(msg)` | None |

---

## 1. Project Initialization

### Instant Scaffolding (Recommended)

You can scaffold a complete TypeScript / AssemblyScript plugin with testing fixtures in seconds using the official CLI:

```sh
npx salamandrsdk new -name my-ts-plugin -lang ts            # Single-file layout
npx salamandrsdk new -name my-ts-plugin -lang ts -split     # Modular layout (models, client, views, actions)
```

For a deep dive into structuring production plugins with clean separation of logic and presentation, see the [CRM Plugin Architecture Guide](../build-crm-plugin/).

### Manual Setup

Alternatively, create a new directory for your plugin from scratch:

```sh
mkdir my-ts-plugin && cd my-ts-plugin
npm init -y
npm install --save-dev assemblyscript
npm install @salamandr/plugin-sdk
```

Create `asconfig.json` in the root directory:

```json
{
  "targets": {
    "release": {
      "outFile": "dist/plugin.wasm",
      "optimizeLevel": 3,
      "shrinkLevel": 2,
      "converge": true,
      "noExportRuntime": false
    }
  }
}
```

Add build scripts to `package.json`:

```json
{
  "name": "my-ts-plugin",
  "version": "0.1.0",
  "scripts": {
    "build": "asc assembly/index.ts --target release",
    "test": "asc --runTests"
  },
  "devDependencies": {
    "assemblyscript": "^0.27.0"
  },
  "dependencies": {
    "@salamandr/plugin-sdk": "^0.3.0"
  }
}
```

---

## 2. Define the Manifest (`manifest.toml`)

Create `manifest.toml` in your project root:

```toml
name = "acme-crm-ts"
version = "0.1.0"
kind = "crm"
author = "Your Engineering Team"
description = "Displays requester CRM profile and company tier in TypeScript."

entrypoints = ["fetch_context", "log_note"]

[scopes]
# Allowed outbound HTTP hosts
http_hosts = ["api.acme-crm.com"]

# Encrypted configuration keys
config_keys = ["api_key"]

# Read tickets and requester information
core = ["users:read", "tickets:read"]
```

---

## 3. Writing the Plugin (`assembly/index.ts`)

Create `assembly/index.ts` with the complete, strongly-typed plugin implementation:

```typescript
import {
  Action,
  ActionOutcome,
  ActionRequest,
  ActionResult,
  ContextBlock,
  ContextRequest,
  ContextResult,
  HttpRequest,
  HttpResponse,
  JValue,
  OpError,
  getConfig,
  httpFetch,
  plugin
} from "@salamandr/plugin-sdk";

const API_BASE = "https://api.acme-crm.com/v1";

/// 1. Context Entrypoint: Called whenever an agent opens a ticket
export function fetchContext(req: ContextRequest): ContextResult {
  // Read tenant API key
  const keyLookup = getConfig("api_key");
  if (keyLookup.isMissing || keyLookup.isErr) {
    return ContextResult.err(OpError.notConfigured());
  }
  const apiKey = keyLookup.unwrapOr("");

  // Iterate over candidate emails associated with the requester
  const emails = req.emails();
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const contactBlock = findContact(apiKey, email, req);
    if (contactBlock !== null) {
      return ContextResult.ok([contactBlock]);
    }
  }

  return ContextResult.ok([]);
}

/// Query the third-party API via sandboxed HTTP
function findContact(apiKey: string, email: string, req: ContextRequest): ContextBlock | null {
  const url = API_BASE + "/contacts?email=" + encodeURIComponent(email);
  
  const httpReq = HttpRequest.get(url)
    .header("Authorization", "Bearer " + apiKey)
    .header("Accept", "application/json");

  const fetchRes = httpFetch(httpReq);
  if (fetchRes.isErr) {
    return null;
  }

  const res = fetchRes.response!;
  if (res.status === 200) {
    const parsed = JValue.parse(res.body);
    if (!parsed.isObject()) return null;
    
    const root = parsed.asObject();
    if (!root.has("results")) return null;
    
    const results = root.getArray("results");
    if (results.length === 0) return null;
    
    const contact = results[0].asObject();
    const contactId = contact.getString("id", "");
    const fullName = contact.getString("full_name", email);
    const company = contact.getString("company", "Independent");
    const plan = contact.getString("plan", "Standard");
    const ltv = contact.getString("lifetime_value", "$0.00");

    // Build the Context Rail Block
    return new ContextBlock("Acme CRM (TypeScript)")
      .field("Name", fullName)
      .field("Company", company)
      .field("Subscription Plan", plan)
      .field("Lifetime Value", ltv)
      .field("Ticket Reference", "Ticket #" + req.ticket_number.toString())
      .action("Open in CRM", "https://app.acme-crm.com/contacts/" + contactId)
      .run(
        Action.run("Log Account Note", "log_note")
          .param("contact_id", contactId)
          .textarea("body", "Note Content", true)
          .placeholder("What should the account manager know about this ticket?")
      );
  }

  return null;
}

/// 2. Action Entrypoint: Triggered when agent submits a note
export function logNote(req: ActionRequest): ActionResult {
  const keyLookup = getConfig("api_key");
  if (keyLookup.isMissing || keyLookup.isErr) {
    return ActionResult.err(OpError.notConfigured());
  }
  const apiKey = keyLookup.unwrapOr("");

  const contactId = req.param("contact_id");
  const noteBody = req.input("body");

  const payload = "{\"contact_id\":\"" + contactId + "\",\"body\":\"" + noteBody + "\\n\\n— Signed: " + req.signature() + "\"}";

  const httpReq = HttpRequest.post(API_BASE + "/notes", payload)
    .header("Authorization", "Bearer " + apiKey)
    .header("Content-Type", "application/json");

  const fetchRes = httpFetch(httpReq);
  if (fetchRes.isErr) {
    return ActionResult.err(fetchRes.error!);
  }

  const res = fetchRes.response!;
  if (res.status === 200 || res.status === 201) {
    return ActionResult.ok(
      new ActionOutcome("Note successfully logged in Acme CRM")
        .url("https://app.acme-crm.com/contacts/" + contactId)
    );
  }

  return ActionResult.err(OpError.other("Failed to log note: HTTP " + res.status.toString()));
}

/// Register WebAssembly Exports
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

## 4. Building the WebAssembly Binary

Run the build script:

```sh
npm run build
```

This compiles your TypeScript source code into a compact, optimized WebAssembly binary at `dist/plugin.wasm` (typically < 100 KB).

---

## 5. Installing the Plugin in Salamandr

### Using the Admin Web UI
1. Navigate to **Admin Panel &rarr; Extensions &rarr; Install Extension**.
2. Upload `manifest.toml` and `dist/plugin.wasm`.
3. The Admin Panel displays all declared permission scopes (`api.acme-crm.com`) for verification.
4. Enter your `api_key` under **Settings**.
5. Toggle **Enable Extension**.

### Using the REST API
```sh
curl -X POST https://helpdesk.yourcompany.com/api/v1/extensions \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -F manifest=@manifest.toml \
  -F wasm=@dist/plugin.wasm
```

When an agent opens a ticket, Salamandr executes `fetchContext` inside the WebAssembly sandbox, instantly rendering the live customer data in the Context Rail.
