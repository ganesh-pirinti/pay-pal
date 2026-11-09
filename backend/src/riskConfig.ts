/**
 * Configurable Risk Scoring Thresholds and Intelligence Rules
 * Documented FinTech Compliance & Dispute Engineering Benchmarks
 */

export const RISK_CONFIG = {
  seller: {
    // Volume velocity threshold: growth >= 50% triggers growth assessment
    salesSpikePercentage: 50.0,

    // Dispute rate thresholds (Disputes / Transactions * 100)
    disputeRate: {
      healthy: 1.0,     // <= 1.0% is PayPal standard commercial threshold
      elevated: 3.0,    // 3.0% warrants monitoring
      critical: 7.0     // >= 7.0% represents urgent anomaly
    },

    // Refund rate thresholds (Refunds / Transactions * 100)
    refundRate: {
      healthy: 3.0,     // Standard retail returns benchmark
      elevated: 8.0,    // Suggests inventory or quality issues
      critical: 15.0    // Severe dissatisfaction or pre-dispute surge
    },

    // Ticket anomaly: transaction > averageOrderValue * outlierMultiplier
    ticketOutlierMultiplier: 6.0,

    // Concentration of unverified buyer accounts
    unverifiedBuyerThreshold: 0.35,

    // Evidence sufficiency criteria
    sufficiency: {
      minTransactionsForHighConfidence: 10,
      minTransactionsForModerateConfidence: 3,
      newMerchantTenureDays: 30
    }
  },

  invoice: {
    // Scoring thresholds for classification
    scoring: {
      highRisk: 60,
      suspicious: 40
    },

    // Signal weights for linguistic indicators
    weights: {
      coerciveLegalThreat: 35,
      artificialTimePressure: 20,
      serviceSuspension: 20,
      brandImpersonation: 25,
      unverifiedPhoneContact: 15,
      cryptocurrencyTransfer: 60,
      giftCardPayment: 65,
      nonStandardWire: 50,
      promptInjectionAttempt: 45
    },

    limits: {
      minChars: 5,
      maxChars: 50000
    }
  },

  ai: {
    timeoutMs: 5000,
    model: 'gemini-1.5-flash',
    fallbackProvider: 'deterministic-fallback'
  }
} as const;
