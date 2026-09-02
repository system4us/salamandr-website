---
name: "Healthcare & Life Sciences"
tagline: "Patient communications and device support that never leave your infrastructure"
painPoint: >
  Cloud helpdesks store patient names, medical device logs, and confidential inquiries on third-party servers,
  triggering strict compliance roadblocks before evaluation even starts. Meanwhile, support agents waste valuable time
  switching between communication tools and clinical software just to identify a patient or equipment record.
whyFit:
  - "Purpose-built communication layer — Salamandr does not replace your EHR/EMR; it provides a secure, self-hosted helpdesk for patient portals, telemedicine assistance, and medical device technical support"
  - "On-demand clinical context in the ticket sidebar — WebAssembly context extensions query your internal patient database, PACS, or device registry live on demand, displaying equipment serial numbers and status without duplicating or storing sensitive medical records in the helpdesk"
  - "100% data custody on your own servers — Patient inquiries, attached prescriptions, and diagnostic reports stay entirely within your private hospital network or sovereign cloud"
  - "Zero telemetry & air-gap capable — Operates completely offline with zero background tracking, telemetry pings, or external license server calls"
  - "Private local AI (Ollama) — Index internal clinical protocols, runbooks, and FAQs locally so agents get cited response suggestions without sending patient data to third-party cloud AI APIs"
  - "HIPAA & GDPR alignment — Credentials and tokens encrypted at rest (AES-256-GCM), staff SSO (SAML/OIDC), and an append-only administrative audit log recording every access"
order: 1
---

## The Architecture: Communication Layer vs. Clinical Core

A major pitfall in healthcare IT procurement is attempting to force an Electronic Health Record (EHR/EMR) to act as a modern customer messaging desk, or conversely, attempting to turn a cloud helpdesk into a medical record repository.

Salamandr establishes a clear, secure boundary:
- **Your EHR / PACS / Clinical DB** remains the single source of truth for electronic health records and patient history.
- **Salamandr** acts as the secure, self-hosted communications and technical support layer where incoming inquiries from patient portals, WhatsApp, email, or live chat are triage-routed and answered.

## Real-Time Clinical Context without Database Duplication

Using Salamandr's sandboxed WebAssembly plugin system, technical support agents can view patient or equipment context directly in the ticket's sidebar (*Context Rail*):

- **Live Equipment & Device Status:** When a clinic or patient reports an issue with a connected medical device (e.g., infusion pump, patient monitor, diagnostic sensor), the context extension queries your internal device registry via secure API and displays serial numbers, firmware versions, warranty status, and last calibration dates.
- **No Data Synchronization:** Information is queried on-demand when the ticket is opened. No medical records or patient databases are copied, synced, or cached inside the helpdesk.
- **Actionable Operations:** Agents can trigger safe one-click actions defined by your engineering team, such as initiating an RMA replacement ticket or refreshing a device provisioning token.

## Air-Gapped Operation and Local AI

In strict hospital network zones where outbound internet access is restricted or prohibited:
- **Offline License Verification:** Enterprise licenses are verified locally via offline cryptographic signatures — no license server phone-home is ever performed.
- **Private AI Assist via Ollama:** Clinical protocol manuals, standard operating procedures (SOPs), and hardware troubleshooting guides are indexed locally. Support reps receive instant drafted responses grounded on verified internal documentation without exposing any patient text to external cloud AI providers.
