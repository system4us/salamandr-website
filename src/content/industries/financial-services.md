---
name: "Financial Services & Fintech"
tagline: "Secure customer support and fraud incident response without cloud data exposure"
painPoint: >
  Financial data leaving internal infrastructure for a SaaS vendor's cloud triggers immediate security and compliance vetoes.
  Support reps lose time jumping across core banking dashboards and payment gateways while trying to answer urgent customer inquiries.
whyFit:
  - "Secure communication gateway — Salamandr does not replace your core banking or ledger systems; it serves as the hardened omnichannel support platform for customer inquiries, card disputes, and technical support"
  - "Live account context in the agent sidebar — Query internal KYC status, account tiers, and transaction details on demand via custom extensions without caching or duplicating core financial databases"
  - "No PCI scope expansion — Payment refunds and lookup actions communicate directly with your payment processor via secure APIs, never storing raw cardholder data"
  - "Direct Meta API integration — Connect WhatsApp, Instagram, and Messenger using your organization's own developer keys, preventing third-party vendors from intercepting client communications"
  - "Auditable compliance trail (Enterprise) — Immutable audit logging of every staff interaction, scoped API keys, and staff SSO (SAML/OIDC) built for SOC 2 and financial security reviews"
  - "Regional data isolation — Deploy dedicated, isolated instances per geographic jurisdiction or subsidiary from a single unified fleet license"
order: 2
---

## The Boundary: Banking Core vs. Support Gateway

Financial institutions, neobanks, and fintech platforms operate on hardened core banking engines, fraud detection systems, and ledger databases. Exposing these core systems to external cloud SaaS helpdesks introduces severe compliance risks (SOC 2, ISO 27001, GLBA, DORA, and regional banking secrecy regulations).

Salamandr provides a secure, self-hosted support gateway that bridges customer communication with internal banking context without compromising security perimeters.

## Custom Financial Context in the Ticket Sidebar

When a member reports a card transaction dispute or authentication failure:
- **On-Demand Account Metadata:** The agent sidebar queries internal microservices on the fly using sandboxed WebAssembly extensions, rendering member KYC verification tier, account standing, card status (Active, Frozen), and recent transaction identifiers.
- **Zero Ledger Replication:** Account data is never ingested, cached, or replicated into the helpdesk database. The context rail acts as a real-time viewfinder into internal systems.
- **Direct Card Actions without PCI Scope:** Secure action endpoints allow authorized staff to trigger card lock/unlock requests or issue transaction dispute receipts directly against internal payment switches.

## Direct Messaging Channels with Private Keys

Financial customers increasingly rely on WhatsApp and messaging channels for prompt support. 
- **Bring Your Own App (BYOA):** All Meta channels (WhatsApp Business API, Instagram, Messenger) authenticate directly using your organization's verified developer credentials.
- **No Intermediary Cloud Broker:** Customer conversations flow directly from the Meta API into your self-hosted backend, eliminating third-party SaaS vendors sitting in the middle of financial discussions.
