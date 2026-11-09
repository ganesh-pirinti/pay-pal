import type { DashboardSummary } from '../../shared/src/types.js';

/**
 * Mock Dashboard Intelligence Provider
 * Strictly labels all aggregated statistics as simulated hackathon benchmark data.
 */
export function getDashboardSummary(): DashboardSummary {
  return {
    totalTransactionsAnalyzed: 14820,
    highRiskCases: 38,
    sellerAlerts: 14,
    invoiceScans: 412,
    riskDistribution: {
      low: 82,
      medium: 12,
      high: 4,
      insufficientEvidence: 2
    },
    recentActivity: [
      {
        id: 'EVT-9041',
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        type: 'seller-protection',
        entityId: 'MERCHANT_TECH_CORP_04',
        riskCategory: 'Low Risk',
        riskScore: 18,
        summary: 'Q4 Black Friday sales surge (+240%) verified with healthy 0.12% dispute rate.'
      },
      {
        id: 'EVT-9042',
        timestamp: new Date(Date.now() - 1000 * 60 * 27).toISOString(),
        type: 'invoice-scam',
        entityId: 'INV-GEEK-88219',
        riskCategory: 'High-Risk Scam',
        riskScore: 88,
        summary: 'Geek Squad impersonation detected with fake toll-free callback and 24-hour threat.'
      },
      {
        id: 'EVT-9043',
        timestamp: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
        type: 'seller-protection',
        entityId: 'MERCHANT_NEW_LUXURY_99',
        riskCategory: 'Insufficient Evidence',
        riskScore: 24,
        summary: 'First-month account baseline monitoring initialized. Zero historical dispute record.'
      },
      {
        id: 'EVT-9044',
        timestamp: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
        type: 'seller-protection',
        entityId: 'MERCHANT_GAMING_KEYS_12',
        riskCategory: 'High Risk',
        riskScore: 82,
        summary: 'Sales surge coupled with 8.4% dispute velocity and high unverified buyer ratio.'
      },
      {
        id: 'EVT-9045',
        timestamp: new Date(Date.now() - 1000 * 60 * 195).toISOString(),
        type: 'invoice-scam',
        entityId: 'INV-ACME-CORP-401',
        riskCategory: 'Legitimate / Low Risk',
        riskScore: 12,
        summary: 'Verified B2B consulting invoice with standard Net 30 terms and registered Tax ID.'
      }
    ],
    isSimulatedData: true,
    _note: 'SIMULATED DATA DEMO: All dashboard transactions and audit logs are synthetic benchmark records for PayPal AI Hackathon 2026.'
  };
}
