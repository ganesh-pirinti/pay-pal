export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'AUDIT';

export interface LogContext {
  traceId?: string;
  module?: string;
  merchantId?: string;
  caseId?: string;
  durationMs?: number;
  userId?: string;
  role?: string;
  [key: string]: unknown;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

class StructuredLogger {
  private isTest = process.env.NODE_ENV === 'test';

  /**
   * Redact sensitive credentials, authorization headers, and payment card details
   */
  private redactSensitiveData(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.redactSensitiveData(item));
    }

    const sensitiveKeys = ['secret', 'token', 'key', 'password', 'authorization', 'bearer', 'cvv', 'cardnumber'];
    const sanitized: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(obj)) {
      if (sensitiveKeys.some(s => k.toLowerCase().includes(s))) {
        sanitized[k] = '[REDACTED_CREDENTIAL]';
      } else if (typeof v === 'object' && v !== null) {
        sanitized[k] = this.redactSensitiveData(v);
      } else if (typeof v === 'string') {
        sanitized[k] = v.replace(
          /(?:key|secret|token|bearer|password)\s*[:=]\s*['"]?[a-zA-Z0-9_\-]{16,}['"]?/gi,
          '[REDACTED]'
        );
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }

  private emit(level: LogLevel, message: string, context?: LogContext): void {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context ? (this.redactSensitiveData(context) as LogContext) : undefined
    };

    // In testing, only output WARN, ERROR, and AUDIT unless DEBUG is explicitly set
    if (this.isTest && (level === 'DEBUG' || level === 'INFO')) {
      return;
    }

    const output = JSON.stringify(entry);
    if (level === 'ERROR') {
      console.error(output);
    } else if (level === 'WARN') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  public debug(message: string, context?: LogContext): void {
    this.emit('DEBUG', message, context);
  }

  public info(message: string, context?: LogContext): void {
    this.emit('INFO', message, context);
  }

  public warn(message: string, context?: LogContext): void {
    this.emit('WARN', message, context);
  }

  public error(message: string, context?: LogContext): void {
    this.emit('ERROR', message, context);
  }

  public audit(message: string, context?: LogContext): void {
    this.emit('AUDIT', message, context);
  }

  /**
   * Helper to measure elapsed execution time with high-precision hrtime
   */
  public startTimer(operationName: string, initialContext?: LogContext) {
    const start = process.hrtime.bigint();
    return {
      end: (level: LogLevel = 'INFO', completionMessage?: string, additionalContext?: LogContext) => {
        const elapsedNanoseconds = process.hrtime.bigint() - start;
        const durationMs = Number(elapsedNanoseconds) / 1_000_000;
        this.emit(level, completionMessage || `${operationName} completed`, {
          ...initialContext,
          ...additionalContext,
          operationName,
          durationMs: parseFloat(durationMs.toFixed(2))
        });
        return durationMs;
      }
    };
  }
}

export const logger = new StructuredLogger();
