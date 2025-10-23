import * as winston from "winston";

export class Logger {
  private logger: winston.Logger;
  private verbose = false;

  private constructor() {
    this.logger = winston.createLogger();
  }

  public static async create(
    transport: "aws" | "gcp" | "console" | "file",
    config?: winston.transport.TransportStreamOptions
  ): Promise<Logger> {
    const logger = new Logger();
    await logger.initialize(transport, config);
    return logger;
  }

  private async initialize(
    transport: "aws" | "gcp" | "console" | "file",
    config?: winston.transport.TransportStreamOptions
  ) {
    this.logger = winston.createLogger({
      level: "silly",
      format: this.getFormat(),
      transports: [await this.getTransport(transport, config)],
      exitOnError: true,
    });
  }

  private getFormat() {
    const format = [
      winston.format.timestamp(),
      winston.format.printf((info: winston.Logform.TransformableInfo) => {
        if (this.verbose) {
          return `${info.timestamp} ${info.level}: ${info.message}`;
        }
        return `${info.timestamp} ${info.level}: ${info.message}`;
      }),
    ];
    return winston.format.combine(...format);
  }

  private async getTransport(
    transport: "aws" | "gcp" | "console" | "file",
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
      case "file":
        return new winston.transports.File(config);
      case "console":
      default:
        return new winston.transports.Console(config);
    }
  }

  public setVerbose(isEnabled: boolean) {
    this.verbose = isEnabled;
    this.logger.format = this.getFormat();
  }

  public isVerbose() {
    return this.verbose;
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
}
