# ultralog

A comprehensive, production-ready logging library for Node.js applications with framework integrations, observability features, and advanced configuration options.

## Overview

Ultralog is a powerful and flexible logging framework designed for modern Node.js applications. It provides a unified interface for logging across multiple transports, with built-in support for observability, metrics collection, distributed tracing, and framework integrations.

## Features

- 🚀 **Multiple Transports**: Console, File, AWS CloudWatch, GCP Stackdriver, HTTP, Database
- 🔧 **Highly Configurable**: Opinionated defaults with full customization support
- 📊 **Built-in Metrics**: Automatic metrics collection and reporting
- 🔍 **Distributed Tracing**: Support for correlation IDs and request tracing
- 🏗️ **Framework Integrations**: NestJS, Express, Fastify out of the box
- ⚡ **Performance Optimized**: Async logging with buffering and batching
- 🛡️ **Resilient**: Graceful degradation and error recovery
- 📝 **Structured Logging**: JSON and text formats with custom formatters
- 🎯 **TypeScript First**: Full type safety and IntelliSense support

## Installation

```bash
npm install ultralog
```

### Optional Dependencies

For specific transports and framework integrations:

```bash
# AWS CloudWatch
npm install winston-cloudwatch

# GCP Stackdriver
npm install @google-cloud/logging-winston

# Framework integrations
npm install @nestjs/common express fastify
```

## Quick Start

### Basic Usage

```typescript
import { Logger } from 'ultralog';

// Simple console logging
const logger = await Logger.create('console');
await logger.info('Hello, world!');
await logger.error('Something went wrong', { error: 'Database connection failed' });
```

### Advanced Configuration

```typescript
import { Logger, LoggerConfig } from 'ultralog';

const config: LoggerConfig = {
  transport: 'multiple',
  level: 'info',
  format: 'json',
  context: {
    service: 'my-app',
    version: '1.0.0',
    environment: 'production'
  },
  transportConfig: {
    console: { level: 'warn' },
    file: { filename: 'app.log', level: 'info' },
    aws: { logGroupName: 'my-app-logs' }
  },
  metrics: { enabled: true },
  tracing: true,
  async: true,
  bufferSize: 100
};

const logger = await Logger.createWithConfig(config);
```

## Framework Integrations

### NestJS

```typescript
import { Module } from '@nestjs/common';
import { UltralogModule, UltralogService } from 'ultralog';

@Module({
  imports: [
    UltralogModule.forRoot({
      transport: 'console',
      level: 'info',
      format: 'json',
      context: { service: 'my-nestjs-app' },
      metrics: { enabled: true }
    })
  ],
  providers: [MyService],
})
export class AppModule {}

@Injectable()
export class MyService {
  constructor(private readonly logger: UltralogService) {}
  
  async doSomething() {
    this.logger.info('Doing something', 'MyService');
  }
}
```

### Express

```typescript
import express from 'express';
import { Logger, requestLogger, errorLogger } from 'ultralog';

const app = express();
const logger = await Logger.create('console');

app.use(requestLogger({ logger }));
app.use(errorLogger(logger));

app.get('/users/:id', (req, res) => {
  const requestLogger = req.logger; // Added by middleware
  requestLogger.info('Fetching user', { userId: req.params.id });
  res.json({ id: req.params.id, name: 'John Doe' });
});
```

### Fastify

```typescript
import Fastify from 'fastify';
import { Logger, fastifyLoggerPlugin } from 'ultralog';

const fastify = Fastify();
const logger = await Logger.create('console');

await fastify.register(fastifyLoggerPlugin, { logger });

fastify.get('/users/:id', async (request, reply) => {
  request.logger.info('Fetching user', { userId: request.params.id });
  return { id: request.params.id, name: 'John Doe' };
});
```

## Configuration

### Logger Configuration

```typescript
interface LoggerConfig {
  // Transport configuration
  transport: 'console' | 'file' | 'aws' | 'gcp' | 'http' | 'database' | 'multiple';
  transportConfig?: TransportConfig;
  
  // Log levels
  level: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  levels?: CustomLevels;
  
  // Formatting
  format: 'text' | 'json' | 'pretty' | 'custom';
  customFormat?: winston.Format;
  
  // Verbose settings
  verbose: boolean;
  verboseFormat: 'text' | 'json';
  
  // Performance
  bufferSize?: number;
  flushInterval?: number;
  async?: boolean;
  
  // Context
  defaultMeta?: Record<string, any>;
  context?: LoggerContext;
  
  // Error handling
  exitOnError?: boolean;
  silent?: boolean;
  
  // Metrics
  metrics?: MetricsConfig;
  
  // Tracing
  tracing?: boolean;
}
```

