import * as winston from 'winston';
import { 
  TransportConfig, 
  ConsoleTransportConfig, 
  FileTransportConfig, 
  AWSCloudWatchConfig, 
  GCPStackdriverConfig,
  HTTPTransportConfig,
  DatabaseTransportConfig,
  LogLevelString
} from '../types';

export class TransportFactory {
  static async createTransports(
    transport: string,
    config?: TransportConfig,
    level?: LogLevelString
  ): Promise<winston.transport[]> {
    const transports: winston.transport[] = [];

    switch (transport) {
      case 'console':
        transports.push(this.createConsoleTransport(config?.console, level));
        break;
      
      case 'file':
        if (Array.isArray(config?.file)) {
          config.file.forEach(fileConfig => {
            transports.push(this.createFileTransport(fileConfig, level));
          });
        } else if (config?.file) {
          transports.push(this.createFileTransport(config.file, level));
        }
        break;
      
      case 'aws':
        if (config?.aws) {
          transports.push(await this.createAWSCloudWatchTransport(config.aws, level));
        }
        break;
      
      case 'gcp':
        if (config?.gcp) {
          transports.push(await this.createGCPStackdriverTransport(config.gcp, level));
        }
        break;
      
      case 'http':
        if (config?.http) {
          transports.push(this.createHTTPTransport(config.http, level));
        }
        break;
      
      case 'database':
        if (config?.database) {
          transports.push(await this.createDatabaseTransport(config.database, level));
        }
        break;
      
      case 'multiple':
        if (config) {
          // Create all configured transports
          if (config.console) {
            transports.push(this.createConsoleTransport(config.console, level));
          }
          if (config.file) {
            if (Array.isArray(config.file)) {
              config.file.forEach(fileConfig => {
                transports.push(this.createFileTransport(fileConfig, level));
              });
            } else {
              transports.push(this.createFileTransport(config.file, level));
            }
          }
          if (config.aws) {
            transports.push(await this.createAWSCloudWatchTransport(config.aws, level));
          }
          if (config.gcp) {
            transports.push(await this.createGCPStackdriverTransport(config.gcp, level));
          }
          if (config.http) {
            transports.push(this.createHTTPTransport(config.http, level));
          }
          if (config.database) {
            transports.push(await this.createDatabaseTransport(config.database, level));
          }
          if (config.custom) {
            transports.push(...config.custom);
          }
        }
        break;
      
      default:
        throw new Error(`Unsupported transport: ${transport}`);
    }

    return transports;
  }

  private static createConsoleTransport(
    config?: ConsoleTransportConfig,
    level?: LogLevelString
  ): winston.transport {
    return new winston.transports.Console({
      level: level || config?.level || 'info',
      silent: config?.silent || false,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    });
  }

  private static createFileTransport(
    config: FileTransportConfig,
    level?: LogLevelString
  ): winston.transport {
    return new winston.transports.File({
      filename: config.filename,
      level: level || config.level || 'info',
      maxsize: config.maxsize || 5242880, // 5MB
      maxFiles: config.maxFiles || 5,
      tailable: config.tailable || true,
      zippedArchive: config.zippedArchive || false,
      format: config.format === 'json' 
        ? winston.format.json() 
        : winston.format.combine(
            winston.format.timestamp(),
            winston.format.simple()
          )
    });
  }

  private static async createAWSCloudWatchTransport(
    config: AWSCloudWatchConfig,
    level?: LogLevelString
  ): Promise<winston.transport> {
    try {
      const CloudWatchTransport = await import('winston-cloudwatch');
      return new CloudWatchTransport({
        logGroupName: config.logGroupName,
        logStreamName: config.logStreamName || `ultralog-${Date.now()}`,
        awsRegion: config.region || 'us-east-1',
        awsAccessKeyId: config.accessKeyId,
        awsSecretKey: config.secretAccessKey,
        retentionInDays: config.retentionInDays || 14,
        level: level || config.level || 'info'
      });
    } catch (error) {
      throw new Error(
        'winston-cloudwatch is not installed. Please install it to use the aws transport: npm install winston-cloudwatch'
      );
    }
  }

  private static async createGCPStackdriverTransport(
    config: GCPStackdriverConfig,
    level?: LogLevelString
  ): Promise<winston.transport> {
    try {
      const { LoggingWinston } = await import('@google-cloud/logging-winston');
      return new LoggingWinston({
        projectId: config.projectId,
        keyFilename: config.keyFilename,
        resource: config.resource || {
          type: 'global'
        },
        level: level || config.level || 'info'
      });
    } catch (error) {
      throw new Error(
        '@google-cloud/logging-winston is not installed. Please install it to use the gcp transport: npm install @google-cloud/logging-winston'
      );
    }
  }

  private static createHTTPTransport(
    config: HTTPTransportConfig,
    level?: LogLevelString
  ): winston.transport {
    // Custom HTTP transport implementation
    return new winston.transports.Http({
      host: new URL(config.url).hostname,
      port: parseInt(new URL(config.url).port) || 80,
      path: new URL(config.url).pathname,
      ssl: new URL(config.url).protocol === 'https:',
      level: level || config.level || 'info',
      headers: config.headers || {},
      format: winston.format.json()
    });
  }

  private static async createDatabaseTransport(
    config: DatabaseTransportConfig,
    level?: LogLevelString
  ): Promise<winston.transport> {
    // This would require additional database-specific packages
    // For now, we'll create a placeholder that could be extended
    throw new Error(
      `Database transport for ${config.type} is not yet implemented. Please use a custom transport or file an issue.`
    );
  }
}
