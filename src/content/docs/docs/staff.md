---
title: "Staff & Agent Seats"
description: Managing support agents, administrators, seat capacities, invitation onboarding, concurrent conversation limits, and two-factor authentication.
---

Staff users represent the support agents, team leads, specialists, and administrators who log into Salamandr to triage queues, reply to tickets, and manage platform configuration.

---

## 1. Staff Roles & Capabilities

Salamandr provides built-in system roles as well as custom RBAC roles (Enterprise):

- **Admin:** Full administrative access across all tenant settings, licensing, billing, mailboxes, channels, and team assignments.
- **Agent:** Access to ticket queues, live chat console, customer directory, internal knowledge base, and personal productivity reports.
- **Custom Role (Enterprise):** Fine-grained permission sets defined in **Admin Panel &rarr; Access Control** (e.g. *Field Engineer*, *Billing Specialist*, *Audit Viewer*).

---

## 2. Agent Seats & Fleet Quotas

- **Seat Counting:** Seats are counted based on active users with `role: "agent"` or `role: "admin"`. Customer accounts do not consume licensed seats.
- **Seat Limit:** The maximum number of concurrently active agents allowed by your deployment license.
- **Fleet Quota (Multi-Instance):** In multi-instance deployments, an Enterprise license pool can allocate specific seat quotas per instance (e.g. 15 seats on Instance A, 10 seats on Instance B).

### Checking Seat Usage
Navigate to **Admin Panel &rarr; Users & Team** or query the API:
```http
GET /api/v1/users/seats
Authorization: Bearer <API_TOKEN>
```
**Response (`200 OK`):**
```json
{
  "count": 7,
  "limit": 10,
  "message": "3 seats remaining"
}
```

---

## 3. Inviting New Staff Members

1. Go to **Admin Panel &rarr; Users & Team &rarr; New User**.
2. Fill in the agent's name, email, role, and optional phone number.
3. Check **Send email invitation** or generate a direct invite link.
4. The agent receives an invite link (`/invite/{token}`) to set their secure password and configure Two-Factor Authentication (2FA).

---

## 4. Workload Balancing (Max Concurrent Conversations)

To prevent agent burnout and maintain low response times, administrators can configure a **Max Concurrent Conversations** threshold per agent:

- When an agent reaches their active ticket limit (e.g. 5 concurrent chats/tickets), the routing engine skips them during round-robin or skill-based distribution.
- Once the agent resolves or closes a ticket, their capacity reopens automatically.

---

## 5. Staff Two-Factor Authentication (TOTP)

All staff members can protect their accounts using standard TOTP apps (Google Authenticator, 1Password, Bitwarden, YubiKey):

1. Click user avatar in bottom left &rarr; **My Profile &rarr; Security**.
2. Click **Enable Two-Factor Authentication**.
3. Scan the QR code and enter the 6-digit confirmation token.
4. Download emergency recovery codes.
