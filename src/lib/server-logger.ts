// Server-side only Winston logger
import winston from "winston";
import Transport from "winston-transport";

// Log entry interface for debug logs
export interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
}

export const debugLogs: LogEntry[] = [];
const MAX_DEBUG_LOGS = 50;

// Custom Winston transport to store logs in memory for debugging
class MemoryTransport extends Transport {
  constructor() {
    super();
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    // Store log entry in memory for debugging
    const logEntry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level: info.level,
      message: info.message,
      meta: info.meta || info,
    };

    debugLogs.unshift(logEntry);
    if (debugLogs.length > MAX_DEBUG_LOGS) {
      debugLogs.splice(MAX_DEBUG_LOGS);
    }

    callback();
  }
}

// Create Winston logger
const winstonLogger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new MemoryTransport(),
  ],
});

// Main logger interface that uses Winston
export const logger = {
  info: (message: string, meta?: any) => {
    winstonLogger.info(message, meta);
  },
  error: (message: string, meta?: any) => {
    winstonLogger.error(message, meta);
  },
  warn: (message: string, meta?: any) => {
    winstonLogger.warn(message, meta);
  },
  debug: (message: string, meta?: any) => {
    winstonLogger.debug(message, meta);
  },
};

// Add custom methods for HTTP request logging
export const logHttpRequest = (req: any, body?: any) => {
  logger.info("HTTP Request", {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(
      req.headers.entries ? req.headers.entries() : []
    ),
    body,
    userAgent: req.headers.get("user-agent"),
    ip:
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown",
  });
};

export const logHttpResponse = (
  req: any,
  res: any,
  responseTime: number,
  error?: any
) => {
  const logData: any = {
    method: req.method,
    url: req.url,
    statusCode: res.status,
    responseTime: `${responseTime}ms`,
    contentLength: res.headers?.get("content-length") || "unknown",
  };

  if (error) {
    logData.error = error.message || error;
    logger.error("HTTP Response Error", logData);
  } else {
    logger.info("HTTP Response", logData);
  }
};

export const clearDebugLogs = () => {
  debugLogs.length = 0;
};

export default logger;
