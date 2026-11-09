import type {
  InvestigationMemoryRecord,
  MemoryHit,
  RiskCategory,
  CaseManagerResult,
  CaseUnderwriterNote,
  CaseAttachment,
  HumanFeedbackRecord
} from '../../../shared/src/types.js';
import { CalibrationEngine } from '../ai/calibrationEngine.js';
import { EvidenceRanker } from '../ai/evidenceRanker.js';
import { HypothesisGenerator } from '../ai/hypothesisGenerator.js';
import { ContradictionDetector } from '../ai/contradictionDetector.js';
import { GraphGenerator } from '../graph/graphGenerator.js';

/**
 * Long-Term Investigation Memory for Multi-Agent AI Fraud Prevention
 * 
 * Safety & Security Guarantees:
 * 1. Zero Secrets: Credentials, API tokens, and customer passwords are systematically stripped.
 * 2. Longitudinal Merchant Context: Tracks historical investigations, past reviewer actions, and baseline norms.
 * 3. Pattern Recognition: Enables agents to cross-reference new investigations against historical scam cases.
 */
class InvestigationMemoryStore {
  private cases: Map<string, InvestigationMemoryRecord> = new Map();
  private fullCases: Map<string, CaseManagerResult> = new Map();
  private feedbackRecords: HumanFeedbackRecord[] = [];

  constructor() {
    this.seedInitialHistoricalCases();
  }

  /**
   * Seed realistic historical cases for demo and benchmark consistency
   */
  private seedInitialHistoricalCases(): void {
    const initialCases: InvestigationMemoryRecord[] = [
      {
        caseId: 'CASE-MEM-2026-001',
        merchantId: 'MERCHANT_GROWTH_001',
        timestamp: '2026-02-15T10:00:00.000Z',
        riskCategory: 'Low Risk',
        riskScore: 12,
        summary: 'Prior investigation into +190% sales surge during Presidents Day promotion. Low dispute rate (0.0%) confirmed normal seasonal retail expansion.',
        merchantBaseline: {
          avgDailyVolume: 26.67,
          avgTicketSize: 53.33,
          disputeRatio: 0.001
        },
        humanReviewAction: 'Approve Standard Flow'
      },
      {
        caseId: 'CASE-MEM-2026-002',
        merchantId: 'MERCHANT_COMPROMISED_002',
        timestamp: '2026-03-01T14:30:00.000Z',
        riskCategory: 'High Risk',
        riskScore: 82,
        summary: 'Account Takeover investigation: Merchant credentials potentially leaked; sudden shift from $50 electronics to $1,400 luxury items and 30% chargebacks.',
        merchantBaseline: {
          avgDailyVolume: 33.33,
          avgTicketSize: 50.00,
          disputeRatio: 0.008
        },
        humanReviewAction: 'Place on 48h Rolling Monitor'
      },
      {
        caseId: 'CASE-MEM-2026-003',
        timestamp: '2026-03-10T09:15:00.000Z',
        riskCategory: 'High-Risk Scam' as unknown as RiskCategory,
        riskScore: 92,
        summary: 'Invoice scam wave: Fake Geek Squad $499 auto-renewal phishing emails directing victims to toll-free number +1-888-555-0144.',
        knownScamIndicators: ['1-888-555-0144', 'geek squad', 'auto-renewal', '$499'],
        humanReviewAction: 'Escalate to Compliance Specialist'
      },
      {
        caseId: 'CASE-MEM-2026-004',
        timestamp: '2026-03-12T16:45:00.000Z',
        riskCategory: 'High-Risk Scam' as unknown as RiskCategory,
        riskScore: 95,
        summary: 'Extortion and arrest warrant scam targeting elderly users via simulated invoice demands for cryptocurrency payment.',
        knownScamIndicators: ['1-800-555-0199', 'arrest warrant', 'sheriff', 'bitcoin', 'crypto'],
        humanReviewAction: 'Escalate to Compliance Specialist'
      }
    ];

    for (const item of initialCases) {
      this.cases.set(item.caseId, item);
    }
  }

