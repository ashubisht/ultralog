import { Logger } from "../lib/Logger";

describe("Logger", () => {
  it("should be defined", () => {
    expect(Logger).toBeDefined();
  });

  it("should create a console logger", async () => {
    const logger = await Logger.create("console");
    expect(logger).toBeDefined();
  });
});
