/**
 * Shared Type Definitions for PayPal TrustShield AI
 * Fintech Security & Merchant Risk Intelligence Engine
 */

export type RiskCategory = 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Insufficient Evidence';

export type InvoiceRiskCategory = 'Legitimate / Low Risk' | 'Suspicious' | 'High-Risk Scam' | 'Needs Review';

export type EvidenceSufficiencyLevel = 'High' | 'Moderate' | 'Low' | 'Insufficient';

export interface RiskSignal {
  id: string;
  name: string;
  severity: 'info' | 'low' | 'medium' | 'high';
  description: string;
  weight: number;
}

export interface ExplainableEvidenceBreakdown {
  observedEvidence: string[];
  inferredRisk: string[];
  missingInformation: string[];
  evidenceSufficiency: EvidenceSufficiencyLevel;
  confidenceScore: number; // 0 - 100
}

export interface AiSynthesisResult {
  provider: string; // 'gemini' | 'openai' | 'deterministic-fallback'
  isAiGenerated: boolean;
  executiveSummary: string;
  keyFindings: string[];
  underwriterRecommendation: string;
  confidenceNote: string;
}

export interface SellerProtectionInput {
  merchantId: string;
  transactions: number[];
  previousMonthSales: number;
  disputes: number;
  refunds: number;
  accountAgeDays?: number;
  unverifiedPayerRatio?: number;
}

export interface SellerMetrics {
  totalRecentSales: number;
  salesGrowthPercentage: number;
  disputeRatePercentage: number;
  refundRatePercentage: number;
  averageOrderValue: number;
  transactionCount: number;
  minTransaction: number;
  maxTransaction: number;
}

export interface SellerProtectionResult {
  merchantId: string;
  riskScore: number; // 0 - 100
  category: RiskCategory;
  explanation: string;
  signals: RiskSignal[];
  recommendations: string[];
  metrics: SellerMetrics;
  disclaimer: string;
  isSimulated: boolean;
  timestamp: string;
  // Enhanced Explainable AI fields
  evidenceSufficiency: EvidenceSufficiencyLevel;
  confidenceScore: number;
  observedEvidence: string[];
  inferredRisk: string[];
  missingInformation: string[];
  aiSynthesis?: AiSynthesisResult;
}

export interface InvoiceWarning {
  id: string;
  category: 'Urgency & Coercion' | 'Unverified Phone Number' | 'Impersonation' | 'Unusual Payment Instruction' | 'Commercial Terms' | 'Adversarial Prompt Injection';
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  detail: string;
  matchedText?: string;
}

export interface UnverifiedContact {
  type: 'phone' | 'email';
  value: string;
  context: string;
  isVerified: false;
  verificationCaveat: string;
}

export interface PaymentDestinationSignal {
  method: string;
  destination: string;
  isUnusual: boolean;
  notes: string;
}

export interface InvoiceScamInput {
  invoiceText: string;
  senderEmail?: string;
  invoiceNumber?: string;
}

export interface InvoiceScamResult {
  riskScore: number; // 0 - 100
  category: InvoiceRiskCategory;
  explanation: string;
  warnings: InvoiceWarning[];
  unverifiedContacts: UnverifiedContact[];
  paymentDestinations: PaymentDestinationSignal[];
  urgencyDetected: boolean;
  impersonationDetected: boolean;
  safeNextSteps: string[];
  confidenceScore: number;
  disclaimer: string;
  timestamp: string;
  // Enhanced Explainable AI fields
  evidenceSufficiency: EvidenceSufficiencyLevel;
  observedEvidence: string[];
  inferredRisk: string[];
  missingInformation: string[];
  adversarialAttemptDetected?: boolean;
  aiSynthesis?: AiSynthesisResult;
}

export interface DashboardSummary {
  totalTransactionsAnalyzed: number;
  highRiskCases: number;
  sellerAlerts: number;
  invoiceScans: number;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    insufficientEvidence: number;
  };
  recentActivity: Array<{
    id: string;
    timestamp: string;
    type: 'seller-protection' | 'invoice-scam';
    entityId: string;
    riskCategory: string;
    riskScore: number;
    summary: string;
  }>;
  isSimulatedData: true;
  _note: string;
}

export interface PayPalSandboxStatus {
  isConfigured: boolean;
  mode: 'sandbox' | 'simulated';
  environment: 'sandbox' | 'live';
  clientIdMasked: string | null;
  statusMessage: string;
  requiresRealCredentials: boolean;
  liveApiAvailable: boolean;
  apiBaseUrl: string;
}

