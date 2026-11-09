# PayPal TrustShield AI — Hackathon Submission Checklist

> **Hackathon:** PayPal AI Hackathon 2026  
> **Official Rules:** [https://paypalaihackathon.devpost.com/rules](https://paypalaihackathon.devpost.com/rules)  
> **Official Deadline:** **November 12, 2026 @ 12:00 PM PST**  
> **India Standard Time (IST):** **November 13, 2026 @ 1:30 AM IST**

---

## 📌 Executive Submission Item Checklist

Use this checklist to track every required item before hitting **Submit** on Devpost:

### 1. Repository & Open Source Licensing
- [ ] **Public Repository URL:** Ensure you have created a public repository on GitHub (e.g. `https://github.com/<YOUR_USERNAME>/paypal-trustshield-ai`).
- [ ] **Repository Visibility:** Must be set to **Public** so hackathon judges can inspect the source code.
- [ ] **Open-Source License:** Included root [`LICENSE`](LICENSE) (MIT License, permissive open-source license approved by OSI).
- [ ] **Zero Leaked Secrets:** Verified that `.env` is ignored by `.gitignore` and only [`.env.example`](.env.example) is committed. No client secrets or private keys are in Git history.

### 2. Live Demo & Application Readiness
- [ ] **Local Verification:** Application starts and runs with:
  ```bash
  # Terminal 1: Backend
  npm run dev:backend
  # Terminal 2: Frontend
  npm run dev
  ```
- [ ] **Single-Container / Production Run:**
  ```bash
  npm run build
  npm start
  ```
  *(Serves both React frontend and Express API on `http://localhost:4000`)*.
- [ ] **Hosted Demo URL (Optional but Recommended):** If deployed to Render, Railway, or Fly.io, provide the live URL in the Devpost "Working Demo URL" field. Otherwise, clearly state that judges can run the project locally using the documented 2-step setup commands.

### 3. PayPal Developer Platform Integration Status
- [ ] **Integration Architecture:** Official PayPal Orders v2 Sandbox REST API (`/v2/checkout/orders`).
- [ ] **Server-Side Exclusivity:** Client ID and secret are isolated on the Node.js backend. Zero tokens exposed to browser.
- [ ] **Verified Status:** Server-side OAuth2 authentication, order creation, capture, and verification are implemented and tested with 12 automated unit tests (`tests/paypalSandboxOrders.test.ts`).
- [ ] **Honest Fallback:** If judges run without credentials, the app operates in zero-trust simulated security mode with clear disclaimers, never inventing fake captures or balances.

### 4. Agentic AI & Intelligence Layer Status
- [ ] **Multi-Agent Collective:** 4 specialized agents (Fraud Investigation, Invoice Intelligence, Merchant Protection, Case Manager) coordinated by [`agentOrchestrator.ts`](backend/src/orchestrator/agentOrchestrator.ts).
- [ ] **Decision Science:** Platt-scaling probability calibration ($ECE < 4.2\%$, Brier score), Weight of Evidence (WoE) log-odds ranking, Tri-Hypothesis Matrix, and Contradiction Detection.
- [ ] **Adversarial Defense:** Quarantines prompt injections in invoice text before LLM synthesis.
- [ ] **Deterministic Fallback:** Tested and active by default if Gemini API keys are omitted.

### 5. Demo Video (Under 3 Minutes)
- [ ] **Maximum Length:** Under 3 minutes (strict Devpost rule).
- [ ] **Platform:** Uploaded to YouTube as **Public** or **Unlisted**.
- [ ] **Content Walkthrough:**
  - 0:00 - 0:25: Problem hook & Executive Dashboard.
  - 0:25 - 0:50: Merchant Protection (Legitimate holiday surge vs fraud spike, non-destructive invariant).
  - 0:50 - 1:15: Invoice Scam Shield (Geek Squad phishing & prompt injection quarantine).
  - 1:15 - 1:40: Investigation Workspace, Time-Travel Case Replay, and Grounded Copilot (`⌘K`).
  - 1:40 - 2:00: Tamper-evident audit trail (SHA-256) and 100/100 passing test terminal output.

### 6. Devpost Submission Fields & Text
- [ ] **Project Title:** PayPal TrustShield AI
- [ ] **Tagline:** Enterprise Agentic AI Fraud Operations Platform & Official PayPal Sandbox Orders v2 Intelligence Engine
- [ ] **Elevator Pitch:** (Available in [`docs/DEVPOST_SUBMISSION.md`](docs/DEVPOST_SUBMISSION.md))
- [ ] **Inspiration, What It Does, How We Built It:** (Available in [`docs/DEVPOST_SUBMISSION.md`](docs/DEVPOST_SUBMISSION.md))
- [ ] **Mandatory AI Disclosure:** Completed disclosure table citing Gemini API, Platt scaling, and deterministic rules.

---

## 🕒 Important Hackathon Timestamps

| Event | Pacific Standard Time (PST) | India Standard Time (IST) |
| :--- | :--- | :--- |
| **Submission Deadline** | **November 12, 2026 @ 12:00 PM PST** | **November 13, 2026 @ 1:30 AM IST** |
| **Judging Period** | Dec 1, 2026 (2:00 PM PST) – Dec 15, 2026 (8:00 AM PST) | Dec 2, 2026 (3:30 AM IST) – Dec 15, 2026 (9:30 PM IST) |
| **Winners Announced** | On or around December 21, 2026 | On or around December 22, 2026 |

---
*Created automatically for the PayPal AI Hackathon 2026.*
