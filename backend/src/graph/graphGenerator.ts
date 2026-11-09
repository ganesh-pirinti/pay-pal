import type {
  NetworkGraphData,
  NetworkGraphNode,
  NetworkGraphEdge,
  RiskEvolutionPoint,
  HeatmapCell,
  TrustScoreHistoryPoint,
  CaseReplayStep,
  CaseAttachment,
  CaseUnderwriterNote
} from '../../../shared/src/types.js';

/**
 * PayPal TrustShield AI — Graph Visualization & Network Generator
 * 
 * Generates interactive network graphs, risk evolution curves, fraud heatmaps,
 * and case replay steps for Trust & Safety investigation workspaces.
 */
export class GraphGenerator {
  /**
   * Generates a context-aware transaction and relationship network graph.
   */
  public static generateCaseNetworkGraph(
    caseId: string,
    merchantId?: string,
    riskScore: number = 25,
    isInvoice: boolean = false
  ): NetworkGraphData {
    const nodes: NetworkGraphNode[] = [];
    const edges: NetworkGraphEdge[] = [];

    if (isInvoice) {
      // Invoice relationship network
      nodes.push({
        id: 'node-inv-main',
        label: `Invoice #${caseId.substring(caseId.length - 6)}`,
        type: 'invoice',
        riskScore
      });

      nodes.push({
        id: 'node-phone-1',
        label: '+1 (888) 492-0199',
        type: 'phone',
        riskScore: riskScore >= 70 ? 92 : 20,
        details: { carrier: 'VoIP Provider (Unregistered)', location: 'Toll-Free Redirect' }
      });

      nodes.push({
        id: 'node-wallet-1',
        label: 'bc1q9...78fd',
        type: 'crypto_wallet',
        riskScore: riskScore >= 70 ? 96 : 15,
        details: { network: 'Bitcoin Mainnet', cluster: 'High-Risk Mixer' }
      });

      nodes.push({
        id: 'node-brand-1',
        label: 'Geek Squad Support',
        type: 'merchant',
        riskScore: 88,
        details: { verifiedStatus: 'Brand Impersonated' }
      });

      edges.push({
        id: 'edge-1',
        source: 'node-inv-main',
        target: 'node-phone-1',
        relationship: 'Lists Callback Contact',
        weight: 3,
        isSuspicious: riskScore >= 70
      });

      edges.push({
        id: 'edge-2',
        source: 'node-inv-main',
        target: 'node-wallet-1',
        relationship: 'Settlement Address',
        weight: 4,
        isSuspicious: riskScore >= 70
      });

      edges.push({
        id: 'edge-3',
        source: 'node-inv-main',
        target: 'node-brand-1',
        relationship: 'Claims Affiliation',
        weight: 2,
        isSuspicious: riskScore >= 70
      });
    } else {
      // Merchant transaction and entity relationship network
      const mId = merchantId || 'MERCHANT_CORE_001';
      nodes.push({
        id: 'node-merch-main',
        label: mId,
        type: 'merchant',
        riskScore
      });

      nodes.push({
        id: 'node-bank-1',
        label: 'JPMorgan Chase (****4891)',
        type: 'bank',
        riskScore: 12,
        details: { routingVerified: true, accountAgeMonths: 24 }
      });

      nodes.push({
        id: 'node-ip-cluster',
        label: 'Subnet 198.51.100.0/24',
        type: 'ip',
        riskScore: riskScore >= 70 ? 84 : 10,
        details: { asn: 'Commercial ISP', proxyDetected: riskScore >= 70 }
      });

      nodes.push({
        id: 'node-buyer-cluster',
        label: 'Buyer Cohort (42 Buyers)',
        type: 'buyer',
        riskScore: riskScore >= 70 ? 76 : 15,
        details: { unverifiedRatio: riskScore >= 70 ? '65%' : '5%' }
      });

      nodes.push({
        id: 'node-card-cluster',
        label: 'Card BIN Cluster (411111)',
        type: 'card',
        riskScore: riskScore >= 70 ? 70 : 8,
        details: { internationalRatio: riskScore >= 70 ? '78%' : '10%' }
      });

      edges.push({
        id: 'edge-1',
        source: 'node-merch-main',
        target: 'node-bank-1',
        relationship: 'Verified Settlement Account',
        weight: 1,
        isSuspicious: false
      });

      edges.push({
        id: 'edge-2',
        source: 'node-merch-main',
        target: 'node-ip-cluster',
        relationship: 'Checkout Ingress IP',
        weight: riskScore >= 70 ? 4 : 2,
        isSuspicious: riskScore >= 70
      });

      edges.push({
        id: 'edge-3',
        source: 'node-merch-main',
        target: 'node-buyer-cluster',
        relationship: 'Recent Sales Volume',
        weight: 5,
        isSuspicious: riskScore >= 70
      });

      edges.push({
        id: 'edge-4',
        source: 'node-buyer-cluster',
        target: 'node-card-cluster',
        relationship: 'Payment Method Token',
        weight: 3,
        isSuspicious: riskScore >= 70
      });
    }

    return { nodes, edges };
  }

