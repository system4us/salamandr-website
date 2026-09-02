---
title: Editions
description: The differences between Salamandr Community and Enterprise, and how the gating works.
---

Salamandr ships in editions from the same codebase. Which one you're running is a
**build-time flag**, never something a deployer can flip at runtime — it's baked into the
compiled binary, not read from an environment variable.

## Community

Free, AGPL-3.0, self-hosted, single tenant, **up to 5 agents**. Every channel adapter,
SLA/business hours, routing (including skill-based assignment), macros, bot flows, the
knowledge base and AI-assist, and the full WASM plugin *system* are in Community — nothing
here runs on a trial clock or stops working after a grace period.

What Community does **not** include is a specific list of integrations this project itself
builds and maintains — see "What Enterprise adds" below. The distinction that matters: the WASM
*plugin host* is free in every edition, so a Community deployer can still connect any of those
same systems by [writing a plugin](../build-a-plugin/) — what Enterprise buys is the
ready-made, already-maintained version instead of writing your own.

Community is meant to stay genuinely useful indefinitely for a team it fits. No feature timer,
no trial period — the 5-agent count is the only clock running.

## Enterprise

Same self-hosted deployment as Community — same Docker images, same Helm chart — unlocked by
uploading a signed license file in the Admin Panel. The license is verified **offline**
against a public key baked into the binary at build time: no license server, no network call,
works fully air-gapped.

Enterprise unlocks:

- **Community's 5-agent cap is replaced by your plan's band** — see
  [Pricing](../enterprise-licensing/#pricing) — baked into the signed license file and enforced
  **locally** against your own agent count, the same offline check that already verifies the
  license itself; no live seat audit, ever
- **Single sign-on** — staff SSO and customer-organization SSO
- **E-commerce**: WooCommerce and Shopify order/refund/coupon lookups from inside a ticket
- **Meeting scheduling**: calendar sync (Outlook/Google) and video connectors (Teams/Zoom/Meet)
- **Slack, Microsoft Teams and Zulip** chat mirroring — Mattermost and Discord mirroring stay
  free in Community
- **Ready-made connectors**: HubSpot, Zabbix, Jira, GitHub Issues, Linear and Redmine, plus file
  requests and cloud storage connectors — see
  [Extension kinds & built-in plugins](../extension-kinds/)
- **Custom staff roles** with per-resource permissions (the two default roles, Administrator and
  Agent, are free in every edition)
- **Administrative audit log**, **scoped API keys**, and **priority support**
- **Run several isolated instances as one fleet** — one license's seat pool shared across as
  many separate self-hosted installs as you deploy, useful for running one instance per client,
  brand or region — see [Multiple instances, one release](../multi-instance-deployments/)

A tenant-configured outbound webhook endpoint is also Enterprise — the underlying event
mechanism every edition's chat mirroring and notifications already run on is not gated, only the
"send this to a URL I configure" admin feature is.

See [Enterprise licensing](../enterprise-licensing/) for how the license file itself works.

<!--
SaaS vetoed for now — re-add when it's offered again:

## SaaS

The same product again, but hosted and operated for you: multi-tenant, subdomain-resolved,
with per-tenant settings for mail, channels and billing. Useful if you'd rather not run
infrastructure at all. Billing is handled per agent per month — see the pricing section on the
[homepage](/#pricing).
-->

## Choosing between them

| You are... | Probably want |
|---|---|
| Evaluating the product, or a small team with in-house ops capacity | Community |
| A company that needs SSO/audit logging but wants to keep the data in-house | Enterprise |
<!-- | A team that doesn't want to operate a database and a Redis instance | SaaS | (vetoed for now) -->
