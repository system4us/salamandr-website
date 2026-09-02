---
title: "Meetings, Video Connectors & Calendars"
description: Architectural specification and operator guide for meeting scheduling, video room connectors, bidirectional calendar synchronization, recurrence rules, ICS feeds, and automated RSVPs.
---

Salamandr integrates native **Meeting Scheduling & Video Room Management** (`internal/meeting`), bridging customer support conversations directly with live video calls and external corporate calendars.

:::important[Enterprise Licensing]
Meeting scheduling and external connectors (Microsoft Teams, Zoom, Google Meet, Outlook 365, Google Calendar) are Enterprise features gated behind `license.ModuleMeetings`. The Community edition supports basic ticket timestamps, but connector integrations and live sync require a licensed deployment.
:::

---

## 1. Video Connectors vs. Calendar Sync

A common point of confusion is how video rooms and calendar synchronization interact. Salamandr keeps these as two decoupled integrations:

```
┌────────────────────────────────────────────────────────────────────────┐
│                     Salamandr Meeting Scheduler                        │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌───────────────────────────────────────┐ ┌──────────────────────────────┐
│       1. Video Room Connector         │ │      2. Calendar Sync        │
│    (Teams / Zoom / Google Meet)       │ │  (Outlook 365 / Google Cal)  │
├───────────────────────────────────────┤ ├──────────────────────────────┤
│ • Generates the live join URL         │ │ • Mirrors meeting into       │
│ • Exactly ONE provider per meeting    │ │   agent's external calendar  │
│ • Or 'manual' for pasted custom links │ │ • Real-time free/busy checks │
│ • Fired when meeting is created       │ │ • Bidirectional edit syncing │
└───────────────────────────────────────┘ └──────────────────────────────┘
```

- **Video Connectors** (`internal/connector/providers/msteams`, `zoom`, `meet`): Issue the **join link** (e.g. `https://teams.microsoft.com/l/meetup-join/...` or `https://zoom.us/j/...`). Exactly one provider applies to each scheduled meeting.
- **Calendar Sync** (`internal/connector/providers/outlookcal`, `googlecal`): Mirrors **every** meeting an agent organizes or attends into their personal external calendar, regardless of which video provider is used.

### Bring-Your-Own-App (BYOA) Architecture
In accordance with Salamandr's self-hosted custody posture:
1. The administrator registers an OAuth 2.0 application in their tenant's Azure AD / Google Cloud Console / Zoom Marketplace.
2. The credentials (`client_id`, `client_secret`) are saved once in **Admin Panel &rarr; Settings &rarr; Connectors**.
3. Each staff agent connects their personal account individually from **Profile &rarr; Connections**.
4. OAuth tokens are encrypted at rest using `ENCRYPTION_KEY` and automatically refreshed on demand.

---

## 2. Scheduling & Lifecycle Mechanics

Meetings can be scheduled from the main **Admin Panel &rarr; Calendar** or directly from the ticket detail page via the **"Schedule a meeting"** button in the composer (which automatically links the ticket and adds the customer as an attendee).

### Meeting Data Model
- **Title, Description, Start & End Timestamps:** Plain local dates/times converted to UTC for storage.
- **Video Call Provider:** `manual` (paste any link), `msteams`, `zoom`, or `meet`.
- **Linked Ticket:** Optional UUID linking the meeting to a customer ticket.
- **Attendees:** Staff agents, ticket collaborators, or arbitrary external email addresses.
- **Recurrence:** Optional recurring schedule rule (see below).

### Architectural Invariants:
1. **Unconditional Field Assignment (No Coalescing):**
   `UpdateMeeting` assigns every field outright. A `null` in the payload means the organizer deliberately cleared that field (e.g., wiping a description or unlinking a ticket).
2. **Cancelled Meetings Cannot Be Re-edited (HTTP 409 Conflict):**
   Cancelling a meeting purges external calendar mirrors and notifies attendees. Re-editing a cancelled meeting is blocked to prevent recreating zombie events for canceled appointments. A new meeting must be created instead.
