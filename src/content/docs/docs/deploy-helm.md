---
title: "Deploying on Kubernetes with Helm"
description: Production guide for deploying Salamandr on Kubernetes using the official Artifact Hub Helm chart — multi-instance fleets, horizontal pod autoscaling, ingress TLS, and sharded workers.
---

[![Artifact Hub](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/salamandr)](https://artifacthub.io/packages/helm/salamandr/salamandr)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://github.com/system4us/salamandr/blob/main/LICENSE)

The official **[Salamandr Helm Chart on Artifact Hub](https://artifacthub.io/packages/helm/salamandr/salamandr)** packages the full Salamandr stack for Kubernetes.

It supports standalone single-tenant installations, high-availability deployments with managed cloud databases (AWS RDS, GCP Cloud SQL, Azure Database), and multi-instance fleets sharing a single release.

---

## 1. Prerequisites

- **Kubernetes:** Cluster version 1.24+
- **Helm:** Version 3.8+
- **Artifact Hub Repository:** Indexed at `https://artifacthub.io/packages/helm/salamandr/salamandr`
- **Ingress Controller:** `ingress-nginx`, Traefik, or cloud ingress with `cert-manager` for automated TLS certificates
- **Storage:** Persistent Volumes with `ReadWriteOnce` (for bundled PostgreSQL/Redis) or external managed database endpoints

---

## 2. Quickstart Installation (from Artifact Hub)

### Step 1: Add the Helm Repository

Add the official repository indexed on [Artifact Hub](https://artifacthub.io/packages/helm/salamandr/salamandr):

```bash
helm repo add salamandr https://system4us.github.io/salamandr-helm/
helm repo update
```

### Step 2: Create a `values.yaml` Configuration

For a standalone deployment with in-cluster PostgreSQL (`pgvector`) and Redis:

```yaml
# values.yaml
image:
  tag: "latest"

instances:
  - name: support
    ingress:
      enabled: true
      className: nginx
      host: helpdesk.yourcompany.com
      tls:
        enabled: true
        secretName: helpdesk-tls
    postgresql:
      enabled: true
      storage: 20Gi
      database: salamandr
      username: salamandr
      password: "ChangeAdminDBPassword123!"
      appPassword: "ChangeAppDBPassword123!"
    redis:
      enabled: true
      storage: 5Gi
    secretEnv:
      ADMIN_EMAIL: "admin@yourcompany.com"
      ADMIN_PASSWORD: "ChangeAdminSecretPassword123!"
      ENCRYPTION_KEY: "dGhpcy1pcy1hLXNhbXBsZS1lbmNyeXB0aW9uLWtleS0zMndheXM="
```

### Step 3: Install the Chart

```bash
helm install salamandr salamandr/salamandr -f values.yaml --namespace salamandr --create-namespace
```

---

## 3. Production Deployment with Managed Cloud Services

In high-throughput environments, connect Salamandr to managed databases (AWS RDS PostgreSQL with `pgvector`, AWS ElastiCache Redis, and S3 Object Storage):

```yaml
# values-production.yaml
image:
  tag: "enterprise-latest"

instances:
  - name: support
    replicas: 3
    hpa:
      enabled: true
      minReplicas: 3
      maxReplicas: 10
      targetCPUUtilizationPercentage: 75

    # Disable bundled in-cluster databases
    postgresql:
      enabled: false
    redis:
      enabled: false

    ingress:
      enabled: true
      className: nginx
      host: support.yourcompany.com
      annotations:
        cert-manager.io/cluster-issuer: "letsencrypt-prod"
      tls:
        enabled: true
        secretName: support-tls

    env:
      FRONTEND_URL: "https://support.yourcompany.com"
      BACKEND_URL: "https://support.yourcompany.com"
      TRUSTED_PROXY_CIDRS: "10.0.0.0/8,172.16.0.0/12"
      CLAMAV_ADDR: "clamav-service.salamandr.svc.cluster.local:3310"
      S3_ENDPOINT: "https://s3.us-east-1.amazonaws.com"
      S3_REGION: "us-east-1"
      S3_BUCKET: "salamandr-attachments-vault"
      S3_USE_PATH_STYLE: "false"

    secretEnv:
      DATABASE_URL: "postgres://salamandr_app:SecPass123!@rds-postgres.internal:5432/salamandr?sslmode=require"
      DATABASE_RO_URL: "postgres://salamandr_app:SecPass123!@rds-postgres-ro.internal:5432/salamandr?sslmode=require"
      REDIS_URL: "redis://elasticache-redis.internal:6379/0"
      S3_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE"
      S3_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
      ENCRYPTION_KEY: "dGhpcy1pcy1hLXNhbXBsZS1lbmNyeXB0aW9uLWtleS0zMndheXM="
```

Deploy the production release:

```bash
helm upgrade --install salamandr salamandr/salamandr -f values-production.yaml -n salamandr
```

---

## 4. Sharded Background Workers (`salamandr-worker`)

The Helm chart provisions a `StatefulSet` for background workers (`salamandr-worker`). Persistent connection workloads (IMAP polling, Discord/Mattermost websocket listeners) are partitioned across worker replicas using deterministic modulo sharding (`WORKER_INDEX` and `WORKER_COUNT`):

```yaml
worker:
  replicas: 3
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 250m
      memory: 512Mi
```

---

## 5. Artifact Hub Package & Schema Validation

The Salamandr Helm chart is verified and published on **[Artifact Hub](https://artifacthub.io/packages/helm/salamandr/salamandr)** with full JSON Schema validation (`values.schema.json`):

- **Package URL:** `https://artifacthub.io/packages/helm/salamandr/salamandr`
- **Schema Validation:** Ensures YAML formatting, required environment secrets (`DATABASE_URL`, `ENCRYPTION_KEY`), and port configurations pass linting before deployment.
- **Artifact Hub Metadata:** Integrates with GitOps tools (ArgoCD, FluxCD) using standard Helm repository polling.

---

## 6. Operations & Upgrades

### View Pod Status
```bash
kubectl get pods -n salamandr -o wide
```

### Stream Application Logs
```bash
kubectl logs -n salamandr -l app.kubernetes.io/component=backend -f
```

### Rollback a Failed Release
```bash
helm history salamandr -n salamandr
helm rollback salamandr 1 -n salamandr
```