  /**
   * Sanitize record to guarantee no client secrets, tokens, or raw passwords are stored
   */
  private sanitizeRecord(record: InvestigationMemoryRecord): InvestigationMemoryRecord {
    const sanitized = { ...record };
    // Strip common secret keys if accidentally included
    const secretKeywords = ['secret', 'token', 'key', 'password', 'bearer'];
    for (const [k, v] of Object.entries(sanitized)) {
      if (secretKeywords.some(keyword => k.toLowerCase().includes(keyword))) {
        delete (sanitized as Record<string, unknown>)[k];
      } else if (typeof v === 'string') {
        // Redact any patterns resembling API keys
        sanitized[k as keyof InvestigationMemoryRecord] = v.replace(
          /(?:key|secret|token|password)\s*[:=]\s*['"]?[a-zA-Z0-9_\-]{16,}['"]?/gi,
          '[REDACTED_SECRET]'
        ) as never;
      }
    }
    return sanitized;
  }

  /**
   * Store a completed investigation in long-term memory
   */
  public rememberCase(record: InvestigationMemoryRecord): void {
    const cleanRecord = this.sanitizeRecord(record);
    this.cases.set(cleanRecord.caseId, cleanRecord);
  }

  /**
   * Search past cases by merchant ID or keyword
   */
  public searchPastCases(query: { merchantId?: string; keyword?: string }): MemoryHit[] {
    const hits: MemoryHit[] = [];
    const keywordLower = query.keyword?.toLowerCase();

    for (const [id, item] of this.cases.entries()) {
      let isMatch = false;
      let matchType: MemoryHit['matchType'] = 'Merchant History';

      if (query.merchantId && item.merchantId && item.merchantId.toLowerCase() === query.merchantId.toLowerCase()) {
        isMatch = true;
        matchType = 'Merchant History';
      } else if (keywordLower && item.summary.toLowerCase().includes(keywordLower)) {
        isMatch = true;
        matchType = 'Known Scam Pattern';
      } else if (keywordLower && item.knownScamIndicators?.some(ind => keywordLower.includes(ind.toLowerCase()) || ind.toLowerCase().includes(keywordLower))) {
        isMatch = true;
        matchType = 'Shared Phone/Domain';
      }

      if (isMatch) {
        hits.push({
          caseId: id,
          timestamp: item.timestamp,
          matchType,
          summary: item.summary,
          pastVerdict: item.humanReviewAction || item.riskCategory
        });
      }
    }

    return hits;
  }

  /**
   * Match raw invoice text against known scam signatures in long-term memory
   */
  public matchScamPatterns(text: string): MemoryHit[] {
    const hits: MemoryHit[] = [];
    const textLower = text.toLowerCase();

    for (const [id, item] of this.cases.entries()) {
      if (item.knownScamIndicators && item.knownScamIndicators.length > 0) {
        const matched = item.knownScamIndicators.filter(indicator => textLower.includes(indicator.toLowerCase()));
        if (matched.length >= 2) {
          hits.push({
            caseId: id,
            timestamp: item.timestamp,
            matchType: 'Known Scam Pattern',
            summary: `Matched historical scam campaign indicators: ${matched.join(', ')} (${item.summary})`,
            pastVerdict: item.humanReviewAction || item.riskCategory
          });
        }
      }
    }

    return hits;
  }

  /**
   * Record human reviewer decision for a case
   */
  public updateHumanDecision(caseId: string, action: string, notes?: string): boolean {
    const existing = this.cases.get(caseId);
    if (!existing) return false;

    existing.humanReviewAction = action;
    if (notes) {
      existing.summary = `${existing.summary} | Human Note: ${notes}`;
    }
    return true;
  }

  /**
   * Store full case result with graphs and decision science
   */
  public storeFullCase(caseResult: CaseManagerResult): void {
    this.fullCases.set(caseResult.caseId, caseResult);
  }

  /**
   * Retrieve full case result with all decision science, graphs, and notes
   */
  public getFullCase(caseId: string): CaseManagerResult | undefined {
    const existing = this.fullCases.get(caseId);
    if (existing) return existing;

    const record = this.cases.get(caseId);
    if (!record) return undefined;

    // Synthesize rich case structure on-the-fly for seeded historical record
    const isHigh = record.riskScore >= 70;
    const isMedium = record.riskScore >= 40 && record.riskScore < 70;
    const priority = isHigh ? 'critical' : isMedium ? 'medium' : 'low';
    const slaDueHours = isHigh ? 2 : isMedium ? 24 : 72;
    const isInvoice = !!(record.knownScamIndicators && record.knownScamIndicators.length > 0);

    const mergedEvidence = [
      record.summary,
      ...(record.knownScamIndicators?.map(s => `Detected threat signature: ${s}`) || []),
      ...(record.merchantBaseline ? [`Baseline volume: ${record.merchantBaseline.avgDailyVolume} txns/day, dispute ratio: ${(record.merchantBaseline.disputeRatio * 100).toFixed(2)}%`] : [])
    ];

    const synthetic: CaseManagerResult = {
      caseId: record.caseId,
      timestamp: record.timestamp,
      merchantId: record.merchantId,
      overallRiskScore: record.riskScore,
      overallRiskCategory: record.riskCategory,
      finalVerdict: record.summary,
      humanInTheLoop: {
        isRequired: isHigh || isMedium,
        reason: isHigh ? 'High risk threshold exceeded. Mandatory underwriting sign-off.' : 'Standard operational review.',
        triggeredByEvidence: mergedEvidence.slice(0, 2),
        confidenceLevel: isHigh ? 'High' : 'Moderate',
        additionalEvidenceNeeded: isHigh ? ['Bank statement for past 30 days', 'Carrier delivery scans'] : [],
        status: record.humanReviewAction ? 'Action Taken' : (isHigh ? 'Pending Review' : 'Approved'),
        reviewerDecision: record.humanReviewAction ? {
          action: record.humanReviewAction as any,
          decidedAt: record.timestamp
        } : undefined
      },
      timeline: [
        { time: record.timestamp, source: 'System', event: 'Investigation Ingested', detail: 'Historical case recorded in longitudinal baseline store.' }
      ],
      mergedEvidence,
      deduplicatedAlerts: isHigh ? [
        { id: 'ALT-1', source: 'Case Manager Agent', severity: 'critical', title: 'Risk Boundary Tripped', message: record.summary }
      ] : [],
      recommendedWorkflow: [
        '1. Inspect evidence artifacts and merchant dispute baseline.',
        '2. Confirm identity verification status and active settlement routing.'
      ],
      humanReadableExplanation: record.summary,
      alternativePossibilities: [
        'Standard commercial transaction distribution.',
        'Compromised credential run or phishing lure campaign.'
      ],
      limitations: ['Synthesized from longitudinal memory store.'],
      agentReports: {},
      toolCallAuditLog: [],
      memoryHits: [],
      verificationClassification: 'Simulated',
      priority,
      slaDueHours,
      assignee: 'Underwriting Fleet Tier-2',
      attachments: GraphGenerator.generateSimulatedAttachments(record.caseId),
      underwriterNotes: GraphGenerator.generateSimulatedNotes(),
      calibrationMetrics: CalibrationEngine.calculateCalibration(record.riskScore, 'Moderate', mergedEvidence.length),
      rankedEvidence: EvidenceRanker.rankEvidence(mergedEvidence).rankedItems,
      missingEvidence: EvidenceRanker.rankEvidence(mergedEvidence).missingSignals,
      alternativeHypotheses: HypothesisGenerator.generateHypotheses(record.riskScore, mergedEvidence, record.merchantId, isInvoice),
      contradictions: ContradictionDetector.detectContradictions(mergedEvidence, record.riskScore),
      replaySteps: GraphGenerator.generateCaseReplaySteps(record.caseId, record.riskScore),
      networkGraph: GraphGenerator.generateCaseNetworkGraph(record.caseId, record.merchantId, record.riskScore, isInvoice),
      riskEvolution: GraphGenerator.generateRiskEvolution(record.riskScore)
    };

    this.fullCases.set(caseId, synthetic);
    return synthetic;
  }

  public addNote(caseId: string, note: CaseUnderwriterNote): boolean {
    const full = this.getFullCase(caseId);
    if (!full) return false;
    if (!full.underwriterNotes) full.underwriterNotes = [];
    full.underwriterNotes.unshift(note);
    return true;
  }

  public addAttachment(caseId: string, attachment: CaseAttachment): boolean {
    const full = this.getFullCase(caseId);
    if (!full) return false;
    if (!full.attachments) full.attachments = [];
    full.attachments.unshift(attachment);
    return true;
  }

  public recordFeedback(feedback: HumanFeedbackRecord): void {
    this.feedbackRecords.push(feedback);
  }

  public getFeedbackRecords(): HumanFeedbackRecord[] {
    return this.feedbackRecords;
  }

  /**
   * Retrieve all memorized cases for auditing and dashboard review
   */
  public getAllCases(): InvestigationMemoryRecord[] {
    return Array.from(this.cases.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}

export const investigationMemory = new InvestigationMemoryStore();
