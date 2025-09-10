import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Shopify Inventory REST API
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            A comprehensive REST API for searching and managing Shopify store inventory
            using the Storefront API (tokenless method)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              🔍 Product Search
            </h2>
            <p className="text-gray-600 mb-4">
              Search products with advanced filtering, sorting, and pagination.
            </p>
            <Link
              href="/api/inventory/search?q=t-shirt&limit=5"
              className="text-blue-600 hover:text-blue-800 font-medium"
              target="_blank"
            >
              Try it →
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              📦 Product Details
            </h2>
            <p className="text-gray-600 mb-4">
              Get detailed information about specific products including variants.
            </p>
            <code className="text-sm text-gray-500 bg-gray-100 p-2 rounded block mb-2">
              GET /api/products/{"{id}"}
            </code>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              📊 Inventory Check
            </h2>
            <p className="text-gray-600 mb-4">
              Check real-time inventory levels and availability for product variants.
            </p>
            <code className="text-sm text-gray-500 bg-gray-100 p-2 rounded block mb-2">
              GET /api/inventory/check?ids={"{variant-ids}"}
            </code>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              📂 Collections
            </h2>
            <p className="text-gray-600 mb-4">
              Browse and search through product collections.
            </p>
            <Link
              href="/api/collections?limit=5"
              className="text-blue-600 hover:text-blue-800 font-medium"
              target="_blank"
            >
              Try it →
            </Link>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-blue-900 mb-4">
            🚀 Getting Started
          </h2>
          <div className="space-y-4 text-blue-800">
            <p>
              <strong>1.</strong> Set up your environment variables in <code>.env.local</code>
            </p>
            <p>
              <strong>2.</strong> Get your Shopify Storefront access token from the admin panel
            </p>
            <p>
              <strong>3.</strong> The API will automatically connect to your Shopify store
            </p>
            <p>
              <strong>4.</strong> Start making requests to the endpoints above
            </p>
          </div>

          <div className="mt-6">
            <Link
              href="/api/inventory/search?limit=1"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              target="_blank"
            >
              Test API Connection
            </Link>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="https://github.com/your-repo/shopify-inventory-api"
            className="text-gray-500 hover:text-gray-700"
            target="_blank"
          >
            View on GitHub
          </Link>
        </div>
      </div>
    </div>
  );
}