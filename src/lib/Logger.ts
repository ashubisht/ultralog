import * as winston from "winston";
import { Verbose } from "./Verbose.js";
import { Transport } from "./ILogMapper.js";

export class Logger {
  private logger: winston.Logger;
  private readonly verboseInfo = new Verbose();
  private verboseFormat: "text" | "json" = "text";
  private transportType: Transport = "console";

  private constructor() {
    this.logger = winston.createLogger();
  }

  public static async create(
    transport: Transport,
    config?: winston.transport.TransportStreamOptions
  ): Promise<Logger> {
    const logger = new Logger();
    await logger.initialize(transport, config);
    return logger;
  }

  private async initialize(
    transport: Transport,
    config?: winston.transport.TransportStreamOptions
  ) {
    this.transportType = transport;
    this.logger = winston.createLogger({
      level: "silly",
      format: this.getFormat(),
      transports: [await this.getTransport(transport, config)],
      exitOnError: true,
    });
  }

  private getFormat() {
    const isConsole = this.transportType === "console";

    if (this.verboseInfo.enabled && this.verboseFormat === "json") {
      return winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf((info: winston.Logform.TransformableInfo) => {
          const obj: Record<string, unknown> = {
            timestamp: info.timestamp,
            level: info.level,
            message: info.message,
            verbose: this.verboseInfo.toObject(),
            meta: info.metadata || undefined,
          };
          return JSON.stringify(obj);
        })
      );
    }

    const format = [
      winston.format.timestamp(),
      ...(isConsole ? [winston.format.colorize()] : []),
      winston.format.printf((info: winston.Logform.TransformableInfo) => {
        const base = `${info.timestamp} ${info.level}: ${info.message}`;
        const extra = this.verboseInfo.print();
        return extra ? `${base} | ${extra}` : base;
      }),
    ];
    return winston.format.combine(...format);
  }

  // parseVerboseToObject removed in favor of Verbose.toObject()

  private async getTransport(
    transport: Transport,
    config?: winston.transport.TransportStreamOptions
  ) {
    switch (transport) {
      case "aws":
        try {
          const CloudWatchTransport = await import("winston-cloudwatch");
          return new CloudWatchTransport(config);
        } catch (_e) {
          throw new Error(
            "winston-cloudwatch is not installed. Please install it to use the aws transport."
          );
        }
      case "gcp":
        try {
          const { LoggingWinston } = await import(
            "@google-cloud/logging-winston"
          );
          return new LoggingWinston(config);
        } catch (_e) {
          throw new Error(
            "@google-cloud/logging-winston is not installed. Please install it to use the gcp transport."
          );
        }
      case "opensearch":
        try {
          const { OpensearchTransport } = await import("winston-opensearch");
          return new OpensearchTransport(config);
        } catch (_e) {
          throw new Error(
            "winston-opensearch is not installed. Please install it to use the opensearch transport."
          );
        }
      case "file":
        return new winston.transports.File(config);
      case "console":
      default:
        return new winston.transports.Console(config);
    }
  }

  public setVerbose(isEnabled: boolean) {
    this.verboseInfo.enabled = isEnabled;
    this.logger.format = this.getFormat();
  }

  public setVerboseFormat(format: "text" | "json") {
    this.verboseFormat = format;
    this.logger.format = this.getFormat();
  }

  public isVerbose() {
    return this.verboseInfo.enabled;
  }

  public info(message: string, ...meta: unknown[]) {
    this.logger.info(message, ...meta);
  }

  public error(message: string, ...meta: unknown[]) {
    this.logger.error(message, ...meta);
  }

  public debug(message: string, ...meta: unknown[]) {
    this.logger.debug(message, ...meta);
  }

  public trace(message: string, ...meta: unknown[]) {
    this.logger.silly(message, ...meta);
  }

  public warn(message: string, ...meta: unknown[]) {
    this.logger.warn(message, ...meta);
  }
}