### Transport Configuration

```typescript
interface TransportConfig {
  console?: ConsoleTransportConfig;
  file?: FileTransportConfig | FileTransportConfig[];
  aws?: AWSCloudWatchConfig;
  gcp?: GCPStackdriverConfig;
  http?: HTTPTransportConfig;
  database?: DatabaseTransportConfig;
  custom?: winston.Transport[];
}
```

## Advanced Features

### Context-Aware Logging

```typescript
const contextualLogger = logger.withContext({
  requestId: 'req-123',
  userId: 'user-456',
  service: 'auth-service'
});

await contextualLogger.info('User authenticated', { action: 'login' });
```

### Distributed Tracing

```typescript
const tracedLogger = logger.withTracing({
  traceId: 'trace-789',
  spanId: 'span-101',
  parentSpanId: 'span-102'
});

await tracedLogger.info('Database query', { query: 'SELECT * FROM users' });
```

### Child Loggers

```typescript
const childLogger = logger.child({ module: 'auth', version: '2.0.0' });
await childLogger.info('Processing authentication');
```

### Metrics Collection

```typescript
const logger = await Logger.createWithConfig({
  transport: 'console',
  metrics: {
    enabled: true,
    counters: ['requests_total', 'errors_total'],
    histograms: ['request_duration'],
    gauges: ['active_connections']
  }
});

// Metrics are automatically collected
const metrics = logger.getMetrics();
console.log(metrics);
```

### Resilient Logging

```typescript
import { ResilientLogger } from 'ultralog';

const resilientLogger = new ResilientLogger(config);

// Automatically falls back to console logging if primary transport fails
await resilientLogger.info('This will work even if AWS CloudWatch is down');
```

## Production Examples

### Development Configuration

```typescript
const devLogger = await Logger.createWithConfig({
  transport: 'console',
  level: 'debug',
  format: 'pretty',
  verbose: true,
  context: {
    service: 'my-app',
    environment: 'development'
  }
});
```

### Production Configuration

```typescript
const prodLogger = await Logger.createWithConfig({
  transport: 'multiple',
  level: 'info',
  format: 'json',
  context: {
    service: 'my-app',
    version: process.env.APP_VERSION,
    environment: 'production',
    region: process.env.AWS_REGION
  },
  transportConfig: {
    console: { level: 'warn' },
    file: [
      { filename: 'logs/app.log', level: 'info' },
      { filename: 'logs/error.log', level: 'error' }
    ],
    aws: {
      logGroupName: process.env.AWS_LOG_GROUP,
      region: process.env.AWS_REGION
    }
  },
  async: true,
  bufferSize: 1000,
  flushInterval: 5000,
  metrics: { enabled: true },
  tracing: true
});
```

## API Reference

### Logger Methods

- `log(level, message, meta?)` - Log a message at specified level
- `fatal(message, meta?)` - Log fatal error
- `error(message, meta?)` - Log error
- `warn(message, meta?)` - Log warning
- `info(message, meta?)` - Log info
- `debug(message, meta?)` - Log debug
- `trace(message, meta?)` - Log trace
- `setLevel(level)` - Set log level
- `getLevel()` - Get current log level
- `setVerbose(enabled)` - Enable/disable verbose logging
- `isVerbose()` - Check if verbose logging is enabled
- `setVerboseFormat(format)` - Set verbose format (text/json)
- `withContext(context)` - Create contextual logger
- `withTracing(tracing)` - Create traced logger
- `child(defaultMeta)` - Create child logger
- `close()` - Close logger and flush buffers
- `getMetrics()` - Get collected metrics
- `resetMetrics()` - Reset metrics

## Examples

Check the `examples/` directory for comprehensive examples:

- `console-example.ts` - Basic usage and features
- `nestjs-example.ts` - NestJS integration
- `express-example.ts` - Express middleware
- `production-example.ts` - Production configuration

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/ashubisht/ultralog)
- 🐛 [Issues](https://github.com/ashubisht/ultralog/issues)
- 💬 [Discussions](https://github.com/ashubisht/ultralog/discussions)
