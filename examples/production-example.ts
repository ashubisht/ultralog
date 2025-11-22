import { Logger, ResilientLogger, LoggerConfig } from '../src/lib/Logger';

// Production configuration with multiple transports
const productionConfig: LoggerConfig = {
  transport: 'multiple',
  level: 'info',
  format: 'json',
  context: {
    service: 'my-production-app',
    version: process.env.APP_VERSION || '1.0.0',
    environment: 'production',
    region: process.env.AWS_REGION || 'us-east-1',
    instanceId: process.env.INSTANCE_ID || 'unknown'
  },
  transportConfig: {
    console: {
      level: 'warn' // Only warnings and errors to console in production
    },
    file: [
      {
        filename: 'logs/app.log',
        level: 'info',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10,
        zippedArchive: true
      },
      {
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5 * 1024 * 1024, // 5MB
        maxFiles: 5,
        zippedArchive: true
      }
    ],
    aws: {
      logGroupName: process.env.AWS_LOG_GROUP || 'my-app-logs',
      logStreamName: `${process.env.INSTANCE_ID || 'unknown'}-${Date.now()}`,
      region: process.env.AWS_REGION || 'us-east-1',
      retentionInDays: 30
    }
  },
  async: true,
  bufferSize: 100,
  flushInterval: 5000,
  metrics: {
    enabled: true,
    counters: ['requests_total', 'errors_total', 'database_queries_total'],
    histograms: ['request_duration', 'database_query_duration'],
    gauges: ['active_connections', 'memory_usage']
  },
  tracing: true,
  exitOnError: false // Don't exit on error in production
};

// Create resilient logger for production
const logger = new ResilientLogger(productionConfig);

// Example application logic
class ProductionApp {
  private logger = logger;

  async start() {
    this.logger.info('Application starting', {
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage()
    });

    // Simulate application startup
    await this.initializeDatabase();
    await this.startWebServer();
    await this.startBackgroundJobs();

    this.logger.info('Application started successfully');
  }

  private async initializeDatabase() {
    const startTime = Date.now();
    
    try {
      this.logger.info('Connecting to database');
      
      // Simulate database connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const duration = Date.now() - startTime;
      this.logger.info('Database connected successfully', { duration });
      
      // Record metrics
      this.logger.setGauge('database_connections', 1);
      
    } catch (error) {
      this.logger.error('Database connection failed', {
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime
      });
      throw error;
    }
  }

  private async startWebServer() {
    this.logger.info('Starting web server', { port: process.env.PORT || 3000 });
    
    // Simulate server startup
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.logger.info('Web server started');
  }

  private async startBackgroundJobs() {
    this.logger.info('Starting background jobs');
    
    // Simulate background job
    setInterval(() => {
      this.logger.debug('Background job running', {
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage()
      });
    }, 30000); // Every 30 seconds
  }

  async handleRequest(req: any, res: any) {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || this.generateId();
    
    const contextualLogger = this.logger.withContext({
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    try {
      contextualLogger.info('Request received');
      
      // Simulate request processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const duration = Date.now() - startTime;
      contextualLogger.info('Request completed', {
        statusCode: 200,
        duration
      });
      
      // Record metrics
      this.logger.incrementCounter('requests_total', { method: req.method, status: '200' });
      this.logger.recordHistogram('request_duration', duration);
      
      res.status(200).json({ success: true, requestId });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      contextualLogger.error('Request failed', {
        error: error.message,
        stack: error.stack,
        duration
      });
      
      // Record error metrics
      this.logger.incrementCounter('errors_total', { type: 'request_error' });
      
      res.status(500).json({ 
        error: 'Internal Server Error', 
        requestId 
      });
    }
  }

  async shutdown() {
    this.logger.info('Application shutting down');
    
    // Show final metrics
    const metrics = this.logger.getMetrics();
    this.logger.info('Final metrics', { metrics });
    
    await this.logger.close();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// Example usage
const app = new ProductionApp();

// Start application
app.start().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await app.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await app.shutdown();
  process.exit(0);
});

// Health check endpoint
process.on('message', (msg) => {
  if (msg === 'health') {
    const isHealthy = (logger as any).isHealthy();
    process.send({ healthy: isHealthy, errorCount: (logger as any).getErrorCount() });
  }
});
