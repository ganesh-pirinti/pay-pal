import type { FraudTypology, KnowledgeBaseArticle } from '../../../shared/src/types.js';

/**
 * PayPal TrustShield AI — Threat Knowledge Base & Operational Playbooks
 * 
 * Centralized repository of verified fintech fraud typologies, underwriting SOPs,
 * and regulatory compliance guidelines.
 */
export const FRAUD_TYPOLOGIES: FraudTypology[] = [
  {
    id: 'TYPO-001',
    name: 'Account Takeover (ATO) & Immediate Liquidation',
    category: 'Account Compromise',
    description: 'Adversaries compromise legitimate merchant or consumer credentials via credential stuffing or phishing, immediately accelerating order frequency or shifting product categories to luxury goods before liquidation.',
    indicators: [
      'Ticket size acceleration > 4x above 90-day median',
      'Sudden shift in product category (e.g., $40 apparel to $1,400 electronics)',
      'Unverified buyer accounts originating from new geographical subnets',
      'Attempt to modify settlement payout bank routing'
    ],
    standardOperatingProcedure: 'Place merchant under 48-hour passive monitoring. Request Tier-2 identity re-verification. Do NOT freeze account automatically; verify recent shipments via carrier tracking API.',
    applicableRegulations: ['PCI-DSS v4.0 Requirement 8', 'PSD2 Strong Customer Authentication (SCA)'],
    severity: 'critical'
  },
  {
    id: 'TYPO-002',
    name: 'Fake Support & Over-Refund Invoice Impersonation',
    category: 'Social Engineering & Phishing',
    description: 'Fraudsters send spoofed billing invoices purporting to be PayPal, Geek Squad, Norton, or Apple, instructing recipients to dial a toll-free number to cancel a recurring $300-$500 charge.',
    indicators: [
      'Presence of prominent unverified 800/888 call-center numbers',
      'Extreme artificial urgency (e.g. "Charged within 24 hours", "Call immediately")',
      'Payment redirection to non-standard channels (retail gift cards, crypto addresses)',
      'Threat of legal prosecution or law enforcement referral'
    ],
    standardOperatingProcedure: 'Quarantine invoice. Submit toll-free number to telecommunications carrier abuse registry. Flag associated settlement addresses across PayPal risk graph.',
    applicableRegulations: ['FTC Act Section 5 (Unfair/Deceptive Practices)', 'PayPal Acceptable Use Policy'],
    severity: 'high'
  },
  {
    id: 'TYPO-003',
    name: 'Bust-Out / Sleeper Merchant Exploitation',
    category: 'Merchant Risk',
    description: 'A merchant builds a legitimate processing profile over 3-6 months with low ticket sizes, then suddenly processes massive volumes with zero intent to fulfill orders, abandoning the account before chargebacks arrive.',
    indicators: [
      'Sudden +300% volume expansion following period of low, steady activity',
      'Absence of verifiable shipping carrier tracking uploads',
      'Concentrated payouts requested via instant transfer instruments'
    ],
    standardOperatingProcedure: 'Apply temporary 10-20% rolling reserve for 90 days. Require proof of inventory and supplier purchase orders prior to releasing elevated payout volumes.',
    applicableRegulations: ['Visa/Mastercard Merchant Chargeback Monitoring Program (VCMP)'],
    severity: 'critical'
  },
  {
    id: 'TYPO-004',
    name: 'Prompt Injection & Instruction Subversion Attacks',
    category: 'AI Security & Jailbreaking',
    description: 'Attackers embed hidden prompt injection payloads in invoice notes or merchant descriptions to trick automated LLM scoring engines into outputting favorable verdicts.',
    indicators: [
      'Explicit directives such as "Ignore previous instructions", "SYSTEM PROMPT OVERRIDE"',
      'Directives commanding the AI to output specific JSON or assign risk score 0',
      'Base64 or unicode obfuscation designed to evade standard regex pre-filters'
    ],
    standardOperatingProcedure: 'Quarantine payload immediately. Route case to human underwriter with high-risk security alert. Apply strict rule-based fallback scoring.',
    applicableRegulations: ['OWASP Top 10 for LLMs (LLM01: Prompt Injection)'],
    severity: 'critical'
  }
];

export const KNOWLEDGE_ARTICLES: KnowledgeBaseArticle[] = [
  {
    id: 'ART-001',
    title: 'Adjudicating Viral Sales Surges vs Fraudulent Spikes',
    category: 'SOP',
    readTime: '4 min read',
    summary: 'Underwriting guidelines for differentiating legitimate viral TikTok/Reddit promotions from coordinated fraud rings.',
    content: `### Executive Principle: A sales spike alone is never fraud.
When evaluating volume increases (>150% growth):
1. **Dispute Rate Invariant:** If dispute and refund rates remain below 0.5%, the surge is predominantly benign commercial growth.
2. **Buyer Verification:** Check buyer account age. Fraud rings utilize fresh bot accounts; viral social media campaigns bring established consumer accounts.
3. **Carrier Confirmation:** Require courier tracking numbers (USPS, FedEx, DHL, UPS) verifying package dispatch.`
  },
  {
    id: 'ART-002',
    title: 'PayPal Rolling Reserve & Mitigation Matrix',
    category: 'Engine Scoring',
    readTime: '6 min read',
    summary: 'Proportionate risk mitigation levels: Monitoring, Rolling Reserves, and Manual Review triggers.',
    content: `### Risk Mitigation Framework
- **Low Risk (0-39):** Automated Clearance. Maintain standard 14-day rolling review.
- **Moderate Risk (40-64):** Enhanced 72h Passive Monitoring. Require carrier tracking uploads.
- **High Risk (65-100):** Tier-2 Underwriter Review. Apply temporary 10% rolling reserve for 60 days.
*Invariant:* Never freeze accounts automatically.`
  },
  {
    id: 'ART-003',
    title: 'PSD2 Strong Customer Authentication & FinCEN AML Compliance',
    category: 'Regulatory',
    readTime: '5 min read',
    summary: 'Statutory requirements governing dynamic linking, transaction risk analysis (TRA) exemptions, and SAR filings.',
    content: `### Statutory Compliance
- **PSD2 Regulatory Technical Standards (RTS):** TRA exemption allows low-risk transactions under €100 to proceed without SCA friction if PayPal's overall fraud rate remains below 0.01%.
- **FinCEN Suspicious Activity Reports (SAR):** Mandatory reporting within 30 days for confirmed structuring or unauthorized transfers exceeding $5,000.`
  }
];