export interface CreateOrderInput {
  amount: number | string;
  currency?: string;
  description?: string;
}

export interface CreateOrderResult {
  orderId: string;
  status: string;
  approveUrl: string | null;
  currency: string;
  amount: string;
  isSandbox: true;
  isVerifiedByPayPal: true;
  createdAt: string;
}

export interface CaptureOrderResult {
  orderId: string;
  captureId: string;
  status: string;
  amount: string;
  currency: string;
  payer?: {
    email?: string;
    name?: string;
    payerId?: string;
  };
  isSandbox: true;
  isVerifiedByPayPal: true;
  capturedAt: string;
}

export interface PayPalOrderDetails {
  orderId: string;
  status: string;
  intent: string;
  amount: string;
  currency: string;
  createTime?: string;
  updateTime?: string;
  isSandbox: true;
  isVerifiedByPayPal: true;
}

export interface EvaluateSandboxTransactionInput {
  orderId: string;
  amount: number;
  currency: string;
  buyerEmail?: string;
  status: string;
  sellerHistory?: {
    previousSales: number;
    disputes: number;
    refunds: number;
  };
}

export interface SandboxTransactionRiskEvaluation {
  orderId: string;
  riskScore: number;
  category: RiskCategory;
  evidenceBreakdown: ExplainableEvidenceBreakdown;
  signals: RiskSignal[];
  recommendations: string[];
  explanation: string;
  isSandboxVerified: boolean;
  timestamp: string;
}

// ==========================================
// AGENTIC AI & MULTI-AGENT ORCHESTRATION TYPES
// ==========================================

export type AgentRole =
  | 'Fraud Investigation Agent'
  | 'Invoice Intelligence Agent'
  | 'Merchant Protection Agent'
  | 'Case Manager Agent';

export type ToolName =
  | 'Invoice Analyzer'
  | 'Risk Engine'
  | 'Seller Analyzer'
  | 'PayPal Sandbox Adapter'
  | 'Transaction History'
  | 'Knowledge Base'
  | 'Alert Generator';

export interface ToolCallRecord {
  toolName: ToolName;
  timestamp: string;
  reason: string;
  inputSummary: string;
  outputSummary: string;
  durationMs: number;
}

export type SpikeClassification =
  | 'normal growth'
  | 'seasonal event'
  | 'viral marketing'
  | 'fraud'
  | 'bot activity';

export type MerchantProtectionRecommendation =
  | 'No Action'
  | 'Monitor'
  | 'Temporary Review'
  | 'Escalate';

export interface ExplainableAgentResponse {
  agentRole: AgentRole;
  reasoning: string;
  evidence: string[];
  confidence: number; // 0 - 100
  alternativePossibilities: string[]; // Counter-hypotheses
  recommendedActions: string[];
  limitations: string[];
  toolCalls: ToolCallRecord[];
  additionalEvidenceRequested?: string[]; // When confidence is low or evidence missing
}

export interface FraudInvestigationAgentResult extends ExplainableAgentResponse {
  agentRole: 'Fraud Investigation Agent';
  isAtoSuspected: boolean;
  atoConfidence: number;
  paymentBehaviorRisk: 'Low' | 'Medium' | 'High';
  suspiciousSignals: string[];
}

export interface InvoiceIntelligenceAgentResult extends ExplainableAgentResponse {
  agentRole: 'Invoice Intelligence Agent';
  riskScore: number;
  urgencyDetected: boolean;
  impersonationDetected: boolean;
  fakeSupportNumberDetected: boolean;
  paymentManipulationDetected: boolean;
  unverifiedContacts: UnverifiedContact[];
  paymentDestinations: PaymentDestinationSignal[];
}

export interface MerchantProtectionAgentResult extends ExplainableAgentResponse {
  agentRole: 'Merchant Protection Agent';
  spikeClassification: SpikeClassification;
  protectionRecommendation: MerchantProtectionRecommendation;
  justification: string;
  isAccountFrozen: false; // Invariant: system never automatically freezes accounts
}

