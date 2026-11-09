import type {
  SellerProtectionInput,
  FraudInvestigationAgentResult,
  ToolCallRecord
} from '../../../shared/src/types.js';
import {
  sellerAnalyzerTool,
  transactionHistoryTool,
  knowledgeBaseTool
} from '../tools/toolRegistry.js';
import { investigationMemory } from '../memory/investigationMemory.js';

export interface FraudInvestigationAgentInput {
  merchantData?: SellerProtectionInput;
  sandboxOrderId?: string;
}

/**
 * Agent 1: Fraud Investigation Agent
 * 
 * Responsibilities:
 * - Investigate suspicious seller activity and unusual payment velocity
 * - Detect possible Account Takeover (ATO) patterns (ticket acceleration, unverified buyer surge)
 * - Explain every decision with empirical evidence and counter-hypotheses
 * - Explicitly request additional evidence if confidence is low
 */
export async function runFraudInvestigationAgent(
  input: FraudInvestigationAgentInput
): Promise<FraudInvestigationAgentResult> {
  const toolCalls: ToolCallRecord[] = [];
  const evidence: string[] = [];
  const suspiciousSignals: string[] = [];
  const alternativePossibilities: string[] = [];
  const recommendedActions: string[] = [];
  const limitations: string[] = [
    'Telemetry limited to transaction velocity, settlement amounts, and payer verification ratios.',
    'Cannot inspect merchant login IP geo-hops, browser fingerprints, or credential stuffing telemetry.'
  ];
  const additionalEvidenceRequested: string[] = [];

  // If no merchant data is supplied, return reasoned baseline
  if (!input.merchantData) {
    return {
      agentRole: 'Fraud Investigation Agent',
      reasoning: 'No merchant or seller transaction data was provided for deep seller investigation.',
      evidence: ['No seller transaction parameters submitted.'],
      confidence: 30,
      alternativePossibilities: ['Investigation may be an invoice-only or sandbox-only case.'],
      recommendedActions: ['Provide merchant ID and recent transactions if seller evaluation is required.'],
      limitations,
      toolCalls,
      additionalEvidenceRequested: ['Merchant profile ID', 'Recent batch settlement history'],
      isAtoSuspected: false,
      atoConfidence: 0,
      paymentBehaviorRisk: 'Low',
      suspiciousSignals: []
    };
  }

  // 1. Tool Call: Seller Analyzer Tool
  const sellerAnalysis = await sellerAnalyzerTool.run(
    input.merchantData,
    'Analyze sales volume velocity, dispute ratios, and transaction ticket distributions.'
  );
  toolCalls.push(sellerAnalysis.record);
  const metrics = sellerAnalysis.data.metrics;

  // 2. Tool Call: Transaction History Tool
  const historyQuery = await transactionHistoryTool.run(
    { merchantId: input.merchantData.merchantId },
    'Retrieve historical baseline turnover, past average ticket size, and dispute baseline.'
  );
  toolCalls.push(historyQuery.record);
  const baseline = historyQuery.data;

  // 3. Tool Call: Knowledge Base Tool (ATO & Card Testing Signatures)
  const kbQuery = await knowledgeBaseTool.run(
    { query: 'Account Takeover ticket acceleration', category: 'ato-patterns' },
    'Correlate current transaction anomalies with documented Account Takeover (ATO) patterns.'
  );
  toolCalls.push(kbQuery.record);

  // Check long-term memory for prior investigations into this merchant
  const memoryHits = investigationMemory.searchPastCases({ merchantId: input.merchantData.merchantId });
  if (memoryHits.length > 0) {
    evidence.push(`Long-Term Memory: Found ${memoryHits.length} prior investigation(s) for merchant ${input.merchantData.merchantId}. Prior verdict: "${memoryHits[0].pastVerdict}".`);
  }

  // Analyze Evidence
  evidence.push(`Recent Transaction Count: ${metrics.transactionCount} transactions totaling $${metrics.totalRecentSales.toFixed(2)}.`);
  evidence.push(`Recent Average Order Value (AOV): $${metrics.averageOrderValue.toFixed(2)} (Peak single ticket: $${metrics.maxTransaction.toFixed(2)}).`);
  evidence.push(`Dispute Rate: ${metrics.disputeRatePercentage}% (${input.merchantData.disputes} dispute(s)).`);
  evidence.push(`Refund Rate: ${metrics.refundRatePercentage}% (${input.merchantData.refunds} refund(s)).`);

  const unverifiedRatio = input.merchantData.unverifiedPayerRatio ?? 0;
  if (unverifiedRatio > 0) {
    evidence.push(`Unverified Payer Concentration: ${unverifiedRatio}% of recent transactions originated from unverified PayPal accounts.`);
  }

  // Evaluate Account Takeover (ATO) Indicators
  let isAtoSuspected = false;
  let atoConfidence = 0;
  let paymentBehaviorRisk: 'Low' | 'Medium' | 'High' = 'Low';

  // Ticket acceleration check vs baseline
  const ticketAccelerationRatio = baseline.baselineAvgTicketSize > 0
    ? metrics.averageOrderValue / baseline.baselineAvgTicketSize
    : 1;

  if (baseline.isKnownMerchant && ticketAccelerationRatio >= 3.5 && metrics.maxTransaction >= 1000) {
    isAtoSuspected = true;
    atoConfidence = 85;
    paymentBehaviorRisk = 'High';
    suspiciousSignals.push(
      `Extreme Ticket Acceleration: Current AOV ($${metrics.averageOrderValue.toFixed(2)}) is ${ticketAccelerationRatio.toFixed(1)}x higher than established baseline ($${baseline.baselineAvgTicketSize.toFixed(2)}).`
    );
  }

  // Unverified buyer concentration check
  if (unverifiedRatio >= 40) {
    paymentBehaviorRisk = 'High';
    suspiciousSignals.push(
      `Abnormal Unverified Payer Ratio (${unverifiedRatio}%): Indicates potential card-testing or bot syndicates targeting merchant gateway.`
    );
  } else if (unverifiedRatio >= 20) {
    if (paymentBehaviorRisk !== 'High') paymentBehaviorRisk = 'Medium';
    suspiciousSignals.push(`Elevated Unverified Payer Ratio (${unverifiedRatio}%).`);
  }

  // High dispute frequency check
  if (metrics.disputeRatePercentage >= 5.0) {
    paymentBehaviorRisk = 'High';
    suspiciousSignals.push(`Critical Dispute Velocity: ${metrics.disputeRatePercentage}% exceeds acceptable 1.0% threshold.`);
  }

  // Formulate Counter-Hypotheses (Alternative Possibilities)
  if (isAtoSuspected) {
    alternativePossibilities.push(
      'Alternative Hypothesis: Merchant may have legitimately pivoted their product line toward high-value luxury goods or commercial equipment.'
    );
    alternativePossibilities.push(
      'Alternative Hypothesis: A single wholesale or B2B enterprise client placed an unusually large bulk order.'
    );
  } else if (metrics.salesGrowthPercentage >= 100) {
    alternativePossibilities.push(
      'Alternative Hypothesis: Sales surge is driven by organic seasonal promotions (e.g., Cyber Week, clearance sale) or an unannounced influencer endorsement.'
    );
  } else {
    alternativePossibilities.push(
      'Alternative Hypothesis: Operational dispute rate fluctuation may stem from a localized delivery courier delay rather than seller bad faith.'
    );
  }

  // Calculate Agent Confidence Score
  let confidence = 85;
  if (!baseline.isKnownMerchant || (input.merchantData.accountAgeDays ?? 100) < 30) {
    confidence = 45;
    additionalEvidenceRequested.push('Government-issued merchant business license or Articles of Incorporation.');
    additionalEvidenceRequested.push('Past 3 months of business bank statements verifying historical trading volume.');
    additionalEvidenceRequested.push('Supplier commercial invoices and inventory stock receipts.');
  }

  if (unverifiedRatio >= 40) {
    additionalEvidenceRequested.push('Proof of carrier delivery with signature confirmation for recent high-value orders.');
    additionalEvidenceRequested.push('Multi-Factor Authentication (MFA) login access logs for the merchant portal.');
  }

  // Formulate Recommendations
  if (paymentBehaviorRisk === 'High') {
    recommendedActions.push('Require Human Underwriter review before lifting rolling settlement reserve.');
    recommendedActions.push('Request immediate identity reverification and prompt merchant to confirm recent high-ticket sales.');
    recommendedActions.push('Verify recent login locations to rule out compromised API credentials or session hijacking.');
  } else if (paymentBehaviorRisk === 'Medium') {
    recommendedActions.push('Place merchant account on 72-hour passive velocity monitoring.');
    recommendedActions.push('Recommend merchant enforce PayPal Seller Protection eligible shipping methods.');
  } else {
    recommendedActions.push('Maintain standard transaction settlement terms.');
    recommendedActions.push('Log baseline growth metrics in Long-Term Memory for future seasonal modeling.');
  }

  // Synthesize Reasoning Narrative
  let reasoning = '';
  if (isAtoSuspected) {
    reasoning = `High probability of Account Takeover (ATO) or credential compromise detected for merchant ${input.merchantData.merchantId}. Average order values have escalated ${ticketAccelerationRatio.toFixed(1)}x over baseline, compounded by elevated unverified payer ratios (${unverifiedRatio}%). Immediate underwriter scrutiny required.`;
  } else if (paymentBehaviorRisk === 'High') {
    reasoning = `Elevated payment behavior risk identified. Dispute rates (${metrics.disputeRatePercentage}%) or unverified payer concentrations (${unverifiedRatio}%) indicate substantial exposure to chargeback liability, even though account takeover markers are inconclusive.`;
  } else if (metrics.salesGrowthPercentage >= 100 && metrics.disputeRatePercentage === 0) {
    reasoning = `Sales volume increased by +${metrics.salesGrowthPercentage}%, but payment behavior remains exceptionally healthy with 0% disputes and minimal unverified buyers. Velocity reflects legitimate business expansion rather than fraud.`;
  } else {
    reasoning = `Payment metrics fall within expected commercial boundaries. Average order value of $${metrics.averageOrderValue.toFixed(2)} and dispute rate of ${metrics.disputeRatePercentage}% present low fraud risk.`;
  }

  return {
    agentRole: 'Fraud Investigation Agent',
    reasoning,
    evidence,
    confidence,
    alternativePossibilities,
    recommendedActions,
    limitations,
    toolCalls,
    additionalEvidenceRequested: additionalEvidenceRequested.length > 0 ? additionalEvidenceRequested : undefined,
    isAtoSuspected,
    atoConfidence,
    paymentBehaviorRisk,
    suspiciousSignals
  };
}
