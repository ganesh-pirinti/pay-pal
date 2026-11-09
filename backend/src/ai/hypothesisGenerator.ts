import type { AlternativeHypothesis } from '../../../shared/src/types.js';

/**
 * PayPal TrustShield AI — Alternative Hypothesis Generation Engine
 * 
 * Generates three competing hypotheses (Primary Threat, Benign Alternative, Worst-Case Escalation)
 * to avoid tunnel vision in fraud underwriting and ensure fair merchant evaluation.
 */
export class HypothesisGenerator {
  public static generateHypotheses(
    riskScore: number,
    observedEvidence: string[],
    merchantId?: string,
    isInvoiceScam: boolean = false
  ): AlternativeHypothesis[] {
    const hypotheses: AlternativeHypothesis[] = [];

    if (isInvoiceScam) {
      if (riskScore >= 70) {
        hypotheses.push({
          id: 'HYP-1',
          title: 'Organized Impersonation & Refund Scam Campaign',
          type: 'Primary Threat',
          probability: Math.min(88, riskScore),
          rationale: 'High frequency of social engineering triggers, unverified toll-free call centers, and urgency demands matching recognized consumer scam typologies.',
          supportingEvidence: observedEvidence.filter(e => e.toLowerCase().includes('phone') || e.toLowerCase().includes('impersonat') || e.toLowerCase().includes('urgency')),
          contradictingEvidence: ['No confirmed report from recipient financial institution yet.']
        });

        hypotheses.push({
          id: 'HYP-2',
          title: 'Third-Party Vendor Error or Poorly Formatted Authentic Notice',
          type: 'Benign Alternative',
          probability: Math.max(8, 100 - riskScore - 5),
          rationale: 'Legitimate merchant or contractor utilizing outsourced billing templates with aggressive reminder phrasing.',
          supportingEvidence: ['Invoice formatting resembles standard commercial layout.'],
          contradictingEvidence: observedEvidence.filter(e => e.toLowerCase().includes('phone') || e.toLowerCase().includes('crypto') || e.toLowerCase().includes('gift card'))
        });

        hypotheses.push({
          id: 'HYP-3',
          title: 'Targeted Prompt Injection / Secondary Payload Infiltration',
          type: 'Worst-Case Escalation',
          probability: Math.max(4, 100 - (hypotheses[0].probability + hypotheses[1].probability)),
          rationale: 'Attacker leverages social engineering invoice payload to bypass automated text filters or compromise downstream underwriter tooling.',
          supportingEvidence: observedEvidence.filter(e => e.toLowerCase().includes('adversarial') || e.toLowerCase().includes('instruction') || e.toLowerCase().includes('injection')),
          contradictingEvidence: ['Payload did not execute code in quarantined sandbox.']
        });
      } else {
        hypotheses.push({
          id: 'HYP-1',
          title: 'Standard Commercial Invoice with Urgent Terms',
          type: 'Benign Alternative',
          probability: 78,
          rationale: 'Payment terms and contact channels conform to standard commercial billing protocols without detected impersonation.',
          supportingEvidence: observedEvidence,
          contradictingEvidence: []
        });

        hypotheses.push({
          id: 'HYP-2',
          title: 'Low-Sophistication Phishing Probe',
          type: 'Primary Threat',
          probability: 18,
          rationale: 'Lure test designed to verify recipient email deliverability.',
          supportingEvidence: ['Urgent phrasing detected.'],
          contradictingEvidence: ['No fraudulent callback number or cryptocurrency address detected.']
        });

        hypotheses.push({
          id: 'HYP-3',
          title: 'Vendor Email Compromise (VEC)',
          type: 'Worst-Case Escalation',
          probability: 4,
          rationale: 'Legitimate vendor mailbox compromised to seed future fraudulent banking change requests.',
          supportingEvidence: [],
          contradictingEvidence: ['Banking details match verified account baseline.']
        });
      }
    } else {
      // Merchant / Transaction scenario
      if (riskScore >= 70) {
        hypotheses.push({
          id: 'HYP-1',
          title: 'Compromised Merchant Account / Coordinated Cash-Out Run',
          type: 'Primary Threat',
          probability: Math.min(85, riskScore),
          rationale: 'Abrupt volume spike combined with elevated dispute/refund rates and high unverified payer ratio indicating potential ATO or bust-out scheme.',
          supportingEvidence: observedEvidence.filter(e => e.toLowerCase().includes('dispute') || e.toLowerCase().includes('surge') || e.toLowerCase().includes('unverified')),
          contradictingEvidence: ['Merchant has prior settlement history on file.']
        });

        hypotheses.push({
          id: 'HYP-2',
          title: 'Viral Flash Promotion with Fulfillment Bottlenecks',
          type: 'Benign Alternative',
          probability: Math.max(10, 100 - riskScore - 5),
          rationale: 'Merchant experienced sudden viral marketing success (e.g. TikTok, Reddit), causing inventory stockouts and customer service lag rather than malicious intent.',
          supportingEvidence: observedEvidence.filter(e => e.toLowerCase().includes('growth') || e.toLowerCase().includes('sales volume')),
          contradictingEvidence: observedEvidence.filter(e => e.toLowerCase().includes('dispute') && (e.toLowerCase().includes('20%') || e.toLowerCase().includes('30%')))
        });

        hypotheses.push({
          id: 'HYP-3',
          title: 'Systemic Carding Attack via Merchant Checkout',
          type: 'Worst-Case Escalation',
          probability: Math.max(5, 100 - (hypotheses[0].probability + hypotheses[1].probability)),
          rationale: 'Bot syndicate utilizing merchant payment gateway as a testing ground for stolen payment instruments, exposing PayPal to Visa/Mastercard network fines.',
          supportingEvidence: observedEvidence.filter(e => e.toLowerCase().includes('unverified') || e.toLowerCase().includes('velocity')),
          contradictingEvidence: ['No velocity trigger tripping 100 txn/min limit.']
        });
      } else if (riskScore < 40) {
        hypotheses.push({
          id: 'HYP-1',
          title: 'Legitimate Business Expansion or Seasonal Holiday Surge',
          type: 'Benign Alternative',
          probability: 84,
          rationale: 'Sales volume growth accompanied by healthy 0% dispute rates, zero refunds, and verified buyer accounts.',
          supportingEvidence: observedEvidence,
          contradictingEvidence: []
        });

        hypotheses.push({
          id: 'HYP-2',
          title: 'Early-Stage Sleeper Account Warming',
          type: 'Primary Threat',
          probability: 12,
          rationale: 'Account building processing history prior to initiating high-ticket fraudulent sales.',
          supportingEvidence: ['Recent sales acceleration.'],
          contradictingEvidence: ['Clean dispute record, consistent average order values.']
        });

        hypotheses.push({
          id: 'HYP-3',
          title: 'First-Party Friendly Fraud Wave',
          type: 'Worst-Case Escalation',
          probability: 4,
          rationale: 'Delayed consumer chargebacks following holiday delivery deadlines.',
          supportingEvidence: ['High proportion of sales in 30-day window.'],
          contradictingEvidence: ['Active tracking numbers registered with couriers.']
        });
      } else {
        // Medium Risk / Insufficient History
        hypotheses.push({
          id: 'HYP-1',
          title: 'New Merchant with Inconclusive Processing History',
          type: 'Primary Threat',
          probability: 52,
          rationale: 'Account age (<30 days) and sparse transaction volume prevent statistically sound risk differentiation.',
          supportingEvidence: observedEvidence.filter(e => e.toLowerCase().includes('history') || e.toLowerCase().includes('days active')),
          contradictingEvidence: ['No fraudulent activity or disputes registered.']
        });

        hypotheses.push({
          id: 'HYP-2',
          title: 'Authentic Start-up Merchant Growth Phase',
          type: 'Benign Alternative',
          probability: 38,
          rationale: 'Legitimate new business entity initiating valid online commerce operations.',
          supportingEvidence: ['Standard order value distribution.'],
          contradictingEvidence: ['Lack of historical processing baseline.']
        });

        hypotheses.push({
          id: 'HYP-3',
          title: 'Synthetic Identity Creation',
          type: 'Worst-Case Escalation',
          probability: 10,
          rationale: 'Identity crafted using blended real and fabricated PII designed to pass initial automated checks.',
          supportingEvidence: ['Short account tenure.'],
          contradictingEvidence: ['KYC verification passed.']
        });
      }
    }

    return hypotheses;
  }
}
