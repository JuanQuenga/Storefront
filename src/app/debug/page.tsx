'use client';

import { useState } from 'react';

interface ApiResponse {
  data?: any;
  error?: string;
  status: number;
}

export default function DebugPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('');
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states for different endpoints
  const [searchQuery, setSearchQuery] = useState('t-shirt');
  const [searchLimit, setSearchLimit] = useState('10');
  const [productType, setProductType] = useState('');
  const [vendor, setVendor] = useState('');
  const [inStock, setInStock] = useState(false);
  const [productId, setProductId] = useState('');
  const [variantIds, setVariantIds] = useState('');
  const [collectionLimit, setCollectionLimit] = useState('5');
  const [includeProducts, setIncludeProducts] = useState(false);

  const makeRequest = async (url: string, options?: RequestInit) => {
    setLoading(true);
    setResponse(null);

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      setResponse({
        data,
        status: response.status,
      });
    } catch (error) {
      setResponse({
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const testSearchEndpoint = async () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (searchLimit) params.append('limit', searchLimit);
    if (productType) params.append('product_type', productType);
    if (vendor) params.append('vendor', vendor);
    if (inStock) params.append('in_stock', 'true');

    const url = `/api/inventory/search${params.toString() ? '?' + params.toString() : ''}`;
    await makeRequest(url);
  };

  const testProductEndpoint = async () => {
    if (!productId.trim()) {
      setResponse({ error: 'Please enter a product ID', status: 400 });
      return;
    }
    const url = `/api/products/${productId}`;
    await makeRequest(url);
  };

  const testInventoryCheckEndpoint = async () => {
    if (!variantIds.trim()) {
      setResponse({ error: 'Please enter variant IDs', status: 400 });
      return;
    }
    const url = `/api/inventory/check?ids=${variantIds}`;
    await makeRequest(url);
  };

  const testCollectionsEndpoint = async () => {
    const params = new URLSearchParams();
    if (collectionLimit) params.append('limit', collectionLimit);
    if (includeProducts) params.append('include_products', 'true');

    const url = `/api/collections${params.toString() ? '?' + params.toString() : ''}`;
    await makeRequest(url);
  };

  const testAdvancedSearch = async () => {
    const body = {
      query: searchQuery,
      filters: {
        ...(productType && { productType }),
        ...(vendor && { vendor }),
        ...(inStock && { inStock }),
        availableForSale: true,
      },
      pagination: {
        limit: parseInt(searchLimit) || 10,
      },
      sort: 'RELEVANCE',
    };

    const url = '/api/inventory/search';
    await makeRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  const testBatchInventoryCheck = async () => {
    if (!variantIds.trim()) {
      setResponse({ error: 'Please enter variant IDs (comma-separated)', status: 400 });
      return;
    }

    const variantIdsArray = variantIds.split(',').map(id => id.trim()).filter(id => id);
    const body = { variantIds: variantIdsArray };

    const url = '/api/inventory/check';
    await makeRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  const endpoints = [
    {
      name: 'Product Search',
      description: 'Search products with filters',
      method: 'GET',
      url: '/api/inventory/search',
      parameters: ['q', 'limit', 'product_type', 'vendor', 'in_stock'],
      action: testSearchEndpoint,
    },
    {
      name: 'Advanced Product Search',
      description: 'Advanced search with complex filters',
      method: 'POST',
      url: '/api/inventory/search',
      parameters: ['query', 'filters', 'pagination', 'sort'],
      action: testAdvancedSearch,
    },
    {
      name: 'Get Product by ID',
      description: 'Get detailed product information',
      method: 'GET',
      url: '/api/products/{id}',
      parameters: ['id'],
      action: testProductEndpoint,
    },
    {
      name: 'Check Inventory',
      description: 'Check inventory levels for variants',
      method: 'GET',
      url: '/api/inventory/check',
      parameters: ['ids'],
      action: testInventoryCheckEndpoint,
    },
    {
      name: 'Batch Inventory Check',
      description: 'Check multiple variants at once',
      method: 'POST',
      url: '/api/inventory/check',
      parameters: ['variantIds'],
      action: testBatchInventoryCheck,
    },
    {
      name: 'Get Collections',
      description: 'Browse product collections',
      method: 'GET',
      url: '/api/collections',
      parameters: ['limit', 'include_products'],
      action: testCollectionsEndpoint,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Shopify Inventory API Debug Page
          </h1>
          <p className="text-gray-600">
            Test all API endpoints with live examples
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* API Tester */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              API Tester
            </h2>

            {/* Input Parameters */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Query
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., t-shirt, hoodie, jeans"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Limit
                  </label>
                  <input
                    type="number"
                    value={searchLimit}
                    onChange={(e) => setSearchLimit(e.target.value)}
                    placeholder="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Type
                  </label>
                  <input
                    type="text"
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    placeholder="e.g., Clothing"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor
                  </label>
                  <input
                    type="text"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="e.g., Nike"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product ID
                  </label>
                  <input
                    type="text"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    placeholder="gid://shopify/Product/..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variant IDs (comma-separated)
                </label>
                <input
                  type="text"
                  value={variantIds}
                  onChange={(e) => setVariantIds(e.target.value)}
                  placeholder="gid://shopify/ProductVariant/1,gid://shopify/ProductVariant/2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Collection Limit
                  </label>
                  <input
                    type="number"
                    value={collectionLimit}
                    onChange={(e) => setCollectionLimit(e.target.value)}
                    placeholder="5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={inStock}
                    onChange={(e) => setInStock(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    In Stock Only
                  </label>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeProducts}
                  onChange={(e) => setIncludeProducts(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Include Products in Collections
                </label>
              </div>
            </div>

            {/* Test Buttons */}
            <div className="grid grid-cols-1 gap-3">
              {endpoints.map((endpoint) => (
                <button
                  key={endpoint.name}
                  onClick={endpoint.action}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading && selectedEndpoint === endpoint.name ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Testing...
                    </span>
                  ) : (
                    `${endpoint.method} ${endpoint.name}`
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* API Documentation */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              API Endpoints
            </h2>

            <div className="space-y-4">
              {endpoints.map((endpoint) => (
                <div key={endpoint.name} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-1">
                    {endpoint.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {endpoint.description}
                  </p>

                  <div className="bg-gray-50 rounded p-2 mb-2">
                    <code className="text-sm text-blue-600">
                      {endpoint.method} {endpoint.url}
                    </code>
                  </div>

                  <div className="text-xs text-gray-500">
                    <strong>Parameters:</strong> {endpoint.parameters.join(', ')}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Examples */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 mb-3">
                Quick Examples
              </h3>

              <div className="space-y-2 text-sm">
                <div>
                  <strong>Search:</strong>{' '}
                  <code className="bg-gray-100 px-1 rounded">
                    /api/inventory/search?q=t-shirt&limit=5
                  </code>
                </div>
                <div>
                  <strong>Product:</strong>{' '}
                  <code className="bg-gray-100 px-1 rounded">
                    /api/products/gid://shopify/Product/123
                  </code>
                </div>
                <div>
                  <strong>Inventory:</strong>{' '}
                  <code className="bg-gray-100 px-1 rounded">
                    /api/inventory/check?ids=variant-1,variant-2
                  </code>
                </div>
                <div>
                  <strong>Collections:</strong>{' '}
                  <code className="bg-gray-100 px-1 rounded">
                    /api/collections?limit=10
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Response Display */}
        {response && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                API Response
              </h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                response.status >= 200 && response.status < 300
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                Status: {response.status}
              </span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                {response.error ? (
                  <span className="text-red-600">
                    Error: {response.error}
                  </span>
                ) : (
                  JSON.stringify(response.data, null, 2)
                )}
              </pre>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>
            Make sure to set up your Shopify credentials in <code>.env.local</code> for live testing.
          </p>
        </div>
      </div>
    </div>
  );
}
