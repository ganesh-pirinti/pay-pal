import type {
  CaseManagerResult,
  CaseManagerTimelineEvent,
  CaseManagerDeduplicatedAlert,
  HumanInTheLoopState,
  RiskCategory,
  FraudInvestigationAgentResult,
  InvoiceIntelligenceAgentResult,
  MerchantProtectionAgentResult,
  ToolCallRecord,
  MemoryHit
} from '../../../shared/src/types.js';
import { alertGeneratorTool } from '../tools/toolRegistry.js';
import { CalibrationEngine } from '../ai/calibrationEngine.js';
import { EvidenceRanker } from '../ai/evidenceRanker.js';
import { HypothesisGenerator } from '../ai/hypothesisGenerator.js';
import { ContradictionDetector } from '../ai/contradictionDetector.js';
import { GraphGenerator } from '../graph/graphGenerator.js';

export interface CaseManagerAgentInput {
  caseId: string;
  merchantId?: string;
  fraudAgentResult?: FraudInvestigationAgentResult;
  invoiceAgentResult?: InvoiceIntelligenceAgentResult;
  merchantProtectionResult?: MerchantProtectionAgentResult;
  toolCalls: ToolCallRecord[];
  memoryHits: MemoryHit[];
  isSandboxVerified?: boolean;
}

/**
 * Agent 4: Case Manager Agent
 * 
 * Responsibilities:
 * - Collect outputs from Fraud Investigation, Invoice Intelligence, and Merchant Protection agents.
 * - Merge multi-source evidence into a cohesive narrative without redundant clutter.
 * - Deduplicate alerts and map them into prioritized severity levels.
 * - Construct an audit timeline of investigation milestones.
 * - Determine if Human-in-the-Loop (HITL) underwriter review is required.
 * - Synthesize a comprehensive, human-readable executive explanation.
 */
