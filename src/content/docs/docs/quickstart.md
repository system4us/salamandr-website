---
title: "Quickstart: Docker Compose"
description: Get a self-hosted Salamandr instance running in 5 minutes with Docker Compose, pgvector, and prebuilt containers.
---

This guide walks you through launching a fully functional **Salamandr Community** instance on a single host using Docker Compose.

:::tip[Community Edition]
The Community edition is free forever for up to 5 staff agents and includes all core channels, visual bot flows, SLA engines, local AI integration, and the WebAssembly plugin system.
:::

## Prerequisites

- **Docker Engine 24+** with the Docker Compose plugin (`docker compose version`)
- **System Requirements:** Minimum 2 vCPUs, 4 GB RAM, and 10 GB disk space
- A domain name pointing to your server's IP address (or `localhost` for local testing)

---

## 1. Quick Launch (Standalone Compose)

Create a dedicated directory:

```sh
mkdir -p /opt/salamandr/postgres-initdb && cd /opt/salamandr
```

Salamandr's app process never connects to Postgres as the database owner —
only as a separate, deliberately unprivileged role. Row-Level Security's
`FORCE` option has no effect on a table's owner or on a superuser, so
connecting as the owner would silently give every request access to every
tenant's rows. Create the init script that provisions that role on first
boot, `postgres-initdb/01-app-role.sh`:

```sh
#!/bin/sh
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'salamandr_app') THEN
            CREATE ROLE salamandr_app LOGIN PASSWORD '$APP_DB_PASSWORD';
        END IF;
    END
    \$\$;
    GRANT CONNECT ON DATABASE "$POSTGRES_DB" TO salamandr_app;
EOSQL
```

Make it executable — the Postgres image only runs scripts under
`docker-entrypoint-initdb.d` that are:

```sh
chmod +x postgres-initdb/01-app-role.sh
```

Generate real secrets. Copy-pasting a fixed sample key from a doc page is
exactly how people end up encrypting production data with a key everyone on
the internet also has:

```sh
cat > .env <<-EOF
POSTGRES_PASSWORD=$(openssl rand -hex 24)
APP_DB_PASSWORD=$(openssl rand -hex 24)
REDIS_PASSWORD=$(openssl rand -hex 24)
ENCRYPTION_KEY=$(openssl rand -base64 32)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=$(openssl rand -base64 18)
EOF
cat .env   # keep this output somewhere safe — you'll need ADMIN_PASSWORD to log in
```

`docker compose` reads `.env` in the same directory automatically, so these
values are available to the file below without pasting secrets into it
directly.

Create `docker-compose.yml`:

Salamandr ships as **two** images, not one: `backend` serves the API and the
web UI on one port (`internal/webui` embeds the compiled frontend, so
there's no separate frontend container), while `worker` is a second process
for everything that runs on its own clock rather than in response to a
request — inbound email polling, SLA-breach detection, outbound webhook
delivery, chat-mirror listeners, meeting reminders, scheduled reports. Skip
it and the app still starts and tickets can be created from the UI, but
nothing configured to run in the background ever does — a webhook endpoint
you add just queues deliveries forever, an IMAP mailbox never gets polled.

Pin an actual release rather than `latest` — `latest` tracks whatever was
pushed most recently, which is fine for a five-minute look but not for
anything you keep running (it can change under you on a restart, with no
changelog in front of you when it does). The current release is `v0.9.7`:

```yaml
services:
  salamandr:
    image: system4us/salamandr-backend:v0.9.7
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment: &salamandr-env
      - FRONTEND_URL=http://localhost:8080
      - BACKEND_URL=http://localhost:8080
      # Two URLs, never one: the app connects as the unprivileged role,
      # migrations run as the owner (needed for DDL/CREATE POLICY).
      - DATABASE_URL=postgres://salamandr_app:${APP_DB_PASSWORD}@postgres:5432/salamandr?sslmode=disable
      - MIGRATIONS_DATABASE_URL=postgres://salamandr:${POSTGRES_PASSWORD}@postgres:5432/salamandr?sslmode=disable
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
      - ADMIN_EMAIL=${ADMIN_EMAIL}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - attachments_data:/data/attachments

  worker:
    image: system4us/salamandr-worker:v0.9.7
    restart: unless-stopped
    environment: *salamandr-env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - attachments_data:/data/attachments

  postgres:
    # pgvector is required for local AI knowledge base semantic embeddings;
    # the app's own migrations create the extension, this image just needs
    # to ship the binary.
    image: pgvector/pgvector:pg16
    restart: unless-stopped
    environment:
      - POSTGRES_USER=salamandr
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=salamandr
      # Read by postgres-initdb/01-app-role.sh above, on first init only.
      - APP_DB_PASSWORD=${APP_DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres-initdb:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U salamandr -d salamandr"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    restart: unless-stopped
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  attachments_data:
  postgres_data:
  redis_data:
```

:::caution[Security Notice]
`APP_DB_PASSWORD` only takes effect on Postgres's *first* boot — the init
script does not re-run against an existing data directory. Changing it later
needs a manual `ALTER ROLE`. Back up `.env` together with the `postgres_data`
volume: losing `ENCRYPTION_KEY` doesn't just mean generating a new one —
anything it already encrypted (mail passwords, OAuth tokens, 2FA secrets)
becomes unrecoverable.
:::

---

## 2. Start the Stack

Run the stack in the background:

```sh
docker compose up -d
```

Check the logs to verify database migrations completed:

```sh
docker compose logs -f salamandr
```

---

## 3. Access the Web Interface

Once the containers are healthy:
1. Open your browser and navigate to `http://localhost:8080`.
2. Log in using your configured `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
3. You will land on the **Admin Setup Wizard** to configure your company name and connect your first channel.
