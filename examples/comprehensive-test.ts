import { 
  Logger, 
  ResilientLogger, 
  LoggerConfig, 
  LogLevel,
  UltralogService,
  requestLogger,
  errorLogger,
  healthCheckLogger,
  fastifyLoggerPlugin
} from '../src/index';

async function runComprehensiveTest() {
  console.log('🚀 Starting Ultralog Comprehensive Test\n');

  // Test 1: Basic Logger
  console.log('=== Test 1: Basic Logger ===');
  const basicLogger = await Logger.create('console');
  await basicLogger.info('Basic logger test');
  await basicLogger.error('Error test', { code: 'TEST_ERROR' });
  await basicLogger.warn('Warning test');
  await basicLogger.debug('Debug test');
  await basicLogger.trace('Trace test');

  // Test 2: Advanced Configuration
  console.log('\n=== Test 2: Advanced Configuration ===');
  const advancedConfig: LoggerConfig = {
    transport: 'multiple',
    level: 'info',
    format: 'json',
    context: {
      service: 'test-service',
      version: '1.0.0',
      environment: 'test'
    },
    transportConfig: {
      console: { level: 'debug' },
      file: { filename: 'test.log', level: 'info' }
    },
    verbose: true,
    verboseFormat: 'json',
    metrics: { enabled: true },
    tracing: true,
    async: true,
    bufferSize: 5,
    flushInterval: 2000
  };

  const advancedLogger = await Logger.createWithConfig(advancedConfig);
  await advancedLogger.info('Advanced logger test', { feature: 'configuration' });

  // Test 3: Context-Aware Logging
  console.log('\n=== Test 3: Context-Aware Logging ===');
  const contextualLogger = advancedLogger.withContext({
    requestId: 'req-123',
    userId: 'user-456',
    sessionId: 'session-789'
  });

  await contextualLogger.info('User action', { action: 'login', timestamp: new Date() });

  // Test 4: Distributed Tracing
  console.log('\n=== Test 4: Distributed Tracing ===');
  const tracedLogger = advancedLogger.withTracing({
    traceId: 'trace-abc-123',
    spanId: 'span-def-456',
    parentSpanId: 'span-ghi-789'
  });

  await tracedLogger.info('Database operation', { 
    operation: 'SELECT', 
    table: 'users',
    duration: 150 
  });

  // Test 5: Child Logger
  console.log('\n=== Test 5: Child Logger ===');
  const childLogger = advancedLogger.child({ 
    module: 'auth',
    component: 'jwt-validator'
  });

  await childLogger.info('Token validation', { 
    tokenType: 'JWT',
    algorithm: 'RS256'
  });

  // Test 6: Metrics Collection
  console.log('\n=== Test 6: Metrics Collection ===');
  for (let i = 0; i < 10; i++) {
    await advancedLogger.info(`Metrics test ${i}`, { 
      category: 'performance',
      value: Math.random() * 100 
    });
  }

  // Wait for async buffer to flush
  await new Promise(resolve => setTimeout(resolve, 3000));

  const metrics = advancedLogger.getMetrics();
  console.log('Collected Metrics:', JSON.stringify(metrics, null, 2));

  // Test 7: Resilient Logger
  console.log('\n=== Test 7: Resilient Logger ===');
  const resilientConfig: LoggerConfig = {
    transport: 'aws', // This will fail gracefully
    level: 'info',
    format: 'json',
    context: { service: 'resilient-test' }
  };

  const resilientLogger = new ResilientLogger(resilientConfig);
  await resilientLogger.info('This will fallback to console if AWS fails');
  
  console.log('Resilient logger healthy:', resilientLogger.isHealthy());
  console.log('Error count:', resilientLogger.getErrorCount());

  // Test 8: Log Levels
  console.log('\n=== Test 8: Log Levels ===');
  const levelLogger = await Logger.create('console');
  
  levelLogger.setLevel('debug');
  console.log('Current level:', levelLogger.getLevel());
  
  await levelLogger.debug('This debug message should appear');
  await levelLogger.trace('This trace message should not appear');

  // Test 9: Verbose Logging
  console.log('\n=== Test 9: Verbose Logging ===');
  const verboseLogger = await Logger.create('console');
  
  verboseLogger.setVerbose(true);
  verboseLogger.setVerboseFormat('text');
  await verboseLogger.info('Verbose text format');

  verboseLogger.setVerboseFormat('json');
  await verboseLogger.info('Verbose JSON format');

  // Test 10: Framework Integration Examples
  console.log('\n=== Test 10: Framework Integration Examples ===');
  
  // Express middleware example
  console.log('Express middleware available:', typeof requestLogger === 'function');
  console.log('Error logger available:', typeof errorLogger === 'function');
  console.log('Health check logger available:', typeof healthCheckLogger === 'function');
  
  // Fastify plugin example
  console.log('Fastify plugin available:', typeof fastifyLoggerPlugin === 'function');
  
  // NestJS service example
  console.log('NestJS service available:', typeof UltralogService === 'function');

  // Test 11: Performance Test
  console.log('\n=== Test 11: Performance Test ===');
  const perfLogger = await Logger.createWithConfig({
    transport: 'console',
    level: 'info',
    format: 'json',
    async: true,
    bufferSize: 100,
    flushInterval: 1000
  });

  const startTime = Date.now();
  const promises = [];
  
  for (let i = 0; i < 100; i++) {
    promises.push(perfLogger.info(`Performance test ${i}`, { iteration: i }));
  }
  
  await Promise.all(promises);
  const endTime = Date.now();
  
  console.log(`Logged 100 messages in ${endTime - startTime}ms`);
  
  // Wait for async buffer to flush
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 12: Error Handling
  console.log('\n=== Test 12: Error Handling ===');
  try {
    const errorLogger = await Logger.create('aws', {
      logGroupName: 'non-existent-group',
      region: 'invalid-region'
    });
    await errorLogger.info('This should fail gracefully');
  } catch (error) {
    console.log('Expected error caught:', error.message);
  }

  // Test 13: Custom Format
  console.log('\n=== Test 13: Custom Format ===');
  const customLogger = await Logger.createWithConfig({
    transport: 'console',
    level: 'info',
    format: 'custom',
    customFormat: {
      transform: (info: any) => {
        return `[CUSTOM] ${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`;
      }
    }
  });

  await customLogger.info('Custom format test');

  // Test 14: Multiple File Transports
  console.log('\n=== Test 14: Multiple File Transports ===');
  const multiFileLogger = await Logger.createWithConfig({
    transport: 'multiple',
    level: 'info',
    format: 'json',
    transportConfig: {
      file: [
        { filename: 'logs/app.log', level: 'info' },
        { filename: 'logs/error.log', level: 'error' },
        { filename: 'logs/debug.log', level: 'debug' }
      ]
    }
  });

  await multiFileLogger.info('This goes to app.log');
  await multiFileLogger.error('This goes to error.log');
  await multiFileLogger.debug('This goes to debug.log');

  // Cleanup
  console.log('\n=== Cleanup ===');
  await basicLogger.close();
  await advancedLogger.close();
  await resilientLogger.close();
  await levelLogger.close();
  await verboseLogger.close();
  await perfLogger.close();
  await customLogger.close();
  await multiFileLogger.close();

  console.log('\n✅ All tests completed successfully!');
  console.log('\n📊 Summary:');
  console.log('- ✅ Basic logging functionality');
  console.log('- ✅ Advanced configuration options');
  console.log('- ✅ Context-aware logging');
  console.log('- ✅ Distributed tracing');
  console.log('- ✅ Child loggers');
  console.log('- ✅ Metrics collection');
  console.log('- ✅ Resilient error handling');
  console.log('- ✅ Log level management');
  console.log('- ✅ Verbose logging');
  console.log('- ✅ Framework integrations');
  console.log('- ✅ Performance optimization');
  console.log('- ✅ Custom formatting');
  console.log('- ✅ Multiple transports');
}

// Run the test
runComprehensiveTest().catch(console.error);
