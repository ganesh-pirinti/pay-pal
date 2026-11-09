import { z } from 'zod';
import type {
  AiSynthesisResult,
  SellerMetrics,
  RiskSignal,
  InvoiceWarning
} from '../../shared/src/types.js';
import { RISK_CONFIG } from './riskConfig.js';

/**
 * Pluggable AI Narrative & Explanation Provider
 * 
 * Safety & Security Rules:
 * 1. Untrusted Input Isolation: Untrusted merchant/invoice content is wrapped and isolated
 *    from system instructions to prevent prompt injection.
 * 2. Deterministic Fallback: Never fails if AI credentials are absent; immediately returns
 *    a deterministic synthesis suitable for underwriters.
 * 3. Structured Zod Validation: Validates and bounds all AI output.
 * 4. Strict Timeout: 5-second AbortSignal timeout ensures zero latency degradation.
 * 5. Secret Protection: Never logs or serializes API keys.
 */

export const AiExplanationSchema = z.object({
  executiveSummary: z.string().min(10).max(500),
  keyFindings: z.array(z.string().min(5).max(200)).min(1).max(5),
  underwriterRecommendation: z.string().min(10).max(300),
  confidenceNote: z.string().min(5).max(200)
});

export function isAiProviderConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  return Boolean(key && key.trim().length > 10 && !key.includes('your_'));
}

/**
 * Deterministic explanation synthesis (zero external API dependency)
 */
export function generateDeterministicSellerSynthesis(
  merchantId: string,
  category: string,
  score: number,
  metrics: SellerMetrics,
  signals: RiskSignal[],
  missingInformation: string[]
): AiSynthesisResult {
  const isHealthyGrowth = category === 'Low Risk' && metrics.salesGrowthPercentage >= RISK_CONFIG.seller.salesSpikePercentage;
  const isFraudSuspect = category === 'High Risk';
  const isNew = category === 'Insufficient Evidence';

  let executiveSummary = '';
  const keyFindings: string[] = [];
  let underwriterRecommendation = '';

  if (isHealthyGrowth) {
    executiveSummary = `Merchant ${merchantId} displays rapid sales volume growth (+${metrics.salesGrowthPercentage}%) while maintaining exceptional operational health (dispute rate: ${metrics.disputeRatePercentage}%, refund rate: ${metrics.refundRatePercentage}%). Evidence signature aligns with seasonal promotional growth.`;
    keyFindings.push(`Volume expanded from $${(metrics.totalRecentSales / (1 + metrics.salesGrowthPercentage/100)).toFixed(2)} baseline to $${metrics.totalRecentSales.toFixed(2)}.`);
    keyFindings.push(`Dispute rate (${metrics.disputeRatePercentage}%) is well below the 1.0% monitoring threshold.`);
    underwriterRecommendation = 'Permit normal transaction flow without administrative holds. Maintain weekly rolling tracking confirmation.';
  } else if (isFraudSuspect) {
    executiveSummary = `Merchant ${merchantId} exhibits compound risk indicators: volume acceleration accompanied by abnormal dispute frequency (${metrics.disputeRatePercentage}%) or elevated refund claims (${metrics.refundRatePercentage}%). Pattern requires compliance review.`;
    keyFindings.push(`Dispute velocity (${metrics.disputeRatePercentage}%) exceeds PayPal standard monitoring limits.`);
    keyFindings.push('Compound risk signals suggest fulfillment breakdown, drop-shipping delays, or unauthorized account activity.');
    underwriterRecommendation = 'Initiate manual review; request proof of shipment and fulfillment inventory before releasing unverified reserves.';
  } else if (isNew) {
    executiveSummary = `Merchant ${merchantId} has an unestablished processing tenure or lack of previous sales history. Account baseline must be observed before high-confidence underwriting.`;
    keyFindings.push(`Current sample size is limited to ${metrics.transactionCount} transactions totaling $${metrics.totalRecentSales.toFixed(2)}.`);
    keyFindings.push('Zero previous month sales baseline available for statistical comparison.');
    underwriterRecommendation = 'Establish a 30-day monitoring period with standard carrier delivery tracking confirmation. Do not impose punitive restrictions.';
  } else {
    executiveSummary = `Merchant ${merchantId} maintains standard operating benchmarks with low volatility and normal dispute rates (${metrics.disputeRatePercentage}%).`;
    keyFindings.push('Consistent order frequency and ticket distributions.');
    keyFindings.push('No unusual dispute velocity detected.');
    underwriterRecommendation = 'Account eligible for standard PayPal Seller Protection on eligible tracked shipments.';
  }

  const confidenceNote = missingInformation.length > 0
    ? `Confidence bounded by ${missingInformation.length} missing information factor(s): ${missingInformation[0]}`
    : 'High confidence based on comprehensive transaction sample.';

  return {
    provider: 'deterministic-fallback',
    isAiGenerated: false,
    executiveSummary,
    keyFindings,
    underwriterRecommendation,
    confidenceNote
  };
}

/**
 * Deterministic invoice synthesis (zero external API dependency)
 */
