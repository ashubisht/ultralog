import { Logger } from "../src/lib/Logger";

(async () => {
  const logger = await Logger.create("console");
  logger.info("Starting app");

  logger.setVerbose(true);
  logger.info("Verbose enabled");

  logger.setVerboseFormat("json");
  logger.info("Verbose JSON");
})();
