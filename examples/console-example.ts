import { Logger, LoggerConfig } from "../src/lib/Logger";

(async () => {
  // Basic usage
  console.log("=== Basic Usage ===");
  const logger = await Logger.create("console");
  await logger.info("Starting app");
  await logger.warn("This is a warning");
  await logger.error("This is an error");

  // Verbose logging
  console.log("\n=== Verbose Logging ===");
  logger.setVerbose(true);
  await logger.info("Verbose enabled");

  logger.setVerboseFormat("json");
  await logger.info("Verbose JSON format");

  // Context-aware logging
  console.log("\n=== Context-Aware Logging ===");
  const contextualLogger = logger.withContext({
    service: "my-app",
    version: "1.0.0",
    environment: "development",
    requestId: "req-123"
  });
  
  await contextualLogger.info("Processing request", { userId: 123, action: "login" });

  // Tracing
  console.log("\n=== Tracing ===");
  const tracedLogger = logger.withTracing({
    traceId: "trace-456",
    spanId: "span-789"
  });
  
  await tracedLogger.info("Database query", { query: "SELECT * FROM users" });

  // Child logger
  console.log("\n=== Child Logger ===");
  const childLogger = logger.child({ module: "auth" });
  await childLogger.info("User authenticated", { userId: 123 });

  // Async logging with buffering
  console.log("\n=== Async Logging ===");
  const asyncConfig: LoggerConfig = {
    transport: "console",
    level: "info",
    format: "json",
    async: true,
    bufferSize: 5,
    flushInterval: 2000,
    metrics: { enabled: true }
  };
  
  const asyncLogger = await Logger.createWithConfig(asyncConfig);
  
  for (let i = 0; i < 10; i++) {
    await asyncLogger.info(`Async log message ${i}`);
  }
  
  // Wait for buffer to flush
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Show metrics
  console.log("\n=== Metrics ===");
  const metrics = asyncLogger.getMetrics();
  console.log(JSON.stringify(metrics, null, 2));

  await logger.close();
})();
