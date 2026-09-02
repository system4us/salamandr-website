---
title: FAQ
description: Common questions about self-hosting, editions, data ownership and support.
---

### Is Community edition actually free, or is it a crippled trial?

Free, AGPL-3.0, no feature timer, up to 5 agents. Every channel adapter, SLA policies, bot
flows and the WASM plugin system ship in Community — the seat count is the only limit, not a
cut-down feature set. Enterprise replaces that cap with your plan's own agent band (10, 25, 50,
or a custom deal above that), enforced locally by the license you already hold, and adds SSO,
an audit log, scoped API keys and priority support.

### Does anything in Salamandr call home?

No. There's no telemetry, no anonymous usage reporting, and no license-check network call —
Enterprise licenses verify offline against a key baked into the binary. This is checked in
CI: a release build is inspected to confirm it reports itself correctly before it's published.

### Can I migrate away later if I self-host?

Yes — it's your database. Since everything lives on your own Postgres instance, leaving is a
`pg_dump`, not a support ticket.
<!-- SaaS vetoed for now — the caveat below applies once it's offered again:
(SaaS mode is the one place this is less literal today: this org holds the database, so the
honest claim there is "you can leave whenever," and we don't yet have a polished self-service
export flow for it — ask if you need one.)
-->

### Do I need Kubernetes to run this?

No. A single Docker Compose file (`deploy/production/`) is the primary deployment path, with
an optional bundled Postgres/Redis/MinIO. Docker Swarm and Kubernetes/Helm exist for larger
deployments, or for running several separate self-hosted instances side by side (see
[Multiple instances, one release](../multi-instance-deployments/)), but aren't required to get
started.

### Can I run one instance per client or business unit instead of one shared deployment?

Yes — and it's the recommended shape, not a workaround. Salamandr has no multi-tenant mode: each
instance is a genuinely separate self-hosted install with its own database, so there's no shared
instance mixing anyone's data. The Helm chart can declare several such instances in one release,
and Enterprise licenses share one seat pool across all of them. See
[Multiple instances, one release](../multi-instance-deployments/).

### What's the catch with "bring your own app" for Instagram/Messenger?

It's onboarding friction in exchange for never being the intermediary between you and your
customers' Meta accounts. You create your own Meta App and connect it — a bit more setup than
"click connect," but it's what makes a security review straightforward for regulated buyers,
and it means your integration never depends on a shared vendor app's rate limits or review
status.

### Is Salamandr HIPAA / GDPR / PCI compliant?

Not as a certification — compliance is a program your organization runs, not something
software claims on its own, and we'd rather be precise than tick a box we can't back up.
What the architecture gives you: self-hosted deployment keeps PHI and financial data on
infrastructure you control, credentials/tokens/2FA secrets are encrypted at rest
(AES-256-GCM), every admin action lands in an append-only audit trail, and card data never
touches Salamandr at all — refunds and order lookups call your payment processor's API
directly, adding no PCI scope. Under GDPR, self-hosting makes *you* the data controller, and
per-contact consent/erasure is tracked and logged. See [Industries](/industries/) for the
specifics that apply to healthcare, financial services and public-sector teams.

### Can I extend it without forking the Go backend?

Yes — a sandboxed WebAssembly plugin system lets you add CRM, ERP, issue-tracker, chat-mirror
or monitoring connectors with an SDK in Rust or AssemblyScript/TypeScript, without touching
backend Go code. See the plugin SDK in the repository for the manifest format and examples.

### Where do I ask questions or report a bug?

[GitHub](https://github.com/salamandr/salamandr) — issues and discussions on the repository.
