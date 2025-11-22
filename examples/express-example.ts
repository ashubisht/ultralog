import express, { Request, Response, NextFunction } from 'express';
import { Logger, requestLogger, errorLogger, healthCheckLogger } from '../src/lib/frameworks/ExpressMiddleware';
import { LoggerConfig } from '../src/lib/types';

const app = express();

// Configure logger
const loggerConfig: LoggerConfig = {
  transport: 'console',
  level: 'info',
  format: 'json',
  context: {
    service: 'express-api',
    version: '1.0.0',
    environment: 'development'
  },
  metrics: {
    enabled: true
  },
  tracing: true
};

// Create logger instance
const logger = await Logger.createWithConfig(loggerConfig);

// Middleware
app.use(express.json());
app.use(requestLogger({ logger }));
app.use(errorLogger(logger));

// Health check endpoint
app.get('/health', healthCheckLogger(logger), (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Example routes
app.get('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // Use logger from request (added by middleware)
    const requestLogger = (req as any).logger;
    
    requestLogger.info('Fetching user', { userId: id });
    
    // Simulate database query
    const user = { id, name: 'John Doe', email: 'john@example.com' };
    
    requestLogger.info('User fetched successfully', { userId: id });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

app.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestLogger = (req as any).logger;
    
    requestLogger.info('Creating user', { body: req.body });
    
    // Simulate user creation
    const user = { 
      id: Math.random().toString(36).substring(7), 
      ...req.body 
    };
    
    requestLogger.info('User created successfully', { userId: user.id });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

// Error handling
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  const requestLogger = (req as any).logger;
  
  requestLogger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({ 
    error: 'Internal Server Error',
    requestId: req.headers['x-request-id']
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info('Server started', { port: PORT });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await logger.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await logger.close();
  process.exit(0);
});
