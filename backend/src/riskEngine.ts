import type {
  SellerProtectionInput,
  SellerProtectionResult,
  SellerMetrics,
  RiskSignal,
  InvoiceScamInput,
  InvoiceScamResult,
  InvoiceWarning,
  UnverifiedContact,
  PaymentDestinationSignal,
  EvidenceSufficiencyLevel,
  EvaluateSandboxTransactionInput,
  SandboxTransactionRiskEvaluation
} from '../../shared/src/types.js';
import { RISK_CONFIG } from './riskConfig.js';
import {
  generateDeterministicSellerSynthesis,
  generateDeterministicInvoiceSynthesis
} from './aiProvider.js';

/**
 * PayPal TrustShield AI - Unified Explainable Risk Engine
 * 
 * Core Architectural Standards:
 * 1. Deterministic baseline scoring: mathematical rules always execute first.
 * 2. Explicit separation of:
 *    - Observed Evidence (verifiable empirical facts)
 *    - Inferred Risk (probabilistic/heuristic deductions)
 *    - Missing Information (known unknowns & bounded uncertainty)
 * 3. Evidence Sufficiency: Separates data volume/completeness from the risk score.
 * 4. Safe sales surge principle: A sales increase alone NEVER classifies a seller as fraudulent.
 * 5. Untrusted input isolation: Defends against adversarial prompt injection attacks in invoice text.
 * 6. Non-destructive advisory: System provides review recommendations and never executes account holds.
 */

// ==========================================
// SELLER PROTECTION INTELLIGENCE
// ==========================================

