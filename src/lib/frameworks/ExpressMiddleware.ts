import { LoggerInterface } from '../types';

// Express types - these will be available when express is installed
interface Request {
  headers: any;
  method: string;
  url: string;
  path: string;
  ip?: string;
  body?: any;
  query?: any;
  params?: any;
  logger?: LoggerInterface;
}

interface Response {
  statusCode: number;
  statusMessage?: string;
  get: (name: string) => string | undefined;
  on: (event: string, listener: () => void) => void;
  end: (chunk?: any, encoding?: any) => void;
}

type NextFunction = () => void;
import { LoggerContext, TracingContext } from '../types';

export interface RequestLoggerOptions {
  logger: LoggerInterface;
  generateRequestId?: boolean;
  includeHeaders?: string[];
  excludeHeaders?: string[];
  includeBody?: boolean;
  maxBodyLength?: number;
  skipPaths?: string[];
  skipStatusCodes?: number[];
}

export function requestLogger(options: RequestLoggerOptions) {
  const {
    logger,
    generateRequestId = true,
    includeHeaders = ['user-agent', 'x-forwarded-for', 'x-real-ip'],
    excludeHeaders = ['authorization', 'cookie'],
    includeBody = false,
    maxBodyLength = 1000,
    skipPaths = ['/health', '/metrics'],
    skipStatusCodes = []
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = generateRequestId ? generateId() : req.headers['x-request-id'] as string;
    
    // Skip logging for specified paths
    if (skipPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Create request context
    const context: LoggerContext = {
      requestId,
      service: process.env.SERVICE_NAME || 'express-app',
      environment: process.env.NODE_ENV as any || 'development',
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip || 'unknown',
    };

    // Add tracing if available
    const traceId = req.headers['x-trace-id'] as string || generateId();
    const spanId = req.headers['x-span-id'] as string || generateId();
    const tracing: TracingContext = { traceId, spanId };

    // Create contextual logger
    const requestLogger = logger
      .withContext(context)
      .withTracing(tracing);

    // Log request start
    requestLogger.info('Request started', {
      method: req.method,
      url: req.url,
      headers: filterHeaders(req.headers, includeHeaders, excludeHeaders),
      body: includeBody ? truncateBody(req.body, maxBodyLength) : undefined,
    });

    // Override res.end to capture response
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Skip logging for specified status codes
      if (!skipStatusCodes.includes(statusCode)) {
        requestLogger.info('Request completed', {
          statusCode,
          duration,
          contentLength: res.get('content-length'),
        });
      }

      // Log errors
      if (statusCode >= 400) {
        requestLogger.error('Request failed', {
          statusCode,
          duration,
          error: res.statusMessage,
        });
      }

      // Call original end
      originalEnd.call(this, chunk, encoding);
    };

  // Handle uncaught errors - this would be available in real Express
  // req.on('error', (error: Error) => {
  //   requestLogger.error('Request error', {
  //     error: error.message,
  //     stack: error.stack,
  //   });
  // });

    next();
  };
}

export function errorLogger(logger: LoggerInterface) {
  return (error: Error, req: Request, _res: Response, next: NextFunction) => {
    const context: LoggerContext = {
      requestId: req.headers['x-request-id'] as string,
      service: process.env.SERVICE_NAME || 'express-app',
      environment: process.env.NODE_ENV as any || 'development',
      method: req.method,
      url: req.url,
    };

    logger.withContext(context).error('Unhandled error', {
      error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.url,
      body: req.body,
      query: req.query,
      params: req.params,
    });

    next();
  };
}

export function healthCheckLogger(logger: LoggerInterface) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    _res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.debug('Health check', {
        path: req.path,
        statusCode: _res.statusCode,
        duration,
      });
    });

    next();
  };
}

function filterHeaders(
  headers: any,
  include: string[],
  exclude: string[]
): Record<string, string> {
  const filtered: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    
    if (exclude.some(excludeKey => lowerKey.includes(excludeKey.toLowerCase()))) {
      continue;
    }
    
    if (include.length === 0 || include.some(includeKey => lowerKey.includes(includeKey.toLowerCase()))) {
      filtered[key] = value as string;
    }
  }
  
  return filtered;
}

function truncateBody(body: any, maxLength: number): any {
  if (!body) return undefined;
  
  const bodyStr = JSON.stringify(body);
  if (bodyStr.length <= maxLength) return body;
  
  return {
    ...body,
    _truncated: true,
    _originalLength: bodyStr.length,
  };
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
