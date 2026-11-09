import type {
  ToolName,
  ToolCallRecord,
  SellerProtectionInput,
  SellerProtectionResult,
  InvoiceScamInput,
  InvoiceScamResult,
  PayPalOrderDetails
} from '../../../shared/src/types.js';
import { analyzeSellerProtection, analyzeInvoiceScam } from '../riskEngine.js';
import { getSandboxOrderDetails, getPayPalSandboxStatus } from '../paypalSandbox.js';

export interface ToolExecutionResult<T> {
  data: T;
  record: ToolCallRecord;
}

export interface ITool<TInput, TOutput> {
  name: ToolName;
  description: string;
  run(input: TInput, reason: string): Promise<ToolExecutionResult<TOutput>>;
}

/**
 * 1. Invoice Analyzer Tool
 * Analyzes raw invoice text for urgency, unverified telephone callback numbers,
 * impersonation patterns, and unusual payment routing.
 */
export const invoiceAnalyzerTool: ITool<InvoiceScamInput, InvoiceScamResult> = {
  name: 'Invoice Analyzer',
  description: 'Parses invoice text for urgency, impersonation, unverified contact numbers, and payment routing.',
  async run(input: InvoiceScamInput, reason: string): Promise<ToolExecutionResult<InvoiceScamResult>> {
    const startTime = Date.now();
    const result = analyzeInvoiceScam(input);
    const durationMs = Date.now() - startTime;

    const record: ToolCallRecord = {
      toolName: 'Invoice Analyzer',
      timestamp: new Date().toISOString(),
      reason,
      inputSummary: `Analyzed invoice text (${input.invoiceText.length} chars)`,
      outputSummary: `Risk: ${result.riskScore}/100, Warnings: ${result.warnings.length}, Category: ${result.category}`,
      durationMs
    };

    return { data: result, record };
  }
};

/**
 * 2. Seller Analyzer Tool
 * Computes sales velocity, growth percentages, dispute ratios, refund rates, and ticket size distributions.
 */
export const sellerAnalyzerTool: ITool<SellerProtectionInput, SellerProtectionResult> = {
  name: 'Seller Analyzer',
  description: 'Evaluates seller transaction velocities, dispute rates, refund frequencies, and revenue baselines.',
  async run(input: SellerProtectionInput, reason: string): Promise<ToolExecutionResult<SellerProtectionResult>> {
    const startTime = Date.now();
    const result = analyzeSellerProtection(input);
    const durationMs = Date.now() - startTime;

    const record: ToolCallRecord = {
      toolName: 'Seller Analyzer',
      timestamp: new Date().toISOString(),
      reason,
      inputSummary: `Merchant ${input.merchantId}, ${input.transactions.length} recent txns`,
      outputSummary: `Risk: ${result.riskScore}/100, Category: ${result.category}, Growth: +${result.metrics.salesGrowthPercentage}%`,
      durationMs
    };

    return { data: result, record };
  }
};

/**
 * 3. Risk Engine Tool
 * Unified deterministic risk weighting calculation and confidence sufficiency analysis.
 */
export interface RiskEngineToolInput {
  baseScore: number;
  signalsCount: number;
  evidenceItemsCount: number;
  hasAdversarialThreat: boolean;
}

export interface RiskEngineToolOutput {
  normalizedScore: number;
  confidenceScore: number;
  evidenceSufficiency: 'High' | 'Moderate' | 'Low' | 'Insufficient';
}

export const riskEngineTool: ITool<RiskEngineToolInput, RiskEngineToolOutput> = {
  name: 'Risk Engine',
  description: 'Normalizes compound risk signals into deterministic scores and confidence ratings.',
  async run(input: RiskEngineToolInput, reason: string): Promise<ToolExecutionResult<RiskEngineToolOutput>> {
    const startTime = Date.now();

    let normalizedScore = Math.max(0, Math.min(100, Math.round(input.baseScore)));
    if (input.hasAdversarialThreat) {
      normalizedScore = Math.max(normalizedScore, 85);
    }

    let confidenceScore = 50;
    if (input.evidenceItemsCount >= 5) confidenceScore = 95;
    else if (input.evidenceItemsCount >= 3) confidenceScore = 80;
    else if (input.evidenceItemsCount >= 1) confidenceScore = 65;
    else confidenceScore = 30;

    let evidenceSufficiency: 'High' | 'Moderate' | 'Low' | 'Insufficient' = 'Moderate';
    if (confidenceScore >= 85) evidenceSufficiency = 'High';
    else if (confidenceScore >= 65) evidenceSufficiency = 'Moderate';
    else if (confidenceScore >= 50) evidenceSufficiency = 'Low';
    else evidenceSufficiency = 'Insufficient';

    const durationMs = Date.now() - startTime;

    const record: ToolCallRecord = {
      toolName: 'Risk Engine',
      timestamp: new Date().toISOString(),
      reason,
      inputSummary: `BaseScore: ${input.baseScore}, EvidenceCount: ${input.evidenceItemsCount}`,
      outputSummary: `Normalized: ${normalizedScore}/100, Sufficiency: ${evidenceSufficiency}, Conf: ${confidenceScore}%`,
      durationMs
    };

    return {
      data: { normalizedScore, confidenceScore, evidenceSufficiency },
      record
    };
  }
};

