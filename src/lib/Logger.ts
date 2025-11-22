import * as winston from "winston";
import { 
  LoggerConfig, 
  LoggerInterface, 
  LogLevel, 
  LogLevelString, 
  LoggerContext, 
  TracingContext, 
  LogEntry,
  DEFAULT_CONFIG 
} from "./types";
import { Verbose } from "./Verbose";
import { TransportFactory } from "./transports/TransportFactory";
import { MetricsCollector } from "./metrics/MetricsCollector";

export class Logger implements LoggerInterface {
  private logger!: winston.Logger;
  private verboseInfo: Verbose;
  private verboseFormat: "text" | "json" = "text";
  private config: LoggerConfig;
  private context?: LoggerContext;
  private tracing?: TracingContext;
  private metricsCollector?: MetricsCollector;
  private buffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isAsync: boolean = false;

  private constructor(config: LoggerConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.verboseInfo = new Verbose(this.config.context, this.tracing);
    this.isAsync = this.config.async || false;
    
    if (this.config.metrics?.enabled) {
      this.metricsCollector = new MetricsCollector(this.config.metrics);
    }
  }

  public static async create(
    transport: "aws" | "gcp" | "console" | "file" | "http" | "database" | "multiple",
    config?: Partial<LoggerConfig>
  ): Promise<Logger> {
    const loggerConfig: LoggerConfig = {
      ...DEFAULT_CONFIG,
      transport,
      ...config
    };
    
    const logger = new Logger(loggerConfig);
    await logger.initialize();
    return logger;
  }

  public static async createWithConfig(config: LoggerConfig): Promise<Logger> {
    const logger = new Logger(config);
    await logger.initialize();
    return logger;
  }

  private async initialize() {
    const transports = await TransportFactory.createTransports(
      this.config.transport,
      this.config.transportConfig,
      this.config.level
    );

    this.logger = winston.createLogger({
      level: this.config.level,
      levels: this.config.levels || winston.config.npm.levels,
      format: this.getFormat(),
      transports,
      exitOnError: this.config.exitOnError,
      silent: this.config.silent,
    });

    // Set up async buffering if enabled
    if (this.isAsync) {
      this.setupAsyncBuffering();
    }
  }

  private setupAsyncBuffering() {
    if (this.config.flushInterval) {
      this.flushTimer = setInterval(() => {
        this.flush();
      }, this.config.flushInterval);
    }
  }

  private getFormat() {
    const formats: any[] = [];

    // Add timestamp
    formats.push(winston.format.timestamp());

    // Add custom format if provided
    if (this.config.format === 'custom' && this.config.customFormat) {
      formats.push(this.config.customFormat);
    } else if (this.config.format === 'json') {
      formats.push(winston.format.json());
    } else if (this.config.format === 'pretty') {
      formats.push(winston.format.prettyPrint());
    } else {
      // Default text format
      formats.push(winston.format.printf((info: winston.Logform.TransformableInfo) => {
        const base = `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`;
        const extra = this.verboseInfo.print();
        const meta = info.meta ? ` | ${JSON.stringify(info.meta)}` : '';
        return extra ? `${base} | ${extra}${meta}` : `${base}${meta}`;
      }));
    }

    // Add verbose information if enabled
    if (this.verboseInfo.enabled && this.verboseFormat === "json") {
      formats.push(
        winston.format.printf((info: winston.Logform.TransformableInfo) => {
          const obj: Record<string, unknown> = {
            timestamp: info.timestamp,
            level: info.level,
            message: info.message,
            verbose: this.verboseInfo.toObject(),
            meta: info.meta || undefined,
            context: this.context,
            tracing: this.tracing,
          };
          return JSON.stringify(obj);
        })
      );
    }

    return winston.format.combine(...formats);
  }

  public async log(level: LogLevelString, message: string, meta?: any): Promise<void> {
    const logEntry: LogEntry = {
      message,
      level: LogLevel[level.toUpperCase() as keyof typeof LogLevel],
      timestamp: new Date(),
      context: this.context,
      meta,
      correlationId: this.context?.correlationId,
      requestId: this.context?.requestId,
      traceId: this.tracing?.traceId,
      spanId: this.tracing?.spanId,
    };

    // Record metrics
    if (this.metricsCollector) {
      this.metricsCollector.recordLog(level, message, meta);
    }

    if (this.isAsync) {
      this.buffer.push(logEntry);
      
      if (this.config.bufferSize && this.buffer.length >= this.config.bufferSize) {
        await this.flush();
      }
    } else {
      this.logger.log(level, message, { meta, context: this.context, tracing: this.tracing });
    }
  }

  public async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    for (const entry of entries) {
      const level = LogLevel[entry.level] as LogLevelString;
      this.logger.log(level, entry.message, { 
        meta: entry.meta, 
        context: entry.context, 
        tracing: this.tracing 
      });
    }
  }

  public async fatal(message: string, meta?: any): Promise<void> {
    return this.log('fatal', message, meta);
  }

  public async error(message: string, meta?: any): Promise<void> {
    return this.log('error', message, meta);
  }

  public async warn(message: string, meta?: any): Promise<void> {
    return this.log('warn', message, meta);
  }

  public async info(message: string, meta?: any): Promise<void> {
    return this.log('info', message, meta);
  }

  public async debug(message: string, meta?: any): Promise<void> {
    return this.log('debug', message, meta);
  }

  public async trace(message: string, meta?: any): Promise<void> {
    return this.log('trace', message, meta);
  }

  public setLevel(level: LogLevelString): void {
    this.config.level = level;
    this.logger.level = level;
  }

  public getLevel(): LogLevelString {
    return this.config.level;
  }

  public setVerbose(enabled: boolean): void {
    this.verboseInfo.enabled = enabled;
    this.config.verbose = enabled;
    this.logger.format = this.getFormat();
  }

  public isVerbose(): boolean {
    return this.verboseInfo.enabled;
  }

  public setVerboseFormat(format: "text" | "json"): void {
    this.verboseFormat = format;
    this.config.verboseFormat = format;
    this.logger.format = this.getFormat();
  }

  public withContext(context: LoggerContext): LoggerInterface {
    const newLogger = new Logger(this.config);
    newLogger.context = { ...this.context, ...context };
    newLogger.verboseInfo.setContext(newLogger.context);
    newLogger.logger = this.logger;
    newLogger.metricsCollector = this.metricsCollector;
    return newLogger;
  }

  public withTracing(tracing?: TracingContext): LoggerInterface {
    const newLogger = new Logger(this.config);
    newLogger.tracing = tracing || this.generateTracingContext();
    newLogger.verboseInfo.setTracing(newLogger.tracing);
    newLogger.logger = this.logger;
    newLogger.metricsCollector = this.metricsCollector;
    return newLogger;
  }

  public child(defaultMeta?: Record<string, any>): LoggerInterface {
    const newLogger = new Logger(this.config);
    newLogger.context = { ...this.context, ...defaultMeta };
    newLogger.verboseInfo.setContext(newLogger.context);
    newLogger.logger = this.logger.child(defaultMeta || {});
    newLogger.metricsCollector = this.metricsCollector;
    return newLogger;
  }

  public async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    if (this.buffer.length > 0) {
      await this.flush();
    }
    
    await new Promise<void>((resolve) => {
      this.logger.close();
      resolve();
    });
  }

  public getMetrics() {
    return this.metricsCollector?.getMetrics();
  }

  public resetMetrics() {
    this.metricsCollector?.reset();
  }

  private generateTracingContext(): TracingContext {
    return {
      traceId: this.generateId(),
      spanId: this.generateId(),
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
