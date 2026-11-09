import type { ContradictionSignal } from '../../../shared/src/types.js';

/**
 * PayPal TrustShield AI — Contradiction Detection Engine
 * 
 * Automatically analyzes pairs of signals to detect conflicting evidence,
 * enabling underwriters to spot sophisticated masking tactics.
 */
export class ContradictionDetector {
  public static detectContradictions(
    observedEvidence: string[],
    riskScore: number
  ): ContradictionSignal[] {
    const contradictions: ContradictionSignal[] = [];
    const evidenceText = observedEvidence.join(' ').toLowerCase();

    // Contradiction 1: High growth with zero disputes vs unverified payer cluster
    if (evidenceText.includes('growth') && evidenceText.includes('0% dispute') && evidenceText.includes('unverified')) {
      contradictions.push({
        id: 'CONTRA-1',
        description: 'Clean Dispute Baseline vs High Unverified Buyer Ratio',
        signalA: 'Historical dispute rate is at 0.0% (healthy growth indicator)',
        signalB: 'Elevated concentration of unverified buyer accounts (>50%)',
        severity: 'high',
        explanation: 'While the merchant shows clean chargeback metrics, the influx of unverified payer accounts suggests potential exposure to delayed chargebacks or card testing.'
      });
    }

    // Contradiction 2: Official Brand Name vs Unofficial Payment Destination
    if (
      (evidenceText.includes('paypal') || evidenceText.includes('geek squad') || evidenceText.includes('norton') || evidenceText.includes('apple')) &&
      (evidenceText.includes('crypto') || evidenceText.includes('gift card') || evidenceText.includes('western union') || evidenceText.includes('direct wallet'))
    ) {
      contradictions.push({
        id: 'CONTRA-2',
        description: 'Brand Claim vs Alternative Payment Settlement Channel',
        signalA: 'Header claims authorization from an established enterprise brand',
        signalB: 'Payment instructions redirect funds to cryptocurrency or gift cards',
        severity: 'high',
        explanation: 'Enterprise entities never request settlement via gift card codes or irreversible crypto wallets; this is a definitive marker of refund fraud.'
      });
    }

    // Contradiction 3: Volume Spike alone without disputes
    if (evidenceText.includes('spike') || evidenceText.includes('+200%') || evidenceText.includes('+300%')) {
      if (evidenceText.includes('0 dispute') || evidenceText.includes('disputes: 0')) {
        contradictions.push({
          id: 'CONTRA-3',
          description: 'Sales Velocity Anomaly vs Zero Negative Merchant Feedback',
          signalA: 'Sales volume accelerated by more than 200% month-over-month',
          signalB: 'Merchant maintains 0 disputes and 0 refunds across all recent orders',
          severity: 'medium',
          explanation: 'Sudden sales velocity can mimic fraudulent cash-outs, yet perfect customer satisfaction strongly indicates a viral commercial success rather than malicious activity.'
        });
      }
    }

    // Contradiction 4: Urgent Immediate Due Date on Routine Subscription
    if (evidenceText.includes('urgency') && (evidenceText.includes('annual') || evidenceText.includes('subscription') || evidenceText.includes('renewal'))) {
      contradictions.push({
        id: 'CONTRA-4',
        description: 'Routine Subscription Maintenance vs 24-Hour Coercive Threat',
        signalA: 'Document is styled as an annual software renewal or routine billing notice',
        signalB: 'Text imposes an artificial 24-hour deadline under threat of legal action or account suspension',
        severity: 'medium',
        explanation: 'Standard subscription renewals do not threaten law enforcement or instantaneous cancellation without multi-stage grace periods.'
      });
    }

    return contradictions;
  }
}
