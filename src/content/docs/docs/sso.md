---
title: "Single sign-on"
description: Staff SSO and customer-organization SSO — OIDC/SAML setup, role/admin-group mapping, and the security guards behind JIT provisioning.
---

Single sign-on is Enterprise (see [Editions](../editions/)) and covers two independent flows
that happen to share the name and the same OIDC/SAML plumbing:

- **Staff SSO** — your agents and admins sign in through your own IdP instead of a Salamandr
  password.
- **Customer-organization SSO** — one of *your customers'* own companies brings its own IdP so
  their employees log into the customer portal without a shared portal password.

Both live in this codebase's Enterprise-only source tree, not behind a hidden flag — the code is
readable in every build; what a license actually gates is whether it runs. See
[Enterprise licensing](../enterprise-licensing/) for what that split means in practice.

## Staff SSO

**Admin Panel → SSO.** The tab renders on any Enterprise build regardless of whether a license
is actually installed — the real check happens server-side, and a tenant without the module sees
an explanatory locked-feature notice instead of a working form that fails on save.

### OIDC

Fill in the **issuer URL**, **client ID** and **client secret** from your identity provider,
adjust the requested **scopes** if needed, and name the **groups claim** your IdP puts group
membership under. The page shows the exact redirect URL to hand your IdP:
`{your backend URL}/api/v1/auth/sso/oidc/callback`.

### SAML

Fill in the **IdP entity ID**, **IdP SSO URL** (HTTP-Redirect binding), the **IdP's signing
certificate** (PEM), and the **groups attribute name**. Salamandr generates its own SP signing
certificate the first time SAML is enabled — a self-signed 2048-bit RSA cert good for ten years,
standard practice for a SAML SP cert, since the IdP trusts it because you paste its
fingerprint/metadata in directly rather than through a CA chain. Prefer to supply your own SP
keypair instead? There's a collapsed "use your own SP certificate" section for that. Once a
certificate exists, a **"Download SP metadata"** link gives your IdP everything it needs
(entity ID `{backend URL}/api/v1/auth/sso/saml/metadata`, ACS URL
`{backend URL}/api/v1/auth/sso/saml/acs`) in one file.

### Role mapping

Below each protocol's settings, map **IdP group name → Salamandr role** — any role, a
tenant-custom one included, not just the plain Agent/Admin split. Rows are matched top to bottom,
first match wins, and mapping is re-evaluated on **every** login, not just the first: move
someone between IdP groups and their Salamandr role follows on their next sign-in, no admin
action needed.

One safety cap exists on purpose: **an SSO login can never be what grants an account its first
Administrator role.** A matched mapping targeting Administrator only takes effect on an account
that's already Administrator (a resync, not a promotion) — anyone else lands on Agent instead,
however their mapping reads. A human admin has to grant Administrator once, by hand, from the
Users page; SSO keeps it in sync after that. Every other role — Agent, or any custom role —
applies automatically the moment a mapping matches, since a tenant admin who built that mapping
(or shaped that custom role's own permissions) already made the trust decision.

A second guard closes the opposite direction: an SSO login for an email address that already
belongs to a `customer` account is refused outright, never silently upgraded to staff. An
ordinary employee who filed a ticket before joining the company, say, keeps their customer
account separate from their staff one.

### Require SSO

A separate toggle at the top of the tab — **enabling it removes the password form from the staff
login page entirely**, leaving only the SSO button(s). It's a hard switch, not a per-user
setting: think about how you'll get back in before you turn it on.

## Customer-organization SSO

The mirror image, one level down: not the tenant enforcing SSO on its own staff, but one
*customer organization* bringing its own IdP for its own employees, entirely opt-in per
organization.

**Two-level opt-in, on purpose.** A tenant admin first flips "allow this organization to
self-configure SSO" on that organization's own record (see [Directory](../directory/)) — and
that switch itself refuses to turn on for an organization with no domain on file, or one whose
domain is a public consumer provider (`gmail.com` and the like), since trusting an IdP to assert
"any address at this domain" only makes sense for a domain the organization actually owns.
From there, the organization's *own* admin — a customer with `is_org_admin` set, a portal-side
permission scoped to their own organization and unrelated to any Salamandr staff role — configures
OIDC/SAML themselves from their own portal settings page. The fields and flow mirror the staff
SSO tab above one-to-one, down to the auto-generated SP certificate and metadata download; the
redirect URL is `{backend URL}/api/v1/auth/org-sso/oidc/callback` instead.

**Admin groups**, not role mappings — an organization has only one extra privilege to grant
(`is_org_admin` itself), so instead of a role picker, an org maps IdP group names that should
receive it. Membership in a mapped group is what lets an employee manage their own
organization's ticket-visibility settings and this very SSO configuration, without ever touching
the Salamandr staff app.

**No password-form toggle.** Unlike staff SSO, there's no tenant-wide "require SSO" switch for
an organization — there's no single tenant it could apply to. Instead, the customer `/login` page
quietly checks the email's domain once you leave the field: if that domain has org SSO
configured, its login button appears alongside the password field rather than replacing it.

**JIT provisioning is deliberately narrow.** A successful login creates or matches a
`role=customer` account with `organization_id` taken from the **organization's own
configuration** — never from a claim the IdP happened to assert — which is what stops one
organization's IdP from provisioning an account into a different organization by naming it in a
token.

## What both flows share

Client secrets and SAML private keys are encrypted at rest the same way SMTP/IMAP credentials
are, via the server's `ENCRYPTION_KEY` — see [Self-hosted deployment](../deployment/). Neither
flow needs `ENCRYPTION_KEY` to *read* a login, only to store a secret in the first place, so a
deployment without it configured simply can't save SSO settings yet.
