---
title: Multiple instances, one release
description: Run one isolated self-hosted instance per client, brand or region, deployed together and licensed as a single fleet.
---

Salamandr has no multi-tenant mode — every deployment is a single-tenant, self-hosted install
with its own database. If you need several isolated units — one client, one brand, one region,
one department — the answer isn't a shared instance with tenant switching bolted on. It's
several ordinary self-hosted installs, deployed and licensed together.

## What it is

The [Helm chart](../deployment/) (`deploy/helm/salamandr`) accepts a list of instances instead
of a single one. Even a lone deployment is a list with one entry:

```yaml
image:
  tag: "enterprise-1.2.0" # shared by every instance in this release

instances:
  - name: unidad1
    ingress:
      enabled: true
      host: soporte.unidad1.cliente.com
    postgresql:
      enabled: true
      database: unidad1
    redis:
      enabled: true
    env:
      FRONTEND_URL: "https://soporte.unidad1.cliente.com"
      ADMIN_EMAIL: "admin@unidad1.cliente.com"
    secretEnv:
      # ... DATABASE_URL, ENCRYPTION_KEY, ADMIN_PASSWORD, etc — see the
      # chart's own values-example.yaml for the full set
```

Add a second entry, same shape, to run a second unit — its own Deployment, its own
StatefulSets for the bundled Postgres/Redis if you use them, its own ingress and domain, its
own object-storage bucket if configured. **This is real infrastructure isolation, not
simulated multitenancy**: each instance is exactly the same single-tenant install you'd get
running the chart once, just declared alongside the others.

```yaml
instances:
  - name: unidad1
    # ...
  - name: unidad2
    # ...
```

One `helm upgrade` touches every instance listed together — same image tag, one rollout, one
rollback. That's a deliberate tradeoff: it's what makes managing ten instances no harder than
managing one, at the cost of a shared upgrade cadence across all of them. If you need
independent blast radius per unit instead, running separate Helm releases (one values file per
instance) works exactly the same way — nothing about an instance's own configuration changes,
only how many of them share a `helm upgrade`.

## Enterprise: one seat pool across the fleet

A Salamandr Enterprise license is bought as a seat band (see [Enterprise
licensing](../enterprise-licensing/)). Running several instances under one license doesn't mean
buying a separate band per instance — the license's seat allowance is a single pool, and each
instance gets a **quota**: its own slice of that pool, seeded at deploy time via the chart's
`SEAT_QUOTA` environment variable and adjustable afterwards with no redeploy through
[`salamandrctl`](../configuration/#configuration-as-code) or the instance's own Admin API. Move five
seats from a quiet instance to a busy one on a Tuesday afternoon; nobody's session drops.

The chart's multi-instance declaration itself isn't Enterprise-gated — you can deploy several
Community instances side by side the same way, each on its own 5-agent cap. What's Enterprise is
the shared pool: without a license, each instance still enforces its own independent cap.

## Use cases

**Managed service providers.** Run one instance per client instead of one shared helpdesk with
client-visibility rules layered on top. Each client's tickets, attachments and customer PII sit
in a database only that instance can reach — there's nothing to misconfigure that would leak one
client's conversation into another's view. One Enterprise license, one seat pool sized to your
total support headcount, redistributed as client load shifts.

**Multi-brand and multi-subsidiary companies.** A holding company or franchise network where
each brand or franchisee needs its own branding, domain and — often contractually — its own data
boundary, while support is budgeted and licensed centrally. Each instance gets its own look and
its own database; procurement sees one Enterprise contract.

**Regional and data-residency separation.** A company operating in the EU and the US, or across
jurisdictions with different data-protection regimes, needs customer data to physically stay in
the right region. Deploying one instance per region — each with its own database in that
region's infrastructure — makes that a deployment decision, not a per-row access-control policy
that a future bug could get wrong.

**Government agencies and departments.** Separate agencies procuring or sharing one support
platform, where each needs genuine data separation from the others for the same reason a shared
multi-tenant SaaS gets ruled out for public-sector buyers in the first place. One fleet, one
procurement, isolated data per agency.

**Staging and production, or per-environment instances.** Smaller-scale, but the same mechanism:
declare a staging instance alongside production in the same release, upgrade both together, and
size the staging instance's seat quota down to whatever a handful of test agents actually need.

## What this doesn't include

There's no cross-instance dashboard shipped with the product today — each instance exposes its
own `/healthz` and `/readyz` for whatever monitoring you already run, and `salamandrctl` can be
scripted against each instance's own Admin API for configuration-as-code across the fleet, but
there's no single pane of glass bundled yet. Object storage isn't bundled by the chart for any
topology, single-instance or fleet — each instance's own bucket and credentials are ordinary
Helm values, same as a single deployment.

See the chart's own `README.md` and `values-example.yaml` (in `deploy/helm/salamandr/`) for the
complete field reference, including pointing individual instances at managed Postgres/Redis
instead of the bundled ones, and sourcing every password from Kubernetes Secrets you manage
outside Helm.
