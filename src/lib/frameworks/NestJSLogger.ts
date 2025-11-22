import { LoggerInterface } from '../types';

// NestJS types - these will be available when @nestjs/common is installed
interface Injectable {
  // This will be available when @nestjs/common is installed
}

interface Inject {
  // This will be available when @nestjs/common is installed
}

interface NestLoggerService {
  log(message: string, context?: string): void;
  error(message: string, trace?: string, context?: string): void;
  warn(message: string, context?: string): void;
  debug(message: string, context?: string): void;
  verbose(message: string, context?: string): void;
}

// Mock decorators for when NestJS is not available
const Injectable = (target: any) => target;
const Inject = (_token: string) => (_target: any, _propertyKey: string | symbol | undefined, _parameterIndex: number) => _target;
import { LoggerConfig, LoggerContext } from '../types';

export const LOGGER_CONFIG = 'LOGGER_CONFIG';
export const LOGGER_INSTANCE = 'LOGGER_INSTANCE';

@Injectable()
export class UltralogService implements NestLoggerService {
  private context?: LoggerContext;

  constructor(
    @Inject(LOGGER_INSTANCE) private readonly logger: LoggerInterface,
    @Inject(LOGGER_CONFIG) private readonly config?: LoggerConfig
  ) {}

  log(message: string, context?: string, meta?: any): void {
    this.logger.info(message, { context, ...meta });
  }

  error(message: string, trace?: string, context?: string, meta?: any): void {
    this.logger.error(message, { trace, context, ...meta });
  }

  warn(message: string, context?: string, meta?: any): void {
    this.logger.warn(message, { context, ...meta });
  }

  debug(message: string, context?: string, meta?: any): void {
    this.logger.debug(message, { context, ...meta });
  }

  verbose(message: string, context?: string, meta?: any): void {
    this.logger.trace(message, { context, ...meta });
  }

  fatal(message: string, context?: string, meta?: any): void {
    this.logger.fatal(message, { context, ...meta });
  }

  withContext(context: LoggerContext): UltralogService {
    const newService = new UltralogService(this.logger, this.config);
    newService.context = { ...this.context, ...context };
    (newService as any).logger = this.logger.withContext(newService.context);
    return newService;
  }

  withTracing(traceId: string, spanId: string, parentSpanId?: string): UltralogService {
    const newService = new UltralogService(this.logger, this.config);
    (newService as any).logger = this.logger.withTracing({ traceId, spanId, parentSpanId });
    return newService;
  }

  child(defaultMeta?: Record<string, any>): UltralogService {
    const newService = new UltralogService(this.logger, this.config);
    (newService as any).logger = this.logger.child(defaultMeta);
    return newService;
  }
}

export class UltralogModule {
  static forRoot(config: LoggerConfig) {
    return {
      module: UltralogModule,
      providers: [
        {
          provide: LOGGER_CONFIG,
          useValue: config,
        },
        {
          provide: LOGGER_INSTANCE,
          useFactory: async (loggerConfig: LoggerConfig) => {
            const { Logger } = await import('../Logger');
            return await Logger.createWithConfig(loggerConfig);
          },
          inject: [LOGGER_CONFIG],
        },
        {
          provide: UltralogService,
          useClass: UltralogService,
        },
        {
          provide: 'LOGGER',
          useExisting: UltralogService,
        },
      ],
      exports: [UltralogService, 'LOGGER'],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<LoggerConfig> | LoggerConfig;
    inject?: any[];
  }) {
    return {
      module: UltralogModule,
      providers: [
        {
          provide: LOGGER_CONFIG,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: LOGGER_INSTANCE,
          useFactory: async (loggerConfig: LoggerConfig) => {
            const { Logger } = await import('../Logger');
            return await Logger.createWithConfig(loggerConfig);
          },
          inject: [LOGGER_CONFIG],
        },
        {
          provide: UltralogService,
          useClass: UltralogService,
        },
        {
          provide: 'LOGGER',
          useExisting: UltralogService,
        },
      ],
      exports: [UltralogService, 'LOGGER'],
    };
  }
}
