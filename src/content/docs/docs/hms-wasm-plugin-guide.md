---
title: "Guide: Building an HMS Clinical Context Plugin (Rust & TypeScript)"
description: Step-by-step, code-validated tutorial for writing a WebAssembly extension in Rust (.rs) and TypeScript / AssemblyScript (.ts) to display live Hospital Management System records in the ticket sidebar.
---

This guide walks you through building a production-ready **Hospital Management System (HMS / EHR) Context Plugin** in both **Rust (`.rs`)** and **TypeScript / AssemblyScript (`.ts`)** using the official Salamandr Plugin SDK.

The plugin solves a core healthcare workflow: when an agent opens a ticket submitted by a patient or clinic, it queries your internal hospital API on demand, displays patient metadata and assigned medical devices in the ticket's **Context Rail**, and allows agents to trigger a device maintenance work order with one click — **without copying, syncing, or caching clinical records in the helpdesk database**.

---

## Architecture of the HMS Extension

```
┌──────────────────────────────────────┬──────────────────────────────────────────┐
│  Salamandr Ticket Workspace          │  Context Rail (Sandboxed WASM Plugin)    │
├──────────────────────────────────────┼──────────────────────────────────────────┤
│ Requester: maria.gonzalez@health.org │  Hospital Management System (HMS)        │
│ Subject: "Telemetry monitor alarm"   │  • Patient ID: #PAT-44091                │
│                                      │  • Attending Dept: Cardiology            │
│ Message:                             │  • Assigned Device: Holter ECG X5        │
│ "The wireless ECG unit is beeping    │  • Serial Number: SN-90281-C             │
│ error code E-14 during telemetry."   │  • Warranty: Active (Valid to 2027)      │
│                                      │  • Last Calibration: 15/Jul/2026         │
│                                      │                                          │
│                                      │  [ Order Device Maintenance ]            │
└──────────────────────────────────────┴──────────────────────────────────────────┘
```

---

## 1. Defining the Security Manifest (`manifest.toml`)

The manifest is identical whether you build in Rust or TypeScript. The Salamandr host sandbox strictly enforces these scopes at runtime:

```toml
name = "hms-context-plugin"
version = "0.1.0"
kind = "custom"
author = "Hospital Clinical Engineering Team"
description = "Displays live patient identity and medical device telemetry context from internal HMS."

entrypoints = ["fetch_context", "order_device_maintenance"]

[scopes]
# Only allowed to dial internal hospital API endpoints
http_hosts = ["hms-api.hospital.internal"]

# Secrets stored encrypted at rest (AES-256-GCM) in Salamandr DB
config_keys = ["hms_api_token", "hms_base_url"]

# Reads helpdesk ticket identity to stamp work orders
core = ["tickets:read"]
```

---

## 2. Implementation in Rust (`.rs`)

### Setup & `Cargo.toml`

```sh
rustup target add wasm32-unknown-unknown
cargo new --lib hms-context-rust && cd hms-context-rust
```

```toml
[package]
name = "hms-context-rust"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
salamandr-plugin-sdk = "0.3"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[profile.release]
opt-level = "z"
lto = true
strip = true
panic = "abort"
```

### Rust Code (`src/lib.rs`)