/**
 * 4. PayPal Sandbox Adapter Tool
 * Queries PayPal official sandbox order verification when available; otherwise explicitly reports simulated mode.
 */
export interface PayPalAdapterInput {
  orderId?: string;
}

export interface PayPalAdapterOutput {
  isConfigured: boolean;
  isSandboxVerified: boolean;
  statusMessage: string;
  orderDetails?: PayPalOrderDetails;
}

export const payPalSandboxAdapterTool: ITool<PayPalAdapterInput, PayPalAdapterOutput> = {
  name: 'PayPal Sandbox Adapter',
  description: 'Queries PayPal Orders v2 Sandbox API for authentic verification, strictly isolating unconfigured mode.',
  async run(input: PayPalAdapterInput, reason: string): Promise<ToolExecutionResult<PayPalAdapterOutput>> {
    const startTime = Date.now();
    const status = getPayPalSandboxStatus();

    let orderDetails: PayPalOrderDetails | undefined;
    let isSandboxVerified = false;
    let statusMessage = status.statusMessage;

    if (status.isConfigured && input.orderId) {
      try {
        orderDetails = await getSandboxOrderDetails(input.orderId);
        isSandboxVerified = true;
        statusMessage = `Verified order ${input.orderId} directly with PayPal Orders v2 Sandbox API.`;
      } catch (err: unknown) {
        statusMessage = `PayPal Sandbox query failed: ${err instanceof Error ? err.message : String(err)}`;
      }
    } else {
      statusMessage = status.isConfigured
        ? 'Sandbox configured. No specific Order ID provided for lookup.'
        : 'Sandbox not configured in server environment. Operating in verified simulated mode.';
    }

    const durationMs = Date.now() - startTime;

    const record: ToolCallRecord = {
      toolName: 'PayPal Sandbox Adapter',
      timestamp: new Date().toISOString(),
      reason,
      inputSummary: input.orderId ? `Lookup Order ID: ${input.orderId}` : 'Check Sandbox Connectivity',
      outputSummary: `Configured: ${status.isConfigured}, Verified: ${isSandboxVerified}`,
      durationMs
    };

    return {
      data: {
        isConfigured: status.isConfigured,
        isSandboxVerified,
        statusMessage,
        orderDetails
      },
      record
    };
  }
};

/**
 * 5. Transaction History Tool
 * Queries historical baseline data for merchants: baseline daily volume, average ticket size, and typical dispute ratio.
 */
export interface TransactionHistoryInput {
  merchantId: string;
}

export interface MerchantHistoricalBaseline {
  merchantId: string;
  establishedDays: number;
  baselineDailySales: number;
  baselineAvgTicketSize: number;
  baselineDisputeRatio: number;
  historicalRefundRatio: number;
  isKnownMerchant: boolean;
  notes: string;
}