export function analyzeSellerProtection(input: SellerProtectionInput): SellerProtectionResult {
  const {
    merchantId,
    transactions = [],
    previousMonthSales = 0,
    disputes = 0,
    refunds = 0,
    accountAgeDays,
    unverifiedPayerRatio = 0
  } = input;

  // Zero-division safety and basic aggregation
  const validTransactions = transactions.filter(t => typeof t === 'number' && !isNaN(t) && t > 0);
  const transactionCount = validTransactions.length;
  const totalRecentSales = validTransactions.reduce((sum, val) => sum + val, 0);
  const averageOrderValue = transactionCount > 0 ? totalRecentSales / transactionCount : 0;
  const minTransaction = transactionCount > 0 ? Math.min(...validTransactions) : 0;
  const maxTransaction = transactionCount > 0 ? Math.max(...validTransactions) : 0;

  const salesGrowthPercentage = previousMonthSales > 0
    ? ((totalRecentSales - previousMonthSales) / previousMonthSales) * 100
    : (totalRecentSales > 0 ? 100 : 0);

  const disputeRatePercentage = transactionCount > 0
    ? (disputes / transactionCount) * 100
    : 0;

  const refundRatePercentage = transactionCount > 0
    ? (refunds / transactionCount) * 100
    : 0;

  const metrics: SellerMetrics = {
    totalRecentSales: Math.round(totalRecentSales * 100) / 100,
    salesGrowthPercentage: Math.round(salesGrowthPercentage * 10) / 10,
    disputeRatePercentage: Math.round(disputeRatePercentage * 100) / 100,
    refundRatePercentage: Math.round(refundRatePercentage * 100) / 100,
    averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    transactionCount,
    minTransaction: Math.round(minTransaction * 100) / 100,
    maxTransaction: Math.round(maxTransaction * 100) / 100
  };

  const signals: RiskSignal[] = [];
  const recommendations: string[] = [];
  const observedEvidence: string[] = [];
  const inferredRisk: string[] = [];
  const missingInformation: string[] = [];

  // Populate Observed Evidence
  observedEvidence.push(`Analyzed ${transactionCount} recent transaction(s) totaling $${metrics.totalRecentSales.toFixed(2)}.`);
  observedEvidence.push(`Previous month sales baseline recorded at $${previousMonthSales.toFixed(2)}.`);
  observedEvidence.push(`Dispute count: ${disputes} (${metrics.disputeRatePercentage}% of transaction volume).`);
  observedEvidence.push(`Refund count: ${refunds} (${metrics.refundRatePercentage}% of transaction volume).`);
  if (accountAgeDays !== undefined) {
    observedEvidence.push(`Account tenure: ${accountAgeDays} days since activation.`);
  }

  // Populate Missing Information
  if (previousMonthSales === 0) {
    missingInformation.push('Zero historical sales baseline recorded for previous 30-day window.');
  }
  if (accountAgeDays === undefined || accountAgeDays < RISK_CONFIG.seller.sufficiency.newMerchantTenureDays) {
    missingInformation.push('Limited account tenure (< 30 days); long-term fulfillment pattern unestablished.');
  }
  missingInformation.push('Carrier delivery tracking confirmation not uploaded for recent transactions.');
  missingInformation.push('Customer return policy and terms of service not verified on merchant storefront.');

  // Evidence Sufficiency Calculation
  let evidenceSufficiency: EvidenceSufficiencyLevel = 'Moderate';
  let confidenceScore = 80;

  const isNewMerchant = (accountAgeDays !== undefined && accountAgeDays < RISK_CONFIG.seller.sufficiency.newMerchantTenureDays) ||
    (previousMonthSales === 0 && totalRecentSales > 0);
  const hasSparseHistory = transactionCount < RISK_CONFIG.seller.sufficiency.minTransactionsForModerateConfidence;

  if (isNewMerchant || hasSparseHistory) {
    evidenceSufficiency = 'Insufficient';
    confidenceScore = 35;
  } else if (transactionCount >= RISK_CONFIG.seller.sufficiency.minTransactionsForHighConfidence && accountAgeDays && accountAgeDays > 90) {
    evidenceSufficiency = 'High';
    confidenceScore = 95;
  }

  // Case 1: Insufficient Historical Evidence
  if (isNewMerchant || hasSparseHistory) {
    signals.push({
      id: 'INSUFFICIENT_HISTORY',
      name: 'Unestablished Merchant Baseline',
      severity: 'info',
      description: `Account has limited historical transaction baseline (previous sales: $${previousMonthSales.toFixed(2)}, transaction count: ${transactionCount}).`,
      weight: 15
    });

    inferredRisk.push('Lack of historical processing baseline represents unverified tenure rather than fraudulent intent.');
    inferredRisk.push('Statistical chargeback and fulfillment performance cannot yet be modeled with high confidence.');

    recommendations.push('Do not restrict account purely due to lack of historical baseline.');
    recommendations.push('Establish a 30-day baseline monitoring period with standard delivery tracking confirmation.');
    recommendations.push('Request fulfillment confirmation or supplier invoices only if individual transaction values exceed $1,000.');

    const resultExplanation = 'Merchant has an unestablished transaction history or zero previous-month baseline. Lack of historical data represents unverified tenure rather than confirmed malicious activity.';

    const aiSynthesis = generateDeterministicSellerSynthesis(
      merchantId,
      'Insufficient Evidence',
      24,
      metrics,
      signals,
      missingInformation
    );

    return {
      merchantId,
      riskScore: 24,
      category: 'Insufficient Evidence',
      explanation: resultExplanation,
      signals,
      recommendations,
      metrics,
      disclaimer: 'Advisory risk signal. TrustShield AI provides intelligence for review teams and does not execute account freezes or balance holds.',
      isSimulated: true,
      timestamp: new Date().toISOString(),
      evidenceSufficiency,
      confidenceScore,
      observedEvidence,
      inferredRisk,
      missingInformation,
      aiSynthesis
    };
  }

  // Case 2: Signal Evaluation for Established Merchants
  let baseScore = 10;
  const isSalesSpike = salesGrowthPercentage >= RISK_CONFIG.seller.salesSpikePercentage;

  if (isSalesSpike) {
    signals.push({
      id: 'SALES_VOLUME_ACCELERATION',
      name: 'Sales Volume Surge',
      severity: 'info',
      description: `Current sales volume expanded by +${metrics.salesGrowthPercentage}% compared to previous month ($${previousMonthSales.toFixed(2)} -> $${totalRecentSales.toFixed(2)}).`,
      weight: 10
    });
  }

  // Dispute Evaluation
  if (disputeRatePercentage > RISK_CONFIG.seller.disputeRate.elevated) {
    const isCritical = disputeRatePercentage > RISK_CONFIG.seller.disputeRate.critical;
    const weight = isCritical ? 35 : 25;
    signals.push({
      id: 'HIGH_DISPUTE_RATE',
      name: 'Elevated Dispute Rate',
      severity: isCritical ? 'high' : 'medium',
      description: `Dispute rate of ${metrics.disputeRatePercentage}% exceeds the PayPal standard monitoring threshold (${RISK_CONFIG.seller.disputeRate.healthy}%).`,
      weight
    });
    baseScore += weight;
    inferredRisk.push(`Dispute rate (${metrics.disputeRatePercentage}%) is abnormally high, indicating potential customer non-receipt claims or unauthorized billing.`);
  } else if (disputeRatePercentage > RISK_CONFIG.seller.disputeRate.healthy) {
    signals.push({
      id: 'MODERATE_DISPUTE_RATE',
      name: 'Moderate Dispute Activity',
      severity: 'low',
      description: `Dispute rate of ${metrics.disputeRatePercentage}% is slightly elevated above standard benchmark (${RISK_CONFIG.seller.disputeRate.healthy}%).`,
      weight: 10
    });
    baseScore += 10;
  } else {
    signals.push({
      id: 'HEALTHY_DISPUTE_RATE',
      name: 'Healthy Dispute Ratio',
      severity: 'info',
      description: `Dispute rate of ${metrics.disputeRatePercentage}% is well within the healthy benchmark (< ${RISK_CONFIG.seller.disputeRate.healthy}%).`,
      weight: 0
    });
    observedEvidence.push('Dispute frequency is within standard retail tolerance (< 1.0%).');
  }

  // Refund Evaluation
  if (refundRatePercentage > RISK_CONFIG.seller.refundRate.elevated) {
    const isCritical = refundRatePercentage > RISK_CONFIG.seller.refundRate.critical;
    const weight = isCritical ? 30 : 20;
    signals.push({
      id: 'HIGH_REFUND_RATE',
      name: 'Elevated Refund Frequency',
      severity: 'high',
      description: `Refund rate of ${metrics.refundRatePercentage}% indicates potential customer dissatisfaction, inventory stockouts, or chargeback pre-emptions.`,
      weight
    });
    baseScore += weight;
    inferredRisk.push(`High refund velocity (${metrics.refundRatePercentage}%) suggests inventory delays or quality discrepancies.`);
  } else if (refundRatePercentage > RISK_CONFIG.seller.refundRate.healthy) {
    signals.push({
      id: 'MODERATE_REFUND_RATE',
      name: 'Moderate Refund Rate',
      severity: 'low',
      description: `Refund rate of ${metrics.refundRatePercentage}% is within acceptable retail bounds but should be observed.`,
      weight: 5
    });
    baseScore += 5;
  }

  // Ticket Anomaly
  if (transactionCount > 2 && averageOrderValue > 0 && maxTransaction > averageOrderValue * RISK_CONFIG.seller.ticketOutlierMultiplier) {
    signals.push({
      id: 'TICKET_SIZE_ANOMALY',
      name: 'Outlier Transaction Spike',
      severity: 'medium',
      description: `Maximum transaction ($${maxTransaction.toFixed(2)}) is more than ${RISK_CONFIG.seller.ticketOutlierMultiplier}x the merchant average order value ($${averageOrderValue.toFixed(2)}).`,
      weight: 15
    });
    baseScore += 15;
    inferredRisk.push(`Individual outlier order ($${maxTransaction.toFixed(2)}) deviates significantly from typical ticket size ($${averageOrderValue.toFixed(2)}).`);
  }

  // Unverified Payer Ratio
  if (unverifiedPayerRatio > RISK_CONFIG.seller.unverifiedBuyerThreshold) {
    signals.push({
      id: 'UNVERIFIED_PAYER_CONCENTRATION',
      name: 'High Unverified Payer Concentration',
      severity: 'medium',
      description: `${Math.round(unverifiedPayerRatio * 100)}% of checkout attempts originated from unverified PayPal accounts.`,
      weight: 15
    });
    baseScore += 15;
    inferredRisk.push('Concentration of unverified payer accounts heightens exposure to unauthorized card testing.');
  }

  // Core Rule: Sales Spike Alone Must NOT Classify As High Risk / Fraud
  const hasMultipleSuspiciousIndicators =
    (disputeRatePercentage > 2.5 && refundRatePercentage > 6.0) ||
    (disputeRatePercentage > 5.0) ||
    (disputeRatePercentage > 2.0 && unverifiedPayerRatio > RISK_CONFIG.seller.unverifiedBuyerThreshold);

  let category: SellerProtectionResult['category'];
  let explanation: string;

  if (isSalesSpike && !hasMultipleSuspiciousIndicators) {
    category = 'Low Risk';
    baseScore = Math.min(baseScore, 28);
    explanation = `Sales volume surge (+${metrics.salesGrowthPercentage}%) detected, but dispute (${metrics.disputeRatePercentage}%) and refund (${metrics.refundRatePercentage}%) rates remain healthy. Indicator signature matches normal business expansion, seasonal product launch, or holiday sales.`;
    inferredRisk.push('Sales surge is strongly correlated with legitimate commercial expansion or seasonal promotions.');
    recommendations.push('Maintain standard transaction settlement; do not apply restrictive holds.');
    recommendations.push('Verify proof of shipment / carrier tracking uploads for orders over $750 to retain full PayPal Seller Protection.');
    recommendations.push('Monitor rolling metrics weekly to support merchant scaling.');
  } else if (hasMultipleSuspiciousIndicators) {
    category = baseScore >= 60 ? 'High Risk' : 'Medium Risk';
    explanation = `Merchant exhibits compound risk signals: rapid volume expansion combined with an elevated dispute rate (${metrics.disputeRatePercentage}%) and/or elevated refund frequency (${metrics.refundRatePercentage}%). Pattern warrants human analyst review.`;
    inferredRisk.push('Volume surge combined with dispute spikes represents high probability of fulfillment breakdown or compromised merchant credentials.');
    recommendations.push('Initiate high-priority compliance and fulfillment review.');
    recommendations.push('Review recent chargebacks and dispute claims in PayPal Resolution Center to identify root causes.');
    recommendations.push('Contact merchant via registered phone number to confirm sudden inventory sourcing and fulfillment capacity.');
    recommendations.push('Recommend proportionate rolling reserve (e.g., 10% for 30 days) rather than account freezing.');
  } else if (baseScore >= 40) {
    category = 'Medium Risk';
    explanation = `Elevated dispute (${metrics.disputeRatePercentage}%) or refund (${metrics.refundRatePercentage}%) trends detected without extreme volume surge. Requires proactive merchant outreach.`;
    recommendations.push('Send merchant advisory regarding dispute prevention and clear return policies.');
    recommendations.push('Encourage adoption of PayPal Dispute Automation and customer messaging.');
  } else {
    category = 'Low Risk';
    explanation = `Merchant operations are normal and healthy. Transaction volume, dispute rate (${metrics.disputeRatePercentage}%), and refund rate (${metrics.refundRatePercentage}%) are well within optimal operating benchmarks.`;
    recommendations.push('Full PayPal Seller Protection applies for eligible transactions with valid tracking.');
    recommendations.push('No risk mitigation action required.');
  }

  const finalScore = Math.min(Math.max(baseScore, 0), 100);

  const aiSynthesis = generateDeterministicSellerSynthesis(
    merchantId,
    category,
    finalScore,
    metrics,
    signals,
    missingInformation
  );

  return {
    merchantId,
    riskScore: finalScore,
    category,
    explanation,
    signals,
    recommendations,
    metrics,
    disclaimer: 'Advisory risk signal. TrustShield AI provides intelligence for review teams and does not execute account freezes or balance holds.',
    isSimulated: true,
    timestamp: new Date().toISOString(),
    evidenceSufficiency,
    confidenceScore,
    observedEvidence,
    inferredRisk,
    missingInformation,
    aiSynthesis
  };
}

