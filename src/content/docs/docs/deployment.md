---
title: "Self-Hosted Production Deployment"
description: Complete production guide for deploying Salamandr — PostgreSQL pgvector requirements, Redis HA, S3 object storage, reverse proxies, and backup strategies.
---

This guide covers everything required to operate Salamandr in a high-availability, compliant production environment.

## Deployment Topologies

Salamandr containers are published on Docker Hub. You can deploy across three primary architectures:

| Topology | Use Case | Implementation Reference |
|---|---|---|
| **Single Host (Docker Compose)** | Small to mid-sized teams, single-tenant installations | `deploy/docker-compose.yml` |
| **Docker Swarm** | Lightweight multi-node cluster with auto-restart and rolling updates | `deploy/docker-stack.yml` |
| **Kubernetes (Helm)** | Enterprise high-availability, autoscaling, and multi-*instance* fleets (each instance its own isolated deployment — Salamandr has no shared multi-tenant mode) | `deploy/helm/salamandr/` |

---

## Architectural Components

A complete Salamandr deployment consists of two containerized processes and two backing stores:

1. **`backend` Container (`cmd/api`):** Serves the REST API, Server-Sent Events (SSE) streams, and compiled frontend on port `8080`. Stateless and horizontally scalable behind a load balancer.
2. **`worker` Container (`cmd/worker`):** Background daemon handling IMAP/SMTP mail polling, SLA deadline timers, scheduled reports, webhook dispatching, and asynchronous vector embeddings.
3. **PostgreSQL 16+ Database:** Stores all relational data, RLS tenant isolation, event logs, and `pgvector` knowledge-base embeddings.
4. **Redis 7+ Instance:** Manages user sessions, real-time pub/sub notifications, rate limiting, and short-lived tokens.

---

## Reverse Proxy Configuration

Salamandr must run behind an HTTPS-terminating reverse proxy in production to ensure secure SSE streams and valid webhook delivery from third-party channels (WhatsApp, Instagram, Telegram).

### Option A: Caddy (Recommended — Automatic TLS)

Create `/etc/caddy/Caddyfile`:

