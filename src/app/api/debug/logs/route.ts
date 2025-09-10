import { NextResponse } from "next/server";
import { debugLogs, clearDebugLogs } from "@/lib/server-logger";

export async function GET() {
  console.log(
    "Debug logs endpoint called, current log count:",
    debugLogs.length
  );
  console.log("Debug logs:", debugLogs);

  return NextResponse.json({
    logs: debugLogs,
    count: debugLogs.length,
  });
}

export async function DELETE() {
  console.log("Clearing debug logs");
  clearDebugLogs();

  return NextResponse.json({
    message: "Debug logs cleared",
    count: 0,
  });
}