```rust
use salamandr_plugin_sdk::{
    get_config, http_fetch, plugin, Action, ActionOutcome, ActionRequest, ActionResult,
    ContextBlock, ContextRequest, ContextResult, HttpRequest, OpError,
};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct PatientLookupResponse {
    patient_id: String,
    full_name: String,
    department: String,
    assigned_device: Option<MedicalDevice>,
}

#[derive(Debug, Deserialize)]
struct MedicalDevice {
    model_name: String,
    serial_number: String,
    warranty_status: String,
    last_calibration_date: String,
}

// 1. Context Entrypoint — Triggered when agent opens ticket
fn fetch_context(req: ContextRequest) -> ContextResult {
    let Some(api_token) = get_config("hms_api_token")? else {
        return Err(OpError::NotConfigured);
    };
    let base_url = get_config("hms_base_url")?
        .unwrap_or_else(|| "https://hms-api.hospital.internal/v1".to_string());

    for email in req.emails() {
        if let Some(patient) = query_hms_patient(&base_url, &api_token, email)? {
            return Ok(vec![render_hms_block(&patient, &req)]);
        }
    }
    Ok(vec![])
}

fn query_hms_patient(base_url: &str, api_token: &str, email: &str) -> Result<Option<PatientLookupResponse>, OpError> {
    let url = format!("{base_url}/patients/lookup?email={}", url_encode(email));
    let resp = http_fetch(
        HttpRequest::get(url)
            .header("Authorization", format!("Bearer {api_token}"))
            .header("Accept", "application/json"),
    )?;

    match resp.status {
        200 => {
            let patient: PatientLookupResponse = serde_json::from_str(&resp.body)
                .map_err(|e| OpError::Other(format!("Failed to parse HMS response: {e}")))?;
            Ok(Some(patient))
        }
        404 => Ok(None),
        401 | 403 => Err(OpError::NotConfigured),
        429 => Err(OpError::RateLimited {
            retry_after: resp.header("Retry-After").map(str::to_string),
        }),
        status if status >= 500 => Err(OpError::Transient(format!("HMS API server error ({status})"))),
        status => Err(OpError::Other(format!("Unexpected HMS status code {status}"))),
    }
}

fn render_hms_block(patient: &PatientLookupResponse, _req: &ContextRequest) -> ContextBlock {
    let mut block = ContextBlock::new("Hospital Management System")
        .field("Patient ID", &patient.patient_id)
        .field("Patient Name", &patient.full_name)
        .field("Department", &patient.department);

    if let Some(device) = &patient.assigned_device {
        block = block
            .field("Assigned Device", &device.model_name)
            .field("Device Serial", &device.serial_number)
            .field("Warranty Status", &device.warranty_status)
            .field("Last Calibrated", &device.last_calibration_date)
            .run(
                Action::run("Order Device Maintenance", "order_device_maintenance")
                    .param("patient_id", patient.patient_id.clone())
                    .param("device_serial", device.serial_number.clone())
                    .textarea("fault_description", "Fault Symptoms", true)
                    .placeholder("Describe device diagnostic error codes or defects..."),
            );
    }
    block
}

// 2. Action Entrypoint — Triggered when agent orders maintenance
fn order_device_maintenance(req: ActionRequest) -> ActionResult {
    let Some(api_token) = get_config("hms_api_token")? else {
        return Err(OpError::NotConfigured);
    };
    let base_url = get_config("hms_base_url")?
        .unwrap_or_else(|| "https://hms-api.hospital.internal/v1".to_string());

    let payload = serde_json::json!({
        "patient_id": req.param("patient_id")?,
        "device_serial": req.param("device_serial")?,
        "description": format!("{}\n\nInitiated from Ticket #{} by {}", req.input("fault_description")?, req.ticket.number, req.actor.name),
        "authorized_by": req.signature(),
    });

    let resp = http_fetch(
        HttpRequest::post(format!("{base_url}/maintenance-orders"), payload.to_string())
            .header("Authorization", format!("Bearer {api_token}"))
            .header("Content-Type", "application/json"),
    )?;

    match resp.status {
        200 | 201 => Ok(ActionOutcome::new("Maintenance work order successfully generated in HMS")),
        401 | 403 => Err(OpError::NotConfigured),
        status => Err(OpError::Other(format!("HMS work order creation failed ({status})"))),
    }
}

fn url_encode(raw: &str) -> String {
    let mut out = String::with_capacity(raw.len());
    for byte in raw.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => out.push(byte as char),
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}

plugin! {
    name: "hms-context-plugin",
    version: "0.1.0",
    context_ops: {
        "fetch_context" => fetch_context,
    },
    action_ops: {
        "order_device_maintenance" => order_device_maintenance,
    }
}
```

---

## 3. Implementation in TypeScript / AssemblyScript (`.ts`)

AssemblyScript is strict TypeScript that compiles to WebAssembly with zero overhead.

### Setup & `package.json`

```sh
mkdir hms-context-ts && cd hms-context-ts
npm init -y
npm install --save-dev assemblyscript
npm install @salamandr/plugin-sdk
```

Configure `package.json` build scripts:

```json
{
  "name": "hms-context-ts",
  "version": "0.1.0",
  "scripts": {
    "build": "asc assembly/index.ts --target release --outFile plugin.wasm --optimize"
  },
  "devDependencies": {
    "assemblyscript": "^0.27.0"
  },
  "dependencies": {
    "@salamandr/plugin-sdk": "^0.3.0"
  }
}
```

### TypeScript Code (`assembly/index.ts`)

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
  OpError,
  getConfig,
  httpFetch,
  plugin,
  JSONResult,
  JValue
} from "@salamandr/plugin-sdk";

