---
title: "Calendar Sync & iCal Feeds"
description: Two-way synchronization with Google Calendar and Microsoft Outlook 365, agent availability detection, ICS subscription feeds, and push webhook event mirrors.
---

Salamandr keeps support agents' schedules synchronized with their enterprise calendars to prevent double-bookings, automate availability detection during ticket triage, and synchronize call invitations.

:::note[Enterprise Feature]
Calendar synchronization and OAuth connectors require the **Enterprise Edition** (`license.ModuleMeetings`).
:::

---

## 1. Calendar Sync Architecture

Salamandr interfaces with **Google Calendar** (Google Workspace API) and **Microsoft Outlook** (Microsoft Graph API) using a tenant-managed OAuth 2.0 credential model:

```
┌─────────────────────────┐                 ┌─────────────────────────┐
│     Google Workspace    │                 │   Microsoft 365 Graph   │
│   (Google Calendar API) │                 │     (Outlook API)       │
└────────────┬────────────┘                 └────────────┬────────────┘
             │                                           │
             │ OAuth 2.0 Free/Busy                       │ OAuth 2.0 Free/Busy
             │ Webhook Push Events                       │ Webhook Subscriptions
             ▼                                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Salamandr Calendar Engine                      │
│                         (internal/meeting)                          │
├─────────────────────────────────────────────────────────────────────┤
│ • Aggregates multi-calendar busy blocks per agent                   │
│ • Detects conflicts during ticket meeting scheduling                │
│ • Mirrors meeting events into organizer/attendee calendars          │
│ • Provides private, revocable Webcal (.ics) subscription feeds      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Setting Up Enterprise OAuth Connectors

### A. Microsoft 365 (Outlook / Graph API)
1. In Azure Portal &rarr; **App Registrations**, create an application.
2. Under **API Permissions**, grant:
   - `Calendars.ReadWrite` (Delegated)
   - `offline_access`
3. Add redirect URI: `https://helpdesk.yourcompany.com/api/v1/connectors/outlookcal/callback`.
4. In Salamandr **Admin Panel &rarr; Settings &rarr; Connectors**, save your `Client ID` and `Client Secret`.

### B. Google Workspace (Google Calendar API)
1. In Google Cloud Console, enable the **Google Calendar API**.
2. Under **Credentials &rarr; OAuth 2.0 Client IDs**, configure redirect URI:
   - `https://helpdesk.yourcompany.com/api/v1/connectors/googlecal/callback`
3. In Salamandr **Admin Panel &rarr; Settings &rarr; Connectors**, save your `Client ID` and `Client Secret`.

### C. Agent Account Linking
Once the tenant app is configured, each agent connects their account:
1. Navigate to **Profile &rarr; Connections**.
2. Click **Connect Google Calendar** or **Connect Outlook**.
3. Authorize via your organization's Single Sign-On.

---

## 3. Real-Time Availability Checking

When scheduling a meeting from a ticket, Salamandr checks agent availability:

- **Aggregated Busy Windows:** Queries both internal Salamandr meetings and connected external calendars (`calendarView` on Graph, `events.list` on Google).
- **Self-Exclusion Invariant:** When editing an existing meeting, its own calendar event is excluded from the query so it doesn't trigger a false conflict against itself.
- **Visual Warning:** Conflicts are displayed in the scheduling modal without blocking ticket workflows.

---

## 4. Personal Webcal (`.ics`) Feeds

Every staff agent and customer has access to a private, dynamic calendar feed:

- **Subscribe in Desktop/Mobile Apps:** Compatible with Apple Calendar, Google Calendar, Thunderbird, and mobile OS calendars.
- **Feed URL Format:** `webcal://helpdesk.yourcompany.com/meetings/feed/{token}.ics`
- **Dynamic Window:** Automatically serves meetings within a `±180-day` sliding window.
- **Revocation:** If a token is compromised or a device is lost, clicking **Regenerate Feed Token** invalidates the old URL instantly.

---

## 5. Bidirectional Sync & Webhook Subscriptions

When an agent alters or deletes a mirrored support meeting directly in Google Calendar or Outlook:

1. **Inbound Webhook Delivery:**
   - Microsoft Graph sends change alerts to `/integrations/outlook_calendar/webhook`.
   - Google Calendar sends channel notifications to `/integrations/google_calendar/webhook`.
2. **State Reconciliation:**
   - Salamandr re-fetches the modified event from the vendor API.
   - Updates start/end times or cancels the meeting within Salamandr.
   - Logs an automated note on any linked ticket conversation.
3. **Automatic Watch Renewal:**
   - `cmd/worker`'s `calendarWatchRenewalRunner` runs hourly to renew expiring push channels before they lapse.

---

## 6. REST API Reference

### Check Availability Across All Connected Calendars
```http
GET /api/v1/meetings/availability?from=2026-09-01T08:00:00Z&to=2026-09-01T18:00:00Z&attendee_ids=u_1001,u_1002
Authorization: Bearer <API_TOKEN>
```

### Regenerate Calendar Subscription Token
```http
POST /api/v1/meetings/feed-token/regenerate
Authorization: Bearer <API_TOKEN>
```
