import type {
  InvestigateCaseInput,
  CaseManagerResult,
  ToolCallRecord,
  HumanReviewActionInput
} from '../../../shared/src/types.js';
import { runFraudInvestigationAgent } from '../agents/fraudInvestigationAgent.js';
import { runInvoiceIntelligenceAgent } from '../agents/invoiceIntelligenceAgent.js';
import { runMerchantProtectionAgent } from '../agents/merchantProtectionAgent.js';
import { runCaseManagerAgent } from '../agents/caseManagerAgent.js';
import { payPalSandboxAdapterTool } from '../tools/toolRegistry.js';
import { investigationMemory } from '../memory/investigationMemory.js';
import { logger } from '../infrastructure/logging/logger.js';
import { metricsTracker } from '../infrastructure/monitoring/metricsTracker.js';
import { appCache } from '../infrastructure/cache/memoryCache.js';

let caseCounter = 100;

/**
 * Enterprise Multi-Agent Orchestration Engine for PayPal TrustShield AI
 * 
 * Orchestration Workflow:
 * 1. Initialize case workspace and generate unique audit tracking ID.
 * 2. Cross-reference Long-Term Memory for prior merchant baselines or scam campaign signatures.
 * 3. Query PayPal Sandbox Adapter if sandbox order reference is provided.
 * 4. Coordinate parallel execution of specialized agents with metrics & execution timing:
 *    - Fraud Investigation Agent
 *    - Invoice Intelligence Agent
 *    - Merchant Protection Agent
 * 5. Consolidate tool call audit trail and execution metrics.
 * 6. Case Manager Agent integrates findings, resolves conflicting evidence, and establishes HITL workflow.
 * 7. Persist outcome to Long-Term Memory (with zero secret leakage).
 */
export class AgentOrchestrator {
  /**
   * Run end-to-end multi-agent investigation with performance caching & tracing
   */
  public static async investigate(input: InvestigateCaseInput): Promise<CaseManagerResult> {
    const timer = logger.startTimer('MultiAgentOrchestration', {
      merchantId: input.merchantData?.merchantId,
      hasInvoice: Boolean(input.invoiceText)
    });

    // Check performance cache for identical recent investigations (coalesce requests)
    const cacheKey = `CASE_EVAL:${JSON.stringify(input)}`;
    return appCache.getOrCompute(cacheKey, async () => {
      caseCounter += 1;
      const caseId = `CASE-AI-${Date.now().toString().slice(-6)}-${caseCounter}`;
      const allToolCalls: ToolCallRecord[] = [];

      // 1. Long-Term Memory Lookup
      const memoryHits = [];
      if (input.merchantData?.merchantId) {
        const merchantMemory = investigationMemory.searchPastCases({ merchantId: input.merchantData.merchantId });
        memoryHits.push(...merchantMemory);
      }
      if (input.invoiceText) {
        const scamMemory = investigationMemory.matchScamPatterns(input.invoiceText);
        memoryHits.push(...scamMemory);
      }

      // 2. PayPal Sandbox Adapter Tool Call (if applicable)
      let isSandboxVerified = false;
      if (input.sandboxOrderId) {
        const sandboxStart = Date.now();
        const sandboxResult = await payPalSandboxAdapterTool.run(
          { orderId: input.sandboxOrderId },
          'Verify order settlement authenticity with PayPal Orders v2 Sandbox API.'
        );
        allToolCalls.push(sandboxResult.record);
        isSandboxVerified = sandboxResult.data.isSandboxVerified;
        metricsTracker.recordRiskCalculation('PayPal Sandbox Adapter', Date.now() - sandboxStart);
      }

      // 3. Parallel Specialized Agent Execution with Precision Timing
      const fraudStart = Date.now();
      const invoiceStart = Date.now();
      const merchantStart = Date.now();

      const [fraudResult, invoiceResult, merchantResult] = await Promise.all([
        runFraudInvestigationAgent({
          merchantData: input.merchantData,
          sandboxOrderId: input.sandboxOrderId
        }).then(res => {
          metricsTracker.recordAgentExecution('Fraud Investigation Agent', Date.now() - fraudStart);
          return res;
        }),
        runInvoiceIntelligenceAgent({
          invoiceText: input.invoiceText
        }).then(res => {
          metricsTracker.recordAgentExecution('Invoice Intelligence Agent', Date.now() - invoiceStart);
          return res;
        }),
        runMerchantProtectionAgent({
          merchantData: input.merchantData
        }).then(res => {
          metricsTracker.recordAgentExecution('Merchant Protection Agent', Date.now() - merchantStart);
          return res;
        })
      ]);

      // Consolidate tool call records from each agent
      allToolCalls.push(...fraudResult.toolCalls);
      allToolCalls.push(...invoiceResult.toolCalls);
      allToolCalls.push(...merchantResult.toolCalls);

      // 4. Case Manager Synthesis & Evidence Resolution
      const caseManagerStart = Date.now();
      const caseManagerResult = await runCaseManagerAgent({
        caseId,
        merchantId: input.merchantData?.merchantId,
        fraudAgentResult: fraudResult,
        invoiceAgentResult: invoiceResult,
        merchantProtectionResult: merchantResult,
        toolCalls: allToolCalls,
        memoryHits,
        isSandboxVerified
      });
      metricsTracker.recordAgentExecution('Case Manager Agent', Date.now() - caseManagerStart);

      // 5. Store completed case in Long-Term Memory
      investigationMemory.rememberCase({
        caseId: caseManagerResult.caseId,
        merchantId: caseManagerResult.merchantId,
        timestamp: caseManagerResult.timestamp,
        riskCategory: caseManagerResult.overallRiskCategory,
        riskScore: caseManagerResult.overallRiskScore,
        summary: caseManagerResult.finalVerdict,
        knownScamIndicators: invoiceResult.unverifiedContacts?.map(c => c.value),
        humanReviewAction: caseManagerResult.humanInTheLoop.isRequired ? 'Pending Review' : 'Auto-Approved'
      });
      investigationMemory.storeFullCase(caseManagerResult);

      timer.end('INFO', 'Multi-agent fraud investigation finalized', {
        caseId: caseManagerResult.caseId,
        overallRiskScore: caseManagerResult.overallRiskScore,
        overallRiskCategory: caseManagerResult.overallRiskCategory,
        hitlRequired: caseManagerResult.humanInTheLoop.isRequired
      });

      return caseManagerResult;
    }, 180000); // 3-minute TTL
  }

  /**
   * Submit Human-in-the-Loop Underwriter review action
   */
  public static reviewCase(caseId: string, review: HumanReviewActionInput): boolean {
    const updated = investigationMemory.updateHumanDecision(caseId, review.action, review.notes);
    if (updated) {
      logger.audit('Human Review Decision Recorded', {
        caseId,
        action: review.action,
        hasNotes: Boolean(review.notes)
      });
      // Invalidate cache for cases
      appCache.clear();
    }
    return updated;
  }
}
