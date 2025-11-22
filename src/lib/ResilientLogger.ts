import { Logger } from './Logger';
import { LoggerInterface } from './types';
import { LoggerConfig, LogLevelString } from './types';
import * as winston from 'winston';

export class ResilientLogger implements LoggerInterface {
  private primaryLogger: LoggerInterface;
  private fallbackLogger: winston.Logger;
  private config: LoggerConfig;
  private errorCount: number = 0;
  private maxErrors: number = 10;
  private errorResetInterval: number = 60000; // 1 minute
  private lastErrorTime: number = 0;

  constructor(config: LoggerConfig) {
    this.config = config;
    this.primaryLogger = Logger.createWithConfig(config) as any;
    this.fallbackLogger = this.createFallbackLogger();
  }

  private createFallbackLogger(): winston.Logger {
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ]
    });
  }

  private shouldUseFallback(): boolean {
    const now = Date.now();
    
    // Reset error count if enough time has passed
    if (now - this.lastErrorTime > this.errorResetInterval) {
      this.errorCount = 0;
    }
    
    return this.errorCount >= this.maxErrors;
  }

  private handleError(error: Error): void {
    this.errorCount++;
    this.lastErrorTime = Date.now();
    
    // Log to fallback logger
    this.fallbackLogger.error('Primary logger error', {
      error: error.message,
      stack: error.stack,
      errorCount: this.errorCount
    });
  }

  public async log(level: LogLevelString, message: string, meta?: any): Promise<void> {
    try {
      if (this.shouldUseFallback()) {
        this.fallbackLogger.log(level, message, meta);
        return;
      }

      await this.primaryLogger.log(level, message, meta);
      this.errorCount = 0; // Reset on successful log
    } catch (error) {
      this.handleError(error as Error);
      this.fallbackLogger.log(level, message, meta);
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
    try {
      this.primaryLogger.setLevel(level);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  public getLevel(): LogLevelString {
    try {
      return this.primaryLogger.getLevel();
    } catch (error) {
      this.handleError(error as Error);
      return 'info';
    }
  }

  public setVerbose(enabled: boolean): void {
    try {
      this.primaryLogger.setVerbose(enabled);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  public isVerbose(): boolean {
    try {
      return this.primaryLogger.isVerbose();
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  public setVerboseFormat(format: "text" | "json"): void {
    try {
      this.primaryLogger.setVerboseFormat(format);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  public withContext(context: any): LoggerInterface {
    try {
      return this.primaryLogger.withContext(context);
    } catch (error) {
      this.handleError(error as Error);
      return this;
    }
  }

  public withTracing(tracing?: any): LoggerInterface {
    try {
      return this.primaryLogger.withTracing(tracing);
    } catch (error) {
      this.handleError(error as Error);
      return this;
    }
  }

  public child(defaultMeta?: Record<string, any>): LoggerInterface {
    try {
      return this.primaryLogger.child(defaultMeta);
    } catch (error) {
      this.handleError(error as Error);
      return this;
    }
  }

  public async close(): Promise<void> {
    try {
      await this.primaryLogger.close();
    } catch (error) {
      this.handleError(error as Error);
    }
    
    await new Promise<void>((resolve) => {
      this.fallbackLogger.close();
      resolve();
    });
  }

  public getErrorCount(): number {
    return this.errorCount;
  }

  public resetErrorCount(): void {
    this.errorCount = 0;
    this.lastErrorTime = 0;
  }

  public isHealthy(): boolean {
    return this.errorCount < this.maxErrors;
  }
}
