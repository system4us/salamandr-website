---
title: "Email Inbound & Outbound Configuration"
description: Configuring multi-mailbox IMAP/POP3 polling, SMTP relay delivery, SPF/DKIM verification, and spam blacklist filtering in Salamandr.
---

Email remains the backbone of customer support. Salamandr supports connecting multiple independent mailboxes per tenant with isolated routing rules, custom aliases, and automated parsing.

---

## 1. Connecting a Mailbox

1. Go to **Admin Panel &rarr; Settings &rarr; Mail Settings**.
2. Click **Add Mailbox**.
3. Configure Inbound (IMAP) and Outbound (SMTP) parameters:
   - **Display Name:** e.g. *Support Team*
   - **Inbound Host & Port:** e.g. `imap.yourmail.com:993` (SSL/TLS)
   - **Outbound Host & Port:** e.g. `smtp.yourmail.com:587` (STARTTLS)
   - **Credentials:** Mailbox username and password or OAuth2 app credentials.
   - **Polling Interval:** e.g. every 60 seconds.

---

## 2. Test Connection Diagnostics

Before saving, click **Test IMAP Connection** and **Test SMTP Delivery**:
- Verifies TLS handshake, SASL authentication, and folder listing.
- Sends a test email to ensure outbound deliverability.

---

## 3. Email Blacklist & Spam Protection

Protect your agents from spam floods and auto-responder loops:
- Navigate to **Admin Panel &rarr; Settings &rarr; Email Blacklist**.
- Add individual email addresses (e.g. `spammer@domain.com`) or wildcard domain masks (e.g. `*@marketing-offers.xyz`).
- Inbound messages from blacklisted senders are rejected at the polling layer without consuming database storage or generating ticket notifications.

---

## 4. REST API Reference

### Create Mailbox Configuration
```http
POST /api/v1/mail-settings
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "name": "Primary Support Mailbox",
  "email": "support@yourcompany.com",
  "imap_host": "imap.yourmail.com",
  "imap_port": 993,
  "imap_username": "support@yourcompany.com",
  "imap_password": "SecretMailPassword123!",
  "smtp_host": "smtp.yourmail.com",
  "smtp_port": 587,
  "smtp_username": "support@yourcompany.com",
  "smtp_password": "SecretMailPassword123!"
}
```

### Test Mailbox Connectivity
```http
POST /api/v1/mail-settings/test-imap
POST /api/v1/mail-settings/test-smtp
Authorization: Bearer <API_TOKEN>
```
