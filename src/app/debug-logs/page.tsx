"use client";

import { useState, useEffect } from "react";

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
}

export default function DebugLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState("");

  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/debug/logs");
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
  };

  useEffect(() => {
    fetchLogs(); // Initial fetch
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleClearLogs = async () => {
    try {
      const response = await fetch("/api/debug/logs", { method: "DELETE" });
      if (response.ok) {
        setLogs([]);
      }
    } catch (error) {
      console.error("Failed to clear logs:", error);
    }
  };

  const filteredLogs = logs.filter(
    (log) =>
      !filter ||
      JSON.stringify(log).toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">
              🔍 Winston Debug Logs
            </h1>
            <div className="flex gap-4">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  autoRefresh
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {autoRefresh ? "🔄 Auto Refresh ON" : "⏸️ Auto Refresh OFF"}
              </button>
              <button
                onClick={handleClearLogs}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium transition-colors"
              >
                🗑️ Clear Logs
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch("/api/test-logger");
                    if (response.ok) {
                      console.log("Test logs generated");
                    }
                  } catch (error) {
                    console.error("Failed to generate test logs:", error);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors"
              >
                🧪 Generate Test Logs
              </button>
            </div>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Filter logs (search in body, headers, etc.)"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="mb-4 text-sm text-gray-400">
            Total logs: {logs.length} | Showing: {filteredLogs.length}
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-4">📭</div>
                <p>
                  No logs yet. Click &quot;Generate Test Logs&quot; or make API
                  requests to see Winston logs here.
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => <LogEntry key={log.id} log={log} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LogEntry({ log }: { log: LogEntry }) {
  const [expanded, setExpanded] = useState(false);

  // Extract HTTP request info from meta if available
  const isHttpRequest = log.meta?.method && log.meta?.url;
  const isHttpResponse = log.message.includes("HTTP Response");

  return (
    <div className="border border-gray-600 rounded-lg p-4 bg-gray-700">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              log.level === "error"
                ? "bg-red-600 text-red-100"
                : log.level === "warn"
                ? "bg-yellow-600 text-yellow-100"
                : log.level === "info"
                ? "bg-blue-600 text-blue-100"
                : "bg-gray-600 text-gray-100"
            }`}
          >
            {log.level.toUpperCase()}
          </span>
          {isHttpRequest && (
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                log.meta?.method === "GET"
                  ? "bg-blue-600 text-blue-100"
                  : log.meta?.method === "POST"
                  ? "bg-green-600 text-green-100"
                  : "bg-gray-600 text-gray-100"
              }`}
            >
              {log.meta.method}
            </span>
          )}
          {isHttpResponse && log.meta?.statusCode && (
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${
                log.meta.statusCode >= 200 && log.meta.statusCode < 300
                  ? "bg-green-600 text-green-100"
                  : log.meta.statusCode >= 400
                  ? "bg-red-600 text-red-100"
                  : "bg-yellow-600 text-yellow-100"
              }`}
            >
              {log.meta.statusCode}
            </span>
          )}
          <span className="text-sm font-mono text-gray-300">
            {isHttpRequest ? log.meta.url : log.message}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {new Date(log.timestamp).toLocaleTimeString()}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {expanded ? "🔽 Collapse" : "▶️ Expand"}
          </button>
        </div>
      </div>

      {expanded && log.meta && (
        <div className="mt-4 space-y-3">
          {log.meta.method && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-1">
                HTTP Method:
              </h4>
              <pre className="text-xs bg-gray-600 p-2 rounded overflow-x-auto text-gray-100">
                {log.meta.method}
              </pre>
            </div>
          )}

          {log.meta.url && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-1">URL:</h4>
              <pre className="text-xs bg-gray-600 p-2 rounded overflow-x-auto text-gray-100">
                {log.meta.url}
              </pre>
            </div>
          )}

          {log.meta.headers && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-1">
                Headers:
              </h4>
              <pre className="text-xs bg-gray-600 p-2 rounded overflow-x-auto text-gray-100">
                {JSON.stringify(log.meta.headers, null, 2)}
              </pre>
            </div>
          )}

          {log.meta.body && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-1">
                Request Body:
              </h4>
              <pre className="text-xs bg-gray-600 p-2 rounded overflow-x-auto text-gray-100">
                {typeof log.meta.body === "string"
                  ? log.meta.body
                  : JSON.stringify(log.meta.body, null, 2)}
              </pre>
            </div>
          )}

          {log.meta.responseTime && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-1">
                Response Time:
              </h4>
              <pre className="text-xs bg-gray-600 p-2 rounded overflow-x-auto text-gray-100">
                {log.meta.responseTime}
              </pre>
            </div>
          )}

          {log.meta.error && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-1">
                Error:
              </h4>
              <pre className="bg-red-900 border border-red-700 text-xs p-2 rounded overflow-x-auto text-red-200">
                {log.meta.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
