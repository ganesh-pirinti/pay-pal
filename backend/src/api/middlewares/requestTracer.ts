import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { logger } from '../../infrastructure/logging/logger.js';
import { metricsTracker } from '../../infrastructure/monitoring/metricsTracker.js';

export function requestTracerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const traceId = (req.headers['x-request-id'] as string) || `TRC-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
  req.headers['x-request-id'] = traceId;
  res.setHeader('X-Request-Id', traceId);

  const startNs = process.hrtime.bigint();

  // Intercept response end before headers are sealed
  const originalEnd = res.end.bind(res);
  (res as unknown as { end: (...args: unknown[]) => Response }).end = function (...args: unknown[]) {
    const elapsedNs = process.hrtime.bigint() - startNs;
    const durationMs = parseFloat((Number(elapsedNs) / 1_000_000).toFixed(2));

    if (!res.headersSent) {
      res.setHeader('X-Response-Time-Ms', durationMs);
    }
    metricsTracker.recordApiRequest(durationMs, res.statusCode);

    logger.info('HTTP Request Processed', {
      traceId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
      clientIp: req.ip || req.socket.remoteAddress
    });

    return originalEnd(...(args as [any, any?]));
  };

  next();
}
