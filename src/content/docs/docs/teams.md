---
title: "Support Teams & Departments"
description: Organizing staff agents into functional teams, department queues, specialized skill groups, and team-scoped notifications.
---

**Teams** group support agents into specialized functional units (e.g. *Tier-1 Triage*, *Billing & Finance*, *Clinical Engineering*, *DevOps Escalations*). Teams serve as assignment targets for routing rules, queue filters, and ChatOps channel mirroring.

---

## 1. Creating and Managing Teams

1. Go to **Admin Panel &rarr; Teams**.
2. Click **Create Team**.
3. Provide a team name and description:
   - **Name:** e.g. *Cardiology Hardware Support*
   - **Description:** e.g. *Specialized diagnostic unit for telemetry, Holter monitors, and ECG hardware.*
4. Add team members from your active staff roster.

Agents can belong to multiple teams simultaneously.

---

## 2. Team Queues & Filter Views

- **Team Queue:** Agents can quickly view tickets assigned to their team by selecting the team name in the left navigation panel.
- **My Teams Filter:** Saved queue views can filter by `team_id: "mine"` so agents see tickets assigned to any department they are currently part of.
- **Team Unassigned Queue:** View tickets assigned to the department that have not yet been claimed by an individual agent.

---

## 3. Team-Based ChatOps Routing

Each team can be mapped to a dedicated channel in your team chat platform (Slack, Microsoft Teams, Mattermost, Discord, Zulip):

- Tickets assigned to *Clinical Engineering* spawn threads in `#eng-clinical-support`.
- Tickets assigned to *Billing* spawn threads in `#finance-tickets`.

Configure team channel routes in **Admin Panel &rarr; Integrations &rarr; ChatOps &rarr; Channel Routing**.

---

## 4. REST API Reference

### Create a Team
```http
POST /api/v1/teams
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "name": "Clinical Engineering Tier-2",
  "description": "Hardware and telemetry diagnostic response team"
}
```

### Add Agent to Team
```http
POST /api/v1/teams/{id}/members
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "user_id": "u_1001"
}
```

### Remove Agent from Team
```http
DELETE /api/v1/teams/{id}/members/{userId}
Authorization: Bearer <API_TOKEN>
```
