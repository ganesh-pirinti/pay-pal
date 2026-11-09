import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { AgentOrchestrator } from '../src/orchestrator/agentOrchestrator.js';
import { appCache } from '../src/infrastructure/cache/memoryCache.js';

describe('Enterprise Architecture, Observability & Security Tests', () => {

  // 1. Observability & Diagnostics Health Tests
  describe('1. Observability & Diagnostics API', () => {
    it('GET /api/diagnostics: Returns system health, uptime, memory, p95 latency, and cache stats', async () => {
      const res = await request(app).get('/api/diagnostics');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(res.body.memory).toHaveProperty('heapUsedMB');
      expect(res.body.memory).toHaveProperty('rssMB');
      expect(res.body.metrics).toHaveProperty('totalRequests');
      expect(res.body.metrics).toHaveProperty('p95ApiLatencyMs');
      expect(res.body.cache).toHaveProperty('hitRatePercentage');
      expect(res.body.activeCircuitBreakers).toBeDefined();
    });

    it('GET /api/cases: Returns Case Queue for Human Review Center', async () => {
      const res = await request(app).get('/api/cases');

      expect(res.status).toBe(200);
      expect(res.body.totalCases).toBeGreaterThan(0);
      expect(Array.isArray(res.body.cases)).toBe(true);
      expect(res.body.cases[0]).toHaveProperty('caseId');
      expect(res.body.cases[0]).toHaveProperty('riskCategory');
    });

    it('GET /api/cases/:caseId: Returns single case or 404 for non-existent', async () => {
      const listRes = await request(app).get('/api/cases');
      const sampleCaseId = listRes.body.cases[0].caseId;

      const singleRes = await request(app).get(`/api/cases/${sampleCaseId}`);
      expect(singleRes.status).toBe(200);
      expect(singleRes.body.caseId).toBe(sampleCaseId);

      const notFoundRes = await request(app).get('/api/cases/CASE-INVALID-XYZ');
      expect(notFoundRes.status).toBe(404);
      expect(notFoundRes.body.error).toBe('Case Not Found');
    });
  });

  // 2. OWASP Security Headers & Request Tracing Tests
  describe('2. OWASP Security Headers & Request Tracing', () => {
    it('Injects security headers on HTTP responses', async () => {
      const res = await request(app).get('/api/health');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
      expect(res.headers['x-xss-protection']).toBe('1; mode=block');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['content-security-policy']).toBeDefined();
    });

    it('Injects X-Request-Id and X-Response-Time-Ms tracking headers', async () => {
      const res = await request(app).get('/api/health');

      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.headers['x-request-id']).toMatch(/^TRC-/);
      expect(res.headers['x-response-time-ms']).toBeDefined();
      expect(parseFloat(res.headers['x-response-time-ms'])).toBeGreaterThanOrEqual(0);
    });
  });

  // 3. Role-Based Access Control (RBAC) Tests
  describe('3. Role-Based Access Control (RBAC)', () => {
    it('Blocks unauthorized roles from submitting manual underwriter review with 403 Forbidden', async () => {
      // 1. Create case in memory
      const invRes = await AgentOrchestrator.investigate({
        caseTitle: 'RBAC Authorization Check Case',
        merchantData: {
          merchantId: 'MERCHANT_COMPROMISED_002',
          transactions: [500, 600, 800],
          previousMonthSales: 1000,
          disputes: 1,
          refunds: 0
        }
      });

      const caseId = invRes.caseId;

      // 2. Attempt review with unauthorized 'auditor' role (read-only)
      const deniedRes = await request(app)
        .post(`/api/orchestrator/cases/${caseId}/review`)
        .set('x-user-role', 'auditor')
        .send({
          action: 'Approve Standard Flow',
          notes: 'Attempting override with read-only auditor role'
        });

      expect(deniedRes.status).toBe(403);
      expect(deniedRes.body.error).toBe('Forbidden');
      expect(deniedRes.body.message).toContain('not authorized');

      // 3. Attempt review with authorized 'underwriter' role
      const authorizedRes = await request(app)
        .post(`/api/orchestrator/cases/${caseId}/review`)
        .set('x-user-role', 'underwriter')
        .send({
          action: 'Approve Standard Flow',
          notes: 'Authorized underwriter approval'
        });

      expect(authorizedRes.status).toBe(200);
      expect(authorizedRes.body.success).toBe(true);
    });
  });

  // 4. Input Sanitization & Anti-XSS Tests
  describe('4. Input Sanitization', () => {
    it('Sanitizes malicious script tags and event handlers from incoming payload text', async () => {
      const maliciousPayload = {
        caseTitle: 'Test Invoice <script>alert("XSS")</script>',
        invoiceText: 'Billing notice with <img src=x onerror=alert(1)> and legitimate Net 30 terms.'
      };

      const res = await request(app)
        .post('/api/orchestrator/investigate')
        .send(maliciousPayload);

      expect(res.status).toBe(200);
      // Ensure raw dangerous tags were stripped
      expect(res.body.humanReadableExplanation).not.toContain('<script>');
      expect(res.body.humanReadableExplanation).not.toContain('onerror=');
    });
  });

  // 5. Caching & Performance Tests
  describe('5. Caching & Performance Acceleration', () => {
    it('Accelerates repeated investigations via in-memory caching and request deduplication', async () => {
      appCache.clear();

      const payload = {
        caseTitle: 'Cache Acceleration Test',
        merchantData: {
          merchantId: 'MERCHANT_GROWTH_001',
          transactions: [120, 150, 180, 200, 250, 300, 310, 290, 400, 350],
          previousMonthSales: 800,
          disputes: 0,
          refunds: 0,
          accountAgeDays: 180,
          unverifiedPayerRatio: 5
        }
      };

      // First call: computes and caches
      const start1 = Date.now();
      const res1 = await AgentOrchestrator.investigate(payload);
      const dur1 = Date.now() - start1;

      expect(res1.caseId).toBeDefined();

      // Second call: served from memory cache in sub-10ms
      const start2 = Date.now();
      const res2 = await AgentOrchestrator.investigate(payload);
      const dur2 = Date.now() - start2;

      expect(res2.caseId).toBe(res1.caseId);
      expect(dur2).toBeLessThanOrEqual(Math.max(dur1, 15));

      const stats = appCache.getStats();
      expect(stats.hits).toBeGreaterThanOrEqual(1);
    });
  });
});