```text
helpdesk.yourcompany.com {
    reverse_proxy localhost:8080 {
        header_up X-Forwarded-Proto https
        header_up X-Forwarded-Host {host}
    }

    # Compress static assets
    encode gzip zstd

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

### Option B: Nginx

Create `/etc/nginx/sites-available/salamandr.conf`:

```nginx
server {
    listen 80;
    server_name helpdesk.yourcompany.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name helpdesk.yourcompany.com;

    ssl_certificate /etc/letsencrypt/live/helpdesk.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/helpdesk.yourcompany.com/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        # Server-Sent Events (SSE) support
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## PostgreSQL Database Setup

Salamandr supports self-hosted PostgreSQL or managed cloud databases (AWS RDS, Aurora, Google Cloud SQL, Azure Database for PostgreSQL, Supabase, Neon).

### Extensions Required
Salamandr requires the `vector` (pgvector) and `uuid-ossp` extensions:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
```

### Environment Variables for High Availability (Enterprise)

```ini
# Primary Read-Write Database
DATABASE_URL=postgres://salamandr_app:app_secret@postgres-primary:5432/salamandr?sslmode=disable

# Optional Read-Only Replica for Reporting & BI Offloading (Enterprise)
DATABASE_RO_URL=postgres://salamandr_app:app_secret@postgres-ro:5432/salamandr?sslmode=disable

# Redis Sentinel HA (Enterprise)
REDIS_SENTINEL_MASTER=mymaster
REDIS_SENTINELS=redis-sentinel-1:26379,redis-sentinel-2:26379,redis-sentinel-3:26379

# Trusted Proxy CIDRs for X-Forwarded-For resolution
TRUSTED_PROXY_CIDRS=10.0.0.0/8,172.16.0.0/12
```

---

## Object Storage (Attachments & KB Docs)

Ticket attachments, images pasted into replies, and knowledge-base documents.
By default they land on local disk (`ATTACHMENTS_DIR`, a Docker volume on the
`backend`/`worker` containers) — simple, but the reason you cannot run more
than one instance behind a load balancer: a file exists only on whichever
host received the upload. For multi-replica deployments, configure external
S3-compatible storage instead (AWS S3, MinIO, Cloudflare R2, Backblaze B2,
DigitalOcean Spaces, Wasabi, or Google Cloud Storage through its S3-compatible
endpoint — Azure Blob Storage is **not** supported, it has no S3 API).

Both `FRONTEND_URL` and `BACKEND_URL` are required regardless of which
storage backend you pick — the full public `https://` URL, used for CORS,
outbound email links, and OAuth redirects:

```ini
FRONTEND_URL=https://helpdesk.yourcompany.com
BACKEND_URL=https://helpdesk.yourcompany.com
```

### Cloud Provider (AWS S3 example)

```ini
S3_ENDPOINT=                 # blank for AWS S3; required for every other provider
S3_REGION=us-east-1          # "auto" for Cloudflare R2
S3_BUCKET=salamandr-vault
S3_ACCESS_KEY_ID=YOUR_ACCESS_KEY
S3_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
S3_USE_PATH_STYLE=false      # true for MinIO, and for GCS's S3 endpoint
```

Leave both key variables blank on AWS to use the instance profile, ECS task
role, or EKS service account (IRSA) instead of long-lived keys. Every other
provider needs explicit keys.

### Self-Hosted Alternative: MinIO

Don't want a cloud storage account? Run MinIO alongside Salamandr on the same
host. Add these two services to the `docker-compose.yml` from the Quick
Launch guide:

```yaml
services:
  # ... salamandr, worker, postgres, redis from the Quickstart ...

  minio:
    image: minio/minio:RELEASE.2025-04-22T22-12-26Z
    restart: unless-stopped
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${S3_ACCESS_KEY_ID}
      MINIO_ROOT_PASSWORD: ${S3_SECRET_ACCESS_KEY}
    ports:
      # Console only, bound to localhost. The S3 API itself is reached
      # over the compose network by salamandr/worker and needs no
      # published port.
      - "127.0.0.1:9001:9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 10

  # MinIO doesn't create the bucket for you — this does it once, on boot.
  minio-init:
    image: minio/mc:RELEASE.2025-04-16T18-13-26Z
    restart: on-failure
    depends_on:
      minio:
        condition: service_healthy
    environment:
      S3_ACCESS_KEY_ID: ${S3_ACCESS_KEY_ID}
      S3_SECRET_ACCESS_KEY: ${S3_SECRET_ACCESS_KEY}
      S3_BUCKET: ${S3_BUCKET}
    entrypoint: >
      sh -c "
      mc alias set local http://minio:9000 \"$$S3_ACCESS_KEY_ID\" \"$$S3_SECRET_ACCESS_KEY\" &&
      mc mb --ignore-existing \"local/$$S3_BUCKET\" &&
      echo bucket ready
      "

volumes:
  minio_data:
```

Then point the app's own storage variables at it. `S3_ENDPOINT` is the
container's name on the compose network, and `S3_USE_PATH_STYLE` must be
`true` — MinIO doesn't support virtual-hosted-style bucket addressing:

```ini
S3_BUCKET=salamandr
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_USE_PATH_STYLE=true
S3_ACCESS_KEY_ID=YOUR_MINIO_ACCESS_KEY      # openssl rand -hex 16
S3_SECRET_ACCESS_KEY=YOUR_MINIO_SECRET_KEY  # openssl rand -hex 24
```

:::tip
`deploy/production/docker-compose.yml` in the repo ships this exact MinIO
setup behind a `bundled-s3` Compose profile — add `bundled-s3` to
`COMPOSE_PROFILES` in `.env` instead of hand-assembling the services above if
you're starting from the production compose file rather than the Quickstart
one.
:::

Already have files on local disk and want to move to S3/MinIO? Copy them
across before switching:

```sh
docker compose run --rm backend migrate-storage -from /data/attachments
```

---

## Secrets

```ini
# REQUIRED. Encrypts everything that must be stored recoverably: per-tenant
# mail passwords, OAuth tokens, two-factor secrets, SSO client secrets, and
# encrypted backups. Leaving it empty doesn't weaken those features — it
# turns them off entirely. Losing it after they're in use makes that data
# unrecoverable, so back it up alongside your database dumps, not next to them.
ENCRYPTION_KEY=          # openssl rand -base64 32
```

---

## First Administrator

```ini
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=          # REQUIRED — change it, then change it again from the UI
```

Created once, on first start. Changing `ADMIN_PASSWORD` later does **not**
reset a live account — that's deliberate, so a stale value sitting in your
`.env` can't silently take over the account. Use the password-reset flow
instead.

---

## Email

Neither of these is required to start the container — both are configurable
per tenant from **Admin Panel → Mail Settings** once you're logged in, and a
DB row set there always wins over the env vars below, checked fresh on every
poll cycle or request with no restart needed. What you set here is only the
instance-wide *fallback*, which matters for exactly one thing: getting the
very first admin logged in and mail settings configured is a chicken-and-egg
problem if outbound mail (password resets, agent invitations) has nowhere
to send from yet. Set these before first boot to sidestep that, or configure
mail from the UI afterwards and skip this section entirely.

```ini
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=Salamandr <support@yourcompany.com>
```

Inbound email-to-ticket, same deal — leave `IMAP_HOST` empty to turn off the
fallback entirely once a tenant has configured their own mailbox from the
Admin Panel:

```ini
IMAP_HOST=
IMAP_PORT=993
IMAP_USERNAME=
IMAP_PASSWORD=
IMAP_MAILBOX=INBOX
IMAP_USE_TLS=true

# enforce (default) logs unverified senders but refuses almost nothing —
# useful sender authentication needs a mail server in front that checks
# SPF/DKIM and reports it below. strict refuses mail claiming an existing
# account's address unless it carries a valid, aligned DKIM signature —
# try enforce first and read the logs before switching, or mail forwarded
# through a mailing list gets refused.
EMAIL_AUTH_MODE=enforce
# The authserv-id of your own inbound mail server, if one sits in front and
# writes Authentication-Results (Postfix+OpenDKIM, Google Workspace, a
# filtering gateway). Without this, `enforce` cannot refuse a forged sender
# at all — it's the only source of SPF results, which don't survive into a
# mailbox on their own.
EMAIL_TRUSTED_AUTHSERV_ID=
```

---

## Scaling the Worker

The Docker Swarm and Kubernetes topologies above run more than one
`cmd/worker` process, and that needs one more setting per replica than the
`backend` container does. `cmd/worker` runs persistent per-tenant listeners
(chat-mirror connections, the IMAP poller) that a second identical replica
would otherwise duplicate — polling the same mailbox twice, doubling every
reply mirrored into Slack. `WORKER_INDEX`/`WORKER_COUNT` shard tenants across
replicas by `hash(tenant_id) % WORKER_COUNT == WORKER_INDEX`, so each tenant
is owned by exactly one worker:

```ini
# worker-1
WORKER_INDEX=0
WORKER_COUNT=3
# worker-2
WORKER_INDEX=1
WORKER_COUNT=3
# worker-3
WORKER_INDEX=2
WORKER_COUNT=3
```

The defaults (`WORKER_INDEX=0`, `WORKER_COUNT=1`) mean "the one worker owns
every tenant" — a single-replica deployment (the common case) needs neither
variable set. On the Helm chart this is automatic: `cmd/worker` runs as a
`StatefulSet` and derives its index from the pod's own ordinal (`worker-0`,
`worker-1`, ...) rather than needing it typed in per replica.

