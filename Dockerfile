# ==========================================
# PayPal TrustShield AI — Production Multi-Stage Dockerfile
# Enterprise Security, Zero-Root Execution & Minimal Attack Surface
# ==========================================

# Stage 1: Build Environment
FROM node:22-alpine AS builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy workspace package manifests
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies across all workspaces
RUN npm ci

# Copy full source trees
COPY shared/ ./shared/
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Compile TypeScript across shared domain, backend and frontend
RUN npm run build

# Stage 2: Production Minimal Runtime
FROM node:22-alpine AS runner
WORKDIR /app

# Security: Install dumb-init for PID 1 signal handling and curl for healthcheck
RUN apk add --no-cache dumb-init curl

ENV NODE_ENV=production
ENV PORT=4000
ENV PAYPAL_ENVIRONMENT=sandbox

# Run container as unprivileged non-root user
USER node

# Copy compiled backend and production assets from builder
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/backend/package*.json ./backend/
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/backend/dist ./backend/dist
COPY --chown=node:node --from=builder /app/frontend/dist ./frontend/dist

# Expose API and frontend ports
EXPOSE 4000

# Standard Docker Healthcheck Probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Launch using dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "backend/dist/backend/src/server.js"]