3. **Detached Context Synchronization:**
   Calendar mirroring (`syncCalendars` / `unsyncCalendars`) executes on `context.WithoutCancel` with a strict execution budget. A browser closing or disconnecting mid-save will never leave an orphaned remote event without a database sync row.

---

## 3. Real-Time Availability & Conflict Checking

When an organizer selects a time window and adds attendees, Salamandr performs a real-time availability check (`CheckAvailability`):

1. **Internal Check:** Queries Salamandr's internal database for overlapping meetings where the agent is listed as organizer or attendee.
2. **External Busy-Time Check:** Queries connected Google Calendar / Outlook 365 accounts for external busy blocks.
3. **Self-Conflict Exclusion:** Free-busy checks automatically exclude the meeting currently being edited, avoiding false conflict warnings against its own calendar mirror.
4. **Non-Blocking Warning:** Conflicts appear as visual badges and advisory warnings in the scheduling modal; they never hard-block an organizer from saving.

---

## 4. Recurrence Engine (`RRULE`)

Salamandr supports recurring meeting schedules using a compliant `RRULE` specification (`internal/meeting/rrule.go`):

- **Supported RRULE Subset:**
  - Frequencies: `FREQ=DAILY`, `FREQ=WEEKLY`, `FREQ=MONTHLY`, `FREQ=YEARLY`
  - Intervals: `INTERVAL=1`, `INTERVAL=2`, etc.
  - End Bounds: `COUNT=N` or `UNTIL=YYYYMMDDTHHMMSSZ`
  - Day Filters: `BYDAY=MO,TU,WE,TH,FR` (for weekly schedules)
- **Single-Row Series Architecture:**
  A recurring series is stored as **one single row** (`meetings.recurrence_rule`) rather than spawning hundreds of pre-generated rows.
- **On-the-Fly Virtual Expansion:**
  When rendering week/month calendar views or scanning for upcoming reminders, `OccurrencesInRange` dynamically computes virtual occurrences from the master rule.
- **Series-Wide Actions:**
  Editing or cancelling any occurrence updates or terminates the entire recurring series uniformly.

---

## 5. iCalendar Invitations (`.ics`), SMTP & RSVPs

Salamandr sends native iCalendar invitations directly through the tenant's configured SMTP relay:

```
┌────────────────────────────────────────────────────────────────────────┐
│                     Inbound RSVP Email Received                        │
│                     (METHOD:REPLY, PARTSTAT:ACCEPTED)                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 1. emailIngest captures text/calendar payload                          │
│ 2. ics.ParseReply extracts UID and PARTSTAT (Accepted/Declined)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 3. Short-circuit: Service.RecordRSVP updates attendee record           │
│    (Prevents duplicate ticket creation from inbound email reply)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. Appends system note onto linked ticket thread:                      │
│    "Jane Doe accepted the meeting invitation."                         │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Invitation Specifications:
- **Stable UID Format:** Every invitation carries `UID: <meeting-uuid>@meetings.salamandr.invalid`. Using a fixed non-resolving domain ensures that changing `FRONTEND_URL` or domain names never orphans outstanding calendar events.
- **Sequence Number Replacement:** Migrations maintain `meetings.invite_sequence`. When a meeting is edited, the sequence number increments. External mail clients (Outlook, Apple Mail, Gmail) automatically replace the old calendar entry instead of generating duplicate entries.
- **Participant Cancellation:** If an attendee is removed during an edit, a tailored `METHOD:CANCEL` is dispatched to their email address while other attendees receive a `METHOD:REQUEST`.
- **Automated Ticket Timeline Notes:** Scheduling, editing, canceling, or RSVPing to a meeting automatically logs a system note (`meeting_scheduled`, `meeting_updated`, `meeting_cancelled`, `meeting_rsvp`) on the linked ticket's conversation timeline.

---

## 6. Personal ICS Subscription Feeds

Agents and customers can subscribe to their personal meeting schedule in external calendar applications (Apple Calendar, Google Calendar, Thunderbird) via a live HTTP webcal subscription:

- **Feed URL:** `GET /meetings/feed/{token}.ics` (or `webcal://helpdesk.domain.com/meetings/feed/{token}.ics`)
- **Unauthenticated Token Authentication:** Calendar clients perform background HTTP GET requests without user session cookies. Authentication is handled by a cryptographically random token (`users.calendar_feed_token`).
- **One-Click Token Revocation:** Regenerating the token in profile settings immediately invalidates the old URL, serving as a clean revocation mechanism.
- **Window Scope:** Feeds emit active meetings within a `±180-day` sliding window, serializing recurring meetings as single `RRULE`-bearing `VEVENT` blocks.

