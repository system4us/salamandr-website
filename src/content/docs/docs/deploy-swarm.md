---
title: "Deploying on Docker Swarm"
description: Running Salamandr in high availability with Docker Swarm — overlay networks, zero-downtime rolling updates, stateful data placement constraints, and worker scaling.
---

**Docker Swarm** provides a lightweight orchestration option for teams that want container clustering, automatic health recovery, and zero-downtime rolling updates without the operational complexity of Kubernetes.

Salamandr includes a dedicated production stack configuration in `deploy/docker-stack.yml`.

---

## 1. Prerequisites

- A Docker Swarm cluster with one or more nodes (`docker node ls`).
- Persistent storage for PostgreSQL and Redis, or managed database endpoints.
- Prebuilt container images (`salamandr-backend` and `salamandr-worker`) pushed to a container registry, or built locally on the manager node.

---

## 2. Initializing Swarm & Node Labels

PostgreSQL (`pgvector`) and Redis require persistent volumes bound to a specific node to avoid split-brain storage. Label your primary data node:

```bash
# Label the primary manager node for stateful storage
docker node update --label-add salamandr-data=true $(docker info -f '{{.Swarm.NodeID}}')
```

---

## 3. The Docker Swarm Stack (`docker-stack.yml`)

The Swarm stack definition configures rolling updates, container placement constraints, and healthchecks:

```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: salamandr
      POSTGRES_USER: salamandr
      POSTGRES_PASSWORD: "StrongDatabasePassword123!"
      APP_DB_PASSWORD: "StrongAppPassword123!"
    volumes:
      - pg_data:/var/lib/postgresql/data
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      placement:
        constraints:
          - "node.labels.salamandr-data == true"

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      placement:
        constraints:
          - "node.labels.salamandr-data == true"

  backend:
    image: salamandr/salamandr-backend:latest
    environment:
      - FRONTEND_URL=https://helpdesk.yourcompany.com
      - BACKEND_URL=https://helpdesk.yourcompany.com
      - DATABASE_URL=postgres://salamandr:StrongDatabasePassword123!@postgres:5432/salamandr?sslmode=disable
      - REDIS_URL=redis://redis:6379/0
      - ADMIN_EMAIL=admin@yourcompany.com
      - ADMIN_PASSWORD=StrongAdminPassword123!
      - ENCRYPTION_KEY=dGhpcy1pcy1hLXNhbXBsZS1lbmNyeXB0aW9uLWtleS0zMndheXM=
    ports:
      - target: 8080
        published: 8080
        mode: ingress
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
        delay: 5s
      update_config:
        order: start-first
        parallelism: 1
        delay: 10s
        failure_action: rollback

  worker:
    image: salamandr/salamandr-worker:latest
    environment:
      - DATABASE_URL=postgres://salamandr:StrongDatabasePassword123!@postgres:5432/salamandr?sslmode=disable
      - REDIS_URL=redis://redis:6379/0
      - WORKER_INDEX=0
      - WORKER_COUNT=1
      - ENCRYPTION_KEY=dGhpcy1pcy1hLXNhbXBsZS1lbmNyeXB0aW9uLWtleS0zMndheXM=
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
        delay: 5s

volumes:
  pg_data:
  redis_data:
```

---

## 4. Deploying the Stack

Deploy the stack to the Swarm:

```bash
docker stack deploy -c docker-stack.yml salamandr
```

---

## 5. Operations & Zero-Downtime Rolling Updates

### Check Service Status
```bash
docker stack services salamandr
```

### Inspect Container Tasks
```bash
docker stack ps salamandr
```

### Stream Application Logs
```bash
docker service logs -f salamandr_backend
```

### Execute a Zero-Downtime Rolling Update
When updating the image version:
```bash
docker service update --image salamandr/salamandr-backend:v1.2.0 salamandr_backend
```
Swarm provisions the new container, verifies its healthcheck (`order: start-first`), routes ingress traffic to it, and gracefully terminates the previous replica.

### Teardown Stack
```bash
docker stack rm salamandr
```
