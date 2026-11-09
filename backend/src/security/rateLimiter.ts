import type { Request, Response, NextFunction } from 'express';
import { logger } from '../infrastructure/logging/logger.js';

interface ClientRateLimitRecord {
  requestCount: number;
  windowStart: number;
}

export interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
  errorMessage?: string;
}

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const windowMs = options.windowMs ?? 60000; // 1 minute window
  const maxRequests = options.maxRequests ?? 150; // 150 requests per min
  const clients = new Map<string, ClientRateLimitRecord>();

  // Cleanup expired windows every 2 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of clients.entries()) {
      if (now - record.windowStart > windowMs) {
        clients.delete(key);
      }
    }
  }, Math.max(windowMs, 60000)).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment, allow high capacity unless specifically testing rate limiter
    if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
      next();
      return;
    }

    const clientKey = options.keyGenerator
      ? options.keyGenerator(req)
      : (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown-client';

    const now = Date.now();
    let record = clients.get(clientKey);

    if (!record || now - record.windowStart > windowMs) {
      record = { requestCount: 1, windowStart: now };
      clients.set(clientKey, record);
    } else {
      record.requestCount++;
    }

    const remaining = Math.max(0, maxRequests - record.requestCount);
    const resetTimeSeconds = Math.ceil((record.windowStart + windowMs - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTimeSeconds);

    if (record.requestCount > maxRequests) {
      logger.warn('Rate limit exceeded', {
        clientKey,
        path: req.path,
        requestCount: record.requestCount,
        maxRequests
      });

      res.setHeader('Retry-After', resetTimeSeconds);
      res.status(429).json({
        error: 'Too Many Requests',
        message: options.errorMessage || 'Rate limit exceeded. Please wait before retrying.',
        retryAfterSeconds: resetTimeSeconds
      });
      return;
    }

    next();
  };
}

export const standardApiRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 200
});

export const strictSecurityRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 30,
  errorMessage: 'Excessive requests to sensitive security endpoints. Rate limited.'
});