// Simulated Historical Baselines for known merchants
const MOCK_MERCHANT_BASELINES: Record<string, MerchantHistoricalBaseline> = {
  MERCHANT_GROWTH_001: {
    merchantId: 'MERCHANT_GROWTH_001',
    establishedDays: 180,
    baselineDailySales: 26.67,
    baselineAvgTicketSize: 53.33,
    baselineDisputeRatio: 0.001,
    historicalRefundRatio: 0.005,
    isKnownMerchant: true,
    notes: 'Established outdoor goods vendor with recurring seasonal spring/summer volume expansions.'
  },
  MERCHANT_COMPROMISED_002: {
    merchantId: 'MERCHANT_COMPROMISED_002',
    establishedDays: 60,
    baselineDailySales: 33.33,
    baselineAvgTicketSize: 50.00,
    baselineDisputeRatio: 0.008,
    historicalRefundRatio: 0.01,
    isKnownMerchant: true,
    notes: 'Consumer electronics seller. Historical average ticket was $50; recent tickets of $1,400+ are extreme outliers.'
  },
  MERCHANT_NEWBIE_003: {
    merchantId: 'MERCHANT_NEWBIE_003',
    establishedDays: 12,
    baselineDailySales: 0,
    baselineAvgTicketSize: 97.50,
    baselineDisputeRatio: 0,
    historicalRefundRatio: 0,
    isKnownMerchant: false,
    notes: 'New account with under 14 days of tenure. Insufficient historical data for baseline variance.'
  },
  MERCHANT_DISPUTES_004: {
    merchantId: 'MERCHANT_DISPUTES_004',
    establishedDays: 200,
    baselineDailySales: 16.67,
    baselineAvgTicketSize: 50.00,
    baselineDisputeRatio: 0.005,
    historicalRefundRatio: 0.01,
    isKnownMerchant: true,
    notes: 'Stable digital goods merchant. Recent surge to 20% dispute rate suggests fulfillment breakdown or subscription billing confusion.'
  }
};

export const transactionHistoryTool: ITool<TransactionHistoryInput, MerchantHistoricalBaseline> = {
  name: 'Transaction History',
  description: 'Retrieves historical baseline turnover, average ticket sizes, and historical chargeback ratios.',
  async run(input: TransactionHistoryInput, reason: string): Promise<ToolExecutionResult<MerchantHistoricalBaseline>> {
    const startTime = Date.now();
    const baseline = MOCK_MERCHANT_BASELINES[input.merchantId] || {
      merchantId: input.merchantId,
      establishedDays: 30,
      baselineDailySales: 50.00,
      baselineAvgTicketSize: 75.00,
      baselineDisputeRatio: 0.005,
      historicalRefundRatio: 0.015,
      isKnownMerchant: false,
      notes: 'Unindexed merchant ID; baseline derived from category benchmark medians.'
    };
    const durationMs = Date.now() - startTime;

    const record: ToolCallRecord = {
      toolName: 'Transaction History',
      timestamp: new Date().toISOString(),
      reason,
      inputSummary: `Query merchant ${input.merchantId}`,
      outputSummary: `Known: ${baseline.isKnownMerchant}, Baseline ticket: $${baseline.baselineAvgTicketSize}, Baseline disputes: ${(baseline.baselineDisputeRatio * 100).toFixed(1)}%`,
      durationMs
    };

    return { data: baseline, record };
  }
};

/**
 * 6. Knowledge Base Tool
 * Queries known scam fingerprints, known Account Takeover (ATO) signatures, brand impersonations, and seasonal retail surges.
 */
export interface KnowledgeBaseInput {
  query: string;
  category?: 'scam-signatures' | 'ato-patterns' | 'seasonal-benchmarks' | 'impersonation-brands';
}

