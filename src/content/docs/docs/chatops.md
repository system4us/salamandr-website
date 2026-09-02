---
title: "ChatOps Mirroring (Slack, Teams, Discord, Mattermost, Zulip)"
description: Two-way ticket mirroring into team chat platforms, thread note capturing, @mention synchronization, and per-team channel routing.
---

**ChatOps** connects Salamandr with your organization's internal chat platform, allowing engineers, product managers, and support agents to collaborate on tickets directly from dedicated chat channels.

---

## 1. Supported ChatOps Providers

- **Mattermost** (Free in Community & Enterprise)
- **Discord** (Free in Community & Enterprise)
- **Slack** (Enterprise)
- **Microsoft Teams** (Enterprise)
- **Zulip** (Enterprise)

---

## 2. Two-Way Thread Synchronization

When a ticket is created or updated:
1. A root message is posted to the mapped chat channel (e.g. `#eng-cardiology-support`).
2. Subsequent discussion in the chat platform thread is captured as **Thread Notes** in the Salamandr ticket sidebar.
3. Agents can reply to the internal chat thread directly from the ticket without switching applications.
4. `@mentions` are autocompleted and notified across both platforms.

---

## 3. Configuring Per-Team Channel Routes

Map specific support teams to designated chat channels:
1. Go to **Admin Panel &rarr; Integrations &rarr; ChatOps &rarr; [Provider Name]**.
2. Click **Add Channel Route**:
   - **Support Team:** e.g. *Cardiology Hardware Support*
   - **Chat Channel:** e.g. `#eng-cardiology-support`
3. Choose Mirroring Mode:
   - **Automatic:** Spawns a thread for every ticket assigned to the team.
   - **Manual:** Spawns a thread only when an agent clicks *"Open Chat Thread"* in the ticket detail sidebar.

---

## 4. REST API Reference

### Post Note to ChatOps Thread from Ticket
```http
POST /api/v1/tickets/{id}/thread-notes
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "body": "Engineering confirmation: Hotfix patch v4.2.1 deployed to ICU subnet."
}
```

### Configure Channel Route
```http
PUT /api/v1/integrations/chat/slack/routes
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "team_id": "team_cardiology_uuid",
  "channel_id": "C019284710",
  "channel_name": "#eng-cardiology-support"
}
```
