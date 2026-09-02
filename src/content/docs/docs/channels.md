---
title: "Connecting Channels"
description: Complete setup guide for connecting Email (IMAP/SMTP), Live Chat (SSE), WhatsApp, Telegram, Instagram DMs, Messenger, and Line.
---

Salamandr normalizes communications across every channel into a unified ticket inbox. Regardless of whether a customer sends an email, a WhatsApp message, or an Instagram DM, support reps work from the exact same interface.

To configure channels, navigate to **Admin Panel &rarr; Channels &amp; Sources**.

---

## 1. Email (IMAP & SMTP)

Salamandr polls inbound emails over IMAP and dispatches replies over SMTP. Passwords and app tokens are encrypted at rest using `AES-256-GCM`.

### Configuration Steps

Navigate to **Admin Panel &rarr; Settings &rarr; Mail Settings**:

1. **Inbound (IMAP):**
   - **Host:** `imap.yourmailserver.com`
   - **Port:** `993` (SSL/TLS) or `143` (STARTTLS)
   - **Username / Password:** Your support inbox credentials (e.g. `support@yourcompany.com`)
   - **Poll Interval:** `60s` (configurable)
2. **Outbound (SMTP):**
   - **Host:** `smtp.yourmailserver.com`
   - **Port:** `587` (STARTTLS) or `465` (SSL/TLS)
   - **From Name / Address:** `Your Support Team <support@yourcompany.com>`
3. Click **Test IMAP Connection** and **Test SMTP Delivery** to verify connectivity.

:::tip[Spam Filtering & Blacklists]
Go to **Admin Panel &rarr; Settings &rarr; Email Blacklist** to block automated spam bots or specific wildcard domains (`*@spam-offers.xyz`) from generating tickets and triggering mail loops.
:::

---

## 2. Website Live Chat Widget

The live chat widget is an ultra-lightweight, zero-dependency script served directly by your self-hosted Salamandr instance using Server-Sent Events (SSE).

### Installation

1. Go to **Admin Panel &rarr; Sources &rarr; Website chat**.
2. Add your allowed domain under **Allowed Origins** (e.g., `https://yourwebsite.com`). Requests from unauthorized origins are rejected automatically.
3. Paste the embed script before the closing `</body>` tag of your website:

```html
<!-- Salamandr Live Chat Widget -->
<script
  src="https://helpdesk.yourcompany.com/livechat/widget.js"
  data-salamandr-id="YOUR_TENANT_ID"
  data-theme="dark"
  async>
</script>
```

### Features Supported in Widget
- Real-time Server-Sent Events (SSE) stream
- File attachments & screenshots drag-and-drop
- Online/offline status based on configured [Business Hours](../slas/)
- Pre-chat data capture form (Name, Email)

---

## 3. WhatsApp Business (Cloud API)

Salamandr connects directly to Meta's WhatsApp Business Cloud API using your own Meta Developer App credentials.

### Configuration Steps

1. In the [Meta for Developers Console](https://developers.facebook.com/), create a Business App and enable **WhatsApp**.
2. In Salamandr, go to **Channels &rarr; Add Source &rarr; WhatsApp**.
3. Fill in your credentials:
   - **Phone Number ID:** From your Meta App Dashboard
   - **WhatsApp Business Account ID (WABA):** From Meta Business Manager
   - **Permanent System User Access Token:** Generated in Meta Business Settings
4. Copy the **Webhook Callback URL** (`https://helpdesk.yourcompany.com/api/v1/integrations/whatsapp/webhook`) and **Verify Token** from Salamandr and paste them into your Meta App Webhook configuration.
5. Subscribe to the `messages` and `message_template_status_update` webhook fields.

:::note[24-Hour Messaging Window & Templates]
Standard replies are permitted within 24 hours of the customer's last message. Outside this window, reps can trigger approved WhatsApp Template Messages created in **Admin Panel &rarr; Channels &rarr; WhatsApp &rarr; Templates**.
:::

---

## 4. Telegram

1. Open Telegram and search for `@BotFather`.
2. Send `/newbot`, choose a name and username for your support bot.
3. Copy the **HTTP API Token** provided by BotFather.
4. In Salamandr, navigate to **Channels &rarr; Add Source &rarr; Telegram**.
5. Paste the token and click **Save & Connect**. Salamandr will automatically register its webhook URL with Telegram's API.

---

## 5. Instagram DMs & Facebook Messenger

1. Create a Meta Developer App with the **Instagram Graph API** and **Messenger API** permissions.
2. In Salamandr, go to **Channels &rarr; Add Source &rarr; Instagram / Messenger**.
3. Input your **Page ID**, **App ID**, **App Secret**, and **Page Access Token**.
4. Set the Webhook Callback URL provided by Salamandr in your Meta Developer App.

---

## 6. Migration from osTicket (Live Database Import)

Salamandr includes a native background migration worker for teams transitioning from osTicket via direct MySQL/MariaDB connection:

1. In **Admin Panel &rarr; Settings &rarr; osTicket Import**, enter your osTicket MySQL connection parameters:
   - **Host & Port:** e.g. `mysql.internal:3306`
   - **Database Name:** e.g. `osticket_db`
   - **Username & Password:** Read-only database user credentials
   - **Table Prefix:** e.g. `ost_`
2. Click **Test Database Connection** to verify database connectivity and table schemas.
3. Click **Start Migration**. The background worker streams tickets, messages, customer profiles, staff assignments, and attachments into PostgreSQL with real-time progress tracking.
