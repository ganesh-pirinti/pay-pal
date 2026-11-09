import type {
  PayPalSandboxStatus,
  CreateOrderResult,
  CaptureOrderResult,
  PayPalOrderDetails
} from '../../shared/src/types.js';

/**
 * Official PayPal Orders v2 API Client (Sandbox Environment)
 * 
 * Strict Security Principles:
 * 1. Server-side only: Credentials never exposed to client browsers.
 * 2. Secrets isolation: client secret never logged or serialized in error messages.
 * 3. Enforced Sandbox: Live payment execution disabled to protect real funds.
 * 4. Zero-trust verification: Payments verified exclusively through PayPal API, never trusting client state.
 * 5. Robust resilience: 10-second timeout handling and mapped error responses.
 */

const SANDBOX_BASE_URL = 'https://api-m.sandbox.paypal.com';
const LIVE_BASE_URL = 'https://api-m.paypal.com';
const API_TIMEOUT_MS = 10000;

export class PayPalConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayPalConfigurationError';
  }
}

export class PayPalApiError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode = 502, details?: unknown) {
    super(message);
    this.name = 'PayPalApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// In-memory token cache to avoid redundant token requests
interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}
let tokenCache: CachedToken | null = null;

export function getPayPalEnvironment(): 'sandbox' | 'live' {
  const env = (process.env.PAYPAL_ENVIRONMENT || process.env.PAYPAL_MODE || 'sandbox').toLowerCase().trim();
  return env === 'live' ? 'live' : 'sandbox';
}

export function isPayPalConfigured(): boolean {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  return Boolean(
    clientId &&
    clientSecret &&
    clientId !== 'your_sandbox_client_id_here' &&
    clientSecret !== 'your_sandbox_client_secret_here'
  );
}

export function getPayPalStatus(): PayPalSandboxStatus {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const configured = isPayPalConfigured();
  const environment = getPayPalEnvironment();

  let clientIdMasked: string | null = null;
  if (configured && clientId) {
    clientIdMasked = clientId.length > 8
      ? `${clientId.substring(0, 4)}...${clientId.substring(clientId.length - 4)}`
      : '****';
  }

  const apiBaseUrl = environment === 'live' ? LIVE_BASE_URL : SANDBOX_BASE_URL;

  let statusMessage = '';
  if (configured) {
    statusMessage = `PayPal Sandbox active and configured for Orders v2 API (${apiBaseUrl}). Ready for authenticated test transactions.`;
  } else {
    statusMessage = 'PayPal Sandbox credentials not configured in server environment (PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET required in .env). Operating in zero-trust simulated mode.';
  }

  return {
    isConfigured: configured,
    mode: configured ? 'sandbox' : 'simulated',
    environment,
    clientIdMasked,
    statusMessage,
    requiresRealCredentials: true,
    liveApiAvailable: configured,
    apiBaseUrl
  };
}

/**
 * Retrieve an OAuth 2.0 Client Credentials Access Token from PayPal Sandbox
 */
