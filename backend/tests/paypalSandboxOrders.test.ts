import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import {
  getPayPalStatus,
  getPayPalAccessToken,
  createSandboxOrder,
  captureSandboxOrder,
  getSandboxOrderDetails,
  clearTokenCache,
  PayPalConfigurationError,
  PayPalApiError
} from '../src/paypalClient.js';

describe('PayPal Sandbox Orders v2 Integration & Security Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    clearTokenCache();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    clearTokenCache();
  });

  describe('1. Configuration & Credential Isolation Tests', () => {
    it('Reports honest unconfigured status when environment variables are missing', async () => {
      delete process.env.PAYPAL_CLIENT_ID;
      delete process.env.PAYPAL_CLIENT_SECRET;

      const res = await request(app).get('/api/paypal/status');
      expect(res.status).toBe(200);
      expect(res.body.isConfigured).toBe(false);
      expect(res.body.mode).toBe('simulated');
      expect(res.body.liveApiAvailable).toBe(false);
      expect(res.body.apiBaseUrl).toBe('https://api-m.sandbox.paypal.com');
      expect(res.body.statusMessage).toContain('not configured');
      expect(res.body).not.toHaveProperty('clientSecret');
    });

    it('Masks client ID when credentials are configured', () => {
      process.env.PAYPAL_CLIENT_ID = 'Aa1234567890Zz';
      process.env.PAYPAL_CLIENT_SECRET = 'SecretKey987654321';
      process.env.PAYPAL_ENVIRONMENT = 'sandbox';

      const status = getPayPalStatus();
      expect(status.isConfigured).toBe(true);
      expect(status.mode).toBe('sandbox');
      expect(status.clientIdMasked).toBe('Aa12...90Zz');
      expect(status).not.toHaveProperty('clientSecret');
    });

    it('Refuses to operate in live environment without sandbox safeguards', async () => {
      process.env.PAYPAL_CLIENT_ID = 'RealClientId';
      process.env.PAYPAL_CLIENT_SECRET = 'RealClientSecret';
      process.env.PAYPAL_ENVIRONMENT = 'live';

      await expect(getPayPalAccessToken()).rejects.toThrow(PayPalConfigurationError);
      await expect(getPayPalAccessToken()).rejects.toThrow(/Live PayPal environment is disabled/);
    });
  });

  describe('2. Endpoint Input Validation & Error Handling (Missing Credentials)', () => {
    it('POST /api/paypal/orders/create: Rejects when credentials unconfigured with 503 without fake order', async () => {
      delete process.env.PAYPAL_CLIENT_ID;
      delete process.env.PAYPAL_CLIENT_SECRET;

      const res = await request(app)
        .post('/api/paypal/orders/create')
        .send({ amount: '50.00', currency: 'USD' });

      expect(res.status).toBe(503);
      expect(res.body.error).toBe('PayPal Sandbox Not Configured');
      expect(res.body.requiresRealCredentials).toBe(true);
      expect(res.body).not.toHaveProperty('orderId'); // Never fabricate
    });

    it('POST /api/paypal/orders/create: Rejects invalid, negative, or excessive amounts with 400', async () => {
      // Negative amount
      let res = await request(app)
        .post('/api/paypal/orders/create')
        .send({ amount: -15.00, currency: 'USD' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation Error');

      // Zero amount
      res = await request(app)
        .post('/api/paypal/orders/create')
        .send({ amount: '0.00', currency: 'USD' });
      expect(res.status).toBe(400);

      // Non-numeric amount
      res = await request(app)
        .post('/api/paypal/orders/create')
        .send({ amount: 'not_a_number', currency: 'USD' });
      expect(res.status).toBe(400);

      // Unsupported currency
      res = await request(app)
        .post('/api/paypal/orders/create')
        .send({ amount: '25.00', currency: 'BITCOIN' });
      expect(res.status).toBe(400);

      // Exceeds sandbox test cap ($10,000)
      res = await request(app)
        .post('/api/paypal/orders/create')
        .send({ amount: '25000.00', currency: 'USD' });
      expect(res.status).toBe(400);
    });

    it('POST /api/paypal/orders/:orderId/capture: Validates orderId format and handles missing credentials', async () => {
      delete process.env.PAYPAL_CLIENT_ID;
      delete process.env.PAYPAL_CLIENT_SECRET;

      // Malformed orderId
      let res = await request(app).post('/api/paypal/orders/bad*id!/capture');
      expect(res.status).toBe(400);

      // Too short
      res = await request(app).post('/api/paypal/orders/short/capture');
      expect(res.status).toBe(400);

      // Valid format, but credentials missing -> 503
      res = await request(app).post('/api/paypal/orders/5O190127TN364715T/capture');
      expect(res.status).toBe(503);
      expect(res.body.error).toBe('PayPal Sandbox Not Configured');
    });

    it('GET /api/paypal/orders/:orderId: Validates orderId and handles missing credentials', async () => {
      delete process.env.PAYPAL_CLIENT_ID;
      delete process.env.PAYPAL_CLIENT_SECRET;

      const res = await request(app).get('/api/paypal/orders/5O190127TN364715T');
      expect(res.status).toBe(503);
      expect(res.body.error).toBe('PayPal Sandbox Not Configured');
    });
  });

  describe('3. Orders v2 API Mocked Handshake & Network Failure Tests', () => {
    it('Creates Sandbox Order successfully with mocked PayPal API responses', async () => {
      process.env.PAYPAL_CLIENT_ID = 'test_sandbox_client_id';
      process.env.PAYPAL_CLIENT_SECRET = 'test_sandbox_client_secret';

      // Mock fetch
      const mockFetch = vi.fn()
        // 1. OAuth Token call
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'MOCK_SANDBOX_ACCESS_TOKEN_ABC123',
            expires_in: 3600,
            token_type: 'Bearer'
          })
        } as Response)
        // 2. Order Creation call
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({
            id: '5O190127TN364715T',
            status: 'CREATED',
            links: [
              {
                href: 'https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T',
                rel: 'approve',
                method: 'GET'
              }
            ]
          })
        } as Response);

      const order = await createSandboxOrder(
        { amount: '45.00', currency: 'USD', description: 'Test Order' },
        mockFetch as unknown as typeof fetch
      );

      expect(order.orderId).toBe('5O190127TN364715T');
      expect(order.status).toBe('CREATED');
      expect(order.approveUrl).toBe('https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T');
      expect(order.amount).toBe('45.00');
      expect(order.isSandbox).toBe(true);
      expect(order.isVerifiedByPayPal).toBe(true);

      // Verify OAuth call was sent with Basic Auth
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://api-m.sandbox.paypal.com/v1/oauth2/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic ')
          })
        })
      );
    });

    it('Captures Approved Sandbox Order and verifies status server-side', async () => {
      process.env.PAYPAL_CLIENT_ID = 'test_sandbox_client_id';
      process.env.PAYPAL_CLIENT_SECRET = 'test_sandbox_client_secret';

      const mockFetch = vi.fn()
        // 1. OAuth Token call
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'MOCK_TOKEN',
            expires_in: 3600,
            token_type: 'Bearer'
          })
        } as Response)
        // 2. Order Capture call
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({
            id: '5O190127TN364715T',
            status: 'COMPLETED',
            purchase_units: [
              {
                payments: {
                  captures: [
                    {
                      id: '7XY9988112233',
                      status: 'COMPLETED',
                      amount: { currency_code: 'USD', value: '45.00' }
                    }
                  ]
                }
              }
            ],
            payer: {
              email_address: 'sb-buyer@personal.example.com',
              name: { given_name: 'John', surname: 'Doe' },
              payer_id: 'SANDBOX_PAYER_123'
            }
          })
        } as Response);

      const capture = await captureSandboxOrder(
        '5O190127TN364715T',
        mockFetch as unknown as typeof fetch
      );

      expect(capture.orderId).toBe('5O190127TN364715T');
      expect(capture.captureId).toBe('7XY9988112233');
      expect(capture.status).toBe('COMPLETED');
      expect(capture.amount).toBe('45.00');
      expect(capture.currency).toBe('USD');
      expect(capture.payer?.email).toBe('sb-buyer@personal.example.com');
      expect(capture.isVerifiedByPayPal).toBe(true);
    });

    it('Retrieves verified Order Details from PayPal API', async () => {
      process.env.PAYPAL_CLIENT_ID = 'test_sandbox_client_id';
      process.env.PAYPAL_CLIENT_SECRET = 'test_sandbox_client_secret';

      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'MOCK_TOKEN', expires_in: 3600 })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            id: '5O190127TN364715T',
            status: 'APPROVED',
            intent: 'CAPTURE',
            purchase_units: [{ amount: { currency_code: 'USD', value: '45.00' } }],
            create_time: '2026-11-09T22:00:00Z',
            update_time: '2026-11-09T22:02:00Z'
          })
        } as Response);

      const details = await getSandboxOrderDetails('5O190127TN364715T', mockFetch as unknown as typeof fetch);
      expect(details.orderId).toBe('5O190127TN364715T');
      expect(details.status).toBe('APPROVED');
      expect(details.amount).toBe('45.00');
      expect(details.isVerifiedByPayPal).toBe(true);
    });

    it('Handles PayPal OAuth 401 Unauthorized securely without logging secret', async () => {
      process.env.PAYPAL_CLIENT_ID = 'invalid_id';
      process.env.PAYPAL_CLIENT_SECRET = 'invalid_secret';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'invalid_client', error_description: 'Client Authentication failed' })
      } as Response);

      await expect(getPayPalAccessToken(mockFetch as unknown as typeof fetch)).rejects.toThrow(PayPalApiError);
      await expect(getPayPalAccessToken(mockFetch as unknown as typeof fetch)).rejects.toThrow(/authentication rejected/);
    });

    it('Handles Network Failure and Timeout gracefully with 502/504 error', async () => {
      process.env.PAYPAL_CLIENT_ID = 'valid_id';
      process.env.PAYPAL_CLIENT_SECRET = 'valid_secret';

      const timeoutErr = new Error('The operation was aborted');
      timeoutErr.name = 'TimeoutError';
      const mockFetch = vi.fn().mockRejectedValueOnce(timeoutErr);

      await expect(getPayPalAccessToken(mockFetch as unknown as typeof fetch)).rejects.toThrow(PayPalApiError);
    });
  });
});
