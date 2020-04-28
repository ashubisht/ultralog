import * as TransportStream from "winston-transport";
import { LogEntry } from "winston";
import { LogLevel } from "../ILogMapper";

export interface IBinding {
  config(obj: IBindingOption): void;
  getStream(): TransportStream | undefined;
}

export interface ICloudWatchBindingOptions {
  accessKeyId: string;
  secretKey: string;
  region: string;
  level: LogLevel;
  logStream: string;
  logGroup: string;
  format?: (logObject: LogEntry) => string;
}

export interface IConsoleBindingOptions {
  format?: (logObject: LogEntry) => string;
}

export interface IStackDriverBindingOptions {
  projectId?: string;
  keyFileName?: string;
  format?: (logObject: LogEntry) => string;
  level?: LogLevel;
  [key: string]: unknown;
}

export type IBindingOption = ICloudWatchBindingOptions | IConsoleBindingOptions | IStackDriverBindingOptions; // Extend more binding options here
