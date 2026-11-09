import fs from 'fs';
import path from 'path';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ZodError } from 'zod';
import {
  analyzeSellerProtection,
  analyzeInvoiceScam,
  evaluateSandboxTransactionRisk
} from './riskEngine.js';
import { getDashboardSummary } from './summary.js';
import {
  getPayPalSandboxStatus,
  createSandboxOrder,
  captureSandboxOrder,
  getSandboxOrderDetails,
  PayPalConfigurationError,
  PayPalApiError
} from './paypalSandbox.js';
import {
  SellerProtectionInputSchema,
  InvoiceScamInputSchema,
  CreateOrderInputSchema,
  OrderIdParamSchema,
  EvaluateSandboxTransactionSchema,
  InvestigateCaseInputSchema,
  HumanReviewActionSchema
} from './validation.js';
import { AgentOrchestrator } from './orchestrator/agentOrchestrator.js';
import { investigationMemory } from './memory/investigationMemory.js';
import { requestTracerMiddleware } from './api/middlewares/requestTracer.js';
import { securityHeadersMiddleware } from './security/securityHeaders.js';
import { standardApiRateLimiter } from './security/rateLimiter.js';
import { inputSanitizationMiddleware } from './security/sanitizer.js';
import { requireRole } from './security/rbac.js';
import { logger } from './infrastructure/logging/logger.js';
import { metricsTracker } from './infrastructure/monitoring/metricsTracker.js';
import { appCache } from './infrastructure/cache/memoryCache.js';
import { CopilotService } from './ai/copilotService.js';
import { ContinuousLearningFramework } from './ai/continuousLearning.js';
import { FRAUD_TYPOLOGIES, KNOWLEDGE_ARTICLES } from './knowledge/knowledgeBase.js';
import { auditLogger } from './audit/auditLogger.js';
import { GraphGenerator } from './graph/graphGenerator.js';

dotenv.config();

export const app = express();

// Security and Observability Pipeline
app.use(requestTracerMiddleware);
app.use(securityHeadersMiddleware);
app.use(standardApiRateLimiter);
app.use(cors());
// Limit payload size to protect against denial of service
app.use(express.json({ limit: '500kb' }));
app.use(inputSanitizationMiddleware);

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'PayPal TrustShield AI API',
    version: '1.1.0',
    timestamp: new Date().toISOString()
  });
});

// PayPal Sandbox Status
app.get('/api/paypal/status', (_req: Request, res: Response) => {
  const status = getPayPalSandboxStatus();
  res.json(status);
});

