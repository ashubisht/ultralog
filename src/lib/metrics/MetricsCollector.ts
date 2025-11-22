import { MetricsConfig, LogLevelString } from '../types';

export interface MetricData {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp?: Date;
}

export class MetricsCollector {
  private config: MetricsConfig;
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private gauges: Map<string, number> = new Map();
  private customMetrics: Map<string, any> = new Map();

  constructor(config: MetricsConfig) {
    this.config = config;
  }

  public recordLog(level: LogLevelString, message: string, meta?: any): void {
    if (!this.config.enabled) return;

    // Increment log count by level
    this.incrementCounter(`logs_total`, { level });
    
    // Record log message length
    this.recordHistogram(`log_message_length`, message.length, { level });
    
    // Record metadata size if present
    if (meta && typeof meta === 'object') {
      this.recordHistogram(`log_metadata_size`, JSON.stringify(meta).length, { level });
    }

    // Record specific metrics based on message content
    this.recordCustomMetrics(message, meta);
  }

  public recordCustomMetrics(message: string, meta?: any): void {
    if (!this.config.enabled) return;

    // HTTP request metrics
    if (message.includes('Request') || message.includes('Response')) {
      this.incrementCounter(`http_requests_total`);
      
      if (meta?.statusCode) {
        this.incrementCounter(`http_requests_total`, { status_code: meta.statusCode.toString() });
      }
      
      if (meta?.method) {
        this.incrementCounter(`http_requests_total`, { method: meta.method });
      }
    }

    // Database query metrics
    if (message.includes('Database') || message.includes('Query')) {
      this.incrementCounter(`database_queries_total`);
      
      if (meta?.query) {
        this.recordHistogram(`database_query_duration`, meta.duration || 0);
      }
    }

    // Error metrics
    if (message.includes('Error') || message.includes('Exception')) {
      this.incrementCounter(`errors_total`);
      
      if (meta?.errorType) {
        this.incrementCounter(`errors_total`, { error_type: meta.errorType });
      }
    }

    // User action metrics
    if (message.includes('User') && message.includes('action')) {
      this.incrementCounter(`user_actions_total`);
      
      if (meta?.action) {
        this.incrementCounter(`user_actions_total`, { action: meta.action });
      }
    }
  }

  public incrementCounter(name: string, labels?: Record<string, string>): void {
    if (!this.config.enabled) return;
    
    const key = this.getMetricKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + 1);
  }

  public recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.config.enabled) return;
    
    const key = this.getMetricKey(name, labels);
    const current = this.histograms.get(key) || [];
    current.push(value);
    this.histograms.set(key, current);
  }

  public setGauge(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.config.enabled) return;
    
    const key = this.getMetricKey(name, labels);
    this.gauges.set(key, value);
  }

  public getCounters(): Map<string, number> {
    return new Map(this.counters);
  }

  public getHistograms(): Map<string, number[]> {
    return new Map(this.histograms);
  }

  public getGauges(): Map<string, number> {
    return new Map(this.gauges);
  }

  public getMetrics(): {
    counters: Record<string, number>;
    histograms: Record<string, { count: number; sum: number; avg: number; min: number; max: number }>;
    gauges: Record<string, number>;
  } {
    const counters: Record<string, number> = {};
    const histograms: Record<string, { count: number; sum: number; avg: number; min: number; max: number }> = {};
    const gauges: Record<string, number> = {};

    // Process counters
    for (const [key, value] of this.counters) {
      counters[key] = value;
    }

    // Process histograms
    for (const [key, values] of this.histograms) {
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        histograms[key] = {
          count: values.length,
          sum,
          avg: sum / values.length,
          min: Math.min(...values),
          max: Math.max(...values)
        };
      }
    }

    // Process gauges
    for (const [key, value] of this.gauges) {
      gauges[key] = value;
    }

    return { counters, histograms, gauges };
  }

  public reset(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
    this.customMetrics.clear();
  }

  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    
    const labelString = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    
    return `${name}{${labelString}}`;
  }
}
