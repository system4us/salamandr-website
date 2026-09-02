---
name: "Government & Public Sector"
tagline: "Sovereign citizen services and inter-departmental ticketing with zero vendor lock-in"
painPoint: >
  Public agencies must adhere to strict data-sovereignty mandates and procurement rules that disqualify cloud-only SaaS.
  At the same time, citizens expect modern multi-channel communication (web chat, email, messaging) that legacy monolithic portals fail to deliver.
whyFit:
  - "Sovereign citizen support layer — Salamandr does not replace government registries or municipal ERPs; it acts as the modern omnichannel helpdesk connecting citizens to administrative departments"
  - "Custom case context in the ticket rail — WebAssembly extensions look up citizen permit IDs, registration status, or municipal case numbers live without synchronizing confidential citizen archives"
  - "Total data sovereignty & air-gapped readiness — Runs entirely on self-managed infrastructure or sovereign government clouds with zero telemetry, phone-home, or external dependencies"
  - "GDPR & privacy by architecture — Deployer acts as the sole data controller; includes contact consent tracking and citizen data deletion on request"
  - "Fleet licensing for multiple agencies — Deploy physically isolated databases and instances for different departments or municipalities managed under one centralized Enterprise license"
  - "True open-source independence — AGPL-3.0 open core ensures long-term operational continuity without the risk of proprietary vendor lock-in"
order: 3
---

## True Data Sovereignty for Public Administrations

Government bodies and municipal agencies operate under strict legal mandates regarding data residency, citizen confidentiality, and digital sovereignty. Cloud-only proprietary helpdesks introduce legal vulnerabilities and long-term vendor lock-in that make procurement difficult or impossible.

Salamandr is built from the ground up to guarantee sovereign data custody on municipal servers, national datacenter facilities, or sovereign cloud instances (such as European sovereign clouds).

## Inter-Departmental Ticketing and Multi-Agency Fleets

Public sector organizations frequently require strict separation between different ministries, departments, or municipal entities:
- **Multi-Instance Fleet Deployments:** Under a single Enterprise fleet license, public IT departments can deploy independent, single-tenant instances for each agency (e.g., Housing, Transport, Social Services, Taxation).
- **Physical Database Isolation:** Each department maintains its own independent PostgreSQL database and asset storage, preventing accidental cross-department data exposure.
- **Unified Seat Pool:** License capacity is shared across the entire agency fleet without needing individual contract procurement for each office.

## Connecting Citizen Records via Context Extensions

When a citizen inquires about a building permit, social benefit claim, or municipal tax filing:
- **Live Case Status:** Salamandr's WebAssembly context extensions connect directly to internal municipal registries, displaying case progress, submission dates, and responsible officer tags directly in the ticket's sidebar.
- **Consent Tracking & Data Erasure:** Full GDPR and public compliance controls allow agencies to track explicit communication consent and purge citizen contact data on request.
