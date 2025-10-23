# ultralog

Simple opinionated logging module for NodeJs.

## Overview

Ultralog is a simple and lightweight logging framework for any Node.js application. It provides a common wrapper for logging to various targets, including the console, files, AWS CloudWatch, and GCP Stackdriver. The library is designed to be modular, allowing you to install only the dependencies you need.

## Installation

```bash
npm install ultralog
```

## Usage

Here's a simple example of how to use the `Logger` class:

```typescript
import { Logger } from "ultralog";

// Create a new logger instance
const logger = new Logger("console");

// Log a message
logger.info("Hello, world!");
```

## Transports

Ultralog supports the following transports:

*   `console`: Logs to the console.
*   `file`: Logs to a file.
*   `aws`: Logs to AWS CloudWatch.
*   `gcp`: Logs to GCP Stackdriver.

You can specify the transport in the `Logger` constructor:

```typescript
// Use the file transport
const fileLogger = new Logger("file", { filename: "app.log" });

// Use the AWS CloudWatch transport
const awsLogger = new Logger("aws", {
  logGroupName: "my-log-group",
  logStreamName: "my-log-stream",
  region: "us-east-1",
  accessKeyId: "YOUR_AWS_ACCESS_KEY_ID",
  secretAccessKey: "YOUR_AWS_SECRET_ACCESS_KEY",
});
```

## Optional Dependencies

To use the `aws` or `gcp` transports, you'll need to install some optional dependencies.

### AWS CloudWatch

To log to AWS CloudWatch, you'll need to install the `winston-cloudwatch` package:

```bash
npm install winston-cloudwatch
```

### GCP Stackdriver

To log to GCP Stackdriver, you'll need to install the `@google-cloud/logging-winston` package:

```bash
npm install @google-cloud/logging-winston
```

## Verbosity

You can enable verbose logging to include additional information in your log messages, such as the timestamp and log level.

```typescript
const logger = new Logger("console");

// Enable verbose logging
logger.setVerbose(true);

// This will log a more detailed message
logger.info("This is a verbose log message.");
```

## Contribution and Issues

Visit <https://github.com/ashubisht/ultralog> for more details.
Raise issues at <https://github.com/ashubisht/ultralog/issues>.