---

## 7. Bidirectional Calendar Sync Webhooks

When an agent moves or cancels a meeting directly inside Outlook or Google Calendar, the change flows back into Salamandr:

- **Microsoft Graph Subscriptions:** Inbound notifications hit `POST /integrations/outlook_calendar/webhook` (verified via `clientState`).
- **Google Calendar Channels:** Inbound push notifications hit `POST /integrations/google_calendar/webhook` (verified via channel token).
- **Background Renewal Runner:** `cmd/worker`'s `calendarWatchRenewalRunner` executes hourly to re-subscribe expiring webhook channels.

---

## 8. REST API Reference

### 1. Schedule a Meeting
```http
POST /api/v1/meetings
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "title": "Clinical Telemetry Hardware Review",
  "description": "Reviewing signal interference logs on ECG unit 4.",
  "start_at": "2026-09-01T14:00:00Z",
  "end_at": "2026-09-01T15:00:00Z",
  "video_provider": "msteams",
  "ticket_id": "88c12345-6789-abcd-ef01-234567890abc",
  "attendees": [
    { "user_id": "11a12345-6789-abcd-ef01-234567890abc" },
    { "email": "dr.smith@hospital.org" }
  ],
  "recurrence_rule": "FREQ=WEEKLY;INTERVAL=1;COUNT=4;BYDAY=TU"
}
```

### 2. Check Real-Time Availability
```http
GET /api/v1/meetings/availability?from=2026-09-01T08:00:00Z&to=2026-09-01T18:00:00Z&attendee_ids=11a12345-6789-abcd-ef01-234567890abc,22b12345-6789-abcd-ef01-234567890abc
Authorization: Bearer <API_TOKEN>
```

#### Response:
```json
{
  "conflicts": [
    {
      "user_id": "11a12345-6789-abcd-ef01-234567890abc",
      "user_name": "Sarah Connor",
      "busy_ranges": [
        {
          "start_at": "2026-09-01T14:30:00Z",
          "end_at": "2026-09-01T15:30:00Z",
          "source": "google_calendar"
        }
      ]
    }
  ]
}
```

### 3. Update Meeting
```http
PUT /api/v1/meetings/99d12345-6789-abcd-ef01-234567890abc
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "title": "Clinical Telemetry Hardware Review (Rescheduled)",
  "description": "Updated review time for ECG telemetry diagnostic check.",
  "start_at": "2026-09-01T16:00:00Z",
  "end_at": "2026-09-01T17:00:00Z",
  "video_provider": "msteams",
  "ticket_id": "88c12345-6789-abcd-ef01-234567890abc",
  "attendees": [
    { "user_id": "11a12345-6789-abcd-ef01-234567890abc" },
    { "email": "dr.smith@hospital.org" }
  ]
}
```

### 4. Cancel Meeting
```http
POST /api/v1/meetings/99d12345-6789-abcd-ef01-234567890abc/cancel
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "reason": "Hardware issue resolved prior to call."
}
```

### 5. Regenerate ICS Feed Token
```http
POST /api/v1/meetings/feed-token/regenerate
Authorization: Bearer <API_TOKEN>
```

#### Response:
```json
{
  "feed_token": "cal_sec_99a8b7c6d5e4f3a2b1c0",
  "feed_url": "https://helpdesk.yourcompany.com/meetings/feed/cal_sec_99a8b7c6d5e4f3a2b1c0.ics"
}
```
