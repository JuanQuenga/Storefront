"use client";

import { useState } from "react";

export default function TestApiPage() {
  const [requestBody, setRequestBody] = useState(`{
  "message": {
    "toolCalls": [
      {
        "id": "call_test123",
        "type": "function",
        "function": {
          "name": "search_products",
          "arguments": {
            "q": "asus laptop",
            "limit": 5
          }
        }
      }
    ]
  }
}`);
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testApi = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const parsedBody = JSON.parse(requestBody);

      const res = await fetch("/api/inventory/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedBody),
      });

      // Handle both JSON and text responses
      const contentType = res.headers.get("content-type");
      let data;

      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        // API returns plain text, so we'll wrap it in an object for display
        const textData = await res.text();
        data = {
          type: "text",
          content: textData,
          status: res.status,
          statusText: res.statusText,
        };
      }

      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const presetBodies = {
    vapi: `{
  "message": {
    "toolCalls": [
      {
        "id": "call_test123",
        "type": "function",
        "function": {
          "name": "search_products",
          "arguments": {
            "q": "asus laptop",
            "limit": 5
          }
        }
      }
    ]
  }
}`,
    simple: `{
  "q": "iphone",
  "limit": 3
}`,
    empty: `{}`,
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6 mb-6">
          <h1 className="text-3xl font-bold text-white mb-6">
            🧪 API Test Page
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Request Section */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">
                Request Body
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Preset Bodies:
                </label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setRequestBody(presetBodies.vapi)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    VAPI Tool Call
                  </button>
                  <button
                    onClick={() => setRequestBody(presetBodies.simple)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    Simple JSON
                  </button>
                  <button
                    onClick={() => setRequestBody(presetBodies.empty)}
                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                  >
                    Empty
                  </button>
                </div>
              </div>

              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="w-full h-64 p-4 bg-gray-700 border border-gray-600 rounded-md text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter JSON request body..."
              />

              <div className="mt-4 flex gap-4">
                <button
                  onClick={testApi}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? "Testing..." : "Test API"}
                </button>
              </div>
            </div>

            {/* Response Section */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">
                Response
              </h2>

              {error && (
                <div className="mb-4 p-4 bg-red-900 border border-red-700 rounded-md">
                  <h3 className="text-red-200 font-semibold mb-2">Error:</h3>
                  <pre className="text-red-300 text-sm whitespace-pre-wrap">
                    {error}
                  </pre>
                </div>
              )}

              {response && (
                <div className="bg-gray-700 border border-gray-600 rounded-md p-4">
                  <h3 className="text-gray-300 font-semibold mb-2">
                    Response:
                  </h3>
                  {response.type === "text" ? (
                    <div>
                      <div className="mb-2 text-xs text-gray-400">
                        Status: {response.status} {response.statusText}
                      </div>
                      <pre className="text-gray-100 text-sm whitespace-pre-wrap overflow-auto max-h-96">
                        {response.content}
                      </pre>
                    </div>
                  ) : (
                    <pre className="text-gray-100 text-sm whitespace-pre-wrap overflow-auto max-h-96">
                      {JSON.stringify(response, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              {!response && !error && !loading && (
                <div className="bg-gray-700 border border-gray-600 rounded-md p-8 text-center">
                  <div className="text-gray-400 text-lg mb-2">📭</div>
                  <p className="text-gray-400">
                    No response yet. Click &quot;Test API&quot; to send a
                    request.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* API Documentation */}
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            📚 API Documentation
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-blue-400 mb-2">
                POST /api/inventory/search
              </h3>
              <p className="text-gray-300 text-sm mb-3">
                Search products using VAPI tool call format or simple JSON.
              </p>

              <h4 className="text-md font-medium text-gray-300 mb-2">
                VAPI Tool Call Format:
              </h4>
              <pre className="bg-gray-900 p-3 rounded text-xs text-gray-300 overflow-x-auto">
                {`{
  "message": {
    "toolCalls": [{
      "id": "call_123",
      "type": "function",
      "function": {
        "name": "search_products",
        "arguments": {
          "q": "search term",
          "limit": 5
        }
      }
    }]
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
