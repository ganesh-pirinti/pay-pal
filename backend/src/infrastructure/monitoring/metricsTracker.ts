export interface PerformanceTimingRecord {
  category: 'api' | 'agent' | 'risk_engine' | 'ai_synthesis' | 'database';
  name: string;
  durationMs: number;
  timestamp: string;
}

export interface SystemDiagnostics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptimeSeconds: number;
  environment: string;
  timestamp: string;
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
    externalMB: number;
  };
  metrics: {
    totalRequests: number;
    errorRatePercentage: number;
    averageApiLatencyMs: number;
    p95ApiLatencyMs: number;
    statusCodes: Record<string, number>;
  };
  agentPerformance: Record<string, { count: number; avgDurationMs: number }>;
  activeCircuitBreakers: Record<string, string>;
}

class MetricsTracker {
  private timings: PerformanceTimingRecord[] = [];
  private maxTimingsHistory = 500;
  private totalRequests = 0;
  private statusCodes: Record<string, number> = { '2xx': 0, '4xx': 0, '5xx': 0 };
  private agentTimings: Record<string, number[]> = {
    'Fraud Investigation Agent': [],
    'Invoice Intelligence Agent': [],
    'Merchant Protection Agent': [],
    'Case Manager Agent': []
  };

  /**
   * Record request duration and HTTP status
   */
  public recordApiRequest(durationMs: number, statusCode: number): void {
    this.totalRequests++;

    const category = statusCode >= 500 ? '5xx' : statusCode >= 400 ? '4xx' : '2xx';
    this.statusCodes[category] = (this.statusCodes[category] || 0) + 1;

    this.timings.push({
      category: 'api',
      name: 'http_request',
      durationMs,
      timestamp: new Date().toISOString()
    });

    if (this.timings.length > this.maxTimingsHistory) {
      this.timings.shift();
    }
  }

  /**
   * Record AI agent execution duration
   */
  public recordAgentExecution(agentName: string, durationMs: number): void {
    if (!this.agentTimings[agentName]) {
      this.agentTimings[agentName] = [];
    }
    this.agentTimings[agentName].push(durationMs);
    if (this.agentTimings[agentName].length > 100) {
      this.agentTimings[agentName].shift();
    }

    this.timings.push({
      category: 'agent',
      name: agentName,
      durationMs,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record risk engine evaluation timing
   */
  public recordRiskCalculation(engineName: string, durationMs: number): void {
    this.timings.push({
      category: 'risk_engine',
      name: engineName,
      durationMs,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Compute percentiles from a series of durations
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return parseFloat(sorted[Math.max(0, index)].toFixed(2));
  }

  /**
   * Assemble system diagnostics snapshot
   */
  public getDiagnostics(): SystemDiagnostics {
    const mem = process.memoryUsage();
    const apiLatencies = this.timings
      .filter(t => t.category === 'api')
      .map(t => t.durationMs);

    const totalErrors = (this.statusCodes['5xx'] || 0) + (this.statusCodes['4xx'] || 0);
    const errorRate = this.totalRequests > 0
      ? (totalErrors / this.totalRequests) * 100
      : 0;

    const avgLatency = apiLatencies.length > 0
      ? apiLatencies.reduce((a, b) => a + b, 0) / apiLatencies.length
      : 0;

    const agentStats: Record<string, { count: number; avgDurationMs: number }> = {};
    for (const [name, durations] of Object.entries(this.agentTimings)) {
      agentStats[name] = {
        count: durations.length,
        avgDurationMs: durations.length > 0
          ? parseFloat((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2))
          : 0
      };
    }

    return {
      status: errorRate > 25 ? 'degraded' : 'healthy',
      uptimeSeconds: Math.round(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      memory: {
        heapUsedMB: parseFloat((mem.heapUsed / (1024 * 1024)).toFixed(2)),
        heapTotalMB: parseFloat((mem.heapTotal / (1024 * 1024)).toFixed(2)),
        rssMB: parseFloat((mem.rss / (1024 * 1024)).toFixed(2)),
        externalMB: parseFloat((mem.external / (1024 * 1024)).toFixed(2))
      },
      metrics: {
        totalRequests: this.totalRequests,
        errorRatePercentage: parseFloat(errorRate.toFixed(2)),
        averageApiLatencyMs: parseFloat(avgLatency.toFixed(2)),
        p95ApiLatencyMs: this.calculatePercentile(apiLatencies, 95),
        statusCodes: this.statusCodes
      },
      agentPerformance: agentStats,
      activeCircuitBreakers: {
        paypalOrdersApi: 'CLOSED_HEALTHY',
        aiSynthesisProvider: 'CLOSED_FALLBACK_READY'
      }
    };
  }
}

export const metricsTracker = new MetricsTracker();
