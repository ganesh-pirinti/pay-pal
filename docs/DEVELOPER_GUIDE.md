# PayPal TrustShield AI — Developer & Contributor Guide

> **Tech Stack:** TypeScript 5+, Node.js 22+, Express, React 19, Tailwind CSS v4, Vite 8, Vitest, Supertest, Docker  
> **Workspace Architecture:** npm workspaces (`shared`, `backend`, `frontend`)  

---

## 1. Project Folder Structure

```
my paypal/
├── shared/
│   └── src/
│       └── types.ts                 # Shared domain contracts, graph models & DTOs
├── backend/
│   ├── src/
│   │   ├── agents/                  # 4 Specialized Cooperative AI Agents
│   │   ├── ai/                      # Decision Science (Calibration, WoE, Hypotheses, Copilot)
│   │   ├── api/middlewares/         # RequestTracer, RateLimiter, Sanitizer, RBAC
│   │   ├── audit/                   # Tamper-evident Audit Logger with SHA-256
│   │   ├── core/config/             # Zod environment validation & Sandbox isolation
│   │   ├── graph/                   # Entity relationship & network graph generator
│   │   ├── infrastructure/          # Structured JSON logger, metrics tracker, LRU cache
│   │   ├── knowledge/               # PayPal threat typologies & SOP playbooks
│   │   ├── memory/                  # Longitudinal investigation memory (zero secrets)
│   │   ├── orchestrator/            # Parallel agent coordination & promise coalescing
│   │   ├── tools/                   # Selective tool calling registry
│   │   └── server.ts                # Express REST API & health probes
│   └── tests/                       # 12 Vitest suites (100 automated tests)
├── frontend/
│   └── src/
│       ├── components/              # Investigation Workspace, Graph Visualizer, Copilot
│       ├── App.tsx                  # Global operations platform container
│       └── main.tsx
├── docs/                            # Comprehensive architectural & operational specifications
├── Dockerfile                       # Multi-stage production container build
├── docker-compose.yml               # Multi-container orchestration
└── .github/workflows/ci.yml         # GitHub Actions CI/CD pipeline
```

---

## 2. Local Development Workflow

```bash
# 1. Install all dependencies across workspaces
npm install

# 2. Start backend server in development mode (port 4000)
npm run dev:backend

# 3. Start frontend UI in development mode (port 5173)
npm run dev

# 4. Run automated test suites
npm test

# 5. Build for production
npm run build
```

---

## 3. Contributing Guidelines & Coding Standards

1. **Clean Architecture Decoupling**: Keep domain logic in `shared/` and pure scoring services in `backend/src/ai/` independent of HTTP frameworks.
2. **Strict Invariant**: Never implement autonomous account freezing or arbitrary funds restrictions.
3. **Zero Secrets in Logs**: Use `logger.info()` or `logger.audit()`. Sensitive keys (`token`, `secret`, `password`, `authorization`) are stripped automatically.
4. **All Tests Must Pass**: Run `npm test` before submitting pull requests. Ensure 100% test pass rate.