export async function getPayPalAccessToken(customFetch = fetch): Promise<string> {
  if (!isPayPalConfigured()) {
    throw new PayPalConfigurationError(
      'PayPal Sandbox credentials are not configured on the server. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in backend/.env.'
    );
  }

  const environment = getPayPalEnvironment();
  if (environment === 'live') {
    throw new PayPalConfigurationError(
      'Live PayPal environment is disabled in this hackathon prototype to prevent accidental customer charges. Please set PAYPAL_ENVIRONMENT=sandbox.'
    );
  }

  // Check token cache (refresh if within 60s of expiration)
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60000) {
    return tokenCache.accessToken;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID!.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!.trim();
  const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;

  let res: Response;
  try {
    res = await customFetch(`${SANDBOX_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(API_TIMEOUT_MS)
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new PayPalApiError('PayPal Sandbox OAuth authentication timed out after 10 seconds.', 504);
    }
    throw new PayPalApiError(`Network failure communicating with PayPal Sandbox OAuth: ${err instanceof Error ? err.message : 'Unknown error'}`, 502);
  }

  if (!res.ok) {
    let errBody: unknown;
    try {
      errBody = await res.json();
    } catch {
      errBody = await res.text();
    }
    const message = res.status === 401
      ? 'PayPal Sandbox authentication rejected: Invalid PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET.'
      : `PayPal Sandbox OAuth token request failed with status ${res.status}.`;
    throw new PayPalApiError(message, res.status, errBody);
  }

  interface TokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
  }

  const data = await res.json() as TokenResponse;
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + (data.expires_in * 1000)
  };

  return data.access_token;
}

/**
 * Create a new PayPal Sandbox Order using Orders v2 API
 */
export async function createSandboxOrder(
  input: { amount: string; currency: string; description?: string },
  customFetch = fetch
): Promise<CreateOrderResult> {
  const token = await getPayPalAccessToken(customFetch);

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: input.currency,
          value: input.amount
        },
        description: input.description || 'PayPal TrustShield AI Sandbox Security Order'
      }
    ],
    application_context: {
      brand_name: 'PayPal TrustShield AI',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
      return_url: 'http://localhost:5173/?paypal_approved=true',
      cancel_url: 'http://localhost:5173/?paypal_cancelled=true'
    }
  };

  let res: Response;
  try {
    res = await customFetch(`${SANDBOX_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(API_TIMEOUT_MS)
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new PayPalApiError('PayPal Sandbox Order creation timed out after 10 seconds.', 504);
    }
    throw new PayPalApiError(`Network failure creating PayPal Sandbox order: ${err instanceof Error ? err.message : 'Unknown error'}`, 502);
  }

  interface OrderResponse {
    id: string;
    status: string;
    links?: Array<{ href: string; rel: string; method: string }>;
  }

  if (!res.ok) {
    let errBody: unknown;
    try {
      errBody = await res.json();
    } catch {
      errBody = await res.text();
    }
    throw new PayPalApiError(`PayPal Sandbox Order creation failed (${res.status})`, res.status, errBody);
  }

  const data = await res.json() as OrderResponse;
  const approveLink = data.links?.find(l => l.rel === 'approve')?.href || null;

  return {
    orderId: data.id,
    status: data.status,
    approveUrl: approveLink,
    currency: input.currency,
    amount: input.amount,
    isSandbox: true,
    isVerifiedByPayPal: true,
    createdAt: new Date().toISOString()
  };
}

/**
 * Capture an approved PayPal Sandbox Order using Orders v2 API
 */
export async function captureSandboxOrder(
  orderId: string,
  customFetch = fetch
): Promise<CaptureOrderResult> {
  const token = await getPayPalAccessToken(customFetch);

  let res: Response;
  try {
    res = await customFetch(`${SANDBOX_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      signal: AbortSignal.timeout(API_TIMEOUT_MS)
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new PayPalApiError(`PayPal Sandbox capture timed out for order ${orderId}.`, 504);
    }
    throw new PayPalApiError(`Network failure capturing PayPal Sandbox order: ${err instanceof Error ? err.message : 'Unknown error'}`, 502);
  }

  interface CaptureResponse {
    id: string;
    status: string;
    purchase_units?: Array<{
      payments?: {
        captures?: Array<{
          id: string;
          status: string;
          amount?: { currency_code: string; value: string };
        }>;
      };
    }>;
    payer?: {
      email_address?: string;
      name?: { given_name?: string; surname?: string };
      payer_id?: string;
    };
  }

  if (!res.ok) {
    let errBody: unknown;
    try {
      errBody = await res.json();
    } catch {
      errBody = await res.text();
    }
    const message = res.status === 422
      ? `Cannot capture PayPal order ${orderId}: Order has not been approved by a Sandbox buyer, or has already been captured.`
      : `PayPal Sandbox capture failed (${res.status})`;
    throw new PayPalApiError(message, res.status, errBody);
  }

  const data = await res.json() as CaptureResponse;
  const captureData = data.purchase_units?.[0]?.payments?.captures?.[0];

  const fullName = [data.payer?.name?.given_name, data.payer?.name?.surname].filter(Boolean).join(' ');

  return {
    orderId: data.id,
    captureId: captureData?.id || data.id,
    status: data.status || captureData?.status || 'COMPLETED',
    amount: captureData?.amount?.value || '0.00',
    currency: captureData?.amount?.currency_code || 'USD',
    payer: {
      email: data.payer?.email_address,
      name: fullName || undefined,
      payerId: data.payer?.payer_id
    },
    isSandbox: true,
    isVerifiedByPayPal: true,
    capturedAt: new Date().toISOString()
  };
}

/**
 * Retrieve verified Order Details directly from PayPal Sandbox Orders v2 API
 */
export async function getSandboxOrderDetails(
  orderId: string,
  customFetch = fetch
): Promise<PayPalOrderDetails> {
  const token = await getPayPalAccessToken(customFetch);

  let res: Response;
  try {
    res = await customFetch(`${SANDBOX_BASE_URL}/v2/checkout/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(API_TIMEOUT_MS)
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new PayPalApiError(`PayPal Sandbox order lookup timed out for order ${orderId}.`, 504);
    }
    throw new PayPalApiError(`Network failure querying PayPal Sandbox order: ${err instanceof Error ? err.message : 'Unknown error'}`, 502);
  }

  interface OrderDetailsResponse {
    id: string;
    status: string;
    intent: string;
    purchase_units?: Array<{
      amount?: { currency_code: string; value: string };
    }>;
    create_time?: string;
    update_time?: string;
  }

  if (!res.ok) {
    let errBody: unknown;
    try {
      errBody = await res.json();
    } catch {
      errBody = await res.text();
    }
    throw new PayPalApiError(`PayPal Sandbox order lookup failed (${res.status})`, res.status, errBody);
  }

  const data = await res.json() as OrderDetailsResponse;
  const amountUnit = data.purchase_units?.[0]?.amount;

  return {
    orderId: data.id,
    status: data.status,
    intent: data.intent || 'CAPTURE',
    amount: amountUnit?.value || '0.00',
    currency: amountUnit?.currency_code || 'USD',
    createTime: data.create_time,
    updateTime: data.update_time,
    isSandbox: true,
    isVerifiedByPayPal: true
  };
}

/**
 * Reset token cache (useful for testing and configuration changes)
 */
export function clearTokenCache(): void {
  tokenCache = null;
}