  /**
   * Generates a 90-day risk evolution curve.
   */
  public static generateRiskEvolution(currentScore: number): RiskEvolutionPoint[] {
    const dates = ['60 Days Ago', '45 Days Ago', '30 Days Ago', '15 Days Ago', '7 Days Ago', '48 Hours Ago', 'Current'];
    const baseScore = currentScore > 60 ? 20 : Math.max(10, currentScore - 10);
    
    return dates.map((date, idx) => {
      let score = baseScore;
      if (idx === dates.length - 1) {
        score = currentScore;
      } else if (idx === dates.length - 2 && currentScore > 60) {
        score = Math.round(currentScore * 0.75);
      } else if (idx === dates.length - 3 && currentScore > 60) {
        score = Math.round(currentScore * 0.45);
      }
      
      const trustScore = Math.max(15, 100 - score);
      return {
        date,
        riskScore: score,
        trustScore,
        event: idx === dates.length - 1 ? 'Current Assessment' : idx === dates.length - 2 ? 'Surge Initiated' : undefined
      };
    });
  }

  /**
   * Generates simulated geographic/temporal risk density heatmap data.
   */
  public static generateSimulatedHeatmap(): HeatmapCell[] {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const periods = ['00:00-06:00', '06:00-12:00', '12:00-18:00', '18:00-24:00'];
    const cells: HeatmapCell[] = [];

    days.forEach(day => {
      periods.forEach(period => {
        let density = Math.floor(Math.random() * 40) + 10;
        let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

        // Higher risk on weekends and late night
        if ((day === 'Sat' || day === 'Sun') && period === '00:00-06:00') {
          density = 88;
          riskLevel = 'critical';
        } else if (period === '00:00-06:00') {
          density = 65;
          riskLevel = 'high';
        } else if (period === '18:00-24:00') {
          density = 48;
          riskLevel = 'medium';
        }

        cells.push({
          xLabel: day,
          yLabel: period,
          density,
          riskLevel,
          sampleCount: Math.floor(density * 12.5),
          isSimulated: true
        });
      });
    });

    return cells;
  }

  /**
   * Generates longitudinal trust score progression.
   */
  public static generateTrustScoreHistory(merchantId?: string): TrustScoreHistoryPoint[] {
    return [
      { month: 'Month 1', trustScore: 60, milestone: 'Account Opened & KYC Verified', disputeRate: 0.0 },
      { month: 'Month 2', trustScore: 72, milestone: 'First 50 Successful Settlements', disputeRate: 0.2 },
      { month: 'Month 3', trustScore: 84, milestone: 'Tier-1 Underwriting Clearance', disputeRate: 0.1 },
      { month: 'Month 4', trustScore: 89, milestone: 'PayPal Merchant Preferred Status', disputeRate: 0.0 },
      { month: 'Month 5', trustScore: 92, milestone: 'Zero Dispute Milestone Achieved', disputeRate: 0.0 },
      { month: 'Month 6', trustScore: 95, milestone: 'Instant Payout Privileges Enabled', disputeRate: 0.0 }
    ];
  }

