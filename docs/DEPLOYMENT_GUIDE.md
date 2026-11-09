# PayPal TrustShield AI — Deployment & Infrastructure Guide

> **Platforms:** Docker, Docker Compose, Kubernetes, AWS ECS, GCP Cloud Run  
> **Container Base:** Alpine Linux (`node:22-alpine`)  
> **Security User:** Non-root (`node`, UID 1000)  

---

## 1. Quickstart with Docker Compose

To launch the complete platform (Backend API + Frontend UI + Health Probes):

```bash
# 1. Clone repository & configure environment
cp .env.example .env

# 2. Build and launch containers
docker compose up --build -d

# 3. Verify health status
curl http://localhost:4000/health
```

Access services:
- **Frontend Operations UI:** `http://localhost:5173`
- **Backend Security API:** `http://localhost:4000`
- **Prometheus Metrics:** `http://localhost:4000/metrics`
- **Kubernetes Readiness:** `http://localhost:4000/health/readiness`

---

## 2. Standalone Production Docker Container

```bash
# Build production multi-stage container
docker build -t paypal-trustshield-ai:latest .

# Run with secure non-root privileges
docker run -d \
  --name trustshield-api \
  -p 4000:4000 \
  -e NODE_ENV=production \
  -e PORT=4000 \
  -e PAYPAL_ENVIRONMENT=sandbox \
  paypal-trustshield-ai:latest
```

---

## 3. Kubernetes Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trustshield-api
  labels:
    app: trustshield-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: trustshield-api
  template:
    metadata:
      labels:
        app: trustshield-api
    spec:
      containers:
      - name: api
        image: paypal-trustshield-ai:latest
        ports:
        - containerPort: 4000
        envFrom:
        - secretRef:
            name: paypal-credentials
        livenessProbe:
          httpGet:
            path: /health/liveness
            port: 4000
          initialDelaySeconds: 10
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /health/readiness
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 10
        resources:
          limits:
            cpu: "1000m"
            memory: "512Mi"
          requests:
            cpu: "250m"
            memory: "128Mi"
```