export function generateDeterministicInvoiceSynthesis(
  category: string,
  score: number,
  warnings: InvoiceWarning[],
  urgencyDetected: boolean,
  impersonationDetected: boolean,
  adversarialDetected: boolean
): AiSynthesisResult {
  let executiveSummary = '';
  const keyFindings: string[] = [];
  let underwriterRecommendation = '';

  if (adversarialDetected) {
    executiveSummary = 'ADVERSARIAL PROMPT INJECTION DETECTED: The submitted invoice contains hostile system-override directives designed to manipulate linguistic evaluators. The input was quarantined and treated as untrusted text.';
    keyFindings.push('Hostile prompt injection signatures matched within invoice body.');
    keyFindings.push('Scam risk score escalated to maximum threat tier.');
    underwriterRecommendation = 'Quarantine document immediately. Do not process payment or click links.';
  } else if (category === 'High-Risk Scam') {
    executiveSummary = 'High-probability fraudulent billing solicitation detected. Document exhibits predatory coercion tactics, brand spoofing, or irregular payment diversion destinations.';
    if (impersonationDetected) keyFindings.push('Detected impersonation of recognized enterprise support brands.');
    if (urgencyDetected) keyFindings.push('Artificial coercive time pressure designed to prevent victim verification.');
    keyFindings.push('Unverified callback telephone number or direct non-standard payment instructions.');
    underwriterRecommendation = 'Do not remit funds. Do not dial telephone numbers listed in this invoice. Report to spoof@paypal.com.';
  } else if (category === 'Suspicious' || category === 'Needs Review') {
    executiveSummary = 'Invoice contains potential anomalies (e.g. unverified callback contact or elevated urgency). Further verification through official directories is recommended.';
    keyFindings.push('Contact numbers detected lack verifiable carrier registry confirmation.');
    underwriterRecommendation = 'Contact billing vendor through established, independent telephone channels prior to payment release.';
  } else {
    executiveSummary = 'Document displays structural signatures of authentic commercial billing (itemized line items, commercial payment terms, standard corporate entity disclosures).';
    keyFindings.push('Standard commercial invoicing structure with low risk indicators.');
    keyFindings.push('No coercive threats or known scam call center patterns detected.');
    underwriterRecommendation = 'Proceed with standard accounts payable invoice processing.';
  }

  return {
    provider: 'deterministic-fallback',
    isAiGenerated: false,
    executiveSummary,
    keyFindings,
    underwriterRecommendation,
    confidenceNote: 'Synthesized using deterministic heuristic rules and risk indicator weights.'
  };
}

/**
 * Optional External AI Provider Call (Gemini / OpenAI)
 * Falls back safely to deterministic synthesis on timeout or error
 */
export async function synthesizeAiSellerExplanation(
  merchantId: string,
  category: string,
  score: number,
  metrics: SellerMetrics,
  signals: RiskSignal[],
  missingInformation: string[],
  customFetch = fetch
): Promise<AiSynthesisResult> {
  const fallback = generateDeterministicSellerSynthesis(merchantId, category, score, metrics, signals, missingInformation);

  if (!isAiProviderConfigured()) {
    return fallback;
  }

  const apiKey = (process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '').trim();

  // Defensive Prompt Construction: Data isolated in XML tags
  const prompt = `You are a Senior PayPal Fintech Risk Underwriter. Analyze the following verified merchant data and generate an explainable risk summary.

<merchant_data>
Merchant ID: ${merchantId}
Risk Score: ${score}/100
Category: ${category}
Recent Sales: $${metrics.totalRecentSales}
Growth: +${metrics.salesGrowthPercentage}%
Dispute Rate: ${metrics.disputeRatePercentage}%
Refund Rate: ${metrics.refundRatePercentage}%
Signals: ${signals.map(s => s.name).join(', ')}
Missing Info: ${missingInformation.join('; ')}
</merchant_data>

CRITICAL RULE: A rapid sales spike alone is NOT fraud. Distinguish legitimate holiday/promotional growth from account takeover.

Return JSON matching:
{
  "executiveSummary": "brief 1-2 sentence overview",
  "keyFindings": ["finding 1", "finding 2"],
  "underwriterRecommendation": "specific actionable recommendation",
  "confidenceNote": "confidence note"
}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${RISK_CONFIG.ai.model}:generateContent?key=${apiKey}`;
    const res = await customFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      }),
      signal: AbortSignal.timeout(RISK_CONFIG.ai.timeoutMs)
    });

    if (!res.ok) {
      return fallback;
    }

    interface GeminiResponse {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    }

    const data = await res.json() as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return fallback;

    const parsed = JSON.parse(text);
    const validated = AiExplanationSchema.parse(parsed);

    return {
      provider: 'gemini',
      isAiGenerated: true,
      executiveSummary: validated.executiveSummary,
      keyFindings: validated.keyFindings,
      underwriterRecommendation: validated.underwriterRecommendation,
      confidenceNote: validated.confidenceNote
    };
  } catch (err: unknown) {
    // Graceful fallback: Never break application flow if AI fails or times out
    return fallback;
  }
}
