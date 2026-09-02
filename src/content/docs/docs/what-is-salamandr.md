---
title: "What is Salamandr"
description: An architectural and functional overview of Salamandr — the self-hosted customer support helpdesk you truly own.
---

**Salamandr** is an open-core, self-hosted customer support and helpdesk platform designed for organizations that demand total data custody, strict privacy compliance, and deep omnichannel capabilities.

Built with a high-performance **Go backend**, **React/TypeScript frontend**, **PostgreSQL** with row-level security (RLS), and **Redis** for pub/sub session state, Salamandr delivers a complete customer service operating system without exposing private data to third-party cloud brokers.

---

## Architectural Overview

```
                          ┌────────────────────────────────────────────────────────┐
                          │                   Customer Channels                    │
                          │   Email (IMAP/SMTP) · WhatsApp · Telegram · Live Chat  │
                          │        Instagram · Messenger · Line · Web Portal       │
                          └───────────────────────────┬────────────────────────────┘
                                                      │
                                                      ▼
                          ┌────────────────────────────────────────────────────────┐
                          │               Reverse Proxy / TLS (HTTPS)              │
                          │                 Caddy · Nginx · Traefik                │
                          └───────────────────────────┬────────────────────────────┘
                                                      │
                                                      ▼
                          ┌────────────────────────────────────────────────────────┐
                          │                 Salamandr Go Core Binary               │
                          │                                                        │
                          │  ┌──────────────────────┐   ┌───────────────────────┐  │
                          │  │  Omnichannel Routing │   │  SLA Business Hours   │  │
                          │  │  & Bot Flow Engine   │   │  & Escalation Daemon  │  │
                          │  └──────────────────────┘   └───────────────────────┘  │
                          │  ┌──────────────────────┐   ┌───────────────────────┐  │
                          │  │  WebAssembly Plugin  │   │  Local AI Engine      │  │
                          │  │  Sandbox (ExtWasm)   │   │  (Private Ollama)     │  │
                          │  └──────────────────────┘   └───────────────────────┘  │
                          └─────────────┬──────────────────────────┬───────────────┘
                                        │                          │
                                        ▼                          ▼
                          ┌───────────────────────────┐  ┌─────────────────────────┐
                          │     PostgreSQL 16 DB      │  │  Redis 7 (Sentinel HA)  │
                          │ (Row-Level Security, RLS) │  │  (Sessions & Real-Time) │
                          └───────────────────────────┘  └─────────────────────────┘
```

---

## The Four Core Principles

### 1. Zero Telemetry & Air-Gapped Operation
Unlike SaaS alternatives that continuously report user telemetry and metadata back to central servers, Salamandr has **zero telemetry, zero tracking scripts, and zero phone-home mechanisms**. Enterprise licenses are verified offline using cryptographic public-key signatures baked directly into the binary. Salamandr functions seamlessly inside fully air-gapped, isolated networks.

### 2. Complete Data Custody
Every ticket conversation, customer identifier, internal agent note, and file attachment resides in your own database and private storage. Compliance boundaries (HIPAA, GDPR, SOC 2, DORA) remain strictly within your infrastructure.

### 3. Direct APIs (Bring Your Own App)
All integrations with Meta platforms (WhatsApp Business, Instagram DMs, Facebook Messenger) connect directly using your organization's own developer API keys. No third-party SaaS middleware sits between your support team and your customers.

### 4. Local, Private AI Assist (Ollama)
Salamandr integrates natively with local Large Language Models via self-hosted **Ollama** instances. Product documentation, runbooks, and internal SOPs are indexed and embedded locally with vector search. Support reps receive instant, cited draft replies without transmitting customer inquiries across the public internet.

---

## Community vs. Enterprise Comparison

Salamandr ships from a unified codebase. The edition is determined at build time and unlocked via an offline license file in the Admin Panel:

| Feature / Capability | Community Edition | Enterprise Edition |
|---|---|---|
| **License & Source** | AGPL-3.0 (Open Source) | Commercial (Offline Verified) |
| **Agent Seats** | Up to 5 staff agents free | Banded by license (10 / 25 / 50), custom quote above that |
| **Channel Adapters** | Email, Live Chat, WhatsApp, Telegram, Instagram, Messenger, Line, Portal | All Community channels included |
| **SLA & Business Hours** | Working calendars, holidays & pause states | Full SLA engine included |
| **Automations & Bots** | Visual decision-tree bot flows & macros | Full automation engine included |
| **AI Knowledge Base** | Local Ollama RAG & AI draft generation | Local Ollama + Optional Cloud APIs |
| **WASM Plugin Host** | Full sandbox engine (write your own plugins) | Full sandbox engine included |
| **Single Sign-On (SSO)** | Standard username/password + 2FA | SAML 2.0 & OIDC (Staff & Customer Orgs) |
| **Audit Logs & Roles** | Administrator & Agent roles | Immutable audit logs & custom role permissions |
| **Turnkey CRM Connectors**| Build via WASM SDK | Native Jira, GitHub, Linear, HubSpot, Redmine |
| **Live E-Commerce Context**| Build via WASM SDK | Native Shopify & WooCommerce live lookups |
| **ChatOps Mirroring** | Discord & Mattermost | Slack, Microsoft Teams, Discord, Mattermost, Zulip |
| **Cloud File Requests** | Local file uploads | Direct S3, Google Drive, Dropbox, Box, SFTP |
| **Multi-Instance Fleet** | Single-tenant instance | Deploy multiple isolated instances under 1 license |
| **Technical Support** | Community GitHub Issues | Priority SLA technical support |

---

## Documentation Roadmap

- **Getting Started:**
  - [Docker Compose Quickstart](../quickstart/) — Launch in 5 minutes
  - [Editions & Licensing](../editions/) — Learn how feature gating works
- **Core Operations:**
  - [The Ticket Detail Page](../ticket-detail-page/) — Tour of the agent workspace
  - [Staff, Teams & Routing](../configuration/) — Automated triage rules
  - [Connecting Channels](../channels/) — Email, WhatsApp, chat setup
- **Extending & Integrating:**
  - [Build a WebAssembly Plugin](../build-a-plugin/) — Connect custom internal databases
  - [Extension Kinds & Built-in Plugins](../extension-kinds/) — Turnkey enterprise connectors
- **Production Deployment:**
  - [Self-Hosted Production Deployment](../deployment/) — Kubernetes, Swarm, and backup procedures
  - [Enterprise Multi-Instance Fleet](../multi-instance-deployments/) — Multi-brand and regional architecture