// 1. Context Entrypoint
export function fetchContext(req: ContextRequest): ContextResult {
  const tokenLookup = getConfig("hms_api_token");
  if (tokenLookup.error !== null || tokenLookup.value === null) {
    return ContextResult.err(OpError.notConfigured());
  }
  const apiToken = tokenLookup.value!;

  const urlLookup = getConfig("hms_base_url");
  const baseUrl = (urlLookup.value !== null) ? urlLookup.value! : "https://hms-api.hospital.internal/v1";

  const emails = req.emails();
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const url = baseUrl + "/patients/lookup?email=" + encodeURIComponent(email);
    
    const httpReq = HttpRequest.get(url)
      .header("Authorization", "Bearer " + apiToken)
      .header("Accept", "application/json");
      
    const res = httpFetch(httpReq);
    if (res.error !== null) {
      return ContextResult.err(res.error!);
    }
    
    const httpRes = res.response!;
    if (httpRes.status === 200) {
      const parsed = JValue.parse(httpRes.body);
      if (parsed.isObject()) {
        const obj = parsed.asObject();
        const patientId = obj.getString("patient_id", "");
        const fullName = obj.getString("full_name", "");
        const department = obj.getString("department", "");
        
        const block = new ContextBlock("Hospital Management System")
          .field("Patient ID", patientId)
          .field("Patient Name", fullName)
          .field("Department", department);
          
        if (obj.has("assigned_device")) {
          const dev = obj.getObject("assigned_device");
          const model = dev.getString("model_name", "");
          const serial = dev.getString("serial_number", "");
          const warranty = dev.getString("warranty_status", "");
          const calibration = dev.getString("last_calibration_date", "");
          
          block
            .field("Assigned Device", model)
            .field("Device Serial", serial)
            .field("Warranty Status", warranty)
            .field("Last Calibrated", calibration)
            .run(
              Action.run("Order Device Maintenance", "order_device_maintenance")
                .param("patient_id", patientId)
                .param("device_serial", serial)
                .textarea("fault_description", "Fault Symptoms", true)
            );
        }
        
        return ContextResult.ok([block]);
      }
    } else if (httpRes.status === 404) {
      continue;
    } else {
      return ContextResult.err(OpError.other("HMS API error: " + httpRes.status.toString()));
    }
  }

  return ContextResult.ok([]);
}

// 2. Action Entrypoint
export function orderDeviceMaintenance(req: ActionRequest): ActionResult {
  const tokenLookup = getConfig("hms_api_token");
  if (tokenLookup.error !== null || tokenLookup.value === null) {
    return ActionResult.err(OpError.notConfigured());
  }
  const apiToken = tokenLookup.value!;

  const urlLookup = getConfig("hms_base_url");
  const baseUrl = (urlLookup.value !== null) ? urlLookup.value! : "https://hms-api.hospital.internal/v1";

  const patientId = req.param("patient_id");
  const deviceSerial = req.param("device_serial");
  const faultDescription = req.input("fault_description");

  const bodyJson = "{\"patient_id\":\"" + patientId + "\",\"device_serial\":\"" + deviceSerial + "\",\"description\":\"" + faultDescription + "\"}";

  const httpReq = HttpRequest.post(baseUrl + "/maintenance-orders", bodyJson)
    .header("Authorization", "Bearer " + apiToken)
    .header("Content-Type", "application/json");

  const res = httpFetch(httpReq);
  if (res.error !== null) {
    return ActionResult.err(res.error!);
  }

  const httpRes = res.response!;
  if (httpRes.status === 200 || httpRes.status === 201) {
    return ActionResult.ok(new ActionOutcome("Maintenance work order successfully generated in HMS"));
  }

  return ActionResult.err(OpError.other("Work order creation failed: " + httpRes.status.toString()));
}

// Register Plugin Entrypoints
plugin({
  contextOps: {
    "fetch_context": fetchContext
  },
  actionOps: {
    "order_device_maintenance": orderDeviceMaintenance
  }
});
```

---

## 4. Compiling and Installing

### Building the WASM Binary

- **For Rust:**
  ```sh
  cargo build --release --target wasm32-unknown-unknown
  # Output: target/wasm32-unknown-unknown/release/hms_context_rust.wasm
  ```

- **For TypeScript:**
  ```sh
  npm run build
  # Output: plugin.wasm
  ```

### Uploading to Salamandr

1. Navigate to **Admin Panel &rarr; Extensions &rarr; Install Extension**.
2. Select your `manifest.toml` and compiled `plugin.wasm`.
3. Fill in `hms_api_token` and `hms_base_url` under Settings.
4. Toggle **Enable Extension**.