  /**
   * Generates step-by-step case replay steps.
   */
  public static generateCaseReplaySteps(caseId: string, riskScore: number): CaseReplayStep[] {
    const isHigh = riskScore >= 70;
    return [
      {
        stepNumber: 1,
        timestamp: 'T-04:00:00',
        title: 'Initial Ingress Transaction',
        actor: 'Ingress Gateway',
        eventType: 'transaction',
        riskScoreAtStep: 15,
        description: 'First anomalous transaction packet ingested via checkout gateway.'
      },
      {
        stepNumber: 2,
        timestamp: 'T-02:30:00',
        title: 'Velocity Acceleration Threshold Crossed',
        actor: 'Velocity Monitor',
        eventType: 'alert',
        riskScoreAtStep: isHigh ? 55 : 22,
        description: 'Transaction frequency surged +240% above 30-day baseline.'
      },
      {
        stepNumber: 3,
        timestamp: 'T-01:15:00',
        title: 'Multi-Agent Collective Dispatch',
        actor: 'Agent Orchestrator',
        eventType: 'agent_scan',
        riskScoreAtStep: isHigh ? 78 : 25,
        description: 'Fraud Investigation, Invoice Intelligence, and Merchant Protection agents executed parallel analysis.'
      },
      {
        stepNumber: 4,
        timestamp: 'T-00:05:00',
        title: 'Consensus Verdict & Underwriter Routing',
        actor: 'Case Manager Agent',
        eventType: 'decision',
        riskScoreAtStep: riskScore,
        description: isHigh
          ? 'Human-in-the-Loop review triggered. Case queued with SLA priority timer.'
          : 'Normal growth validated. Low-risk verdict rendered; standard monitoring maintained.'
      }
    ];
  }

  /**
   * Generates realistic simulated case exhibits/attachments.
   */
  public static generateSimulatedAttachments(caseId: string): CaseAttachment[] {
    return [
      {
        id: 'att-1',
        name: `Exhibit_A_Invoice_${caseId.slice(-6)}.pdf`,
        type: 'invoice_pdf',
        size: '184 KB',
        uploadedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
        previewText: 'Billing Document scanned via OCR engine with extracted headers and line items.',
        isSimulated: true
      },
      {
        id: 'att-2',
        name: 'Merchant_Bank_Verification_Letter.pdf',
        type: 'bank_statement',
        size: '412 KB',
        uploadedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        previewText: 'Official depository confirmation letter verifying settlement account ownership.',
        isSimulated: true
      },
      {
        id: 'att-3',
        name: 'Dispute_Claim_Records_Export.csv',
        type: 'dispute_slip',
        size: '56 KB',
        uploadedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        previewText: 'Detailed export of buyer chargeback reason codes and tracking telemetry.',
        isSimulated: true
      }
    ];
  }

  /**
   * Generates simulated initial underwriter notes.
   */
  public static generateSimulatedNotes(): CaseUnderwriterNote[] {
    return [
      {
        id: 'note-1',
        author: 'System Audit Engine',
        role: 'Automated Ingestion',
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        content: 'Case ingested and assigned to Underwriting Queue Level-2. Initial telemetry correlated against historical baseline.',
        flag: 'info'
      },
      {
        id: 'note-2',
        author: 'Sarah Chen',
        role: 'Senior Fraud Underwriter',
        timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
        content: 'Cross-checked courier tracking API. Merchant has uploaded valid delivery confirmations for 85% of recent shipments.',
        flag: 'urgent'
      }
    ];
  }
}