export async function runCaseManagerAgent(
  input: CaseManagerAgentInput
): Promise<CaseManagerResult> {
  const timestamp = new Date().toISOString();
  const timeline: CaseManagerTimelineEvent[] = [];

  timeline.push({
    time: timestamp,
    source: 'Case Manager Agent',
    event: 'Investigation Initialized',
    detail: `Case ${input.caseId} opened for ${input.merchantId ? `merchant ${input.merchantId}` : 'document/transaction intelligence'}.`
  });

  // 1. Log Agent Findings onto Timeline
  if (input.fraudAgentResult) {
    timeline.push({
      time: new Date().toISOString(),
      source: 'Fraud Investigation Agent',
      event: 'Seller Risk Evaluated',
      detail: `Payment Risk: ${input.fraudAgentResult.paymentBehaviorRisk}, ATO Suspected: ${input.fraudAgentResult.isAtoSuspected} (Conf: ${input.fraudAgentResult.confidence}%).`
    });
  }

  if (input.invoiceAgentResult && input.invoiceAgentResult.riskScore > 0) {
    timeline.push({
      time: new Date().toISOString(),
      source: 'Invoice Intelligence Agent',
      event: 'Invoice Threat Scanned',
      detail: `Risk Score: ${input.invoiceAgentResult.riskScore}/100, Urgency: ${input.invoiceAgentResult.urgencyDetected}, Impersonation: ${input.invoiceAgentResult.impersonationDetected}.`
    });
  }

  if (input.merchantProtectionResult) {
    timeline.push({
      time: new Date().toISOString(),
      source: 'Merchant Protection Agent',
      event: 'Spike Classification Completed',
      detail: `Classification: "${input.merchantProtectionResult.spikeClassification}", Recommendation: "${input.merchantProtectionResult.protectionRecommendation}".`
    });
  }

  // 2. Merge Evidence & Remove Redundancies
  const rawEvidence: string[] = [];
  if (input.fraudAgentResult) rawEvidence.push(...input.fraudAgentResult.evidence);
  if (input.invoiceAgentResult) rawEvidence.push(...input.invoiceAgentResult.evidence);
  if (input.merchantProtectionResult) rawEvidence.push(...input.merchantProtectionResult.evidence);

  const seenEvidence = new Set<string>();
  const mergedEvidence: string[] = [];
  for (const item of rawEvidence) {
    const normalized = item.trim().toLowerCase();
    if (!seenEvidence.has(normalized)) {
      seenEvidence.add(normalized);
      mergedEvidence.push(item);
    }
  }

  // 3. Deduplicate Alerts
  const rawAlerts: Array<{ source: string; severity: 'info' | 'low' | 'medium' | 'high' | 'critical'; title: string; message: string }> = [];

  if (input.fraudAgentResult) {
    for (const sig of input.fraudAgentResult.suspiciousSignals) {
      rawAlerts.push({
        source: 'Fraud Investigation Agent',
        severity: input.fraudAgentResult.paymentBehaviorRisk === 'High' ? 'high' : 'medium',
        title: 'Suspicious Payment Behavior',
        message: sig
      });
    }
  }

  if (input.invoiceAgentResult) {
    if (input.invoiceAgentResult.riskScore >= 70) {
      rawAlerts.push({
        source: 'Invoice Intelligence Agent',
        severity: input.invoiceAgentResult.riskScore >= 85 ? 'critical' : 'high',
        title: 'High-Risk Invoice Threat Detected',
        message: input.invoiceAgentResult.reasoning
      });
    }
  }

  if (input.merchantProtectionResult && input.merchantProtectionResult.protectionRecommendation === 'Escalate') {
    rawAlerts.push({
      source: 'Merchant Protection Agent',
      severity: 'high',
      title: 'Merchant Protection Escalation Required',
      message: input.merchantProtectionResult.justification
    });
  }

  const alertDedupeResult = await alertGeneratorTool.run(
    { alerts: rawAlerts },
    'Merge and deduplicate alerts across all agents.'
  );
  input.toolCalls.push(alertDedupeResult.record);

  const deduplicatedAlerts: CaseManagerDeduplicatedAlert[] = alertDedupeResult.data.formattedAlerts.map(a => ({
    id: a.id,
    source: a.source as CaseManagerDeduplicatedAlert['source'],
    severity: a.severity,
    title: a.title,
    message: a.message
  }));

  // 4. Synthesize Overall Risk Score & Category
  let overallRiskScore = 15;
  if (input.invoiceAgentResult && input.invoiceAgentResult.riskScore > 0) {
    overallRiskScore = Math.max(overallRiskScore, input.invoiceAgentResult.riskScore);
  }
  if (input.fraudAgentResult && input.merchantId) {
    if (input.fraudAgentResult.isAtoSuspected) overallRiskScore = Math.max(overallRiskScore, 85);
    else if (input.fraudAgentResult.paymentBehaviorRisk === 'High') overallRiskScore = Math.max(overallRiskScore, 75);
    else if (input.fraudAgentResult.paymentBehaviorRisk === 'Medium') overallRiskScore = Math.max(overallRiskScore, 50);
  }
  if (input.merchantProtectionResult && input.merchantId) {
    if (input.merchantProtectionResult.spikeClassification === 'fraud') overallRiskScore = Math.max(overallRiskScore, 80);
    else if (input.merchantProtectionResult.spikeClassification === 'bot activity') overallRiskScore = Math.max(overallRiskScore, 65);
    else if (
      input.merchantProtectionResult.protectionRecommendation === 'No Action' &&
      (!input.invoiceAgentResult || input.invoiceAgentResult.riskScore < 50)
    ) {
      overallRiskScore = Math.min(overallRiskScore, 25);
    }
  }

  let overallRiskCategory: RiskCategory = 'Low Risk';
  if (overallRiskScore >= 70) overallRiskCategory = 'High Risk';
  else if (overallRiskScore >= 40) overallRiskCategory = 'Medium Risk';
  else overallRiskCategory = 'Low Risk';

  // 5. Evaluate Conflicting Evidence
  const hasConflictingEvidence = Boolean(
    (input.merchantProtectionResult?.protectionRecommendation === 'No Action' && (input.invoiceAgentResult?.riskScore ?? 0) >= 60) ||
    (input.merchantProtectionResult?.spikeClassification === 'viral marketing' && input.fraudAgentResult?.isAtoSuspected) ||
    (input.fraudAgentResult?.paymentBehaviorRisk === 'High' && input.merchantProtectionResult?.spikeClassification === 'seasonal event')
  );

  if (hasConflictingEvidence) {
    timeline.push({
      time: new Date().toISOString(),
      source: 'Case Manager Agent',
      event: 'Conflicting Signals Detected',
      detail: 'Merchant baseline is healthy, but document intelligence or payment velocity signaled high risk. Manual reconciliation prioritized.'
    });
  }

  // 6. Human In The Loop (HITL) Logic
  const triggeredByEvidence: string[] = [];
  const additionalEvidenceNeeded: string[] = [];
  const hitlReasons: string[] = [];
  let isHitlRequired = false;

  if (input.fraudAgentResult?.isAtoSuspected) {
    isHitlRequired = true;
    hitlReasons.push('Suspected Account Takeover (ATO) markers identified. Manual merchant verification mandatory.');
    triggeredByEvidence.push('Severe ticket acceleration or abnormal unverified buyer concentration.');
    additionalEvidenceNeeded.push('Merchant administrative portal login IP logs');
    additionalEvidenceNeeded.push('Proof of carrier delivery with signature confirmation');
  }

  if (hasConflictingEvidence) {
    isHitlRequired = true;
    hitlReasons.push('Conflicting evidence between seller operational health and incoming invoice/threat signatures. Human adjudicator must reconcile divergent signals.');
    triggeredByEvidence.push('Contradictory findings between merchant baseline and threat intelligence.');
  }

  if (overallRiskScore >= 65) {
    isHitlRequired = true;
    hitlReasons.push(`Overall risk score (${overallRiskScore}/100) exceeds underwriter threshold (65/100). Manual approval required.`);
    triggeredByEvidence.push(`Risk score ${overallRiskScore}/100 exceeds automation boundary.`);
  }

  if (input.fraudAgentResult?.additionalEvidenceRequested) {
    additionalEvidenceNeeded.push(...input.fraudAgentResult.additionalEvidenceRequested);
  }

  const activeConfidences: number[] = [];
  if (input.merchantId && input.fraudAgentResult) activeConfidences.push(input.fraudAgentResult.confidence);
  if (input.merchantId && input.merchantProtectionResult) activeConfidences.push(input.merchantProtectionResult.confidence);
  if (input.invoiceAgentResult && input.invoiceAgentResult.riskScore > 0) activeConfidences.push(input.invoiceAgentResult.confidence);

  const avgConfidence = activeConfidences.length > 0
    ? Math.round(activeConfidences.reduce((a, b) => a + b, 0) / activeConfidences.length)
    : 50;

  if (avgConfidence < 60) {
    isHitlRequired = true;
    hitlReasons.push(`Low multi-agent confidence (${avgConfidence}%). Insufficient evidence baseline requires human reviewer verification.`);
    triggeredByEvidence.push(`Multi-agent confidence ${avgConfidence}% is below 60% threshold.`);
  }

  const hitlReason = hitlReasons.length > 0
    ? hitlReasons.join(' | ')
    : 'Automated verification within standard tolerance limits; no human escalation needed.';

  const humanInTheLoop: HumanInTheLoopState = {
    isRequired: isHitlRequired,
    reason: hitlReason || 'Automated verification within standard tolerance limits; no human escalation needed.',
    triggeredByEvidence,
    confidenceLevel: avgConfidence >= 80 ? 'High' : avgConfidence >= 60 ? 'Moderate' : 'Low',
    additionalEvidenceNeeded: Array.from(new Set(additionalEvidenceNeeded)),
    status: isHitlRequired ? 'Pending Review' : 'Approved'
  };

  // 7. Recommended Workflow
  const recommendedWorkflow: string[] = [];
  if (isHitlRequired) {
    recommendedWorkflow.push('1. Step 1: Open Human Underwriter Case Console for manual evidence audit.');
    if (additionalEvidenceNeeded.length > 0) {
      recommendedWorkflow.push(`2. Step 2: Request required supplementary evidence: ${additionalEvidenceNeeded[0]}.`);
    }
    recommendedWorkflow.push('3. Step 3: Check Long-Term Memory for prior resolutions under this merchant ID.');
    recommendedWorkflow.push('4. Step 4: Underwriter records final decision: Approve, Request Docs, Monitor, or Escalate.');
  } else {
    recommendedWorkflow.push('1. Step 1: Maintain automated processing flow; no hold or reserve needed.');
    recommendedWorkflow.push('2. Step 2: Record baseline metrics to Long-Term Memory.');
    recommendedWorkflow.push('3. Step 3: Scheduled rolling audit in 14 days.');
  }

  // 8. Synthesize Explanations & Counter-Hypotheses
  const alternativePossibilities: string[] = [];
  if (input.fraudAgentResult?.alternativePossibilities) {
    alternativePossibilities.push(...input.fraudAgentResult.alternativePossibilities);
  }
  if (input.invoiceAgentResult?.alternativePossibilities) {
    alternativePossibilities.push(...input.invoiceAgentResult.alternativePossibilities);
  }
  if (input.merchantProtectionResult?.alternativePossibilities) {
    alternativePossibilities.push(...input.merchantProtectionResult.alternativePossibilities);
  }

  const limitations = [
    'Assessment derived from transaction velocity, document text heuristics, and knowledge base threat patterns.',
    'No automated account freezes or irreversible administrative restrictions are ever executed without human authorization.',
    'External telecommunications carrier ownership and bank routing networks cannot be directly queried.'
  ];

  let finalVerdict = '';
  if (overallRiskCategory === 'High Risk') {
    finalVerdict = `High Risk Case (${overallRiskScore}/100) — Manual Human Approval Required. Compound threats or ATO indicators present.`;
  } else if (overallRiskCategory === 'Medium Risk') {
    finalVerdict = `Moderate Risk Case (${overallRiskScore}/100) — Enhanced 72h Passive Monitoring with carrier tracking verification.`;
  } else {
    finalVerdict = `Low Risk Case (${overallRiskScore}/100) — Standard Commercial Clearance. Healthy growth patterns confirmed.`;
  }

  const humanReadableExplanation = `
Case Manager Summary for Case ${input.caseId}:
Overall Risk: ${overallRiskCategory} (Score: ${overallRiskScore}/100).
Multi-Agent Findings:
• Fraud Investigation Agent: Payment risk evaluated as ${input.fraudAgentResult?.paymentBehaviorRisk || 'Low'}; ATO suspected: ${input.fraudAgentResult?.isAtoSuspected ? 'YES' : 'NO'}.
• Invoice Intelligence Agent: Document risk score ${input.invoiceAgentResult?.riskScore ?? 0}/100; urgency: ${input.invoiceAgentResult?.urgencyDetected ? 'Detected' : 'None'}; unverified contacts: ${input.invoiceAgentResult?.unverifiedContacts?.length || 0}.
• Merchant Protection Agent: Sales volume classified as "${input.merchantProtectionResult?.spikeClassification || 'normal'}"; recommended action "${input.merchantProtectionResult?.protectionRecommendation || 'No Action'}".
• Human in the Loop (HITL): ${isHitlRequired ? `REQUIRED (${hitlReason})` : 'NOT REQUIRED (Standard Flow Authorized)'}.
`.trim();

  // Advanced Decision Science & Graph Synthesis
  const calibrationMetrics = CalibrationEngine.calculateCalibration(
    overallRiskScore,
    humanInTheLoop.confidenceLevel,
    mergedEvidence.length
  );

  const { rankedItems: rankedEvidence, missingSignals: missingEvidence } = EvidenceRanker.rankEvidence(
    mergedEvidence,
    [],
    additionalEvidenceNeeded
  );

  const isInvoiceCase = !!(input.invoiceAgentResult && input.invoiceAgentResult.riskScore > 0);
  const alternativeHypotheses = HypothesisGenerator.generateHypotheses(
    overallRiskScore,
    mergedEvidence,
    input.merchantId,
    isInvoiceCase
  );

  const contradictions = ContradictionDetector.detectContradictions(
    mergedEvidence,
    overallRiskScore
  );

  const networkGraph = GraphGenerator.generateCaseNetworkGraph(
    input.caseId,
    input.merchantId,
    overallRiskScore,
    isInvoiceCase
  );

  const riskEvolution = GraphGenerator.generateRiskEvolution(overallRiskScore);
  const replaySteps = GraphGenerator.generateCaseReplaySteps(input.caseId, overallRiskScore);
  const attachments = GraphGenerator.generateSimulatedAttachments(input.caseId);
  const underwriterNotes = GraphGenerator.generateSimulatedNotes();

  const priority: 'critical' | 'high' | 'medium' | 'low' =
    overallRiskScore >= 80 ? 'critical' : overallRiskScore >= 60 ? 'high' : overallRiskScore >= 40 ? 'medium' : 'low';
  const slaDueHours = priority === 'critical' ? 2 : priority === 'high' ? 6 : priority === 'medium' ? 24 : 72;

  return {
    caseId: input.caseId,
    timestamp,
    merchantId: input.merchantId,
    overallRiskScore,
    overallRiskCategory,
    finalVerdict,
    humanInTheLoop,
    timeline,
    mergedEvidence,
    deduplicatedAlerts,
    recommendedWorkflow,
    humanReadableExplanation,
    alternativePossibilities: Array.from(new Set(alternativePossibilities)),
    limitations,
    agentReports: {
      fraudInvestigation: input.fraudAgentResult,
      invoiceIntelligence: input.invoiceAgentResult,
      merchantProtection: input.merchantProtectionResult
    },
    toolCallAuditLog: input.toolCalls,
    memoryHits: input.memoryHits,
    verificationClassification: input.isSandboxVerified ? 'Sandbox Verified' : 'Simulated',
    // Enterprise Extended Attributes
    priority,
    slaDueHours,
    assignee: 'Underwriting Fleet Tier-2',
    attachments,
    underwriterNotes,
    calibrationMetrics,
    rankedEvidence,
    missingEvidence,
    alternativeHypotheses,
    contradictions,
    replaySteps,
    networkGraph,
    riskEvolution
  };
}
