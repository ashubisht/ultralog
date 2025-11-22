import { LoggerInterface } from '../types';

// Fastify types - these will be available when fastify is installed
interface FastifyRequest {
  url: string;
  method: string;
  headers: any;
  body?: any;
  query?: any;
  params?: any;
  ip?: string;
  logger?: LoggerInterface;
  startTime?: number;
}

interface FastifyReply {
  statusCode: number;
  statusMessage?: string;
  getHeader: (name: string) => string | undefined;
}

type FastifyPluginAsync<T = any> = (fastify: any, options: T) => Promise<void>;
import { LoggerContext, TracingContext } from '../types';

export interface FastifyLoggerOptions {
  logger: LoggerInterface;
  generateRequestId?: boolean;
  includeHeaders?: string[];
  excludeHeaders?: string[];
  includeBody?: boolean;
  maxBodyLength?: number;
  skipPaths?: string[];
  skipStatusCodes?: number[];
}

export const fastifyLoggerPlugin: FastifyPluginAsync<FastifyLoggerOptions> = async (
  fastify: any,
  options: FastifyLoggerOptions
) => {
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

  // Add request logging hook
  fastify.addHook('onRequest', async (request: FastifyRequest, _reply: FastifyReply) => {
    const startTime = Date.now();
    const requestId = generateRequestId ? generateId() : request.headers['x-request-id'] as string;
    
    // Skip logging for specified paths
    if (skipPaths.some(path => request.url.startsWith(path))) {
      return;
    }

    // Create request context
    const context: LoggerContext = {
      requestId,
      service: process.env.SERVICE_NAME || 'fastify-app',
      environment: process.env.NODE_ENV as any || 'development',
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    };

    // Add tracing if available
    const traceId = request.headers['x-trace-id'] as string || generateId();
    const spanId = request.headers['x-span-id'] as string || generateId();
    const tracing: TracingContext = { traceId, spanId };

    // Store logger in request for use in handlers
    request.logger = logger
      .withContext(context)
      .withTracing(tracing);

    // Log request start
    request.logger.info('Request started', {
      method: request.method,
      url: request.url,
      headers: filterHeaders(request.headers, includeHeaders, excludeHeaders),
      body: includeBody ? truncateBody(request.body, maxBodyLength) : undefined,
    });

    // Store start time for duration calculation
    request.startTime = startTime;
  });

  // Add response logging hook
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.logger || !request.startTime) return;

    const duration = Date.now() - request.startTime;
    const statusCode = reply.statusCode;

    // Skip logging for specified status codes
    if (!skipStatusCodes.includes(statusCode)) {
      request.logger.info('Request completed', {
        statusCode,
        duration,
        contentLength: reply.getHeader('content-length'),
      });
    }

    // Log errors
    if (statusCode >= 400) {
      request.logger.error('Request failed', {
        statusCode,
        duration,
        error: reply.statusMessage,
      });
    }
  });

  // Add error logging hook
  fastify.addHook('onError', async (request: FastifyRequest, _reply: FastifyReply, error: Error) => {
    if (!request.logger) return;

    request.logger.error('Request error', {
      error: error.message,
      stack: error.stack,
      method: request.method,
      url: request.url,
      body: request.body,
      query: request.query,
      params: request.params,
    });
  });

  // Add health check logging
  fastify.addHook('onRoute', (routeOptions: any) => {
    if (routeOptions.path === '/health' || routeOptions.path === '/metrics') {
      routeOptions.preHandler = async (request: FastifyRequest, reply: FastifyReply) => {
        const startTime = Date.now();
        
        // reply.raw.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.debug('Health check', {
          path: request.url,
          statusCode: reply.statusCode,
          duration,
        });
        // });
      };
    }
  });
};

// Extend FastifyRequest interface - this will work when fastify is installed
// declare module 'fastify' {
//   interface FastifyRequest {
//     logger?: LoggerInterface;
//     startTime?: number;
//   }
// }

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
