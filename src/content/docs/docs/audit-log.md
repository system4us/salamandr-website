---
title: "Audit Log & Compliance (Enterprise)"
description: Immutable administrative audit trails, security event logging, and long-term Parquet ticket archiving.
---

Enterprise and regulated environments require strict tracking of all administrative actions, credential rotations, role modifications, and ticket deletions. Salamandr includes an **Immutable Audit Log** covering exactly this kind of activity — the record a SOC 2, HIPAA, ISO 27001, or DORA review typically asks for. Salamandr itself carries no compliance certification and has not undergone a third-party audit; this feature gives your own compliance program the evidence trail it needs, it doesn't substitute for the audit.

---

## 1. Tracked Administrative Events

Salamandr logs every state mutation across the platform:

- **Authentication & Security:** Logins, failed attempts, 2FA setup/disables, password changes, API key creations and revocations.
- **Access Control:** Role creation, permission adjustments, role assignments to staff.
- **Ticket Operations:** Hard deletions, manual merges, tag vocabulary deletions, bulk reassignments.
- **Integrations & Secrets:** Mailbox credential updates, WhatsApp API key rotations, WASM plugin installations.
- **Data Subject Requests (GDPR):** Customer erasure requests, export logs, consent changes.

---

## 2. Immutability & Database Grants

- The `audit_logs` table has zero `UPDATE` or `DELETE` grants for the application database role.
- Once an audit entry is written, it cannot be modified or purged through the web interface or REST API.

---

## 3. Automated Data Lake Archiving (Parquet & S3)

For long-term retention (3 to 7 years) without bloating active PostgreSQL tables:
- Cold, closed tickets can be automatically compacted into columnar **Apache Parquet** files. The audit log itself is not part of this archiving — it stays in PostgreSQL, governed by the immutability grants above, for as long as you retain that database.
- Exported securely to Amazon S3, Cloudflare R2, MinIO, or Google Cloud Storage.
- Queryable via Athena, DuckDB, Snowflake, or BigQuery.

---

## 4. REST API Reference

### Query Audit Log
```http
GET /api/v1/audit-log?from=2026-08-01T00:00:00Z&to=2026-08-23T23:59:59Z&action=role.update
Authorization: Bearer <API_TOKEN>
```
**Response (`200 OK`):**
```json
{
  "items": [
    {
      "id": "aud_910284710",
      "actor": {
        "id": "u_admin_01",
        "name": "System Administrator",
        "email": "admin@yourcompany.com",
        "ip_address": "192.168.1.50"
      },
      "action": "role.update",
      "resource_type": "rbac_role",
      "resource_id": "role_field_engineer_uuid",
      "details": {
        "added_permissions": ["tickets:edit", "tags:edit"],
        "removed_permissions": []
      },
      "created_at": "2026-08-23T14:30:00Z"
    }
  ]
}
```
