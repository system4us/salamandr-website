---
title: "Agent Skills & Assignment"
description: Defining technical skills, language proficiencies, certifying agent capabilities, and skill-based ticket routing.
---

**Skills-Based Routing** ensures that specialized customer problems reach the right agent on the first attempt without manual reassignments.

---

## 1. Skill Definitions

Skills represent technical proficiencies, language capabilities, regional certifications, or product domain expertise:

- **Technical:** *Cardiology Telemetry*, *Kubernetes Cluster Admin*, *Database Performance Tuning*.
- **Languages:** *Spanish Fluent*, *German C2*, *Japanese Native*.
- **Compliance / Certifications:** *HIPAA Certified*, *SOC 2 Auditor*, *PCI Compliance*.

---

## 2. Managing Skills in the UI

1. Go to **Admin Panel &rarr; Skills**.
2. Click **Add Skill**.
3. Enter the skill name and operational description.
4. Open any agent profile in **Users & Team &rarr; [Agent Name] &rarr; Skills** to assign or remove skills.

---

## 3. Skill-Based Routing Algorithm

When a routing rule executes an `assign_by_skill` action:

1. **Candidate Pool:** The engine filters for agents possessing all required skills.
2. **Online Status:** The agent must be active and within their working hours schedule.
3. **Concurrency Check:** The agent must have fewer open tickets than their configured `max_concurrent_conversations`.
4. **Least Loaded Dispatch:** Among qualifying candidates, the ticket is assigned to the agent with the fewest currently active open conversations.

---

## 4. REST API Reference

### Create Skill
```http
POST /api/v1/skills
Content-Type: application/json
Authorization: Bearer <API_TOKEN>

{
  "name": "Cardiology Telemetry",
  "description": "Certified diagnostic specialist for Holter and ECG receivers"
}
```

### Assign Skill to Agent
```http
POST /api/v1/users/{id}/skills/{skillId}
Authorization: Bearer <API_TOKEN>
```