---

## Metrics, Migrations & Other Operational Flags

```ini
# /metrics has no auth beyond this: a caller from a private/loopback address
# (the ordinary case — Prometheus on the same Docker network) is let through
# automatically; anyone else needs this value as a Bearer credential. Leave
# unset to keep /metrics private-network-only.
METRICS_TOKEN=            # openssl rand -hex 24

# Migrations run automatically on startup, guarded by an advisory lock so
# several replicas can boot at once. Set false only if you apply them
# out-of-band as a separate release step.
AUTO_MIGRATE=true

# Session/CSRF cookies get the Secure attribute by default, correct for any
# deployment served over HTTPS (which is every topology on this page). Only
# set to false for a deployment deliberately served over plain HTTP, where a
# browser would otherwise silently refuse to store the cookie at all.
COOKIE_SECURE=true

# Off by default: a tenant admin's own webhook URL, Mattermost base URL,
# storage-connector S3/FTP/SFTP host, staff SSO OIDC issuer, and a few
# trusted first-party extensions' tenant-configured hosts may all point
# anywhere — including this host's own private network, since the admin
# already owns the box. Set true if this host has a reachable cloud metadata
# endpoint (169.254.169.254) you want those integrations unable to reach.
RESTRICT_OUTBOUND_NETWORKS=false
```

---

## Optional Features

None of these are required to start; each one is off until its variable is
set, and the corresponding UI control simply doesn't render until then.

