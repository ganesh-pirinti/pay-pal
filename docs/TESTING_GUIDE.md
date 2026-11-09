# PayPal TrustShield AI — Automated Testing & Benchmark Guide

> **Test Suite:** 12 Test Suites · 100 Automated Tests · Vitest & Supertest  
> **Pass Rate:** **100 / 100 Tests Passing (100.0%)**  
> **Execution Duration:** ~8.3 seconds across 12 worker threads  

---

## 1. Running the Automated Test Suites

```bash
# Run all 12 test suites across the workspace
npm test

# Run tests in watch mode
cd backend && npx vitest

# Run a specific test suite
cd backend && npx vitest run tests/aiCopilotAndAdvancedFeatures.test.ts
```

---

## 2. Test Suite Breakdown (100 Tests)

| Suite File | Tests | Focus Area |
| :--- | :---: | :--- |
| `agentSystem.test.ts` | 9 | Unit tests for Agents 1, 2, 3, 4 and individual tool calling |
| `orchestrator.test.ts` | 5 | End-to-end multi-agent pipeline, memory sync & HITL review |
| `agentEdgeCases.test.ts` | 7 | Adversarial prompt injection defense, extortion scams & conflicts |
| `aiCopilotAndAdvancedFeatures.test.ts` | 11 | Confidence calibration, WoE ranking, hypotheses & Copilot citations |
| `graphAndIntelligence.test.ts` | 14 | Network graphs, audit CSV export, healthchecks & metrics probes |
| `enterpriseObservabilityAndSecurity.test.ts` | 8 | OWASP headers, request tracing `X-Request-Id`, rate limiter & RBAC |
| `unifiedRiskIntelligence.test.ts` | 9 | Observed/inferred decoupling, AI failover & sandbox order analysis |
| `paypalSandboxOrders.test.ts` | 12 | Orders v2 API OAuth, capture, lookup, 503 unconfigured & timeouts |
| `sellerProtection.test.ts` | 7 | Sales surge (+218%) vs fraud separation, new merchant baseline |
| `invoiceScam.test.ts` | 7 | Fake support phone calls, Geek Squad lures, false-positive elimination |
| `securityAndApi.test.ts` | 9 | Schema bounds, zero leaked secrets audit, sandbox honesty |
| `evaluationBenchmark.test.ts` | 2 | Mathematical calculation of Precision, Recall, and FPR |

---

## 3. Mathematical Benchmark Verification

Executed by `tests/evaluationBenchmark.test.ts` on labeled ground-truth datasets:

```
--- SELLER PROTECTION BENCHMARK METRICS ---
True Positives (Fraud Caught): 3
False Positives (Legitimate Growth Misflagged): 0
True Negatives (Legitimate Growth Cleared): 5
False Negatives (Fraud Missed): 0
Insufficient Evidence Detected: 2 / 2
Precision: 100.0%
Recall: 100.0%
False Positive Rate: 0.0%

--- INVOICE SCAM SHIELD BENCHMARK METRICS ---
True Positives (Scams Caught): 5
False Positives (Legitimate Commercial Invoices Misflagged): 0
True Negatives (Genuine Invoices Cleared): 5
False Negatives (Scams Missed): 0
Precision: 100.0%
Recall: 100.0%
False Positive Rate: 0.0%
```
