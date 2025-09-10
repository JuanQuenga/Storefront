"use client";

import { useState } from "react";

export default function TestVapiPage() {
  const [messageJson, setMessageJson] = useState(`{
  "type": "tool-calls",
  "toolCallList": [
    {
      "id": "toolu_test_123",
      "name": "search_products",
      "arguments": {
        "q": "iphone",
        "limit": 3
      }
    }
  ]
}`);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTest = async () => {
    setLoading(true);
    setError("");
    setResponse("");

    try {
      // URL-encode the message JSON
      const encodedMessage = encodeURIComponent(messageJson);
      const url = `/api/inventory/search?message=${encodedMessage}`;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
      }

      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(messageJson);
      setMessageJson(JSON.stringify(parsed, null, 2));
      setError("");
    } catch (err) {
      setError("Invalid JSON format");
    }
  };

  const loadExample = () => {
    const example = {
      type: "tool-calls",
      toolCallList: [
        {
          id: "toolu_example_123",
          name: "search_products",
          arguments: {
            q: "ps5",
            limit: 5,
          },
        },
      ],
    };
    setMessageJson(JSON.stringify(example, null, 2));
  };

  const loadSimpleExample = () => {
    setMessageJson(`{
  "arguments": {
    "q": "iphone",
    "limit": 3
  },
  "id": "toolu_simple_456"
}`);
  };

  const testRegularParams = () => {
    setLoading(true);
    setError("");
    setResponse("");

    // Test with regular query parameters (simulating Vapi headers)
    const url = `/api/inventory/search?q=iphone&limit=2`;
    fetch(url, {
      headers: {
        "User-Agent": "Vapi/1.0",
      },
    })
      .then((res) => res.json())
      .then((data) => setResponse(JSON.stringify(data, null, 2)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Vapi Tool Call Tester
          </h1>
          <p className="text-gray-600">
            Test your Shopify inventory search API with Vapi tool call format
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <label
              htmlFor="message"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Vapi Tool Call Message (JSON)
            </label>
            <textarea
              id="message"
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              value={messageJson}
              onChange={(e) => setMessageJson(e.target.value)}
              placeholder="Paste your Vapi tool call JSON here..."
            />
          </div>

          <div className="flex gap-3 mb-4">
            <button
              onClick={handleTest}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Testing..." : "Test API Call"}
            </button>
            <button
              onClick={handleFormatJson}
              className="px-4 py-2 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Format JSON
            </button>
            <button
              onClick={loadExample}
              className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Load Example
            </button>
            <button
              onClick={loadSimpleExample}
              className="px-4 py-2 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              Load Simple
            </button>
            <button
              onClick={testRegularParams}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 text-white font-medium rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Test Headers
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <pre className="whitespace-pre-wrap font-mono">{error}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {response && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              API Response
            </h3>
            <div className="bg-gray-50 rounded-md p-4">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-x-auto">
                {response}
              </pre>
            </div>
          </div>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">How to use:</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ol className="list-decimal list-inside space-y-1">
                  <li>Enter your Vapi tool call JSON in the textarea above</li>
                  <li>Click &ldquo;Test API Call&rdquo; to send the request</li>
                  <li>
                    The response will show a structured JSON string containing
                    all product details for easy parsing
                  </li>
                  <li>
                    Use &ldquo;Format JSON&rdquo; to pretty-print your JSON
                  </li>
                  <li>
                    Use &ldquo;Load Example&rdquo; for full toolCallList format
                  </li>
                  <li>
                    Use &ldquo;Load Simple&rdquo; for direct arguments format
                  </li>
                  <li>
                    Use &ldquo;Test Headers&rdquo; to test User-Agent detection
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-gray-500 text-sm">
          <p>
            API Endpoint:{" "}
            <code className="bg-gray-100 px-2 py-1 rounded">
              GET /api/inventory/search
            </code>
          </p>
          <p>
            Vapi Tool Format: URL-encoded JSON in{" "}
            <code className="bg-gray-100 px-2 py-1 rounded">?message=</code>{" "}
            parameter
          </p>
        </div>
      </div>
    </div>
  );
}
