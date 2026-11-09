import type {
  RankedEvidenceItem,
  EvidenceCategory,
  MissingEvidenceSignal
} from '../../../shared/src/types.js';

/**
 * PayPal TrustShield AI — Evidence Ranking & Classification Engine
 * 
 * Classifies raw observations into structured evidential categories and computes
 * Weight of Evidence (WoE) log-odds impacts to prioritize underwriter focus.
 */
export class EvidenceRanker {
  /**
   * Evaluates raw evidence strings and returns ranked evidence items.
   */
  public static rankEvidence(
    rawEvidence: string[],
    rawInferredRisk: string[] = [],
    missingInfo: string[] = []
  ): { rankedItems: RankedEvidenceItem[]; missingSignals: MissingEvidenceSignal[] } {
    const items: RankedEvidenceItem[] = [];

    // Process observed evidence
    rawEvidence.forEach((text, index) => {
      const lower = text.toLowerCase();
      let category: EvidenceCategory = 'Behavioral Indicator';
      let woe = 1.5;
      let direction: 'Inculpatory' | 'Exculpatory' = 'Inculpatory';
      let confidence = 85;

      if (lower.includes('dispute') || lower.includes('refund') || lower.includes('transaction count') || lower.includes('sales volume')) {
        category = 'Hard Telemetry';
        if (lower.includes('0 dispute') || lower.includes('0% refund') || lower.includes('zero dispute') || lower.includes('stable')) {
          woe = -2.8;
          direction = 'Exculpatory';
          confidence = 95;
        } else if (lower.includes('dispute rate') && (lower.includes('20%') || lower.includes('30%') || lower.includes('high'))) {
          woe = 4.2;
          direction = 'Inculpatory';
          confidence = 92;
        } else {
          woe = 2.1;
          direction = 'Inculpatory';
          confidence = 88;
        }
      } else if (lower.includes('phone') || lower.includes('call') || lower.includes('contact') || lower.includes('800-') || lower.includes('888-')) {
        category = 'Unverified Claim';
        woe = 3.6;
        direction = 'Inculpatory';
        confidence = 80;
      } else if (lower.includes('invoice') || lower.includes('payment method') || lower.includes('crypto') || lower.includes('bitcoin') || lower.includes('btc') || lower.includes('gift card') || lower.includes('wire') || lower.includes('settlement')) {
        category = 'Documentary Evidence';
        woe = lower.includes('crypto') || lower.includes('bitcoin') || lower.includes('btc') || lower.includes('gift card') ? 4.8 : 2.5;
        direction = 'Inculpatory';
        confidence = 90;
      } else if (lower.includes('surge') || lower.includes('spike') || lower.includes('growth') || lower.includes('velocity')) {
        category = 'Behavioral Indicator';
        // Sales spike alone without disputes is only mildly inculpatory or exculpatory if verified
        woe = lower.includes('growth') && !lower.includes('dispute') ? 0.8 : 2.9;
        direction = 'Inculpatory';
        confidence = 85;
      }

      items.push({
        id: `EVID-${index + 1}`,
        title: text.length > 60 ? text.substring(0, 57) + '...' : text,
        category,
        weightOfEvidence: woe,
        direction,
        confidence,
        rawDetail: text
      });
    });

    // Process inferred risks
    rawInferredRisk.forEach((text, index) => {
      items.push({
        id: `INFER-${index + 1}`,
        title: text.length > 60 ? text.substring(0, 57) + '...' : text,
        category: 'Behavioral Indicator',
        weightOfEvidence: 2.2,
        direction: 'Inculpatory',
        confidence: 70,
        rawDetail: text
      });
    });

    // Sort by absolute Weight of Evidence descending (most impactful first)
    items.sort((a, b) => Math.abs(b.weightOfEvidence) - Math.abs(a.weightOfEvidence));

    // Construct structured missing evidence signals
    const missingSignals: MissingEvidenceSignal[] = missingInfo.map((text, idx) => {
      const lower = text.toLowerCase();
      let missingImpact: 'High' | 'Medium' | 'Low' = 'Medium';
      let uncertaintyContributionPercentage = 15;
      let suggestedAcquisitionMethod = 'Request documentary proof via PayPal Resolution Center.';

      if (lower.includes('history') || lower.includes('baseline') || lower.includes('new merchant')) {
        missingImpact = 'High';
        uncertaintyContributionPercentage = 35;
        suggestedAcquisitionMethod = 'Query merchant bank statements and historical processing statements.';
      } else if (lower.includes('device') || lower.includes('ip') || lower.includes('session')) {
        missingImpact = 'High';
        uncertaintyContributionPercentage = 25;
        suggestedAcquisitionMethod = 'Correlate PayPal Security Token service device fingerprint logs.';
      } else if (lower.includes('dispute') || lower.includes('tracking')) {
        missingImpact = 'Medium';
        uncertaintyContributionPercentage = 18;
        suggestedAcquisitionMethod = 'Cross-reference courier tracking API (USPS/FedEx/DHL) for delivery confirmation.';
      }

      return {
        id: `MISS-${idx + 1}`,
        signalName: text,
        missingImpact,
        uncertaintyContributionPercentage,
        suggestedAcquisitionMethod
      };
    });

    return { rankedItems: items, missingSignals };
  }
}