```ini
# Desktop push notifications for agents. Generate once with
# `go run ./cmd/genvapidkeys` — changing it invalidates every existing
# subscription.
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@yourcompany.com

# Local AI — reply suggestions and knowledge-base search. Points at your own
# Ollama instance; nothing is sent to a third party.
OLLAMA_HOST=
OLLAMA_MODEL=gemma2:9b
OLLAMA_EMBED_MODEL=bge-m3

# Antivirus scanning for uploaded attachments (a ClamAV daemon, not a
# third-party API — files never leave your custody). Turning it on makes
# uploads fail *closed* when the scanner can't be reached, the opposite of
# this app's usual fail-open posture, which is the point of running one.
CLAMAV_ADDR=clamav:3310

# Enterprise only: what the Data Lake tab tells an admin wiring up Power BI
# or another external BI tool. Leave empty and that page falls back to
# parsing DATABASE_URL — correct for how this container reaches its own
# Postgres, wrong for anyone outside this host's network.
ANALYTICS_EXTERNAL_DB_HOST=
ANALYTICS_EXTERNAL_DB_PORT=
```

---

## Antivirus Scanning with ClamAV

Uploaded files are the primary vector where untrusted external bytes enter your support system and reach staff agents (ticket attachments, email inbound files, live chat widget visitor uploads, and Knowledge Base document uploads). 

Salamandr integrates natively with **ClamAV** (`internal/platform/avscan`) using the lightweight `INSTREAM` wire protocol over TCP or Unix domain sockets.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Inbound File Upload                             │
│     (Ticket Attachment / Email Ingest / Live Chat Upload / KB Doc)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Is CLAMAV_ADDR configured?                                          │
│    • Unset -> Skip scan (zero overhead, self-hosted default)           │
│    • Set   -> Stream bytes over TCP / Unix socket via INSTREAM         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                     ┌──────────────┴──────────────┐
              Clean File (OK)                Infected / Scanner Down
                     │                             │
                     ▼                             ▼
┌────────────────────────────────────────┐   ┌──────────────────────────┐
│ Store blob durably in S3 / MinIO;      │   │ Fail-Closed Refusal:     │
│ attach to ticket/message thread.       │   │ • Infected: ErrInfected  │
│                                        │   │ • Down/Timeout:          │
│                                        │   │   ErrUnavailable         │
└────────────────────────────────────────┘   └──────────────────────────┘
```

### Key Security & Operational Invariants:
- **Zero Third-Party Data Leakage:** Files are scanned locally on your own infrastructure and are never transmitted to commercial third-party virus scanning APIs.
- **Fail-Closed Security Posture:** Unlike other optional integrations that fail open, antivirus scanning operates **fail-closed**. If ClamAV cannot be reached or times out during high load, uploads are refused (`the virus scanner is not responding`).
- **Signature Verdict Reporting:** If malware is detected, the rejection message includes the exact signature name (e.g. `this file was rejected by the virus scanner (Eicar-Test-Signature)`).

### 1. Docker Compose Integration

Add the official ClamAV container to your `docker-compose.yml`:

```yaml
services:
  # ... postgres, redis, backend, worker, frontend ...

  clamav:
    image: clamav/clamav:latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:3310:3310"
    volumes:
      # Persist signature databases across container restarts
      - clamav_db:/var/lib/clamav
    environment:
      - CLAMAV_NO_FRESHCLAMD=false
    healthcheck:
      test: ["CMD", "clamdscan", "--ping", "3310"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 60s
    deploy:
      resources:
        limits:
          memory: 2500M

volumes:
  # ... pg_data, redis_data ...
  clamav_db:
```

### 2. Environment Variable Configuration

In your `.env` file:

```ini
# TCP connection across Docker network:
CLAMAV_ADDR=clamav:3310

# Or using a shared Unix Domain Socket for lower latency:
# CLAMAV_ADDR=unix:/var/run/clamav/clamd.sock
```

### 3. Sizing & Memory Considerations
- ClamAV loads the entire virus signature definition database directly into memory.
- Allocate a minimum of **2 GB to 2.5 GB of RAM** to the ClamAV container to avoid out-of-memory (OOM) kills during signature reload cycles (`freshclam`).
- Allow 30–60 seconds for ClamAV to initialize and load signatures upon cold boot before it begins accepting scan streams.

### 4. Verifying Antivirus Protection

You can verify that virus scanning is active by attempting to upload the industry-standard **EICAR test string** as a `.txt` file:

```
X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*
```

Salamandr will immediately reject the upload with:
> `this file was rejected by the virus scanner (Eicar-Test-Signature)`

---

## Health Checks and Monitoring

Salamandr exposes standard Kubernetes-compatible health probes:

- **Liveness Probe:** `GET /healthz` — Returns `200 OK` if the HTTP server is responsive.
- **Readiness Probe:** `GET /readyz` — Returns `200 OK` only when PostgreSQL and Redis connections are healthy.
- **Metrics Endpoint:** `GET /metrics` — Prometheus metrics (HTTP latency, active SSE connections, queue depth).
