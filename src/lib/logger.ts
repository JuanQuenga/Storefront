// Client-safe logger interface
// This file can be imported in both client and server components

// Log entry interface for debug logs
export interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
}

// Simple console logger for client-side usage
export const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[${new Date().toISOString()}] INFO: ${message}`, meta || "");
  },
  error: (message: string, meta?: any) => {
    console.error(
      `[${new Date().toISOString()}] ERROR: ${message}`,
      meta || ""
    );
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[${new Date().toISOString()}] WARN: ${message}`, meta || "");
  },
  debug: (message: string, meta?: any) => {
    console.debug(
      `[${new Date().toISOString()}] DEBUG: ${message}`,
      meta || ""
    );
  },
};

// Add custom methods for HTTP request logging
export const logHttpRequest = (req: any, body?: any) => {
  console.log("🔍 logHttpRequest called with method:", req.method);
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

// Note: clearDebugLogs is only available in server-logger.ts
// This is a client-safe logger interface

export default logger;