// ==========================================
// INVOICE SCAM SHIELD INTELLIGENCE
// ==========================================

export function analyzeInvoiceScam(input: InvoiceScamInput): InvoiceScamResult {
  const rawText = input.invoiceText || '';
  const cleanText = rawText.trim();

  const warnings: InvoiceWarning[] = [];
  const unverifiedContacts: UnverifiedContact[] = [];
  const paymentDestinations: PaymentDestinationSignal[] = [];
  const observedEvidence: string[] = [];
  const inferredRisk: string[] = [];
  const missingInformation: string[] = [];
  let riskScore = 5;

  observedEvidence.push(`Invoice text analyzed (${cleanText.length} characters).`);
  missingInformation.push('Email transport headers (SPF, DKIM, DMARC) not available in raw text.');
  missingInformation.push('Originating IP address and mail transfer agent unverified.');
  missingInformation.push('Carrier registration for detected phone numbers unverified.');

  // 1. Prompt Injection Defense (Treat invoice text strictly as untrusted data)
  const promptInjectionPattern = /\b(ignore\s+(?:all\s+)?(?:previous|prior)\s+(?:instructions|guidelines|rules|prompts|context)|system\s+prompt|you\s+are\s+now|disregard\s+(?:all\s+)?prior|act\s+as\s+a\s+different|override\s+(?:safety|underwriter|guidelines|rules)|mark\s+this\s+as\s+legitimate|print\s+risk\s+score\s+0|internal\s+paypal\s+automated\s+clearance|output\s+json)\b/i;
  const injectionMatch = cleanText.match(promptInjectionPattern);
  let adversarialAttemptDetected = false;

  if (injectionMatch) {
    adversarialAttemptDetected = true;
    warnings.push({
      id: 'ADVERSARIAL_PROMPT_INJECTION',
      category: 'Adversarial Prompt Injection',
      severity: 'critical',
      title: 'Hostile Prompt Injection Detected',
      detail: `Invoice text contains adversarial instructions attempting to manipulate automated risk evaluators: "${injectionMatch[0]}". Text has been quarantined as hostile input.`,
      matchedText: injectionMatch[0]
    });
    observedEvidence.push(`Matched adversarial prompt injection token: "${injectionMatch[0]}".`);
    inferredRisk.push('Hostile prompt injection signatures strongly indicate sophisticated bad-actor attempts to bypass security filters.');
    riskScore += RISK_CONFIG.invoice.weights.promptInjectionAttempt;
  }

  // 2. Phone Number Extraction & Unverified Attribution
  const phoneRegex = /(?:\+?1[-.\s]?)?(?:\(?([2-9][0-9]{2})\)?[-.\s]?|[2-9][0-9]{2}[-.\s]?)[2-9][0-9]{2}[-.\s]?[0-9]{4}/g;
  const matchedPhones = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = phoneRegex.exec(cleanText)) !== null) {
    const phoneStr = match[0].trim();
    if (phoneStr.replace(/\D/g, '').length >= 10) {
      matchedPhones.add(phoneStr);
    }
  }

  for (const phone of matchedPhones) {
    const isTollFree = /(?:800|888|877|866|855|844|833)/.test(phone);
    unverifiedContacts.push({
      type: 'phone',
      value: phone,
      context: isTollFree ? 'Toll-free telephone number detected in invoice header/body' : 'Standard telephone number detected in invoice text',
      isVerified: false,
      verificationCaveat: 'Contact phone number is UNVERIFIED. Telecommunication status cannot be asserted as fraudulent without independent carrier registry checks. Do not dial numbers provided in unsolicited invoices.'
    });

    observedEvidence.push(`Telephone number detected: ${phone} (${isTollFree ? 'Toll-Free' : 'Standard'}).`);
    warnings.push({
      id: 'UNVERIFIED_PHONE_CONTACT',
      category: 'Unverified Phone Number',
      severity: 'medium',
      title: 'Unverified Telephone Number Listed',
      detail: `Invoice instructs recipient to call ${phone}. This number is unverified against official corporate directories.`,
      matchedText: phone
    });
    riskScore += RISK_CONFIG.invoice.weights.unverifiedPhoneContact;
    inferredRisk.push(`Scammers routinely use unverified toll-free call center numbers to conduct voice phishing (vishing) refund scams.`);
  }

  // 3. Coercive Threat & Urgency Patterns
  const coerciveThreatPatterns = [
    { regex: /\b(arrest|sheriff|police|law enforcement|warrant|legal action|court summons|penalty of perjury)\b/i, label: 'Legal / Law Enforcement Threat', weight: RISK_CONFIG.invoice.weights.coerciveLegalThreat },
    { regex: /\b(within 24 hours|within 1 hour|within 12 hours|immediately cancel|call immediately or be charged|charged automatically)\b/i, label: 'Artificial Time Pressure', weight: RISK_CONFIG.invoice.weights.artificialTimePressure },
    { regex: /\b(account suspended|permanently frozen|service disconnected|cancel your subscription call)\b/i, label: 'Service Suspension Threat', weight: RISK_CONFIG.invoice.weights.serviceSuspension }
  ];

  let urgencyDetected = false;
  for (const pattern of coerciveThreatPatterns) {
    const found = cleanText.match(pattern.regex);
    if (found) {
      urgencyDetected = true;
      observedEvidence.push(`Urgency indicator detected: "${found[0]}".`);
      warnings.push({
        id: 'COERCIVE_URGENCY',
        category: 'Urgency & Coercion',
        severity: pattern.weight >= 30 ? 'critical' : 'high',
        title: pattern.label,
        detail: `Coercive phrase detected: "${found[0]}". Scammers routinely fabricate urgency to prevent victims from verifying billing legitimacy.`,
        matchedText: found[0]
      });
      riskScore += pattern.weight;
      inferredRisk.push(`Threats of law enforcement or rapid account suspension are classic coercion techniques designed to induce panic.`);
    }
  }

  // False positive safeguard: legitimate commercial terms
  const legitimateTerms = [
    { regex: /\b(payment due upon receipt|net 30|net 15|terms: net|due date:? \d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/i, label: 'Standard Commercial Terms' }
  ];
  for (const term of legitimateTerms) {
    const found = cleanText.match(term.regex);
    if (found && !urgencyDetected) {
      observedEvidence.push(`Legitimate commercial term matched: "${found[0]}".`);
      warnings.push({
        id: 'STANDARD_COMMERCIAL_TERMS',
        category: 'Commercial Terms',
        severity: 'info',
        title: term.label,
        detail: `Standard commercial payment term detected: "${found[0]}". This is typical in legitimate B2B vendor invoicing.`,
        matchedText: found[0]
      });
    }
  }

  // 4. Impersonation of Known Tech & Billing Brands
  const impersonationTargets = [
    { name: 'Geek Squad / Best Buy', regex: /\b(geek squad|best buy|bestbuy)\b/i, weight: RISK_CONFIG.invoice.weights.brandImpersonation },
    { name: 'PayPal Billing Impersonation', regex: /\b(paypal billing|paypal support team|paypal customer care|paypal security department)\b/i, weight: 20 },
    { name: 'Antivirus Renewal (Norton/McAfee/LifeLock)', regex: /\b(norton|lifelock|mcafee|total av)\b/i, weight: RISK_CONFIG.invoice.weights.brandImpersonation },
    { name: 'Tech Support (Microsoft/Apple Care)', regex: /\b(microsoft defender|apple support team|apple care bill)\b/i, weight: 20 }
  ];

  let impersonationDetected = false;
  for (const target of impersonationTargets) {
    if (target.regex.test(cleanText)) {
      const hasCallInstruction = /(call|helpdesk|toll free|reach us at|contact our support)/i.test(cleanText);
      const isScamContext = hasCallInstruction || /(auto[- ]?renew|renewal fee|\$499|\$399|\$299)/i.test(cleanText);

      if (isScamContext) {
        impersonationDetected = true;
        observedEvidence.push(`Matched brand impersonation target: "${target.name}".`);
        warnings.push({
          id: 'BRAND_IMPERSONATION',
          category: 'Impersonation',
          severity: 'high',
          title: `Suspected Impersonation: ${target.name}`,
          detail: `Invoice references ${target.name} in conjunction with renewal/cancellation instructions. Scammers impersonate recognized brands to induce panic phone calls.`,
          matchedText: target.name
        });
        riskScore += target.weight;
        inferredRisk.push(`Spoofing recognized tech-support brands is an established hallmark of fake auto-renewal scams.`);
      }
    }
  }

  // 5. Unusual Payment Destination Analysis
  const unusualPaymentPatterns = [
    { regex: /\b(bitcoin|btc|ethereum|eth|usdt|crypto wallet|blockchain|binance|coinbase)\b/i, method: 'Cryptocurrency Transfer', weight: RISK_CONFIG.invoice.weights.cryptocurrencyTransfer, notes: 'Legitimate corporate invoices almost never mandate settlement via direct cryptocurrency transfers.' },
    { regex: /\b(gift cards?|target gift cards?|apple (?:gift )?cards?|google play cards?|steam cards?)\b/i, method: 'Gift Card Payment', weight: RISK_CONFIG.invoice.weights.giftCardPayment, notes: 'Demanding settlement via retail gift cards is an unmistakable signature of consumer fraud.' },
    { regex: /\b(wire transfer to (?:personal|agent)|western union|moneygram)\b/i, method: 'Non-Standard Wire / Remittance', weight: RISK_CONFIG.invoice.weights.nonStandardWire, notes: 'Unregistered or personal wire transfer instructions bypass merchant dispute and buyer protection frameworks.' }
  ];

  for (const dest of unusualPaymentPatterns) {
    const found = cleanText.match(dest.regex);
    if (found) {
      paymentDestinations.push({
        method: dest.method,
        destination: found[0],
        isUnusual: true,
        notes: dest.notes
      });
      observedEvidence.push(`Unusual payment destination matched: ${dest.method} (${found[0]}).`);
      warnings.push({
        id: 'UNUSUAL_PAYMENT_METHOD',
        category: 'Unusual Payment Instruction',
        severity: 'critical',
        title: `Unusual Payment Method: ${dest.method}`,
        detail: dest.notes,
        matchedText: found[0]
      });
      riskScore += dest.weight;
      inferredRisk.push(`Requesting non-reversable payment (${dest.method}) is designed to eliminate fraud recovery avenues.`);
    }
  }

  // Authentic invoice indicators
  const authenticIndicators = [
    /\b(ein|tax id|vat number|vat id|registered in|company registration)\b/i,
    /\b(itemized description|unit price|po number|purchase order #|subtotal|sales tax)\b/i
  ];
  let authenticScoreReduction = 0;
  for (const indicator of authenticIndicators) {
    if (indicator.test(cleanText) && !impersonationDetected && !urgencyDetected && !adversarialAttemptDetected) {
      authenticScoreReduction += 10;
    }
  }
  riskScore = Math.max(5, riskScore - authenticScoreReduction);

  const finalScore = Math.min(Math.max(riskScore, 0), 100);

  const hasCriticalScamSignature = paymentDestinations.some(p => p.isUnusual) ||
    (impersonationDetected && unverifiedContacts.length > 0) ||
    (urgencyDetected && unverifiedContacts.length > 0) ||
    adversarialAttemptDetected;

  let category: InvoiceScamResult['category'];
  let explanation: string;

  if (finalScore >= RISK_CONFIG.invoice.scoring.highRisk || hasCriticalScamSignature) {
    category = 'High-Risk Scam';
    explanation = 'High concentration of predatory scam indicators detected: brand impersonation, coercive threats, unverified contact numbers, or non-standard payment methods.';
  } else if (finalScore >= RISK_CONFIG.invoice.scoring.suspicious) {
    category = 'Suspicious';
    explanation = 'Suspicious indicators detected (e.g., unverified phone numbers or artificial urgency). Thorough secondary verification is advised before taking action.';
  } else if (warnings.some(w => w.category === 'Unverified Phone Number')) {
    category = 'Needs Review';
    explanation = 'Invoice contains contact numbers that cannot be verified via automated heuristics. Verify sender credentials through official verified channels.';
  } else {
    category = 'Legitimate / Low Risk';
    explanation = 'No significant fraudulent or coercive indicators detected. The text reflects standard commercial invoicing structure.';
  }

  const safeNextSteps: string[] = [
    'Never call telephone numbers printed directly on unsolicited invoices or payment notifications.',
    'Log in directly to your official PayPal account at https://www.paypal.com to verify whether any invoice or transaction exists in your official Activity log.',
    'If you suspect email spoofing, forward the full original email with headers to spoof@paypal.com.',
    'Never install remote desktop software (e.g. AnyDesk, TeamViewer) at the request of an invoice caller.'
  ];

  if (category === 'High-Risk Scam') {
    safeNextSteps.unshift('DO NOT PAY THIS INVOICE. Do not click links or call numbers provided in this invoice.');
  }

  const evidenceSufficiency: EvidenceSufficiencyLevel = cleanText.length > 150 ? 'High' : 'Moderate';
  const confidenceScore = category === 'High-Risk Scam' || category === 'Legitimate / Low Risk' ? 95 : 75;

  const aiSynthesis = generateDeterministicInvoiceSynthesis(
    category,
    finalScore,
    warnings,
    urgencyDetected,
    impersonationDetected,
    adversarialAttemptDetected
  );

  return {
    riskScore: finalScore,
    category,
    explanation,
    warnings,
    unverifiedContacts,
    paymentDestinations,
    urgencyDetected,
    impersonationDetected,
    safeNextSteps,
    confidenceScore,
    disclaimer: 'Heuristic scam assessment. Text analysis provides algorithmic risk screening and does not constitute definitive proof of invoice validity or fraud.',
    timestamp: new Date().toISOString(),
    evidenceSufficiency,
    observedEvidence,
    inferredRisk,
    missingInformation,
    adversarialAttemptDetected,
    aiSynthesis
  };
}

// ==========================================
// PAYPAL SANDBOX EVENT INTELLIGENCE
// ==========================================

export function evaluateSandboxTransactionRisk(input: EvaluateSandboxTransactionInput): SandboxTransactionRiskEvaluation {
  const {
    orderId,
    amount,
    currency,
    buyerEmail,
    status,
    sellerHistory = { previousSales: 1000, disputes: 0, refunds: 0 }
  } = input;

  const signals: RiskSignal[] = [];
  const recommendations: string[] = [];
  const observedEvidence: string[] = [];
  const inferredRisk: string[] = [];
  const missingInformation: string[] = [];
  let riskScore = 15;

  observedEvidence.push(`PayPal Sandbox Order ID: ${orderId} (Status: ${status}).`);
  observedEvidence.push(`Transaction amount: $${amount.toFixed(2)} ${currency}.`);
  if (buyerEmail) {
    observedEvidence.push(`Buyer Sandbox account: ${buyerEmail}.`);
  }

  // Evaluate amount size anomaly
  if (amount > 2500) {
    signals.push({
      id: 'HIGH_VALUE_ORDER',
      name: 'High-Value Ticket Size',
      severity: 'medium',
      description: `Transaction amount ($${amount.toFixed(2)}) requires higher fulfillment evidence.`,
      weight: 20
    });
    riskScore += 20;
    inferredRisk.push('High-value orders carry increased chargeback liability; require carrier tracking confirmation.');
    recommendations.push('Require signature confirmation upon delivery for orders exceeding $750.');
  }

  if (sellerHistory.disputes > 2) {
    signals.push({
      id: 'MERCHANT_DISPUTE_HISTORY',
      name: 'Merchant History Has Disputes',
      severity: 'high',
      description: `Associated merchant profile has ${sellerHistory.disputes} recorded dispute(s).`,
      weight: 25
    });
    riskScore += 25;
    inferredRisk.push('Prior dispute activity increases transaction risk.');
  }

  missingInformation.push('Buyer account creation date and device IP telemetry unavailable via standard client SDK.');
  missingInformation.push('Shipping address validity check pending carrier verification.');

  const finalScore = Math.min(riskScore, 100);
  const category: SellerProtectionResult['category'] = finalScore >= 60 ? 'High Risk' : finalScore >= 35 ? 'Medium Risk' : 'Low Risk';

  recommendations.push('Upload carrier tracking details promptly via PayPal Sandbox Merchant Portal.');

  return {
    orderId,
    riskScore: finalScore,
    category,
    evidenceBreakdown: {
      observedEvidence,
      inferredRisk,
      missingInformation,
      evidenceSufficiency: 'High',
      confidenceScore: 90
    },
    signals,
    recommendations,
    explanation: `Evaluated PayPal Sandbox transaction ${orderId} ($${amount.toFixed(2)} ${currency}). Risk score: ${finalScore}/100 (${category}).`,
    isSandboxVerified: true,
    timestamp: new Date().toISOString()
  };
}