// PayPal Orders v2: Create Test Sandbox Order
app.post('/api/paypal/orders/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = CreateOrderInputSchema.parse(req.body);
    const result = await createSandboxOrder(validatedData);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// PayPal Orders v2: Capture Approved Sandbox Order
app.post('/api/paypal/orders/:orderId/capture', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = OrderIdParamSchema.parse(req.params.orderId);
    const result = await captureSandboxOrder(orderId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PayPal Orders v2: Retrieve Verified Order Details
app.get('/api/paypal/orders/:orderId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderId = OrderIdParamSchema.parse(req.params.orderId);
    const result = await getSandboxOrderDetails(orderId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Dashboard Summary Aggregates
app.get('/api/summary', (_req: Request, res: Response) => {
  const summary = getDashboardSummary();
  res.json(summary);
});

// Seller Protection Analysis Endpoint
app.post('/api/seller-protection/analyze', (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = SellerProtectionInputSchema.parse(req.body);
    const result = analyzeSellerProtection(validatedData);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Legacy backward-compatibility alias
app.post('/api/seller-protection', (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = SellerProtectionInputSchema.parse(req.body);
    const result = analyzeSellerProtection(validatedData);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Invoice Scam Shield Analysis Endpoint
app.post('/api/invoice-scam/analyze', (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = InvoiceScamInputSchema.parse(req.body);
    const result = analyzeInvoiceScam(validatedData);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Legacy backward-compatibility alias
app.post('/api/invoice-scam', (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = InvoiceScamInputSchema.parse(req.body);
    const result = analyzeInvoiceScam(validatedData);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Unified Intelligence: Evaluate Sandbox Transaction Risk
app.post('/api/intelligence/sandbox-transaction', (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = EvaluateSandboxTransactionSchema.parse(req.body);
    const result = evaluateSandboxTransactionRisk(validatedData);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// MULTI-AGENT ORCHESTRATION & HITL ENDPOINTS
// ==========================================

// Agent Orchestrator: End-to-End Multi-Agent Investigation
app.post('/api/orchestrator/investigate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = InvestigateCaseInputSchema.parse(req.body);
    const result = await AgentOrchestrator.investigate(validatedData);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Long-Term Memory: Query Historical Cases & Merchant Baselines
app.get('/api/orchestrator/memory', (_req: Request, res: Response) => {
  const cases = investigationMemory.getAllCases();
  res.json({
    totalRememberedCases: cases.length,
    cases
  });
});

// Human-in-the-Loop: Submit Underwriter Review Decision (RBAC Protected)
app.post('/api/orchestrator/cases/:caseId/review', requireRole('underwriter', 'admin'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseId = req.params.caseId;
    const reviewData = HumanReviewActionSchema.parse(req.body);
    const updated = AgentOrchestrator.reviewCase(caseId, reviewData);
    if (!updated) {
      res.status(404).json({
        error: 'Case Not Found',
        message: `Case ${caseId} does not exist in investigation memory.`
      });
      return;
    }
    res.json({
      success: true,
      caseId,
      status: 'Decision Recorded',
      decision: reviewData.action,
      notes: reviewData.notes,
      decidedAt: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

// Threat Knowledge Base: Reference Signatures & Benchmarks
app.get('/api/orchestrator/knowledge-base', (_req: Request, res: Response) => {
  res.json({
    system: 'PayPal TrustShield AI Threat Knowledge Base',
    signatures: [
      { category: 'scam-signatures', count: 3, description: 'Geek Squad, crypto redirection, arrest extortion' },
      { category: 'ato-patterns', count: 2, description: 'Ticket acceleration (>4x), unverified payer clusters' },
      { category: 'seasonal-benchmarks', count: 2, description: 'Q4 holiday surges, viral social flash promotions' },
      { category: 'impersonation-brands', count: 1, description: 'PayPal, Norton, Apple Care, Geek Squad' }
    ]
  });
});

// ==========================================
// ENTERPRISE OBSERVABILITY & CASE MANAGEMENT
// ==========================================

// Observability & Diagnostics Health Snapshot
app.get('/api/diagnostics', (_req: Request, res: Response) => {
  const diagnostics = metricsTracker.getDiagnostics();
  const cacheStats = appCache.getStats();
  res.json({
    ...diagnostics,
    cache: cacheStats,
    version: '2.0.0-enterprise'
  });
});

// Human Review Center: Case Queue
app.get('/api/cases', (_req: Request, res: Response) => {
  const cases = investigationMemory.getAllCases();
  res.json({
    totalCases: cases.length,
    cases
  });
});

// Human Review Center: Single Case Lookup (Rich Extended Result)
app.get('/api/cases/:caseId', (req: Request, res: Response) => {
  const fullCase = investigationMemory.getFullCase(req.params.caseId);
  if (!fullCase) {
    res.status(404).json({
      error: 'Case Not Found',
      message: `Investigation case ${req.params.caseId} could not be located.`
    });
    return;
  }
  res.json(fullCase);
});

// AI Assistant / Copilot Chat Endpoint
app.post('/api/copilot/chat', (req: Request, res: Response) => {
  const { message, caseId, history } = req.body || {};
  let activeCase;
  if (caseId) {
    activeCase = investigationMemory.getFullCase(caseId);
  }

  const response = CopilotService.handleQuery({ message: message || '', caseId, history }, activeCase);
  auditLogger.recordEvent({
    eventType: 'COPILOT_QUERY',
    userId: (req.headers['x-user-id'] as string) || 'SEC-USER-001',
    userRole: (req.headers['x-user-role'] as string) || 'underwriter',
    caseId,
    details: `Copilot queried: "${(message || '').substring(0, 80)}"`,
    ipAddress: req.ip || '127.0.0.1'
  });

  res.json(response);
});

// Case Notes: Underwriter Collaboration
app.post('/api/cases/:caseId/notes', requireRole('underwriter', 'admin', 'analyst'), (req: Request, res: Response) => {
  const caseId = req.params.caseId;
  const { content, flag } = req.body || {};
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    res.status(400).json({ error: 'Validation Error', message: 'Note content is required.' });
    return;
  }

  const note = {
    id: `NOTE-${Date.now().toString(36)}`,
    author: (req.headers['x-user-id'] as string) || 'Senior Underwriter',
    role: (req.headers['x-user-role'] as string) || 'underwriter',
    timestamp: new Date().toISOString(),
    content: content.trim(),
    flag: flag || 'info'
  };

  const added = investigationMemory.addNote(caseId, note);
  if (!added) {
    res.status(404).json({ error: 'Case Not Found', message: `Case ${caseId} does not exist.` });
    return;
  }

  auditLogger.recordEvent({
    eventType: 'OVERRIDE',
    userId: note.author,
    userRole: note.role,
    caseId,
    details: `Underwriter note added: "${content.substring(0, 50)}..."`,
    ipAddress: req.ip || '127.0.0.1'
  });

  res.status(201).json({ success: true, note });
});

// Case Attachments / Exhibits
app.post('/api/cases/:caseId/attachments', requireRole('underwriter', 'admin'), (req: Request, res: Response) => {
  const caseId = req.params.caseId;
  const { name, type, previewText } = req.body || {};
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Validation Error', message: 'Attachment name is required.' });
    return;
  }

  const attachment = {
    id: `ATT-${Date.now().toString(36)}`,
    name: name.trim(),
    type: type || 'invoice_pdf',
    size: '240 KB',
    uploadedAt: new Date().toISOString(),
    previewText: previewText || 'Manual exhibit uploaded by underwriter.',
    isSimulated: true
  };

  const added = investigationMemory.addAttachment(caseId, attachment);
  if (!added) {
    res.status(404).json({ error: 'Case Not Found', message: `Case ${caseId} does not exist.` });
    return;
  }

  res.status(201).json({ success: true, attachment });
});

// Human Feedback Loop for Continuous Learning
app.post('/api/cases/:caseId/feedback', requireRole('underwriter', 'admin'), (req: Request, res: Response) => {
  const caseId = req.params.caseId;
  const { agreedWithAiVerdict, overriddenCategory, feedbackNotes } = req.body || {};

  const feedbackRecord = {
    id: `FB-${Date.now().toString(36)}`,
    caseId,
    timestamp: new Date().toISOString(),
    reviewerId: (req.headers['x-user-id'] as string) || 'SEC-USER-001',
    agreedWithAiVerdict: Boolean(agreedWithAiVerdict),
    overriddenCategory,
    feedbackNotes: feedbackNotes || ''
  };

  investigationMemory.recordFeedback(feedbackRecord);
  ContinuousLearningFramework.recordCandidateForRetraining(
    caseId,
    overriddenCategory || 'Verified Clearance',
    feedbackNotes || 'Human feedback recorded'
  );

  auditLogger.recordEvent({
    eventType: 'OVERRIDE',
    userId: feedbackRecord.reviewerId,
    userRole: 'underwriter',
    caseId,
    details: `Underwriter feedback submitted. Agreed: ${feedbackRecord.agreedWithAiVerdict}`,
    ipAddress: req.ip || '127.0.0.1'
  });

  res.status(201).json({ success: true, feedback: feedbackRecord });
});

// Threat Knowledge Base: Articles & Typologies
app.get('/api/knowledge/articles', (_req: Request, res: Response) => {
  res.json({
    typologies: FRAUD_TYPOLOGIES,
    articles: KNOWLEDGE_ARTICLES
  });
});

// Audit Center: Immutable Audit Trail
app.get('/api/audit/logs', (_req: Request, res: Response) => {
  const limit = parseInt(_req.query.limit as string) || 100;
  const logs = auditLogger.getLogs(limit);
  res.json({ totalLogs: logs.length, logs });
});

// Audit Center: Export Audit Logs (CSV or JSON)
app.get('/api/audit/export', (req: Request, res: Response) => {
  const format = req.query.format === 'csv' ? 'csv' : 'json';
  auditLogger.recordEvent({
    eventType: 'EXPORT',
    userId: (req.headers['x-user-id'] as string) || 'SEC-USER-001',
    userRole: (req.headers['x-user-role'] as string) || 'auditor',
    details: `Audit trail exported as ${format.toUpperCase()}`,
    ipAddress: req.ip || '127.0.0.1'
  });

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="paypal_trustshield_audit_log.csv"');
    res.send(auditLogger.exportCsv());
  } else {
    res.json(auditLogger.getLogs(500));
  }
});

// Fraud Intelligence: Network Graph Data
app.get('/api/fraud-intelligence/network', (_req: Request, res: Response) => {
  const graph = GraphGenerator.generateCaseNetworkGraph('NETWORK-GLOBAL', 'MERCHANT_CLUSTER_GLOBAL', 65, false);
  res.json(graph);
});

// Fraud Intelligence: Heatmap Data
app.get('/api/fraud-intelligence/heatmap', (_req: Request, res: Response) => {
  const heatmap = GraphGenerator.generateSimulatedHeatmap();
  res.json({
    timeZone: 'UTC',
    aggregation: 'Hourly Risk Density (Past 7 Days)',
    isSimulated: true,
    cells: heatmap
  });
});

// AI Continuous Learning & Model Drift Status
app.get('/api/ai/continuous-learning', (_req: Request, res: Response) => {
  const status = ContinuousLearningFramework.getStatus();
  res.json(status);
});

// Standard Enterprise Health & Monitoring Probes
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'HEALTHY', uptime: process.uptime() });
});

app.get('/health/liveness', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

app.get('/health/readiness', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'READY', subsystems: { memory: 'OK', cache: 'OK', rateLimiter: 'OK' } });
});

app.get('/metrics', (_req: Request, res: Response) => {
  const diagnostics = metricsTracker.getDiagnostics();
  res.json({
    metrics: {
      uptime_seconds: diagnostics.uptimeSeconds,
      memory_heap_used_mb: diagnostics.memory.heapUsedMB,
      requests_total: diagnostics.metrics.totalRequests,
      status_2xx: diagnostics.metrics.statusCodes['2xx'] || 0,
      status_4xx: diagnostics.metrics.statusCodes['4xx'] || 0,
      status_5xx: diagnostics.metrics.statusCodes['5xx'] || 0,
      latency_p95_ms: diagnostics.metrics.p95ApiLatencyMs
    }
  });
});

// Production Static Frontend Assets (Single-Service Deployment Mode)
const possibleFrontendPaths = [
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(process.cwd(), '../frontend/dist'),
  path.resolve(process.cwd(), '../../frontend/dist')
];

const frontendDistPath = possibleFrontendPaths.find(p => fs.existsSync(p));

if (frontendDistPath) {
  logger.info('Serving static frontend assets from', { path: frontendDistPath });
  app.use(express.static(frontendDistPath));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/metrics')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Centralized Error Handling Middleware
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const traceId = (req.headers['x-request-id'] as string) || 'UNKNOWN_TRACE';

  if (err instanceof ZodError) {
    const issues = err.issues || [];
    logger.warn('Schema Validation Error', { traceId, path: req.path, issues });
    res.status(400).json({
      error: 'Validation Error',
      message: 'Request payload failed schema validation.',
      issues: issues.map(e => ({
        path: e.path.map(String).join('.'),
        message: e.message
      }))
    });
    return;
  }

  if (err instanceof PayPalConfigurationError) {
    logger.info('PayPal Sandbox unconfigured', { traceId, message: err.message });
    res.status(503).json({
      error: 'PayPal Sandbox Not Configured',
      message: err.message,
      requiresRealCredentials: true
    });
    return;
  }

  if (err instanceof PayPalApiError) {
    logger.error('PayPal API Error', { traceId, message: err.message, statusCode: err.statusCode });
    res.status(err.statusCode).json({
      error: 'PayPal API Error',
      message: err.message,
      details: err.details
    });
    return;
  }

  if (typeof err === 'object' && err !== null && 'type' in err && (err as { type: string }).type === 'entity.too.large') {
    logger.warn('Payload Too Large', { traceId, path: req.path });
    res.status(413).json({
      error: 'Payload Too Large',
      message: 'Input body exceeds maximum allowable payload size.'
    });
    return;
  }

  logger.error('Unhandled Security Engine Error', {
    traceId,
    path: req.path,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected security engine error occurred.',
    traceId
  });
});

const PORT = process.env.PORT || 4000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[TrustShield AI Backend] Listening securely on http://localhost:${PORT}`);
  });
}
