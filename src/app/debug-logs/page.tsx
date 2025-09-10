'use client';

import { useState, useEffect } from 'react';

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

// In-memory log store (in production, you'd use a database)
let requestLogs: LogEntry[] = [];
const MAX_LOGS = 50;

export default function DebugLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        setLogs([...requestLogs]);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const clearLogs = () => {
    requestLogs = [];
    setLogs([]);
  };

  const filteredLogs = logs.filter(log =>
    !filter || JSON.stringify(log).toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              🔍 Live Request Debug Logs
            </h1>
            <div className="flex gap-4">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-md font-medium ${
                  autoRefresh
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {autoRefresh ? '🔄 Auto Refresh ON' : '⏸️ Auto Refresh OFF'}
              </button>
              <button
                onClick={clearLogs}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 font-medium"
              >
                🗑️ Clear Logs
              </button>
            </div>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Filter logs (search in body, headers, etc.)"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="mb-4 text-sm text-gray-600">
            Total logs: {logs.length} | Showing: {filteredLogs.length}
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📭</div>
                <p>No logs yet. Make a request to /api/inventory/search to see logs here.</p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <LogEntry key={log.id} log={log} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LogEntry({ log }: { log: LogEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            log.method === 'GET' ? 'bg-blue-100 text-blue-800' :
            log.method === 'POST' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {log.method}
          </span>
          <span className="text-sm font-mono text-gray-600">
            {log.url}
          </span>
          {log.status && (
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              log.status >= 200 && log.status < 300 ? 'bg-green-100 text-green-800' :
              log.status >= 400 ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {log.status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {new Date(log.timestamp).toLocaleTimeString()}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {expanded ? '🔽 Collapse' : '▶️ Expand'}
          </button>
        </div>
      </div>

      {log.error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          ❌ Error: {log.error}
        </div>
      )}

      {expanded && (
        <div className="mt-4 space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Headers:</h4>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
              {JSON.stringify(log.headers, null, 2)}
            </pre>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Request Body:</h4>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
              {typeof log.body === 'string' ? log.body : JSON.stringify(log.body, null, 2)}
            </pre>
          </div>

          {log.response && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Response:</h4>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                {typeof log.response === 'string' ? log.response : JSON.stringify(log.response, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Export the log store for use in the API route
export { requestLogs, MAX_LOGS };
