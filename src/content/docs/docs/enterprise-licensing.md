---
title: "Enterprise Licensing & Pricing"
description: Complete guide to Salamandr Enterprise licensing — offline cryptographic verification, agent tiers, fleet pooling, and pricing structure.
---

Salamandr Enterprise operates on the identical self-hosted deployment as the Community edition. It is activated by uploading a cryptographically signed license file in **Admin Panel &rarr; Settings &rarr; License**.

---

## 1. Offline Verification Architecture

The license file's signature is verified **100% offline** against an Ed25519 public key compiled directly into the binary:

- **Zero Network Calls:** No central license server is ever contacted. An air-gapped deployment operates identically to an internet-connected one.
- **Payload Contents:** The signed license file specifies the organization name, enabled module flags, licensed agent band, and expiration timestamp.
- **Graceful Expiration:** If a license expires, existing ticket history and core helpdesk operations remain accessible; Enterprise-gated capabilities simply pause until a renewed license is provided.

---

:::note[No Feature Paywalls Inside Enterprise]
**Every Enterprise license unlocks 100% of Enterprise capabilities starting from the base tier (up to 10 agents).** There are no feature paywalls, add-on modules, or tiered restrictions between Enterprise plans — the tiers differ solely by licensed agent capacity.
:::

## 2. Enterprise Pricing & Agent Tiers

Self-hosted Enterprise is priced in **predictable annual agent tiers**, rather than volatile monthly per-seat micro-billing:

| Plan Tier | Agent Capacity | Annual Price | Effective Monthly Cost | Feature Scope |
|---|---|---|---|---|
| **Enterprise 10** | Up to 10 agents | **$3,000** / year | ~$25 / agent / mo | **Full Enterprise Suite** (100% features unlocked) |
| **Enterprise 25** | Up to 25 agents | **$6,500** / year | ~$21 / agent / mo | **Full Enterprise Suite** (100% features unlocked) |
| **Enterprise 50** | Up to 50 agents | **$11,000** / year | ~$18 / agent / mo | **Full Enterprise Suite** (100% features unlocked) |
| **Custom / Unlimited**| 50+ to Unlimited | **Custom Quote** | Tailored volume | **Full Enterprise Suite** (Custom capacity / No cap) |

:::tip[Predictable Band Pricing]
Agent tiers eliminate administrative overhead: you can add, remove, or rotate staff members within your tier without adjusting contracts or receiving unexpected mid-month invoices.
:::

---

## 3. What Enterprise Unlocks (All Tiers)

Every Enterprise tier includes the complete suite of advanced capabilities with zero exceptions:

### Identity & Access Control
- **Single Sign-On (SSO):** SAML 2.0 and OIDC support for staff agents via Okta, Azure AD / Microsoft Entra ID, Google Workspace, and Keycloak.
- **Customer Organization SSO:** Allow enterprise B2B customers to authenticate into their customer portal using their own corporate identity provider.
- **Granular Custom Roles:** Define custom staff permission profiles with per-resource read/write/delete scopes beyond the default Admin/Agent roles.
- **Scoped API Keys:** Issue programmatic API tokens with strict resource scopes, expiration dates, and per-token rate limits.

### Turnkey Integrations
- **E-Commerce Context:** Live, on-demand order lookups, tracking info, and refund processing for Shopify and WooCommerce right in the ticket view.
- **Issue Trackers & CRM:** Pre-built connectors for Jira, GitHub Issues, Linear, HubSpot, Redmine, and Zabbix monitoring.
- **Direct Storage Requests:** Send tokenized links allowing customers to upload large files directly into your private Amazon S3, Google Drive, Dropbox, Box, or SFTP storage.
- **Calendar & Meetings:** Book customer calls directly from the ticket timeline with Outlook and Google Calendar synchronization and automated Zoom, Meet, or Teams video links.
- **ChatOps Mirroring:** Two-way ticket mirroring into Slack, Microsoft Teams, Zulip, Mattermost, and Discord.

### Multi-Instance Fleet Deployments
- **Shared Seat Pooling:** A single Enterprise license can pool its agent seat capacity across multiple physically isolated helpdesk installations.
- **Multi-Brand & Multi-Client:** Deploy separate instances per subsidiary, client organization, or geographic region with independent databases while maintaining a single commercial agreement.

---

## 4. How the Seat Cap is Enforced

The maximum agent count is embedded directly in the signed license file and enforced **locally** by your self-hosted instance:

```text
Active Staff Agents: 18 / 25 [Capacity Available]
License Status: Valid · Offline Verification Active
```

- When you add a new staff member, Salamandr checks the active agent count against the licensed limit in your local PostgreSQL database.
- Deactivating an inactive agent immediately frees up their seat for a new team member.

---

## 5. Ordering & License Provisioning

1. Reach out to request a quote or order your required agent tier.
2. You will receive a cryptographically signed license file (`salamandr.lic`).
3. In your Salamandr Admin Panel, navigate to **Settings &rarr; License** and upload the file.
4. All Enterprise features activate instantly without restarting containers.
