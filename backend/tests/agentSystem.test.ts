import { describe, it, expect } from 'vitest';
import { runFraudInvestigationAgent } from '../src/agents/fraudInvestigationAgent.js';
import { runInvoiceIntelligenceAgent } from '../src/agents/invoiceIntelligenceAgent.js';
import { runMerchantProtectionAgent } from '../src/agents/merchantProtectionAgent.js';
import { runCaseManagerAgent } from '../src/agents/caseManagerAgent.js';

describe('Multi-Agent AI Fraud Prevention System — Individual Agent Tests', () => {

  // ----------------------------------------------------
  // AGENT 1: Fraud Investigation Agent Tests
  // ----------------------------------------------------
  describe('Agent 1: Fraud Investigation Agent', () => {
    it('Detects Account Takeover (ATO) patterns from extreme ticket acceleration and unverified payers', async () => {
      const result = await runFraudInvestigationAgent({
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

      expect(result.agentRole).toBe('Fraud Investigation Agent');
      expect(result.isAtoSuspected).toBe(true);
      expect(result.paymentBehaviorRisk).toBe('High');
      expect(result.atoConfidence).toBeGreaterThanOrEqual(80);
      expect(result.suspiciousSignals.some(s => s.includes('Extreme Ticket Acceleration'))).toBe(true);
      expect(result.suspiciousSignals.some(s => s.includes('Abnormal Unverified Payer Ratio'))).toBe(true);
      // Tool selection check
      expect(result.toolCalls.some(t => t.toolName === 'Seller Analyzer')).toBe(true);
      expect(result.toolCalls.some(t => t.toolName === 'Transaction History')).toBe(true);
      expect(result.toolCalls.some(t => t.toolName === 'Knowledge Base')).toBe(true);
      // Counter-hypotheses
      expect(result.alternativePossibilities.length).toBeGreaterThan(0);
      expect(result.limitations.length).toBeGreaterThan(0);
    });

    it('Requests additional evidence when merchant history is low confidence or unindexed', async () => {
      const result = await runFraudInvestigationAgent({
        merchantData: {
          merchantId: 'M_UNKNOWN_NEW',
          transactions: [75, 120],
          previousMonthSales: 0,
          disputes: 0,
          refunds: 0,
          accountAgeDays: 8,
          unverifiedPayerRatio: 0
        }
      });

      expect(result.confidence).toBeLessThan(65);
      expect(result.additionalEvidenceRequested).toBeDefined();
      expect(result.additionalEvidenceRequested?.length).toBeGreaterThan(0);
      expect(result.additionalEvidenceRequested?.some(e => e.includes('business bank statements') || e.includes('license'))).toBe(true);
    });

    it('Confirms legitimate healthy merchant payment behavior without false ATO flag', async () => {
      const result = await runFraudInvestigationAgent({
        merchantData: {
          merchantId: 'MERCHANT_GROWTH_001',
          transactions: [120, 150, 180, 200, 250, 300, 310, 290, 400, 350],
          previousMonthSales: 800,
          disputes: 0,
          refunds: 0,
          accountAgeDays: 180,
          unverifiedPayerRatio: 5
        }
      });

      expect(result.isAtoSuspected).toBe(false);
      expect(result.paymentBehaviorRisk).toBe('Low');
      expect(result.recommendedActions.some(a => a.includes('standard transaction settlement'))).toBe(true);
    });
  });

  // ----------------------------------------------------
  // AGENT 2: Invoice Intelligence Agent Tests
  // ----------------------------------------------------
  describe('Agent 2: Invoice Intelligence Agent', () => {
    it('Detects brand impersonation, unverified callback numbers, urgency, and payment manipulation', async () => {
      const invoiceText = `
        GEEK SQUAD BEST BUY INVOICE #GS-88210
        Auto-renewal fee: $499.00 charged to your checking account.
        If you did not authorize this charge, call toll free support immediately: +1-888-555-0144
        Immediate cancellation required within 24 hours.
        Settlement instructions: Pay via Bitcoin wallet 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa or Target Gift Cards.
      `;

      const result = await runInvoiceIntelligenceAgent({ invoiceText });

      expect(result.agentRole).toBe('Invoice Intelligence Agent');
      expect(result.riskScore).toBeGreaterThanOrEqual(80);
      expect(result.impersonationDetected).toBe(true);
      expect(result.urgencyDetected).toBe(true);
      expect(result.fakeSupportNumberDetected).toBe(true);
      expect(result.paymentManipulationDetected).toBe(true);
      expect(result.unverifiedContacts.length).toBeGreaterThan(0);
      expect(result.unverifiedContacts[0].verificationCaveat).toContain('UNVERIFIED');
      expect(result.toolCalls.some(t => t.toolName === 'Invoice Analyzer')).toBe(true);
      expect(result.toolCalls.some(t => t.toolName === 'Knowledge Base')).toBe(true);
      expect(result.alternativePossibilities.length).toBeGreaterThan(0);
      expect(result.recommendedActions.some(r => r.includes('Do NOT dial'))).toBe(true);
    });

    it('Clears routine commercial invoice with standard Net 30 payment terms as low risk', async () => {
      const invoiceText = `
        ACME Cloud Solutions Inc.
        Invoice Date: March 1, 2026 | Invoice #: INV-2026-9041
        Billed To: Global Logistics Corp
        Description: Enterprise Cloud Database Hosting - Q1
        Amount Due: $1,800.00 | Terms: Net 30 days
        Payment Instructions: Remit via ACH or standard corporate check.
      `;

      const result = await runInvoiceIntelligenceAgent({ invoiceText });

      expect(result.riskScore).toBeLessThan(30);
      expect(result.impersonationDetected).toBe(false);
      expect(result.urgencyDetected).toBe(false);
      expect(result.paymentManipulationDetected).toBe(false);
      expect(result.recommendedActions.some(r => r.includes('Proceed with standard'))).toBe(true);
    });
  });

  // ----------------------------------------------------
  // AGENT 3: Merchant Protection Agent Tests
  // ----------------------------------------------------
  describe('Agent 3: Merchant Protection Agent', () => {
    it('Classifies holiday promotional expansion as seasonal event / viral marketing and recommends No Action', async () => {
      const result = await runMerchantProtectionAgent({
        merchantData: {
          merchantId: 'MERCHANT_GROWTH_001',
          transactions: [120, 150, 180, 200, 250, 300, 310, 290, 400, 350],
          previousMonthSales: 800, // +218% growth
          disputes: 0,
          refunds: 0,
          accountAgeDays: 180,
          unverifiedPayerRatio: 5
        }
      });

      expect(result.agentRole).toBe('Merchant Protection Agent');
      expect(['seasonal event', 'viral marketing']).toContain(result.spikeClassification);
      expect(result.protectionRecommendation).toBe('No Action');
      // Crucial Fintech safety invariant: Never freeze accounts automatically
      expect(result.isAccountFrozen).toBe(false);
      expect(result.recommendedActions.some(a => a.includes('Permit standard automatic fund disbursements'))).toBe(true);
    });

    it('Recommends Temporary Review for bot activity / unverified buyer clusters without freezing account', async () => {
      const result = await runMerchantProtectionAgent({
        merchantData: {
          merchantId: 'MERCHANT_BOT_TARGET',
          transactions: [50, 60, 50, 50, 60, 70, 80, 90, 100, 120],
          previousMonthSales: 300,
          disputes: 0,
          refunds: 0,
          accountAgeDays: 90,
          unverifiedPayerRatio: 55 // High unverified ratio
        }
      });

      expect(result.spikeClassification).toBe('bot activity');
      expect(result.protectionRecommendation).toBe('Temporary Review');
      expect(result.isAccountFrozen).toBe(false);
      expect(result.recommendedActions.some(a => a.includes('temporary rolling reserve'))).toBe(true);
    });

    it('Recommends Escalate when sales surge is accompanied by critical dispute rates', async () => {
      const result = await runMerchantProtectionAgent({
        merchantData: {
          merchantId: 'MERCHANT_SURGE_FRAUD',
          transactions: [200, 300, 500, 700, 900, 1200],
          previousMonthSales: 500,
          disputes: 2, // 2/6 = 33% dispute rate
          refunds: 1,
          accountAgeDays: 45,
          unverifiedPayerRatio: 45
        }
      });

      expect(result.spikeClassification).toBe('fraud');
      expect(result.protectionRecommendation).toBe('Escalate');
      expect(result.isAccountFrozen).toBe(false);
    });
  });

  // ----------------------------------------------------
  // AGENT 4: Case Manager Agent Tests
  // ----------------------------------------------------
  describe('Agent 4: Case Manager Agent', () => {
    it('Collects multi-agent outputs, merges evidence, deduplicates alerts, and constructs audit timeline', async () => {
      const fraudRes = await runFraudInvestigationAgent({
        merchantData: {
          merchantId: 'MERCHANT_GROWTH_001',
          transactions: [120, 150, 180, 200, 250, 300, 310, 290, 400, 350],
          previousMonthSales: 800,
          disputes: 0,
          refunds: 0,
          accountAgeDays: 180
        }
      });

      const merchantRes = await runMerchantProtectionAgent({
        merchantData: {
          merchantId: 'MERCHANT_GROWTH_001',
          transactions: [120, 150, 180, 200, 250, 300, 310, 290, 400, 350],
          previousMonthSales: 800,
          disputes: 0,
          refunds: 0,
          accountAgeDays: 180
        }
      });

      const caseResult = await runCaseManagerAgent({
        caseId: 'CASE-TEST-001',
        merchantId: 'MERCHANT_GROWTH_001',
        fraudAgentResult: fraudRes,
        merchantProtectionResult: merchantRes,
        toolCalls: [...fraudRes.toolCalls, ...merchantRes.toolCalls],
        memoryHits: []
      });

      expect(caseResult.caseId).toBe('CASE-TEST-001');
      expect(caseResult.overallRiskCategory).toBe('Low Risk');
      expect(caseResult.timeline.length).toBeGreaterThanOrEqual(3);
      expect(caseResult.mergedEvidence.length).toBeGreaterThan(0);
      expect(caseResult.humanReadableExplanation).toContain('Case Manager Summary');
      expect(caseResult.humanInTheLoop.isRequired).toBe(false);
      expect(caseResult.humanInTheLoop.status).toBe('Approved');
    });
  });
});
