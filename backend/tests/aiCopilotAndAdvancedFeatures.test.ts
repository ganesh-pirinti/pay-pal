import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { CalibrationEngine } from '../src/ai/calibrationEngine.js';
import { EvidenceRanker } from '../src/ai/evidenceRanker.js';
import { HypothesisGenerator } from '../src/ai/hypothesisGenerator.js';
import { ContradictionDetector } from '../src/ai/contradictionDetector.js';
import { CopilotService } from '../src/ai/copilotService.js';
import { GraphGenerator } from '../src/graph/graphGenerator.js';

describe('Advanced AI, Copilot & Decision Science Tests', () => {
  describe('1. CalibrationEngine (Brier Score & Expected Calibration Error)', () => {
    it('Calculates Brier score and ECE across probability bins', () => {
      const calibration = CalibrationEngine.calculateCalibration(85, 'High', 4);
      expect(calibration).toBeDefined();
      expect(calibration.brierScore).toBeGreaterThanOrEqual(0);
      expect(calibration.brierScore).toBeLessThanOrEqual(1);
      expect(calibration.expectedCalibrationError).toBeGreaterThanOrEqual(0);
      expect(calibration.expectedCalibrationError).toBeLessThan(0.1);
      expect(calibration.calibrationCurve.length).toBe(5);
      expect(calibration.isWellCalibrated).toBe(true);
      expect(calibration.reliabilityAssessment).toContain('Reliable');
    });

    it('Discounts reliability when evidence sufficiency is Insufficient', () => {
      const calibration = CalibrationEngine.calculateCalibration(50, 'Insufficient', 1);
      expect(calibration.reliabilityAssessment).toContain('Discounted');
    });
  });

  describe('2. EvidenceRanker (Weight of Evidence & Missing Signal Isolation)', () => {
    it('Ranks observed evidence by log-odds Weight of Evidence and categorizes correctly', () => {
      const rawEvidence = [
        'Dispute rate jumped to 30.0%',
        'Sales volume growth increased +250%',
        'Toll-free callback number: +1-888-555-0199',
        'Direct Bitcoin settlement address requested'
      ];

      const { rankedItems, missingSignals } = EvidenceRanker.rankEvidence(
        rawEvidence,
        [],
        ['Historical 90-day baseline is missing']
      );

      expect(rankedItems.length).toBe(4);
      // Hard telemetry or high-impact fraud markers should have highest absolute WoE
      expect(rankedItems[0].weightOfEvidence).toBeGreaterThan(0);
      expect(rankedItems.some(i => i.category === 'Hard Telemetry')).toBe(true);
      expect(rankedItems.some(i => i.category === 'Unverified Claim')).toBe(true);
      expect(rankedItems.some(i => i.category === 'Documentary Evidence')).toBe(true);

      expect(missingSignals.length).toBe(1);
      expect(missingSignals[0].missingImpact).toBe('High');
      expect(missingSignals[0].suggestedAcquisitionMethod).toBeDefined();
    });
  });

  describe('3. HypothesisGenerator (Multi-Hypothesis Reasoning)', () => {
    it('Generates 3 competing hypotheses (Primary, Benign, Worst-Case) with probability distribution', () => {
      const hypotheses = HypothesisGenerator.generateHypotheses(
        85,
        ['Elevated dispute rate 30%', 'Sudden ticket acceleration'],
        'MERCHANT_TEST',
        false
      );

      expect(hypotheses.length).toBe(3);
      expect(hypotheses.some(h => h.type === 'Primary Threat')).toBe(true);
      expect(hypotheses.some(h => h.type === 'Benign Alternative')).toBe(true);
      expect(hypotheses.some(h => h.type === 'Worst-Case Escalation')).toBe(true);

      const totalProb = hypotheses.reduce((acc, h) => acc + h.probability, 0);
      expect(totalProb).toBeGreaterThanOrEqual(95);
      expect(totalProb).toBeLessThanOrEqual(105);
    });
  });

  describe('4. ContradictionDetector (Opposing Signal Reconciliation)', () => {
    it('Detects contradiction between 0% dispute history and sudden surge with unverified payers', () => {
      const contradictions = ContradictionDetector.detectContradictions(
        ['Sales growth +250%', '0% dispute rate maintained', 'unverified buyer accounts > 50%'],
        45
      );

      expect(contradictions.length).toBeGreaterThan(0);
      expect(contradictions[0].description).toContain('Clean Dispute Baseline vs High Unverified Buyer Ratio');
      expect(contradictions[0].severity).toBe('high');
    });

    it('Detects brand impersonation coupled with crypto payment destination', () => {
      const contradictions = ContradictionDetector.detectContradictions(
        ['PayPal Billing notice', 'Send crypto payment to direct wallet'],
        85
      );

      expect(contradictions.some(c => c.description.includes('Brand Claim vs Alternative Payment Settlement Channel'))).toBe(true);
    });
  });

  describe('5. CopilotService (Grounded Underwriter Assistant)', () => {
    it('Answers platform queries safely when no active case is present', () => {
      const response = CopilotService.handleQuery({
        message: 'How do I start an investigation?'
      });
      expect(response.reply).toContain('PayPal TrustShield AI Copilot');
      expect(response.actionSuggestions.length).toBeGreaterThan(0);
      expect(response.caseSummaryAvailable).toBe(false);
    });

    it('Executes grounded case summarization and explanation without hallucinating', async () => {
      // Fetch or seed a case
      const res = await request(app).get('/api/cases/CASE-MEM-2026-001');
      expect(res.status).toBe(200);
      const activeCase = res.body;

      const summaryResponse = CopilotService.handleQuery(
        { message: 'Summarize this case for the underwriter' },
        activeCase
      );

      expect(summaryResponse.reply).toContain('Executive Investigation Summary');
      expect(summaryResponse.reply).toContain('CASE-MEM-2026-001');
      expect(summaryResponse.citedEvidence.length).toBeGreaterThan(0);
      expect(summaryResponse.caseSummaryAvailable).toBe(true);
    });
  });

  describe('6. REST API Endpoints: Copilot, Notes, Attachments & Feedback', () => {
    it('POST /api/copilot/chat: Returns structured grounded response', async () => {
      const res = await request(app)
        .post('/api/copilot/chat')
        .send({
          message: 'Explain key risk drivers for this case',
          caseId: 'CASE-MEM-2026-002'
        });

      expect(res.status).toBe(200);
      expect(res.body.reply).toBeDefined();
      expect(res.body.actionSuggestions).toBeInstanceOf(Array);
      expect(res.body.citedEvidence).toBeInstanceOf(Array);
    });

    it('POST /api/cases/:caseId/notes: Records underwriter note with audit logging', async () => {
      const res = await request(app)
        .post('/api/cases/CASE-MEM-2026-001/notes')
        .set('x-user-role', 'underwriter')
        .set('x-user-id', 'UNDERWRITER-CHOPRA')
        .send({
          content: 'Verified phone call with merchant CFO confirming seasonal clearance event.',
          flag: 'decision'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.note.author).toBe('UNDERWRITER-CHOPRA');
    });

    it('POST /api/cases/:caseId/feedback: Captures human feedback loop for continuous learning', async () => {
      const res = await request(app)
        .post('/api/cases/CASE-MEM-2026-001/feedback')
        .set('x-user-role', 'underwriter')
        .send({
          agreedWithAiVerdict: true,
          overriddenCategory: 'Low Risk',
          feedbackNotes: 'Accurate model calibration on seasonal promotions.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.feedback.agreedWithAiVerdict).toBe(true);
    });
  });
});
