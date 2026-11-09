# PayPal TrustShield AI — Hackathon Judge Evaluation Guide

> **Project:** PayPal TrustShield AI  
> **Event:** PayPal AI Hackathon 2026  
> **Mission:** Transform from a hackathon prototype into a platform that feels like **PayPal's next-generation internal AI platform**.

---

## 1. What Makes This "Something PayPal Should Actually Build"

1. **Non-Destructive Invariant**: Most fraud tools hastily freeze accounts during volume surges, destroying merchant goodwill. TrustShield AI distinguishes viral marketing from true fraud and recommends non-destructive, proportionate mitigations (48h rolling monitor, Tier-2 documentation requests).
2. **Explainable Decision Science**: Overcomes LLM overconfidence via Platt-scaled probability calibration, Brier score calculation, Expected Calibration Error ($< 4.2\%$), and Weight of Evidence (WoE) log-odds ranking.
3. **Multi-Hypothesis Reasoning**: Generates 3 competing explanations (Primary Threat, Benign Alternative, Worst-Case Escalation) with explicit contradiction detection to prevent underwriter bias.
4. **Interactive Investigation Workspace**: Complete underwriter workspace with priority SLA timers, Entity Relationship Network Graph, 90-day risk evolution curve, Case Replay scrubber, and printable PDF audit reports.
5. **Grounded AI Copilot**: In-case underwriter assistant strictly citing case telemetry with zero hallucination.
6. **Zero-Trust Sandbox Honesty**: Directly integrates with official PayPal Orders v2 API without exposing client secrets in browser bundles or faking transaction settlements.

---

## 2. 5-Minute Judge Demo Walkthrough

### Step 1: Open the Investigation Workspace
- Navigate to `http://localhost:5173`.
- Notice the **Underwriting Queue** on the left with SLA countdown badges (`2h Urgent`, `24h SLA`) and priority filters.
- Select `CASE-MEM-2026-002` (Account Takeover Case).
- Inspect the **Interactive Entity Relationship Network Graph** showing suspicious IP ingress, card cluster, and merchant nodes.
- Click through the tabs:
  - **🔍 Evidence**: Notice items ranked by log-odds Weight of Evidence (`+4.2 WoE`) and Missing Telemetry indicators.
  - **⚖️ Calibration & Hypotheses**: Review the Brier score, calibration curve, and 3 competing hypothesis branches.
  - **⏱️ Case Replay**: Move the slider to step through how the fraud unfolded transaction-by-transaction.
  - **🛡️ Underwriter Override**: Record a decision with mandatory written rationale.

### Step 2: Open the Grounded AI Copilot (`⌘K` or Header Button)
- Click the **Copilot** button or press `⌘K`.
- Click quick action: **"Summarize this investigation"** or **"Explain key risk drivers"**.
- Notice how every assertion cites specific case telemetry and SOP rules with zero hallucination.

### Step 3: Explore AI Operations & Continuous Learning
- Click **⚡ AI Operations** in the top navigation.
- Review the 4 specialized agent cards with live latency and tool permissions.
- Click **Continuous Learning & Model Drift** to inspect the shadow model status, candidate retraining queue, and Population Stability Index (PSI).

### Step 4: Inspect System Monitoring & Probes
- Click **📈 System Monitoring**.
- Test live health probes (`/health`, `/health/liveness`, `/health/readiness`, `/metrics`).

### Step 5: Run Automated Tests
- Run `npm test` in the terminal to verify all **100 / 100 tests passing**.
