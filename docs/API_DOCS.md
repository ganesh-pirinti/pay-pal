# PayPal TrustShield AI — REST API Specification

> **Base URL:** `http://localhost:4000`  
> **API Version:** `v2.0.0-enterprise`  
> **Format:** JSON / RFC-4180 CSV  
> **Tracing Header:** `X-Request-Id` automatically injected on all requests and responses  

---

## 1. Core Risk Intelligence Endpoints

### `POST /api/orchestrator/investigate`
Dispatches the 4 cooperative agents in parallel to execute end-to-end multi-agent fraud investigation.
- **Request Body:**
  ```json
  {
    "caseTitle": "Optional title",
    "merchantData": {
      "merchantId": "MERCHANT_GROWTH_001",
      "transactions": [120, 150, 180, 200, 250, 300, 310, 290, 400, 350],
      "previousMonthSales": 800,
      "disputes": 0,
      "refunds": 0,
      "accountAgeDays": 180,
      "unverifiedPayerRatio": 5
    },
    "invoiceText": "Raw invoice text to scan...",
    "sandboxOrderId": "67890123AB"
  }
  ```
- **Response:** `200 OK` returns `CaseManagerResult` with overall risk score, agent reports, ranked evidence, calibration metrics, alternative hypotheses, and network graph.

### `POST /api/seller-protection/analyze`
Evaluates merchant sales velocity, historical baseline, dispute rate, and buyer verification ratio.
- **Response:** `200 OK` returns `SellerProtectionResult`.

### `POST /api/invoice-scam/analyze`
Scans invoice text for brand impersonation, unverified toll-free call centers, urgency cues, payment redirection, and prompt injection attempts.
- **Response:** `200 OK` returns `InvoiceScamResult`.

---

## 2. Underwriter Case Management & Copilot Endpoints

### `GET /api/cases`
Retrieves all active and historical cases in the underwriting queue with SLA countdowns and priority tags.

### `GET /api/cases/:caseId`
Retrieves a single case with rich entity relationship graphs, 90-day risk evolution curve, exhibits, and underwriter notes.

### `POST /api/copilot/chat`
Context-aware conversational assistance grounded strictly in active case telemetry and PayPal SOPs.
- **Request Body:**
  ```json
  {
    "message": "Explain the primary risk drivers for this merchant",
    "caseId": "CASE-AI-900115-103"
  }
  ```
- **Response:** `200 OK` returns `{ reply, actionSuggestions, citedEvidence, caseSummaryAvailable }`.

### `POST /api/orchestrator/cases/:caseId/review` (RBAC Protected)
Records human underwriter decision override. Requires `underwriter` or `admin` role.
- **Request Headers:** `x-user-role: underwriter`, `x-user-id: SEC-USER-001`
- **Request Body:**
  ```json
  {
    "action": "Place on 48h Rolling Monitor",
    "notes": "Verified inventory tracking numbers with DHL."
  }
  ```

### `POST /api/cases/:caseId/notes`
Appends a collaborative underwriter note to the case record.

### `POST /api/cases/:caseId/feedback`
Captures reviewer agreement/disagreement for continuous learning shadow queue.

---

## 3. Threat Intelligence, Audit & System Monitoring

### `GET /api/knowledge/articles`
Returns verified PayPal fraud typologies and underwriting SOPs.

### `GET /api/audit/logs?limit=100`
Returns tamper-evident audit records with SHA-256 checksums.

### `GET /api/audit/export?format=csv`
Streams RFC-4180 compliant CSV export of the complete audit trail.

### `GET /api/fraud-intelligence/network`
Returns multi-entity relationship graph data.

### `GET /api/fraud-intelligence/heatmap`
Returns hourly risk density grid (explicitly labeled as simulated data).

### `GET /health` & `GET /health/liveness` & `GET /health/readiness`
Standard container health probes returning HTTP `200 OK`.

### `GET /metrics`
Exposes observability gauges (uptime, heap memory, request throughput, $p_{95}$ latency).
