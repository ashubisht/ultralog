export type LogLevel = "info" | "error" | "debug" | "trace";

export type Transport = "console" | "file" | "aws" | "gcp" | "opensearch";

export interface ILogMapper {
  info: LogLevel[];
  error: LogLevel[];
  debug: LogLevel[];
  trace: LogLevel[];
}
