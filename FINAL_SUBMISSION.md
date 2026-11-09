# PayPal TrustShield AI — Final Hackathon Submission Package

> **Hackathon:** PayPal AI Hackathon 2026  
> **Official Rules:** [https://paypalaihackathon.devpost.com/rules](https://paypalaihackathon.devpost.com/rules)  
> **Official Deadline:** **November 12, 2026 @ 12:00 PM PST**  
> **India Standard Time (IST):** **November 13, 2026 @ 1:30 AM IST**

---

## 1. Project Title & Tagline

- **Project Title:** **PayPal TrustShield AI**
- **Tagline:** Enterprise Agentic AI Fraud Operations Platform & Official PayPal Sandbox Orders v2 Intelligence Engine

---

## 2. Project Description (Devpost Elevator Pitch)

PayPal TrustShield AI replaces blunt account freezes with explainable, multi-agent AI investigations. By synthesizing deterministic decision science, continuous probability calibration, real PayPal Sandbox Orders v2 transactions, and human-in-the-loop underwriting, TrustShield AI protects honest merchants during viral growth surges while safeguarding consumers from sophisticated invoice scams.

---

## 3. The Problem & The Solution

### The Problem
1. **The Merchant False-Positive Dilemma:** When small businesses experience rapid commercial success—such as holiday flash sales, product launches, or viral TikTok campaigns—legacy fraud engines hastily treat volume spikes as presumptive fraud. Freezing funds during critical scaling periods destroys honest merchants.
2. **The Invoice Phishing Epidemic:** Fraudsters steal billions annually through deceptive invoice social engineering, impersonating trusted brands (Geek Squad, Norton, PayPal, Apple) with fake toll-free call centers and coercive countdowns to coerce victims into voice phishing or cryptocurrency settlements.

### The Solution (10 Integrated Operational Centers)
- **1. Executive Dashboard:** Real-time financial telemetry ($1.24M processed volume, 0.42% dispute rate) with live system status and one-click scenario chips.
- **2. AI Operations Center:** Multi-agent fleet monitoring, tool permissions, latency tracking, and continuous learning with Population Stability Index (PSI = 0.042) drift monitoring.
- **3. Investigation Workspace:** Underwriting queue with SLA countdowns (`2h Urgent`, `24h SLA`), 7-tab evidence inspector, Weight of Evidence (WoE) log-odds ranking, and a Time-Travel Case Replay scrubber.
- **4. Merchant Protection Center:** Volume surge classifier distinguishing legitimate scaling from bust-out fraud.
- **5. Invoice Scam Shield:** Deep linguistic analysis detecting unverified callback numbers and brand spoofing, equipped with an active **Prompt Injection Quarantine** neutralizing adversarial payloads.
- **6. PayPal Sandbox Gateway:** Server-side integration with the official PayPal Orders v2 Sandbox API (`/v2/checkout/orders`).
- **7. Sandbox Risk Intelligence:** Evaluates captured PayPal Sandbox orders through the unified multi-agent risk engine.
- **8. Fraud Intelligence Center:** Interactive SVG constellation network graph rendering merchant, buyer, device, and invoice entity clusters with risk halos and threat links, plus an hourly risk density heatmap.
- **9. Underwriter Knowledge Center:** Integrated taxonomy of PayPal fraud typologies (Account Takeover, Synthetic Identity, Triangular Fraud) and SOPs linked to regulatory frameworks (PSD2 SCA, FinCEN AML).
- **10. Tamper-Evident Audit Center:** Cryptographically secured event store with SHA-256 checksums and RFC-4180 CSV / JSON exports.
- **💬 Grounded AI Copilot (`⌘K`):** Slide-out underwriter assistant strictly citing case telemetry with zero hallucination.

### The Non-Destructive Invariant
> [!IMPORTANT]
> **Strict Fintech Invariant:** PayPal TrustShield AI **never automatically freezes merchant accounts or holds balances**. All mitigation recommendations require human underwriter sign-off before any administrative restriction is enacted.

---

## 4. Features Actually Implemented

| Capability | Real Implementation Details | Verification Evidence |
| :--- | :--- | :--- |
| **Seller Protection Engine** | Deterministic mathematical algorithm calculating growth velocity, dispute ratios, and unverified buyer saturation. | `tests/sellerProtection.test.ts` (PASS): +218% volume surge with 0 disputes scored as Low Risk (25/100). |
| **Invoice Scam Shield** | Natural language regex and pattern extractor identifying fake toll-free call centers and coercive countdowns. | `tests/invoiceScam.test.ts` (PASS): Geek Squad $499 auto-renewal flagged as High-Risk Scam (100/100). |
| **Prompt Injection Quarantine** | Pre-LLM sanitizer isolating adversarial instructions (`"SYSTEM PROMPT OVERRIDE"`). | `tests/agentEdgeCases.test.ts` (PASS): Hostile directives quarantined; Critical Alert triggered. |
| **Multi-Agent Collective** | 4 autonomous TypeScript agents coordinating via an orchestrator, querying Long-Term Memory, and deduplicating alerts. | `tests/agentSystem.test.ts` & `tests/orchestrator.test.ts` (PASS). |
| **Platt-Scaling Calibration** | Mathematical engine calculating Expected Calibration Error ($ECE < 4.2\%$) and Brier scores across 5 probability bins. | `tests/aiCopilotAndAdvancedFeatures.test.ts` (PASS). |
| **Weight of Evidence (WoE)** | Computes statistical log-odds contributions across Hard Telemetry, Behavioral, Documentary, and Claims. | `tests/aiCopilotAndAdvancedFeatures.test.ts` (PASS). |
| **Tri-Hypothesis Matrix** | Generates 3 competing hypotheses (Primary Threat, Benign Alternative, Worst-Case Escalation) totaling ~100% probability. | `tests/aiCopilotAndAdvancedFeatures.test.ts` (PASS). |
| **PayPal Orders v2 Client** | Server-side OAuth2 bearer token negotiation, order creation, capture, and verification. | `tests/paypalSandboxOrders.test.ts` (12 PASSING tests). |
| **Cryptographic Audit Log** | SHA-256 chained hash logs with one-click RFC-4180 CSV and structured JSON exports. | `tests/graphAndIntelligence.test.ts` (PASS). |
| **Single-Port Production Serving** | Express server detects and serves compiled React UI (`frontend/dist`) on port 4000. | Verified in `backend/src/server.ts`. |

---

## 5. AI & Multi-Agent Architecture

```
┌────────────────────────────────────────────────────────┐
│               Multi-Agent Orchestrator                 │
└───────┬──────────────┬──────────────┬──────────────┬───┘
        │              │              │              │
┌───────▼──────┐┌──────▼──────┐┌──────▼──────┐┌──────▼──────┐
│   Agent 1    ││   Agent 2    ││   Agent 3    ││   Agent 4    │
│    Fraud     ││   Invoice    ││   Merchant   ││    Case      │
│ Investigation││ Intelligence││  Protection ││   Manager    │
└───────┬──────┘└──────┬──────┘└──────┬──────┘└──────┬──────┘
        │              │              │              │
        └──────────────┴───────┬──────┴──────────────┘
                               │
                ┌──────────────▼──────────────┐
                │   Advanced Decision Science │
                │   • Platt-Scaled Calibration│
                │   • Weight of Evidence (WoE)│
                │   • Tri-Hypothesis Matrix   │
                │   • Contradiction Detector  │
                │   • Prompt Injection Defense│
                └─────────────────────────────┘
```

- **Agent 1 (Fraud Investigation Agent):** Analyzes sales velocity, ticket size acceleration, and unverified buyer saturation to detect Account Takeover (ATO).
- **Agent 2 (Invoice Intelligence Agent):** Sanitizes untrusted text, identifies spoofed brands, and flags unverified callback numbers.
- **Agent 3 (Merchant Protection Agent):** Classifies business surges into legitimate growth vs. bot attacks vs. compound fraud.
- **Agent 4 (Case Manager Agent):** Synthesizes multi-agent evidence, builds the time-travel case replay sequence, and manages human underwriter reviews.
- **Deterministic Expert Fallback:** If external AI APIs (Google Gemini) are unconfigured or unreachable, the system automatically uses its local deterministic rule engine without downtime (`provider: "deterministic-fallback"`).

---

## 6. PayPal Developer Platform Integration & Verified Status

- **API Used:** Official PayPal Orders v2 Sandbox REST API (`/v2/checkout/orders`).
- **Authentication:** Server-side OAuth2 client credentials flow with automatic in-memory token caching.
- **Zero-Client-Secret Boundary:** `PAYPAL_CLIENT_SECRET` is strictly isolated on the backend. No credentials leak to browser bundles or client network logs.
- **Verified Local Status:** In the local demo environment without `.env` credentials, the server honestly operates in zero-trust simulated security mode (`"PayPal Sandbox: Simulated Mode"`), gracefully returning status information without fabricating fake payments.

---

## 7. Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Recharts (SVG data visualizer), Lucide Icons.
- **Backend:** Node.js (v24 & v20), Express, Zod (schema validation), Dotenv.
- **AI & Decision Science:** Google Gemini API (`gemini-1.5-flash`), custom Platt-scaling logistic sigmoid engine, custom regex adversarial quarantine.
- **Payment Gateway:** PayPal Orders v2 Sandbox REST API (`/v2/checkout/orders`).
- **Testing & QA:** Vitest, Supertest, Oxlint (0 warnings, 0 errors across 16 files), TypeScript compiler (`tsc -b`).
- **DevOps:** Docker (multi-stage non-root build), Docker Compose, GitHub Actions CI workflow with automated secret scanning.

---

## 8. Public Repository & Demo URLs

| Item | Actual Status | URL / Instructions |
| :--- | :---: | :--- |
| **Public GitHub Repository** | **PENDING USER ACTION** | *[Insert your public GitHub URL after pushing: `https://github.com/<YOUR_USERNAME>/paypal-trustshield-ai`]* |
| **Public Hosted Demo URL** | **LOCAL (100% Permitted by Rules)** | Local run: `npm run dev:backend` (port 4000) & `npm run dev` (port 5173).<br>*(Optional: Deploy free to Render following `docs/DEPLOYMENT_GUIDE.md`)*. |
| **Public YouTube Demo Video** | **PENDING USER ACTION** | *[Insert your public or unlisted YouTube video URL after recording the 2:30 script]* |

---

## 9. Known Limitations

1. **Plain Text Invoices:** Currently evaluates pasted plain text; does not parse raw RFC-822 email transport headers (SPF, DKIM, DMARC alignment).
2. **In-Memory Agent Messaging:** Agents communicate via Node.js event memory. Production at enterprise scale would utilize distributed Kafka or Redis Streams.
3. **Sandbox Scope:** Focuses on Orders v2 (create/capture/lookup). Disputed Transactions and Vault APIs are documented as future expansions.

---

## 10. Final Testing Evidence

```
================================================================================
TEST SUITE SUMMARY (12 PASSED / 100 TESTS)
================================================================================
 ✓ tests/evaluationBenchmark.test.ts                    (2 tests)   26ms
 ✓ tests/agentEdgeCases.test.ts                         (7 tests)  454ms
 ✓ tests/aiCopilotAndAdvancedFeatures.test.ts          (11 tests)  253ms
 ✓ tests/graphAndIntelligence.test.ts                  (14 tests)  563ms
 ✓ tests/orchestrator.test.ts                           (5 tests)  337ms
 ✓ tests/invoiceScam.test.ts                            (7 tests)   82ms
 ✓ tests/unifiedRiskIntelligence.test.ts                (9 tests)  413ms
 ✓ tests/sellerProtection.test.ts                       (7 tests)   25ms
 ✓ tests/agentSystem.test.ts                            (9 tests)   49ms
 ✓ tests/securityAndApi.test.ts                         (9 tests)  413ms
 ✓ tests/enterpriseObservabilityAndSecurity.test.ts     (8 tests)  533ms
 ✓ tests/paypalSandboxOrders.test.ts                   (12 tests)  555ms
--------------------------------------------------------------------------------
BENCHMARK EVALUATION (GROUND-TRUTH LABELED TEST CASES):
• Seller Protection:       Precision: 100.0% | Recall: 100.0% | FPR: 0.0%
• Invoice Scam Shield:     Precision: 100.0% | Recall: 100.0% | FPR: 0.0%
--------------------------------------------------------------------------------
LINTING & BUILD INTEGRITY:
• oxlint (frontend):       0 warnings, 0 errors across 16 files
• tsc -b && vite build:    0 errors (Frontend built in 1.1s)
• tsc (backend):           0 errors
================================================================================
```

---

## 11. Checklist of Submission Fields Needing Your Action

Before submitting on Devpost, ensure you have completed these 3 final steps:

- [ ] **1. Push to GitHub:** Run `git remote add origin https://github.com/<YOUR_USERNAME>/paypal-trustshield-ai.git` and `git push -u origin main`.
- [ ] **2. Record 2:30 Video:** Follow the script in [`SUBMISSION_DRAFT.md`](SUBMISSION_DRAFT.md) and upload to YouTube as **Public** or **Unlisted**.
- [ ] **3. Devpost Submission Form:** Open [paypalaihackathon.devpost.com](https://paypalaihackathon.devpost.com) and paste:
  - Project Title & Tagline
  - Elevator Pitch, Problem, Solution (from Section 2 & 3 above)
  - GitHub Repository URL
  - YouTube Video URL
  - AI Models & Tools Disclosure (from Section 7 above)

---
*Created for final submission execution on November 10, 2026.*
