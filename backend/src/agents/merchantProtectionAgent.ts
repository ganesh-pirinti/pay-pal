import type {
  SellerProtectionInput,
  MerchantProtectionAgentResult,
  SpikeClassification,
  MerchantProtectionRecommendation,
  ToolCallRecord
} from '../../../shared/src/types.js';
import {
  sellerAnalyzerTool,
  transactionHistoryTool,
  knowledgeBaseTool
} from '../tools/toolRegistry.js';
import { RISK_CONFIG } from '../riskConfig.js';
import { investigationMemory } from '../memory/investigationMemory.js';

export interface MerchantProtectionAgentInput {
  merchantData?: SellerProtectionInput;
}

/**
 * Agent 3: Merchant Protection Agent
 * 
 * Responsibilities:
 * - Determine whether a sudden sales spike is likely:
 *   'normal growth' | 'seasonal event' | 'viral marketing' | 'fraud' | 'bot activity'
 * - Recommend proportionate risk actions:
 *   'No Action' | 'Monitor' | 'Temporary Review' | 'Escalate'
 * - INVARIANT: NEVER freeze or modify merchant accounts automatically.
 * - Protect legitimate merchant expansion from premature administrative friction.
 */
export async function runMerchantProtectionAgent(
  input: MerchantProtectionAgentInput
): Promise<MerchantProtectionAgentResult> {
  const toolCalls: ToolCallRecord[] = [];
  const evidence: string[] = [];
  const alternativePossibilities: string[] = [];
  const recommendedActions: string[] = [];
  const limitations: string[] = [
    'Does not have visibility into merchant marketing ad-spend or live social media campaign analytics.',
    'Inventory stock and supplier fulfillment contracts are unverified without direct document submission.'
  ];

  if (!input.merchantData) {
    return {
      agentRole: 'Merchant Protection Agent',
      reasoning: 'No merchant sales data provided to evaluate volume velocity or protection recommendations.',
      evidence: ['No seller transaction parameters submitted.'],
      confidence: 25,
      alternativePossibilities: ['Investigation is an isolated invoice or buyer incident.'],
      recommendedActions: ['Provide merchant transaction history if volume spike assessment is needed.'],
      limitations,
      toolCalls,
      spikeClassification: 'normal growth',
      protectionRecommendation: 'No Action',
      justification: 'No sales data submitted; default to No Action.',
      isAccountFrozen: false
    };
  }

  // 1. Tool Call: Seller Analyzer Tool
  const sellerAnalysis = await sellerAnalyzerTool.run(
    input.merchantData,
    'Extract sales growth rate, dispute percentage, and refund frequency.'
  );
  toolCalls.push(sellerAnalysis.record);
  const metrics = sellerAnalysis.data.metrics;
  const sellerResult = sellerAnalysis.data;

  // 2. Tool Call: Transaction History Tool
  const historyQuery = await transactionHistoryTool.run(
    { merchantId: input.merchantData.merchantId },
    'Fetch historical baseline turnover and established days.'
  );
  toolCalls.push(historyQuery.record);
  const baseline = historyQuery.data;

  // 3. Tool Call: Knowledge Base Tool (Seasonal Benchmarks & Viral Surges)
  const kbQuery = await knowledgeBaseTool.run(
    { query: 'Seasonal surge Q4 holiday viral campaign', category: 'seasonal-benchmarks' },
    'Correlate sales expansion against retail calendar surges and viral growth patterns.'
  );
  toolCalls.push(kbQuery.record);

  // Cross-reference Long-Term Memory for past growth confirmations
  const memoryHits = investigationMemory.searchPastCases({ merchantId: input.merchantData.merchantId });
  if (memoryHits.length > 0) {
    evidence.push(`Memory Baseline: Merchant previously validated in case ${memoryHits[0].caseId} (Action: ${memoryHits[0].pastVerdict}).`);
  }

  // Compile Observed Evidence
  evidence.push(`Sales Velocity: Recent sales of $${metrics.totalRecentSales.toFixed(2)} representing a ${metrics.salesGrowthPercentage >= 0 ? '+' : ''}${metrics.salesGrowthPercentage}% volume change over baseline.`);
  evidence.push(`Chargeback Health: Dispute rate is ${metrics.disputeRatePercentage}% (${input.merchantData.disputes} disputes).`);
  evidence.push(`Refund Frequency: Refund rate is ${metrics.refundRatePercentage}% (${input.merchantData.refunds} refunds).`);
  evidence.push(`Account Tenure: ${input.merchantData.accountAgeDays ?? baseline.establishedDays} days active on platform.`);

  const unverifiedRatio = input.merchantData.unverifiedPayerRatio ?? 0;
  if (unverifiedRatio > 0) {
    evidence.push(`Unverified Payer Metric: ${unverifiedRatio}% unverified payer concentration.`);
  }

  // Evaluate Spike Classification
  let spikeClassification: SpikeClassification = 'normal growth';
  let protectionRecommendation: MerchantProtectionRecommendation = 'No Action';
  let justification = '';

  const isGrowthSpike = metrics.salesGrowthPercentage >= RISK_CONFIG.seller.salesSpikePercentage;
  const hasElevatedDisputes = metrics.disputeRatePercentage >= RISK_CONFIG.seller.disputeRate.elevated;
  const hasCriticalDisputes = metrics.disputeRatePercentage >= RISK_CONFIG.seller.disputeRate.critical;
  const hasElevatedRefunds = metrics.refundRatePercentage >= RISK_CONFIG.seller.refundRate.elevated;
  const hasHighUnverified = unverifiedRatio >= 40;
  const isTenureNew = (input.merchantData.accountAgeDays ?? baseline.establishedDays) < RISK_CONFIG.seller.sufficiency.newMerchantTenureDays;

  if (isTenureNew && input.merchantData.previousMonthSales === 0) {
    spikeClassification = 'normal growth';
    protectionRecommendation = 'Monitor';
    justification = 'New merchant initiating initial transaction volume. Insufficient historical data for baseline comparison; monitor transaction settlement.';
  } else if (isGrowthSpike) {
    if (hasCriticalDisputes || (hasElevatedDisputes && hasHighUnverified)) {
      spikeClassification = 'fraud';
      protectionRecommendation = 'Escalate';
      justification = `Severe compound risk: sales surged +${metrics.salesGrowthPercentage}%, but dispute rate reached ${metrics.disputeRatePercentage}% with ${unverifiedRatio}% unverified buyers. Indicates potential fulfillment default or synthetic fraud.`;
    } else if (hasHighUnverified && metrics.disputeRatePercentage < 1.0) {
      spikeClassification = 'bot activity';
      protectionRecommendation = 'Temporary Review';
      justification = `Sudden surge of +${metrics.salesGrowthPercentage}% characterized by abnormally high unverified buyer ratio (${unverifiedRatio}%), suggesting automated bot script or card testing activity.`;
    } else if (metrics.disputeRatePercentage === 0 && metrics.refundRatePercentage <= 2.0) {
      if (metrics.salesGrowthPercentage >= 200) {
        spikeClassification = 'viral marketing';
        justification = `Exceptional sales surge (+${metrics.salesGrowthPercentage}%) with perfect operational health (0% disputes). Signature matches viral social media or flash campaign.`;
      } else {
        spikeClassification = 'seasonal event';
        justification = `Healthy seasonal expansion (+${metrics.salesGrowthPercentage}%) with 0% chargebacks and normal refund frequency. Aligns with standard holiday retail velocity.`;
      }
      protectionRecommendation = 'No Action';
    } else if (hasElevatedDisputes || hasElevatedRefunds) {
      spikeClassification = 'normal growth';
      protectionRecommendation = 'Temporary Review';
      justification = `Volume growth (+${metrics.salesGrowthPercentage}%) accompanied by mild dispute increase (${metrics.disputeRatePercentage}%). Requires underwriter review of delivery tracking before funds release.`;
    } else {
      spikeClassification = 'normal growth';
      protectionRecommendation = 'Monitor';
      justification = 'Moderate growth pattern within expected commercial boundaries.';
    }
  } else {
    // No growth spike
    if (hasCriticalDisputes) {
      spikeClassification = 'fraud';
      protectionRecommendation = 'Escalate';
      justification = `Critical dispute rate of ${metrics.disputeRatePercentage}% without sales growth indicates severe merchant operational breakdown or dispute claim surge.`;
    } else if (hasElevatedDisputes) {
      spikeClassification = 'normal growth';
      protectionRecommendation = 'Temporary Review';
      justification = `Dispute rate of ${metrics.disputeRatePercentage}% exceeds 1.0% monitoring threshold; requires customer service review.`;
    } else {
      spikeClassification = 'normal growth';
      protectionRecommendation = 'No Action';
      justification = 'Normal stable merchant operating metrics with clean dispute history.';
    }
  }

  // Counter-Hypotheses (Alternative Possibilities)
  if (spikeClassification === 'viral marketing' || spikeClassification === 'seasonal event') {
    alternativePossibilities.push(
      'Alternative Hypothesis: Surge could reflect delayed fulfillment liabilities where disputes will manifest 30-45 days post-sale.'
    );
    alternativePossibilities.push(
      'Alternative Hypothesis: A promotional discount code may have been scraped and exploited by reseller bots.'
    );
  } else if (spikeClassification === 'fraud' || spikeClassification === 'bot activity') {
    alternativePossibilities.push(
      'Alternative Hypothesis: Merchant may be an innocent victim of a distributed Denial-of-Inventory or checkout probing attack.'
    );
    alternativePossibilities.push(
      'Alternative Hypothesis: Sudden dispute surge may be caused by a single logistics carrier loss (e.g. shipping container damage) rather than bad merchant faith.'
    );
  } else {
    alternativePossibilities.push(
      'Alternative Hypothesis: Modest volume fluctuations may simply reflect weekend/weekday retail cycles.'
    );
  }

  // Calculate Confidence
  let confidence = 85;
  if (isTenureNew) confidence = 50;
  if (unverifiedRatio > 30) confidence = 75;

  // Formulate Recommendations
  switch (protectionRecommendation) {
    case 'No Action':
      recommendedActions.push('Permit standard automatic fund disbursements without administrative holds.');
      recommendedActions.push('Ensure merchant attaches valid carrier tracking to maintain PayPal Seller Protection coverage.');
      break;
    case 'Monitor':
      recommendedActions.push('Place merchant on automated 7-day rolling performance monitoring.');
      recommendedActions.push('Notify merchant to confirm inventory reserves for pending order fulfillment.');
      break;
    case 'Temporary Review':
      recommendedActions.push('Request recent proof of carrier delivery with online tracking numbers.');
      recommendedActions.push('Apply a temporary rolling reserve (e.g., 10% for 30 days) rather than account freeze.');
      break;
    case 'Escalate':
      recommendedActions.push('Escalate case to Senior Risk Underwriter for comprehensive case audit.');
      recommendedActions.push('Engage merchant directly via PayPal Resolution Center to review disputed transactions.');
      break;
  }

  // Synthesize Reasoning
  const reasoning = `Merchant Protection Agent evaluated merchant ${input.merchantData.merchantId}: Growth volume classified as '${spikeClassification}'. Assessment: ${justification} Recommended action: '${protectionRecommendation}'. Zero administrative account freezes applied.`;

  return {
    agentRole: 'Merchant Protection Agent',
    reasoning,
    evidence,
    confidence,
    alternativePossibilities,
    recommendedActions,
    limitations,
    toolCalls,
    spikeClassification,
    protectionRecommendation,
    justification,
    isAccountFrozen: false
  };
}
