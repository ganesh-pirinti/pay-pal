import { describe, it, expect } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { app } from '../src/server.js';
import { getPayPalSandboxStatus } from '../src/paypalSandbox.js';

describe('Security Architecture & API Endpoint Tests', () => {

  it('1. GET /api/health: Returns 200 OK and service metadata', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toContain('PayPal TrustShield AI');
  });

  it('2. GET /api/paypal/status: Unconfigured mode reports true status without fabricating credentials', async () => {
    const res = await request(app).get('/api/paypal/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('isConfigured');
    expect(res.body).toHaveProperty('mode');
    expect(res.body).toHaveProperty('statusMessage');

    // In local hackathon test environment without env credentials:
    if (!process.env.PAYPAL_CLIENT_ID) {
      expect(res.body.isConfigured).toBe(false);
      expect(res.body.mode).toBe('simulated');
      expect(res.body.liveApiAvailable).toBe(false);
      expect(res.body.statusMessage).toContain('not configured');
    }

    // Verify secret is NEVER returned in response
    expect(res.body).not.toHaveProperty('clientSecret');
    expect(res.body).not.toHaveProperty('PAYPAL_CLIENT_SECRET');
  });

  it('3. GET /api/summary: Returns simulated dashboard benchmark and clear disclaimer', async () => {
    const res = await request(app).get('/api/summary');
    expect(res.status).toBe(200);
    expect(res.body.isSimulatedData).toBe(true);
    expect(res.body._note).toContain('SIMULATED DATA DEMO');
    expect(res.body.totalTransactionsAnalyzed).toBeGreaterThan(0);
    expect(res.body.riskDistribution).toBeDefined();
    expect(Array.isArray(res.body.recentActivity)).toBe(true);
  });

  it('4. POST /api/seller-protection/analyze: Valid request yields complete risk assessment', async () => {
    const payload = {
      merchantId: 'M-TEST-100',
      transactions: [150, 200, 250],
      previousMonthSales: 500,
      disputes: 0,
      refunds: 0
    };
    const res = await request(app)
      .post('/api/seller-protection/analyze')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.merchantId).toBe('M-TEST-100');
    expect(res.body).toHaveProperty('riskScore');
    expect(res.body).toHaveProperty('category');
    expect(res.body).toHaveProperty('signals');
    expect(res.body).toHaveProperty('metrics');
    expect(res.body.isSimulated).toBe(true);
  });

  it('5. POST /api/seller-protection/analyze: Rejects invalid schema with 400 Bad Request', async () => {
    const invalidPayload = {
      merchantId: '', // Invalid empty ID
      transactions: [-100], // Invalid negative amount
      previousMonthSales: 'not-a-number'
    };
    const res = await request(app)
      .post('/api/seller-protection/analyze')
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
    expect(Array.isArray(res.body.issues)).toBe(true);
    expect(res.body.issues.length).toBeGreaterThan(0);
  });

  it('6. POST /api/invoice-scam/analyze: Valid invoice request yields structured analysis', async () => {
    const payload = {
      invoiceText: 'Invoice #101: Legal consulting services for $1,200. Terms: Net 30.'
    };
    const res = await request(app)
      .post('/api/invoice-scam/analyze')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('riskScore');
    expect(res.body).toHaveProperty('category');
    expect(res.body).toHaveProperty('warnings');
    expect(res.body).toHaveProperty('safeNextSteps');
  });

  it('7. POST /api/invoice-scam/analyze: Empty or missing invoice text rejected with 400', async () => {
    const res = await request(app)
      .post('/api/invoice-scam/analyze')
      .send({ invoiceText: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });

  it('8. Security Static Audit: Frontend code MUST NEVER contain PayPal client secrets or hardcoded credentials', () => {
    const frontendSrcDir = path.resolve(__dirname, '../../frontend/src');
    expect(fs.existsSync(frontendSrcDir)).toBe(true);

    const forbiddenPatterns = [
      /PAYPAL_CLIENT_SECRET/i,
      /client_secret\s*[:=]\s*['"][a-zA-Z0-9_-]{10,}['"]/i,
      /['"](?:sk_live|secret_[a-zA-Z0-9]{20,})['"]/i
    ];

    function scanDirectory(dir: string) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (/\.(tsx?|jsx?|json|css|html)$/.test(file)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const pattern of forbiddenPatterns) {
            // Ensure no forbidden secret pattern appears in source
            const match = content.match(pattern);
            if (match) {
              throw new Error(`CRITICAL SECURITY FAILURE: Potential secret or forbidden token exposed in ${fullPath}: "${match[0]}"`);
            }
          }
        }
      }
    }

    // Execute scan across entire frontend codebase
    scanDirectory(frontendSrcDir);
  });

  it('9. Zero-Fabrication Integrity: Simulated transactions cannot be confused with live production PayPal transactions', () => {
    const sandboxStatus = getPayPalSandboxStatus();
    expect(sandboxStatus.requiresRealCredentials).toBe(true);
    if (!sandboxStatus.isConfigured) {
      expect(sandboxStatus.liveApiAvailable).toBe(false);
      expect(sandboxStatus.mode).toBe('simulated');
    }
  });
});