export interface HumanInTheLoopState {
  isRequired: boolean;
  reason: string;
  triggeredByEvidence: string[];
  confidenceLevel: string;
  additionalEvidenceNeeded: string[];
  status: 'Pending Review' | 'Approved' | 'Review Underway' | 'Action Taken';
  reviewerDecision?: {
    action: 'Approve Standard Flow' | 'Request Additional Documentation' | 'Place on 48h Rolling Monitor' | 'Escalate to Compliance Specialist';
    notes?: string;
    decidedAt: string;
  };
}

export interface CaseManagerTimelineEvent {
  time: string;
  source: AgentRole | 'System' | 'Human Underwriter';
  event: string;
  detail: string;
}

export interface CaseManagerDeduplicatedAlert {
  id: string;
  source: AgentRole;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
}

export interface MemoryHit {
  caseId: string;
  timestamp: string;
  matchType: 'Merchant History' | 'Known Scam Pattern' | 'Shared Phone/Domain' | 'Similar Ticket Velocity';
  summary: string;
  pastVerdict: string;
}

export interface InvestigationMemoryRecord {
  caseId: string;
  merchantId?: string;
  timestamp: string;
  riskCategory: RiskCategory;
  riskScore: number;
  summary: string;
  knownScamIndicators?: string[];
  merchantBaseline?: {
    avgDailyVolume: number;
    avgTicketSize: number;
    disputeRatio: number;
  };
  humanReviewAction?: string;
}

export interface CaseManagerResult {
  caseId: string;
  timestamp: string;
  merchantId?: string;
  overallRiskScore: number;
  overallRiskCategory: RiskCategory;
  finalVerdict: string;
  humanInTheLoop: HumanInTheLoopState;
  timeline: CaseManagerTimelineEvent[];
  mergedEvidence: string[];
  deduplicatedAlerts: CaseManagerDeduplicatedAlert[];
  recommendedWorkflow: string[];
  humanReadableExplanation: string;
  alternativePossibilities: string[];
  limitations: string[];
  agentReports: {
    fraudInvestigation?: FraudInvestigationAgentResult;
    invoiceIntelligence?: InvoiceIntelligenceAgentResult;
    merchantProtection?: MerchantProtectionAgentResult;
  };
  toolCallAuditLog: ToolCallRecord[];
  memoryHits: MemoryHit[];
  verificationClassification: 'Simulated' | 'Sandbox Verified' | 'Unknown';
  // Enterprise Extended Case Attributes
  priority?: 'critical' | 'high' | 'medium' | 'low';
  slaDueHours?: number;
  assignee?: string;
  attachments?: CaseAttachment[];
  underwriterNotes?: CaseUnderwriterNote[];
  calibrationMetrics?: CalibrationMetrics;
  rankedEvidence?: RankedEvidenceItem[];
  missingEvidence?: MissingEvidenceSignal[];
  alternativeHypotheses?: AlternativeHypothesis[];
  contradictions?: ContradictionSignal[];
  replaySteps?: CaseReplayStep[];
  networkGraph?: NetworkGraphData;
  riskEvolution?: RiskEvolutionPoint[];
}

export interface InvestigateCaseInput {
  caseTitle?: string;
  merchantData?: SellerProtectionInput;
  invoiceText?: string;
  sandboxOrderId?: string;
}

export interface HumanReviewActionInput {
  action: 'Approve Standard Flow' | 'Request Additional Documentation' | 'Place on 48h Rolling Monitor' | 'Escalate to Compliance Specialist';
  notes?: string;
}

// ==========================================
// ADVANCED AI & DECISION SCIENCE TYPES
// ==========================================

export interface CalibrationCurveBin {
  bin: string;
  predictedProb: number;
  observedProb: number;
  sampleCount: number;
}

export interface CalibrationMetrics {
  brierScore: number; // 0 (perfect) - 1 (poor)
  expectedCalibrationError: number; // ECE (e.g. 0.04 = 4%)
  calibrationCurve: CalibrationCurveBin[];
  isWellCalibrated: boolean;
  reliabilityAssessment: string;
}

export type EvidenceCategory = 'Hard Telemetry' | 'Behavioral Indicator' | 'Documentary Evidence' | 'Unverified Claim';

export interface RankedEvidenceItem {
  id: string;
  title: string;
  category: EvidenceCategory;
  weightOfEvidence: number; // -5.0 to +5.0 log-odds scale
  direction: 'Inculpatory' | 'Exculpatory';
  confidence: number; // 0 - 100
  rawDetail: string;
}

