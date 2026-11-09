import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { AgentOrchestrator } from '../src/orchestrator/agentOrchestrator.js';

describe('Multi-Agent Orchestration & Human-in-the-Loop Tests', () => {

  it('Orchestrates full investigation pipeline combining merchant data and threat intelligence', async () => {
    const payload = {
      caseTitle: 'Holiday Surge Investigation',
      merchantData: {
        merchantId: 'MERCHANT_GROWTH_001',
        transactions: [120, 150, 180, 200, 250, 300, 310, 290, 400, 350],
        previousMonthSales: 800,
        disputes: 0,
        refunds: 0,
        accountAgeDays: 180,
        unverifiedPayerRatio: 5
      }
    };

    const res = await request(app)
      .post('/api/orchestrator/investigate')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.caseId).toMatch(/^CASE-AI-/);
    expect(res.body.overallRiskCategory).toBe('Low Risk');
    expect(res.body.agentReports.fraudInvestigation).toBeDefined();
    expect(res.body.agentReports.merchantProtection).toBeDefined();

    // Check Tool Call Audit Log
    expect(res.body.toolCallAuditLog.length).toBeGreaterThan(0);
    const toolNames = res.body.toolCallAuditLog.map((t: { toolName: string }) => t.toolName);
    expect(toolNames).toContain('Seller Analyzer');
    expect(toolNames).toContain('Transaction History');

    // Check Long-Term Memory recall
    expect(res.body.memoryHits).toBeDefined();

    // Verification classification
    expect(res.body.verificationClassification).toBe('Simulated');
  });

  it('Triggers Human-in-the-Loop (HITL) when high risk or suspected ATO is identified', async () => {
    const payload = {
      caseTitle: 'Compromised Merchant ATO Investigation',
      merchantData: {
        merchantId: 'MERCHANT_COMPROMISED_002',
        transactions: [250, 300, 450, 500, 600, 800, 950, 1200, 1400, 3200],
        previousMonthSales: 1000,
        disputes: 3,
        refunds: 2,
        accountAgeDays: 60,
        unverifiedPayerRatio: 65
      }
    };

    const res = await request(app)
      .post('/api/orchestrator/investigate')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.overallRiskCategory).toBe('High Risk');
    expect(res.body.humanInTheLoop.isRequired).toBe(true);
    expect(res.body.humanInTheLoop.status).toBe('Pending Review');
    expect(res.body.humanInTheLoop.reason).toContain('Account Takeover');
    expect(res.body.humanInTheLoop.triggeredByEvidence.length).toBeGreaterThan(0);
    expect(res.body.humanInTheLoop.additionalEvidenceNeeded.length).toBeGreaterThan(0);

    // Timeline must document the alert
    expect(res.body.timeline.some((e: { event: string }) => e.event.includes('Seller Risk Evaluated'))).toBe(true);
  });

  it('POST /api/orchestrator/cases/:caseId/review: Allows Human Underwriter to record review decision', async () => {
    // 1. Run investigation to create case in memory
    const invRes = await AgentOrchestrator.investigate({
      merchantData: {
        merchantId: 'MERCHANT_COMPROMISED_002',
        transactions: [250, 300, 450, 500, 600, 800, 950, 1200, 1400, 3200],
        previousMonthSales: 1000,
        disputes: 3,
        refunds: 2,
        accountAgeDays: 60,
        unverifiedPayerRatio: 65
      }
    });

    const caseId = invRes.caseId;

    // 2. Submit Human Underwriter review action
    const reviewRes = await request(app)
      .post(`/api/orchestrator/cases/${caseId}/review`)
      .send({
        action: 'Place on 48h Rolling Monitor',
        notes: 'Underwriter reviewed IP logs and placed account on temporary rolling reserve while awaiting delivery proofs.'
      });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.success).toBe(true);
    expect(reviewRes.body.caseId).toBe(caseId);
    expect(reviewRes.body.decision).toBe('Place on 48h Rolling Monitor');
  });

  it('GET /api/orchestrator/memory: Returns long-term investigation memory without leaking secrets', async () => {
    const res = await request(app).get('/api/orchestrator/memory');

    expect(res.status).toBe(200);
    expect(res.body.totalRememberedCases).toBeGreaterThan(0);
    expect(Array.isArray(res.body.cases)).toBe(true);

    // Verify zero secrets guarantee in memory
    const serialized = JSON.stringify(res.body.cases);
    expect(serialized).not.toContain('PAYPAL_CLIENT_SECRET');
    expect(serialized).not.toContain('bearer');
  });

  it('GET /api/orchestrator/knowledge-base: Returns threat intelligence reference categories', async () => {
    const res = await request(app).get('/api/orchestrator/knowledge-base');

    expect(res.status).toBe(200);
    expect(res.body.system).toContain('PayPal TrustShield AI');
    expect(res.body.signatures.length).toBeGreaterThanOrEqual(4);
  });
});