export interface KnowledgeBaseOutput {
  matches: Array<{
    category: string;
    pattern: string;
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  totalPatternsSearched: number;
}

const KNOWLEDGE_BASE_ENTRIES = [
  {
    category: 'scam-signatures',
    pattern: 'Geek Squad Auto-Renewal',
    severity: 'critical' as const,
    description: 'Fake $399-$499 tech support subscription invoice coercing user to dial toll-free callback center to cancel.'
  },
  {
    category: 'scam-signatures',
    pattern: 'Cryptocurrency / Gift Card Redirection',
    severity: 'critical' as const,
    description: 'Invoice instructs buyer to settle via BTC wallet, Ethereum, or retail gift cards (Target, Apple, Steam).'
  },
  {
    category: 'scam-signatures',
    pattern: 'Law Enforcement / Arrest Threat',
    severity: 'critical' as const,
    description: 'Threatens sheriff arrest warrant or FBI investigation within 24 hours if payment is not remitted.'
  },
  {
    category: 'ato-patterns',
    pattern: 'Ticket Size Acceleration (>4x)',
    severity: 'high' as const,
    description: 'Account Takeover pattern where compromised account suddenly lists and sells items at 4x-10x previous average ticket size.'
  },
  {
    category: 'ato-patterns',
    pattern: 'Unverified Buyer Cluster (>40%)',
    severity: 'high' as const,
    description: 'Compromised merchant account targeted by organized card testing rings with high concentration of unverified accounts.'
  },
  {
    category: 'seasonal-benchmarks',
    pattern: 'Q4 Holiday / Black Friday Surge',
    severity: 'info' as const,
    description: 'Normal legitimate e-commerce retailers experience +150% to +350% volume growth between November and January without elevated disputes.'
  },
  {
    category: 'seasonal-benchmarks',
    pattern: 'Viral Social Media Campaign',
    severity: 'info' as const,
    description: 'Sudden legitimate influx of new buyers driven by TikTok / Instagram viral product exposure, characterized by low dispute rates.'
  },
  {
    category: 'impersonation-brands',
    pattern: 'PayPal / Geek Squad / Norton / McAfee / Apple Care',
    severity: 'high' as const,
    description: 'Known phishing lure brands frequently used in fraudulent billing notifications.'
  }
];

export const knowledgeBaseTool: ITool<KnowledgeBaseInput, KnowledgeBaseOutput> = {
  name: 'Knowledge Base',
  description: 'Searches verified threat intelligence: known scam signatures, ATO markers, and retail calendar benchmarks.',
  async run(input: KnowledgeBaseInput, reason: string): Promise<ToolExecutionResult<KnowledgeBaseOutput>> {
    const startTime = Date.now();
    const queryLower = input.query.toLowerCase();

    const matches = KNOWLEDGE_BASE_ENTRIES.filter(entry => {
      if (input.category && entry.category !== input.category) return false;
      return (
        entry.pattern.toLowerCase().includes(queryLower) ||
        entry.description.toLowerCase().includes(queryLower) ||
        queryLower.includes(entry.pattern.toLowerCase())
      );
    });

    const durationMs = Date.now() - startTime;

    const record: ToolCallRecord = {
      toolName: 'Knowledge Base',
      timestamp: new Date().toISOString(),
      reason,
      inputSummary: `Query: "${input.query}" (Filter: ${input.category || 'all'})`,
      outputSummary: `Found ${matches.length} matching threat intelligence signatures`,
      durationMs
    };

    return {
      data: {
        matches,
        totalPatternsSearched: KNOWLEDGE_BASE_ENTRIES.length
      },
      record
    };
  }
};

/**
 * 7. Alert Generator Tool
 * Generates and structures standardized fraud warnings, deduplicating repetitive alerts.
 */
export interface AlertGeneratorInput {
  alerts: Array<{
    source: string;
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
  }>;
}

export interface AlertGeneratorOutput {
  deduplicatedCount: number;
  highestSeverity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  formattedAlerts: Array<{
    id: string;
    source: string;
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
  }>;
}

export const alertGeneratorTool: ITool<AlertGeneratorInput, AlertGeneratorOutput> = {
  name: 'Alert Generator',
  description: 'Consolidates, ranks by severity, and deduplicates security alerts across agents.',
  async run(input: AlertGeneratorInput, reason: string): Promise<ToolExecutionResult<AlertGeneratorOutput>> {
    const startTime = Date.now();

    const seenKeys = new Set<string>();
    const formattedAlerts: AlertGeneratorOutput['formattedAlerts'] = [];

    const severityOrder = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
    let highestSeverity: 'info' | 'low' | 'medium' | 'high' | 'critical' = 'info';

    for (const [idx, alert] of input.alerts.entries()) {
      const dedupeKey = `${alert.title.toLowerCase()}:${alert.severity}`;
      if (!seenKeys.has(dedupeKey)) {
        seenKeys.add(dedupeKey);
        formattedAlerts.push({
          id: `ALT-${Date.now()}-${idx + 1}`,
          source: alert.source,
          severity: alert.severity,
          title: alert.title,
          message: alert.message
        });

        if (severityOrder[alert.severity] > severityOrder[highestSeverity]) {
          highestSeverity = alert.severity;
        }
      }
    }

    const durationMs = Date.now() - startTime;

    const record: ToolCallRecord = {
      toolName: 'Alert Generator',
      timestamp: new Date().toISOString(),
      reason,
      inputSummary: `Processed ${input.alerts.length} raw alerts`,
      outputSummary: `Deduplicated to ${formattedAlerts.length} alerts (Max severity: ${highestSeverity})`,
      durationMs
    };

    return {
      data: {
        deduplicatedCount: formattedAlerts.length,
        highestSeverity,
        formattedAlerts
      },
      record
    };
  }
};
