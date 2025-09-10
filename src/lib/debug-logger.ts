interface LogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: any;
  response?: any;
  status?: number;
  error?: string;
}

// Shared logs array that persists across requests
export const requestLogs: LogEntry[] = [];
export const MAX_LOGS = 50;

export function addLogEntry(logEntry: Omit<LogEntry, "id" | "timestamp">) {
  const entry: LogEntry = {
    ...logEntry,
    id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };

  requestLogs.unshift(entry);
  if (requestLogs.length > MAX_LOGS) {
    requestLogs.splice(MAX_LOGS);
  }

  return entry.id;
}

export function updateLogEntry(id: string, updates: Partial<LogEntry>) {
  const logEntry = requestLogs.find((log) => log.id === id);
  if (logEntry) {
    Object.assign(logEntry, updates);
  }
}

export function clearLogs() {
  requestLogs.length = 0;
}
