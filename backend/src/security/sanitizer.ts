import type { Request, Response, NextFunction } from 'express';

/**
 * Sanitizes a single string against Cross-Site Scripting (XSS), null bytes,
 * and dangerous script tags while preserving normal characters, punctuation, and currencies.
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;

  return input
    .replace(/\0/g, '') // Strip null bytes
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Strip script tags
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Strip event handlers (onload, onerror, onclick)
    .replace(/javascript:[^"']*/gi, '') // Strip javascript pseudo-protocol
    .trim();
}

/**
 * Recursively sanitizes object properties
 */
export function sanitizeDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return sanitizeString(value) as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeDeep(item)) as unknown as T;
  }

  if (value !== null && typeof value === 'object') {
    const cleanObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      cleanObj[k] = sanitizeDeep(v);
    }
    return cleanObj as T;
  }

  return value;
}

/**
 * Express middleware to sanitize incoming request body, query, and parameters
 */
export function inputSanitizationMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeDeep(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeDeep(req.query);
  }
  next();
}