export interface MissingEvidenceSignal {
  id: string;
  signalName: string;
  missingImpact: 'High' | 'Medium' | 'Low';
  uncertaintyContributionPercentage: number;
  suggestedAcquisitionMethod: string;
}

export interface AlternativeHypothesis {
  id: string;
  title: string;
  type: 'Primary Threat' | 'Benign Alternative' | 'Worst-Case Escalation';
  probability: number; // 0 - 100
  rationale: string;
  supportingEvidence: string[];
  contradictingEvidence: string[];
}

export interface ContradictionSignal {
  id: string;
  description: string;
  signalA: string;
  signalB: string;
  severity: 'high' | 'medium' | 'low';
  explanation: string;
}

export interface HumanFeedbackRecord {
  id: string;
  caseId: string;
  timestamp: string;
  reviewerId: string;
  agreedWithAiVerdict: boolean;
  overriddenCategory?: RiskCategory;
  feedbackNotes: string;
  signalAdjustments?: Array<{
    signalId: string;
    recommendedWeightChange: number;
  }>;
}

export interface ContinuousLearningStatus {
  shadowModelActive: boolean;
  driftDetected: boolean;
  baselineDriftScore: number;
  candidateQueueSize: number;
  lastEvaluationRun: string;
  canaryRolloutSafe: boolean;
  note: string;
}

// ==========================================
// GRAPH VISUALIZATION DATA STRUCTURES
// ==========================================

export type NetworkNodeType = 'merchant' | 'buyer' | 'card' | 'ip' | 'bank' | 'invoice' | 'crypto_wallet' | 'phone';

export interface NetworkGraphNode {
  id: string;
  label: string;
  type: NetworkNodeType;
  riskScore: number; // 0 - 100
  details?: Record<string, any>;
}

export interface NetworkGraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  weight: number;
  isSuspicious: boolean;
}

export interface NetworkGraphData {
  nodes: NetworkGraphNode[];
  edges: NetworkGraphEdge[];
}

export interface RiskEvolutionPoint {
  date: string;
  riskScore: number;
  trustScore: number;
  event?: string;
}

export interface HeatmapCell {
  xLabel: string;
  yLabel: string;
  density: number; // 0 - 100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  sampleCount: number;
  isSimulated: true;
}

export interface TrustScoreHistoryPoint {
  month: string;
  trustScore: number;
  milestone: string;
  disputeRate: number;
}

// ==========================================
// INVESTIGATION WORKSPACE DATA STRUCTURES
// ==========================================

export interface CaseAttachment {
  id: string;
  name: string;
  type: 'invoice_pdf' | 'bank_statement' | 'dispute_slip' | 'id_verification';
  size: string;
  uploadedAt: string;
  previewText?: string;
  isSimulated: boolean;
}

export interface CaseUnderwriterNote {
  id: string;
  author: string;
  role: string;
  timestamp: string;
  content: string;
  flag?: 'urgent' | 'info' | 'decision';
}

export interface CaseReplayStep {
  stepNumber: number;
  timestamp: string;
  title: string;
  actor: string;
  eventType: 'transaction' | 'alert' | 'agent_scan' | 'decision';
  riskScoreAtStep: number;
  description: string;
}

// ==========================================
// AI ASSISTANT / COPILOT DATA STRUCTURES
// ==========================================

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  actionSuggestions?: string[];
  citedEvidence?: string[];
}

export interface CopilotChatInput {
  message: string;
  caseId?: string;
  contextData?: any;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface CopilotChatResponse {
  reply: string;
  actionSuggestions: string[];
  citedEvidence: string[];
  caseSummaryAvailable?: boolean;
}

// ==========================================
// KNOWLEDGE & AUDIT CENTER DATA STRUCTURES
// ==========================================

export interface FraudTypology {
  id: string;
  name: string;
  category: string;
  description: string;
  indicators: string[];
  standardOperatingProcedure: string;
  applicableRegulations: string[];
  severity: 'critical' | 'high' | 'medium';
}

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  category: 'SOP' | 'Regulatory' | 'Scam Typology' | 'Engine Scoring';
  readTime: string;
  summary: string;
  content: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  eventType: 'OVERRIDE' | 'EVALUATION' | 'RULE_CHANGE' | 'SECURITY_ALERT' | 'COPILOT_QUERY' | 'EXPORT';
  userId: string;
  userRole: string;
  caseId?: string;
  details: string;
  ipAddress: string;
  checksum: string;
}
