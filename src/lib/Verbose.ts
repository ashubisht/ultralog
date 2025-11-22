import { LoggerContext, TracingContext } from './types';

export class Verbose {
  public enabled: boolean = false;
  public context?: LoggerContext;
  public tracing?: TracingContext;

  constructor(context?: LoggerContext, tracing?: TracingContext) {
    this.context = context;
    this.tracing = tracing;
  }

  public print(): string {
    return this.enabled ? this.harshPrint() : "";
  }

  public harshPrint(): string {
    const parts = [
      `GID: ${this.gid()}`,
      `UID: ${this.uid()}`,
      `PID: ${this.pid()}`,
      `MEMORY: { ${this.memory()} }`
    ];

    if (this.context) {
      if (this.context.service) parts.push(`SERVICE: ${this.context.service}`);
      if (this.context.version) parts.push(`VERSION: ${this.context.version}`);
      if (this.context.environment) parts.push(`ENV: ${this.context.environment}`);
      if (this.context.requestId) parts.push(`REQ_ID: ${this.context.requestId}`);
      if (this.context.correlationId) parts.push(`CORR_ID: ${this.context.correlationId}`);
    }

    if (this.tracing) {
      parts.push(`TRACE_ID: ${this.tracing.traceId}`);
      parts.push(`SPAN_ID: ${this.tracing.spanId}`);
      if (this.tracing.parentSpanId) parts.push(`PARENT_SPAN_ID: ${this.tracing.parentSpanId}`);
    }

    return parts.join(', ');
  }

  /**
   * Structured representation of verbose info. Prefer this over parsing the string.
   */
  public toObject() {
    const memInfo = process.memoryUsage();
    const result: any = {
      gid: this.gid(),
      uid: this.uid(),
      pid: this.pid(),
      memory: {
        arrayBuffers: memInfo.arrayBuffers,
        external: memInfo.external,
        heapTotal: memInfo.heapTotal,
        heapUsed: memInfo.heapUsed,
        rss: memInfo.rss,
      },
      uptime: process.uptime(),
      platform: process.platform,
      nodeVersion: process.version,
    };

    if (this.context) {
      result.context = this.context;
    }

    if (this.tracing) {
      result.tracing = this.tracing;
    }

    return result;
  }

  public setContext(context: LoggerContext): void {
    this.context = { ...this.context, ...context };
  }

  public setTracing(tracing: TracingContext): void {
    this.tracing = tracing;
  }

  private gid(): number {
    // process.getgid may not exist on non-POSIX platforms
    // keep runtime check to avoid exceptions
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return typeof process.getgid === "function" ? process.getgid() : 0;
  }

  private uid(): number {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return typeof process.getuid === "function" ? process.getuid() : 0;
  }

  private pid(): number {
    return process.pid;
  }

  private memory(): string {
    const memInfo = process.memoryUsage();
    return `ArrayBuffer: ${memInfo.arrayBuffers}, External: ${memInfo.external}, HeapTotal: ${memInfo.heapTotal}, HeapUsed: ${memInfo.heapUsed}, RSS: ${memInfo.rss}`;
  }
}
