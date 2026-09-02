---
title: "Visual Bot Flows & Automated Triage"
description: Complete guide and DSL reference for Salamandr's decision-tree triage bots, WhatsApp/Telegram/Chat buttons, local AI auto-resolution, and human escalation.
---

Salamandr includes a native **Bot Flow Engine** for live messaging channels (WhatsApp, Telegram, Facebook Messenger, Instagram DMs, LINE, and Website Live Chat).

Bot flows evaluate incoming customer messages, resolve routine inquiries (order lookups, KB search, AI chat) without creating a ticket, and escalate complex issues directly to specialized teams.

---

## 1. The Bot Flow DSL Grammar

Bot flows can be authored visually or written directly in Salamandr's indentation-based **Bot Flow DSL**:

```text
menu "<prompt>"                 # Displays interactive options / buttons
  option "<label>"              # Defines a choice branch leading to an indented child
  message "<text>"              # Terminal node: sends final text and ends session
  ask "<prompt>" [as="<name>"]  # Prompts user and captures response into variable <name>
    order_lookup                # Queries Shopify / WooCommerce using captured input
    kb_answer                   # Answers question using AI grounded in public KB articles
    ai_chat                     # Multi-turn conversational AI grounded in public KB
    search_product              # Searches catalog for products matching captured query
    sale                        # Places in-chat order from collected billing variables
  escalate [team="<name>"]      # Creates a ticket in Salamandr and assigns to team
```

---

## 2. Example: Clinical Equipment Triage Flow

```text
menu "Welcome to Saint Jude Support. How can we help you today?"
  option "Telemetry ECG Diagnostic"
    ask "Please enter your device serial number (e.g. SN-90281-C):" as="device_serial"
      ask "What error code is showing on the display?"
        kb_answer
  option "Order Replacement Consumables"
    ask "What product or sensor model do you need?"
      search_product
        ask "How many units?" as="quantity"
          sale
  option "Speak with Clinical Engineer"
    escalate team="Cardiology Hardware Support"
```

---

## 3. Supported Channel Rendering

- **WhatsApp Cloud API:** Menu options automatically render as native **Quick Reply Buttons** (up to 3 items) or **Interactive List Pickers** (up to 10 items).
- **Telegram:** Renders as inline keyboard buttons.
- **Live Chat Widget:** Renders as interactive clickable option pills.
- **SMS / Plain Text Fallback:** Automatically formats numbered choices (`1. Option A, 2. Option B`) and parses numeric user replies.

---

## 4. Session State & No-Ticket Self-Service

- **Self-Service Resolution:** When a customer completes a flow through `message`, `kb_answer`, `ai_chat`, or `sale`, the session finishes and **no ticket is created**, keeping your agent queue clean.
- **Human Escalation:** A ticket is created in PostgreSQL and dispatched to staff **only when an `escalate` node is reached**, attaching the full conversation transcript and captured variables as ticket custom fields.

---

## 5. REST API Reference

### Create Bot Flow
```http
POST /api/v1/bot-flows
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "name": "Cardiology Telemetry Triage",
  "channel": "whatsapp",
  "is_active": true,
  "dsl": "menu \"Welcome to Cardiology Support\"\n  option \"ECG Error Help\"\n    ask \"Describe the issue:\"\n      kb_answer\n  option \"Call Clinical Engineer\"\n    escalate team=\"Cardiology Hardware Support\""
}
```

### View Bot Session Transcript
```http
GET /api/v1/bot-flow-sessions/{id}
Authorization: Bearer <API_TOKEN>
```
