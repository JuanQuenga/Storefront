import { NextResponse } from "next/server";
import { logger, debugLogs } from "@/lib/server-logger";

export async function GET() {
  console.log("Test logger endpoint called");

  // Generate various Winston log levels
  logger.debug("Debug message from Winston", {
    component: "test-logger",
    data: { debug: true },
  });

  logger.info("Info message from Winston", {
    component: "test-logger",
    data: { info: true },
  });

  logger.warn("Warning message from Winston", {
    component: "test-logger",
    data: { warning: true },
  });

  logger.error("Error message from Winston", {
    component: "test-logger",
    data: { error: true },
  });

  // Test HTTP request logging
  logger.info("HTTP Request", {
    method: "GET",
    url: "/api/test-logger",
    headers: { "user-agent": "test-client" },
    body: null,
  });

  logger.info("HTTP Response", {
    method: "GET",
    url: "/api/test-logger",
    statusCode: 200,
    responseTime: "5ms",
  });

  return NextResponse.json({
    message: "Winston logger test completed",
    logCount: debugLogs.length,
    logs: debugLogs.slice(0, 10), // Return first 10 logs
  });
}
