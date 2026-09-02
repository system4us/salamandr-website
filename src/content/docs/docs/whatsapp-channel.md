---
title: "WhatsApp & Meta Messaging Channels"
description: Connecting WhatsApp Business Cloud API, managing phone numbers, creating and validating Meta message templates, and handling 24-hour service windows.
---

Salamandr integrates natively with the **Meta WhatsApp Business Cloud API**, enabling two-way customer support, automated bot triage, rich interactive buttons, and template notifications.

---

## 1. Connecting WhatsApp Cloud API

1. Go to **Admin Panel &rarr; Channels &rarr; WhatsApp**.
2. Click **Connect WhatsApp**.
3. Authenticate with your Meta Business Account via embedded signup, or enter your credentials manually:
   - **WhatsApp Business Account ID (WABA ID)**
   - **Phone Number ID**
   - **Meta System User Access Token**
4. Configure your Webhook URL in the Meta App Dashboard:
   - **Webhook Callback URL:** `https://helpdesk.yourcompany.com/api/v1/integrations/whatsapp/webhook`
   - **Verify Token:** Your generated tenant verification secret.
   - **Subscribed Fields:** `messages`, `message_template_status_update`.

---

## 2. 24-Hour Customer Service Window & Template Messages

- **Free-Form Messages (Within 24 Hours):** When a customer messages you first, agents can reply with standard text, images, voice notes, and documents for 24 hours.
- **Template Messages (Outside 24 Hours):** To initiate a conversation or follow up on a resolved issue after the 24-hour window expires, agents must use an approved **WhatsApp Message Template**.

---

## 3. Creating & Validating Templates

1. Navigate to **Admin Panel &rarr; Channels &rarr; WhatsApp &rarr; Templates**.
2. Click **New Template**:
   - **Name:** e.g. `order_update_v2`
   - **Category:** `UTILITY` or `MARKETING`
   - **Language:** e.g. `en_US`, `es_ES`
   - **Body:** e.g. `Hi {{1}}, your maintenance request for device {{2}} has been scheduled.`
3. Click **Validate Schema** (local check against Meta guidelines).
4. Click **Submit to Meta**. Meta reviews and approves the template within minutes.

---

## 4. REST API Reference

### Send Approved WhatsApp Template
```http
POST /api/v1/integrations/whatsapp/templates/send
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "ticket_id": "6f1d1f4e-6a1b-4a4f-9b0e-1f0b6d2f9a01",
  "template_name": "order_update_v2",
  "language_code": "en",
  "components": [
    {
      "type": "body",
      "parameters": [
        { "type": "text", "text": "Maria" },
        { "type": "text", "text": "SN-90281-C" }
      ]
    }
  ]
}
```
