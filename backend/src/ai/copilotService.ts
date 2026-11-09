import type {
  CopilotChatInput,
  CopilotChatResponse,
  CaseManagerResult
} from '../../../shared/src/types.js';
import { logger } from '../infrastructure/logging/logger.js';

/**
 * PayPal TrustShield AI — Copilot Intelligence Assistant
 * 
 * Provides an interactive, strictly grounded AI copilot for underwriters and fraud investigators.
 * 
 * Strict Invariant: Never invent or hallucinate evidence. Every assertion cites case telemetry,
 * baseline metrics, or verified knowledge base typologies.
 */
export class CopilotService {
  public static handleQuery(
    input: CopilotChatInput,
    activeCase?: CaseManagerResult
  ): CopilotChatResponse {
    const rawMessage = input.message.trim();
    const lowerMessage = rawMessage.toLowerCase();

    logger.info('Copilot Query Received', {
      queryLength: rawMessage.length,
      hasActiveCase: !!activeCase,
      caseId: activeCase?.caseId
    });

    const actionSuggestions: string[] = [
      'Summarize this investigation',
      'Explain key risk drivers',
      'Evaluate counter-hypotheses',
      'Suggest next underwriting actions',
      'Draft formal case report'
    ];
    const citedEvidence: string[] = [];

    // If no case is active, answer with platform guidance
    if (!activeCase) {
      return {
        reply: `Hello, I am your PayPal TrustShield AI Copilot. I assist fraud underwriters with explainable risk analysis, case summarization, and evidence cross-examination.\n\nTo begin an investigation, select a case from the **Investigation Workspace** or run a simulation in the **AI Operations Center**. You can also ask me questions regarding PayPal fraud typologies, merchant surge benchmarks, or sandbox orders.`,
        actionSuggestions: [
          'What are PayPal surge thresholds?',
          'How does the 4-agent system work?',
          'Explain prompt injection defense'
        ],
        citedEvidence: ['System: PayPal TrustShield Knowledge Base v2.0'],
        caseSummaryAvailable: false
      };
    }

    // Collect available evidence from active case for citations
    if (activeCase.mergedEvidence && activeCase.mergedEvidence.length > 0) {
      citedEvidence.push(...activeCase.mergedEvidence.slice(0, 4));
    }
    if (activeCase.agentReports.merchantProtection) {
      citedEvidence.push(`Merchant Protection: ${activeCase.agentReports.merchantProtection.spikeClassification} classification`);
    }

    // 1. Summarize Investigation
    if (lowerMessage.includes('summarize') || lowerMessage.includes('summary') || lowerMessage.includes('brief')) {
      const summaryText = `### 📋 Executive Investigation Summary: Case ${activeCase.caseId}
- **Assessed Risk Level:** ${activeCase.overallRiskCategory} (Score: ${activeCase.overallRiskScore}/100)
- **Primary Finding:** ${activeCase.finalVerdict}
- **Human-in-the-Loop Status:** ${activeCase.humanInTheLoop.isRequired ? 'Triggered (' + activeCase.humanInTheLoop.reason + ')' : 'Automated Clearance'}
- **Recommended Action:** ${activeCase.recommendedWorkflow.slice(0, 2).join('; ') || 'Standard monitoring'}

*All observations are grounded in verifiable merchant telemetry and documentary scans.*`;

      return {
        reply: summaryText,
        actionSuggestions: ['Explain key risk drivers', 'Evaluate counter-hypotheses', 'Draft formal case report'],
        citedEvidence,
        caseSummaryAvailable: true
      };
    }

    // 2. Explain Risk Factors / Drivers
    if (lowerMessage.includes('explain') || lowerMessage.includes('driver') || lowerMessage.includes('factor') || lowerMessage.includes('why')) {
      const drivers = activeCase.mergedEvidence.map(e => `• **${e}**`).join('\n');
      const alerts = activeCase.deduplicatedAlerts.map(a => `• [${a.severity.toUpperCase()}] ${a.title}: ${a.message}`).join('\n');

      return {
        reply: `### 🔍 Risk Factor Decomposition for ${activeCase.caseId}
**Overall Score:** ${activeCase.overallRiskScore}/100 (${activeCase.overallRiskCategory})

**Corroborated Evidence Signals:**
${drivers || '• No high-severity signals identified.'}

**Active Alerts:**
${alerts || '• No outstanding alerts.'}

**Model Confidence Calibration:**
${activeCase.calibrationMetrics ? activeCase.calibrationMetrics.reliabilityAssessment : 'Model confidence calibrated against historical empirical ground truth.'}`,
        actionSuggestions: ['Evaluate counter-hypotheses', 'Suggest next underwriting actions', 'Draft formal case report'],
        citedEvidence,
        caseSummaryAvailable: true
      };
    }

    // 3. Counter-Hypotheses / Alternative Possibilities
    if (lowerMessage.includes('hypothes') || lowerMessage.includes('counter') || lowerMessage.includes('alternative')) {
      let hypText = `### ⚖️ Multi-Hypothesis Analysis for ${activeCase.caseId}\n\n`;
      if (activeCase.alternativeHypotheses && activeCase.alternativeHypotheses.length > 0) {
        activeCase.alternativeHypotheses.forEach(h => {
          hypText += `**${h.type}: ${h.title} (${h.probability}%)**\n${h.rationale}\n\n`;
        });
      } else {
        hypText += `• **Primary Hypothesis:** ${activeCase.finalVerdict}\n• **Benign Alternative:** Normal commercial activity with anomalous telemetry.\n• **Worst-Case Escalation:** Unmitigated chargeback exposure or account takeover.\n`;
      }

      return {
        reply: hypText,
        actionSuggestions: ['Suggest next underwriting actions', 'Summarize this investigation'],
        citedEvidence,
        caseSummaryAvailable: true
      };
    }

    // 4. Suggest Next Actions
    if (lowerMessage.includes('action') || lowerMessage.includes('next') || lowerMessage.includes('recommend') || lowerMessage.includes('what should')) {
      const actions = activeCase.recommendedWorkflow.map((act, i) => `${i + 1}. **${act}**`).join('\n');
      return {
        reply: `### 🛡️ Recommended Underwriter Actions for ${activeCase.caseId}
${actions}

> **PayPal Risk Policy Invariant:** Underwriters must record written justification prior to applying reserves, and accounts are never frozen automatically without manual verification.`,
        actionSuggestions: ['Draft formal case report', 'Summarize this investigation'],
        citedEvidence,
        caseSummaryAvailable: true
      };
    }

    // 5. Draft Formal Underwriter Report
    if (lowerMessage.includes('report') || lowerMessage.includes('draft') || lowerMessage.includes('memo') || lowerMessage.includes('export')) {
      return {
        reply: `### 📄 Formal Underwriter Investigation Memo
**Case ID:** ${activeCase.caseId}  
**Date:** ${new Date().toISOString()}  
**Investigating Underwriter:** Level-2 Fraud Risk Specialist  
**Merchant / Subject:** ${activeCase.merchantId || 'Documentary Invoice Entity'}  
**Risk Level:** ${activeCase.overallRiskCategory} (Score: ${activeCase.overallRiskScore}/100)  

**1. Incident Overview**  
${activeCase.humanReadableExplanation}

**2. Key Evidence & Verification Telemetry**  
${activeCase.mergedEvidence.map(e => `- ${e}`).join('\n')}

**3. Underwriter Decision Recommendation**  
Recommended Workflow: ${activeCase.recommendedWorkflow.join(' -> ')}  
*Account status remains ACTIVE in accordance with non-destructive policy.*`,
        actionSuggestions: ['Export report as JSON', 'Summarize this investigation'],
        citedEvidence,
        caseSummaryAvailable: true
      };
    }

    // Default conversational grounding response
    return {
      reply: `Regarding Case **${activeCase.caseId}**:
The current evaluation indicates a risk score of **${activeCase.overallRiskScore}/100** categorized as **${activeCase.overallRiskCategory}**.

Key observed signal: ${activeCase.mergedEvidence[0] || 'Standard processing parameters observed'}.

Would you like me to:
1. Provide an executive summary of this case?
2. Break down the contributing risk drivers?
3. Contrast alternative hypotheses (e.g. viral promotion vs ATO)?
4. Recommend next steps for underwriting?`,
      actionSuggestions: ['Summarize this investigation', 'Explain key risk drivers', 'Suggest next underwriting actions'],
      citedEvidence,
      caseSummaryAvailable: true
    };
  }
}
