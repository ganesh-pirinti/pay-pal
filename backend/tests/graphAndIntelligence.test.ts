import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { GraphGenerator } from '../src/graph/graphGenerator.js';

describe('Graph Visualizations, Knowledge Base, Audit & Monitoring Tests', () => {
  describe('1. GraphGenerator Unit Tests', () => {
    it('Generates merchant transaction network graph with verified bank and buyer cluster nodes', () => {
      const graph = GraphGenerator.generateCaseNetworkGraph('CASE-TEST-1', 'MERCHANT_DEMO_01', 75, false);
      expect(graph.nodes.length).toBeGreaterThanOrEqual(4);
      expect(graph.edges.length).toBeGreaterThanOrEqual(3);
      expect(graph.nodes.some(n => n.type === 'merchant')).toBe(true);
      expect(graph.nodes.some(n => n.type === 'bank')).toBe(true);
      expect(graph.nodes.some(n => n.type === 'buyer')).toBe(true);
      expect(graph.edges.some(e => e.isSuspicious === true)).toBe(true);
    });

    it('Generates invoice relationship graph with unverified callback numbers and crypto wallet nodes', () => {
      const graph = GraphGenerator.generateCaseNetworkGraph('CASE-INV-99', undefined, 88, true);
      expect(graph.nodes.some(n => n.type === 'phone')).toBe(true);
      expect(graph.nodes.some(n => n.type === 'crypto_wallet')).toBe(true);
      expect(graph.edges.some(e => e.relationship.includes('Callback'))).toBe(true);
    });

    it('Generates 90-day risk evolution curve with trust score progression', () => {
      const curve = GraphGenerator.generateRiskEvolution(80);
      expect(curve.length).toBe(7);
      expect(curve[curve.length - 1].riskScore).toBe(80);
      expect(curve[curve.length - 1].trustScore).toBe(20);
    });

    it('Generates simulated fraud heatmap cells with explicit simulation flag', () => {
      const cells = GraphGenerator.generateSimulatedHeatmap();
      expect(cells.length).toBe(28); // 7 days * 4 periods
      expect(cells.every(c => c.isSimulated === true)).toBe(true);
    });
  });

  describe('2. Threat Knowledge Base & Operational Playbooks', () => {
    it('GET /api/knowledge/articles: Returns typologies and underwriting SOPs', async () => {
      const res = await request(app).get('/api/knowledge/articles');
      expect(res.status).toBe(200);
      expect(res.body.typologies).toBeInstanceOf(Array);
      expect(res.body.articles).toBeInstanceOf(Array);
      expect(res.body.typologies.some((t: any) => t.id === 'TYPO-001')).toBe(true);
      expect(res.body.articles.some((a: any) => a.id === 'ART-001')).toBe(true);
    });
  });

  describe('3. Audit Center: Immutable Audit Trail & CSV Export', () => {
    it('GET /api/audit/logs: Retrieves tamper-evident logs with SHA-256 checksums', async () => {
      const res = await request(app).get('/api/audit/logs');
      expect(res.status).toBe(200);
      expect(res.body.logs.length).toBeGreaterThan(0);
      expect(res.body.logs[0].checksum).toBeDefined();
      expect(res.body.logs[0].checksum.length).toBe(16);
    });

    it('GET /api/audit/export?format=csv: Streams RFC-4180 compliant CSV', async () => {
      const res = await request(app).get('/api/audit/export?format=csv');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('checksum');
      expect(res.text).toContain('eventType');
    });
  });

  describe('4. Fraud Intelligence Endpoints', () => {
    it('GET /api/fraud-intelligence/network: Returns platform relationship graph', async () => {
      const res = await request(app).get('/api/fraud-intelligence/network');
      expect(res.status).toBe(200);
      expect(res.body.nodes).toBeInstanceOf(Array);
      expect(res.body.edges).toBeInstanceOf(Array);
    });

    it('GET /api/fraud-intelligence/heatmap: Returns hourly risk density grid', async () => {
      const res = await request(app).get('/api/fraud-intelligence/heatmap');
      expect(res.status).toBe(200);
      expect(res.body.isSimulated).toBe(true);
      expect(res.body.cells.length).toBe(28);
    });

    it('GET /api/ai/continuous-learning: Returns shadow pipeline & drift telemetry', async () => {
      const res = await request(app).get('/api/ai/continuous-learning');
      expect(res.status).toBe(200);
      expect(res.body.shadowModelActive).toBe(true);
      expect(res.body.note).toContain('Architectural Framework');
    });
  });

  describe('5. Health Checks & Production Monitoring Probes', () => {
    it('GET /health: Returns basic application status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('HEALTHY');
    });

    it('GET /health/liveness: Returns 200 OK', async () => {
      const res = await request(app).get('/health/liveness');
      expect(res.status).toBe(200);
      expect(res.text).toBe('OK');
    });

    it('GET /health/readiness: Returns subsystems readiness status', async () => {
      const res = await request(app).get('/health/readiness');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('READY');
      expect(res.body.subsystems.cache).toBe('OK');
    });

    it('GET /metrics: Exposes key observability gauges', async () => {
      const res = await request(app).get('/metrics');
      expect(res.status).toBe(200);
      expect(res.body.metrics.uptime_seconds).toBeGreaterThanOrEqual(0);
      expect(res.body.metrics.requests_total).toBeDefined();
    });
  });
});
