import type {
  InvoiceScamInput,
  InvoiceIntelligenceAgentResult,
  ToolCallRecord,
  UnverifiedContact,
  PaymentDestinationSignal
} from '../../../shared/src/types.js';
import {
  invoiceAnalyzerTool,
  knowledgeBaseTool,
  alertGeneratorTool
} from '../tools/toolRegistry.js';
import { investigationMemory } from '../memory/investigationMemory.js';

export interface InvoiceIntelligenceAgentInput {
  invoiceText?: string;
  senderEmail?: string;
  invoiceNumber?: string;
}

/**
 * Agent 2: Invoice Intelligence Agent
 * 
 * Responsibilities:
 * - Analyze submitted invoice text for social engineering, urgency tactics, brand impersonation,
 *   unverified telephone support numbers, and payment destination redirection.
 * - Cross-reference against Knowledge Base threat intelligence and Long-Term Memory scam campaigns.
 * - Return structured risk scores, confidence metrics, counter-hypotheses, and actionable recommendations.
 */
export async function runInvoiceIntelligenceAgent(
  input: InvoiceIntelligenceAgentInput
): Promise<InvoiceIntelligenceAgentResult> {
  const toolCalls: ToolCallRecord[] = [];
  const evidence: string[] = [];
  const alternativePossibilities: string[] = [];
  const recommendedActions: string[] = [];
  const limitations: string[] = [
    'Text-based linguistic analysis cannot query telecom carrier ownership databases in real-time.',
    'Cannot verify email DKIM, SPF, or DMARC authentication records without raw RFC 822 email headers.'
  ];

  if (!input.invoiceText || input.invoiceText.trim().length === 0) {
    return {
      agentRole: 'Invoice Intelligence Agent',
      reasoning: 'No invoice or billing notification text was provided for textual analysis.',
      evidence: ['Invoice text input was empty.'],
      confidence: 10,
      alternativePossibilities: ['Investigation is focused exclusively on merchant transaction telemetry.'],
      recommendedActions: ['Paste invoice text or upload billing document if invoice analysis is required.'],
      limitations,
      toolCalls,
      riskScore: 0,
      urgencyDetected: false,
      impersonationDetected: false,
      fakeSupportNumberDetected: false,
      paymentManipulationDetected: false,
      unverifiedContacts: [],
      paymentDestinations: []
    };
  }

  // 1. Tool Call: Invoice Analyzer Tool
  const analyzerResult = await invoiceAnalyzerTool.run(
    { invoiceText: input.invoiceText, senderEmail: input.senderEmail, invoiceNumber: input.invoiceNumber },
    'Analyze linguistic urgency, brand impersonation tokens, unverified callback numbers, and payment routing.'
  );
  toolCalls.push(analyzerResult.record);
  const scan = analyzerResult.data;

  // 2. Tool Call: Knowledge Base Tool
  const kbResult = await knowledgeBaseTool.run(
    { query: input.invoiceText.slice(0, 200), category: 'scam-signatures' },
    'Cross-reference invoice text fragments against known phishing lures and extortion signatures.'
  );
  toolCalls.push(kbResult.record);

  // 3. Check Long-Term Memory for prior scam campaigns
  const memoryHits = investigationMemory.matchScamPatterns(input.invoiceText);
  if (memoryHits.length > 0) {
    evidence.push(`Long-Term Memory Match: Found ${memoryHits.length} matching historical scam campaigns (${memoryHits[0].summary}).`);
  }

  // Compile Evidence
  if (scan.adversarialAttemptDetected) {
    evidence.push('CRITICAL: Adversarial Prompt Injection attempt detected in untrusted invoice text.');
  }
  if (scan.impersonationDetected) {
    evidence.push('Brand Impersonation: Document references reputable brand (Geek Squad, Norton, PayPal, Apple) in suspicious context.');
  }
  if (scan.urgencyDetected) {
    evidence.push('Urgency / Coercion Tactics: Uses immediate deadlines, threat of account freeze, or legal action to force immediate action.');
  }

  const unverifiedContacts: UnverifiedContact[] = scan.unverifiedContacts || [];
  let fakeSupportNumberDetected = false;
  if (unverifiedContacts.length > 0) {
    evidence.push(
      `Unverified Contacts: Found ${unverifiedContacts.length} callback telephone number(s) (e.g. ${unverifiedContacts[0].value}). Marked UNVERIFIED.`
    );
    if (scan.impersonationDetected || scan.urgencyDetected) {
      fakeSupportNumberDetected = true;
    }
  }

  const paymentDestinations: PaymentDestinationSignal[] = scan.paymentDestinations || [];
  let paymentManipulationDetected = false;
  for (const dest of paymentDestinations) {
    if (dest.isUnusual) {
      paymentManipulationDetected = true;
      evidence.push(`Unusual Payment Routing: Directs settlement to unconventional destination (${dest.method} - ${dest.destination}).`);
    }
  }

  for (const warning of scan.warnings) {
    if (warning.category !== 'Commercial Terms') {
      evidence.push(`Warning [${warning.severity.toUpperCase()}]: ${warning.title} - ${warning.detail}`);
    }
  }

  // 4. Tool Call: Alert Generator Tool
  const rawAlerts = scan.warnings.map(w => ({
    source: 'Invoice Intelligence Agent',
    severity: w.severity,
    title: w.title,
    message: w.detail
  }));

  if (rawAlerts.length > 0) {
    const alertResult = await alertGeneratorTool.run(
      { alerts: rawAlerts },
      'Deduplicate and structure invoice risk alerts by severity priority.'
    );
    toolCalls.push(alertResult.record);
  }

  // Counter-Hypotheses (Alternative Possibilities)
  if (scan.category === 'High-Risk Scam' || scan.riskScore >= 70) {
    alternativePossibilities.push(
      'Alternative Hypothesis: A legitimate merchant may have outsourced technical billing support to a third-party call center with an unfamiliar toll-free number.'
    );
    alternativePossibilities.push(
      'Alternative Hypothesis: Commercial invoice may include urgent late payment penalties as standard collection contract terms.'
    );
  } else if (scan.category === 'Suspicious') {
    alternativePossibilities.push(
      'Alternative Hypothesis: Poorly formatted legitimate billing receipt from a small vendor without professional design templates.'
    );
  } else {
    alternativePossibilities.push(
      'Alternative Hypothesis: Invoice could be a sophisticated zero-day spear phishing lure mimicking standard corporate purchase orders.'
    );
  }

  // Calculate Confidence & Risk Adjustments
  let riskScore = scan.riskScore;
  if (scan.adversarialAttemptDetected) {
    riskScore = Math.max(riskScore, 85);
  }
  if (scan.impersonationDetected && unverifiedContacts.length > 0 && scan.urgencyDetected) {
    riskScore = Math.max(riskScore, 80);
  }

  let confidence = scan.confidenceScore;
  if (memoryHits.length > 0) {
    confidence = Math.min(99, confidence + 10);
  }

  // Formulate Recommendations
  if (scan.category === 'High-Risk Scam' || scan.riskScore >= 60) {
    recommendedActions.push('Do NOT dial telephone numbers or click links contained in this invoice.');
    recommendedActions.push('Verify any legitimate charges directly inside official PayPal account transaction activity at paypal.com.');
    recommendedActions.push('Report invoice phishing lure to spoof@paypal.com and forward to security awareness registry.');
  } else if (scan.category === 'Suspicious') {
    recommendedActions.push('Independently confirm invoice legitimacy with the vendor through an established, out-of-band communication channel.');
    recommendedActions.push('Check that sender email domain strictly matches the official company domain.');
  } else {
    recommendedActions.push('Invoice text demonstrates normal commercial structure with expected settlement terms.');
    recommendedActions.push('Proceed with standard accounts payable invoice clearance.');
  }

  // Synthesize Reasoning
  let reasoning = '';
  if (scan.adversarialAttemptDetected) {
    reasoning = 'Adversarial instruction injection detected. Invoice content was quarantined and flagged as malicious exploitation attempt.';
  } else if (scan.category === 'High-Risk Scam') {
    reasoning = `Invoice classified as High-Risk Scam (Score: ${scan.riskScore}/100). Contains strong markers of technical support phishing or coercion: ${
      scan.impersonationDetected ? 'Brand impersonation, ' : ''
    }${unverifiedContacts.length > 0 ? 'unverified toll-free callback numbers, ' : ''}${
      paymentManipulationDetected ? 'unusual payment routing, ' : ''
    }and artificial urgency.`;
  } else if (scan.category === 'Suspicious') {
    reasoning = `Invoice exhibits suspicious elements (Score: ${scan.riskScore}/100) such as unverified contact numbers or coercive language, but lacks conclusive brand impersonation or malicious payment routing.`;
  } else {
    reasoning = `Invoice demonstrates standard commercial invoicing characteristics (Score: ${scan.riskScore}/100) with routine payment terms (e.g., Net 30) and no deceptive coercion detected.`;
  }

  return {
    agentRole: 'Invoice Intelligence Agent',
    reasoning,
    evidence,
    confidence,
    alternativePossibilities,
    recommendedActions,
    limitations,
    toolCalls,
    riskScore,
    urgencyDetected: scan.urgencyDetected,
    impersonationDetected: scan.impersonationDetected,
    fakeSupportNumberDetected,
    paymentManipulationDetected,
    unverifiedContacts,
    paymentDestinations
  };
}
