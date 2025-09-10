# Shopify Inventory REST API

A comprehensive REST API built with Next.js for searching and managing Shopify store inventory using the Storefront API (tokenless method).

## Features

- 🔍 **Product Search**: Full-text search with advanced filtering
- 📦 **Inventory Management**: Real-time stock levels and availability
- 🏷️ **Product Details**: Complete product information including variants
- 📂 **Collections**: Browse and search through product collections
- 🚀 **RESTful Design**: Clean, intuitive API endpoints
- 🔓 **Tokenless Access**: Uses Shopify Storefront API without authentication
- 📊 **Pagination**: Efficient handling of large product catalogs
- 🧪 **Debug Page**: Interactive testing interface at `/debug`
- 📝 **Type Safety**: Full TypeScript support with GraphQL codegen
- 🛡️ **Environment Validation**: Zod-powered validation for all environment variables

## Quick Start

### 1. Environment Setup (Tokenless Access)

This API uses Shopify's **tokenless access** which means **no authentication is required**!

Create a `.env.local` file in the project root:

### 3. Set up Environment Variables

Create a `.env.local` file in your project root using the provided template:

```bash
cp env.example .env.local
```

Then fill in your actual values:

```env
# REQUIRED: Your Shopify store domain (without https://)
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com

# OPTIONAL: API version (defaults to 2025-07)
SHOPIFY_API_VERSION=2025-07
```

#### Environment Variable Validation

The application uses **Zod** for robust environment variable validation:

- ✅ **Type Safety**: All environment variables are validated at startup
- ✅ **Format Validation**: Ensures Shopify domains are properly formatted
- ✅ **Clear Error Messages**: Detailed validation errors if configuration is incorrect
- ✅ **Default Values**: Sensible defaults for optional variables

**Validation Rules:**

- `SHOPIFY_STORE_DOMAIN`: Must be a valid Shopify domain (e.g., `mystore.myshopify.com`)
- `SHOPIFY_API_VERSION`: Must be in `YYYY-MM` format (defaults to `2025-07`)

#### Tokenless Access Features

With tokenless access, you get:

- ✅ **Products and Collections** - Full access
- ✅ **Search functionality** - Advanced product search
- ✅ **Cart operations** - Read and write cart data
- ✅ **Selling Plans** - Access to subscription plans
- ❌ **Product Tags** - Requires token-based authentication
- ❌ **Metaobjects/Metafields** - Requires token-based authentication

If validation fails, the application will show clear error messages explaining what's wrong.

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### 6. Test Your API

Visit `http://localhost:3000/debug` for an interactive debug page where you can:

- Test all API endpoints with live buttons
- See example URLs and parameters
- View API responses in real-time
- Experiment with different search filters

Or visit `http://localhost:3000` for the main landing page with API documentation.

## API Endpoints

### 🔍 Product Search

**GET** `/api/inventory/search`

Search products with various filters and sorting options.

#### Query Parameters

| Parameter      | Type    | Description               | Example                                  |
| -------------- | ------- | ------------------------- | ---------------------------------------- |
| `q`            | string  | Search query              | `t-shirt`                                |
| `limit`        | number  | Results per page (max 50) | `20`                                     |
| `cursor`       | string  | Pagination cursor         | `eyJsYXN0X2lkIjo...`                     |
| `sort`         | string  | Sort order                | `PRICE`, `TITLE`, `CREATED`, `RELEVANCE` |
| `product_type` | string  | Filter by product type    | `Clothing`                               |
| `vendor`       | string  | Filter by vendor          | `Nike`                                   |
| `tag`          | string  | Filter by tag             | `sale`                                   |
| `min_price`    | number  | Minimum price             | `10.00`                                  |
| `max_price`    | number  | Maximum price             | `100.00`                                 |
| `in_stock`     | boolean | Only in-stock items       | `true`                                   |
| `available`    | boolean | Only available items      | `true`                                   |

#### Example Request

```bash
GET /api/inventory/search?q=t-shirt&product_type=Clothing&in_stock=true&limit=10
```

#### Example Response

```json
{
  "products": [
    {
      "id": "gid://shopify/Product/123456789",
      "title": "Classic Cotton T-Shirt",
      "handle": "classic-cotton-t-shirt",
      "description": "Comfortable cotton t-shirt...",
      "productType": "Clothing",
      "tags": ["cotton", "casual"],
      "vendor": "Fashion Brand",
      "priceRange": {
        "min": "19.99",
        "max": "29.99",
        "currency": "USD"
      },
      "variants": [
        {
          "id": "gid://shopify/ProductVariant/987654321",
          "title": "Small / White",
          "sku": "TS-S-WHT",
          "price": "19.99",
          "inventoryQuantity": 25,
          "availableForSale": true,
          "options": [
            { "name": "Size", "value": "Small" },
            { "name": "Color", "value": "White" }
          ]
        }
      ],
      "images": [
        {
          "url": "https://cdn.shopify.com/s/files/1/0000/0000/products/t-shirt.jpg",
          "altText": "Classic Cotton T-Shirt"
        }
      ]
    }
  ],
  "pagination": {
    "hasNextPage": true,
    "endCursor": "eyJsYXN0X2lkIjo...",
    "totalCount": 1
  }
}
```

#### Advanced Search (POST)

**POST** `/api/inventory/search`

Send complex search queries with multiple filters in the request body.

```json
{
  "query": "t-shirt",
  "filters": {
    "productType": "Clothing",
    "vendor": "Nike",
    "minPrice": "20.00",
    "maxPrice": "50.00",
    "inStock": true,
    "availableForSale": true
  },
  "pagination": {
    "limit": 20,
    "cursor": null
  },
  "sort": "PRICE"
}
```

### 📦 Product Details

**GET** `/api/products/{id}`

Get detailed information about a specific product.

#### Parameters

| Parameter | Type   | Description          | Example                           |
| --------- | ------ | -------------------- | --------------------------------- |
| `id`      | string | Product ID or handle | `gid://shopify/Product/123456789` |

#### Example Request

```bash
GET /api/products/gid://shopify/Product/123456789
```

### 📊 Inventory Check

**GET** `/api/inventory/check`

Check inventory levels for specific product variants.

#### Query Parameters

| Parameter | Type   | Description                 | Example                                                         |
| --------- | ------ | --------------------------- | --------------------------------------------------------------- |
| `ids`     | string | Comma-separated variant IDs | `gid://shopify/ProductVariant/1,gid://shopify/ProductVariant/2` |

#### Example Request

```bash
GET /api/inventory/check?ids=gid://shopify/ProductVariant/987654321,gid://shopify/ProductVariant/987654322
```

#### Example Response

```json
{
  "inventory": [
    {
      "id": "gid://shopify/ProductVariant/987654321",
      "sku": "TS-S-WHT",
      "title": "Small / White",
      "inventoryQuantity": 25,
      "availableForSale": true,
      "price": "19.99",
      "currency": "USD",
      "product": {
        "title": "Classic Cotton T-Shirt",
        "handle": "classic-cotton-t-shirt"
      }
    }
  ],
  "summary": {
    "totalVariants": 2,
    "inStock": 1,
    "outOfStock": 1,
    "lowStock": 0
  }
}
```

#### Batch Inventory Check (POST)

**POST** `/api/inventory/check`

Check inventory for multiple variants at once.

```json
{
  "variantIds": [
    "gid://shopify/ProductVariant/987654321",
    "gid://shopify/ProductVariant/987654322"
  ]
}
```

### 📂 Collections

**GET** `/api/collections`

Browse and search through product collections.

#### Query Parameters

| Parameter          | Type    | Description                  | Example              |
| ------------------ | ------- | ---------------------------- | -------------------- |
| `limit`            | number  | Results per page (max 50)    | `20`                 |
| `cursor`           | string  | Pagination cursor            | `eyJsYXN0X2lkIjo...` |
| `include_products` | boolean | Include products in response | `true`               |

#### Example Request

```bash
GET /api/collections?include_products=true&limit=10
```

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `404` - Not Found (product/collection doesn't exist)
- `500` - Internal Server Error

Error responses include a descriptive message:

```json
{
  "error": "Product not found"
}
```

## Rate Limiting

Shopify Storefront API has rate limits:

- 1000 requests per minute for authenticated requests
- 60 requests per minute for unauthenticated requests

The API handles rate limiting automatically and will return appropriate error messages if limits are exceeded.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The API can be deployed to any platform that supports Node.js:

- Heroku
- Railway
- DigitalOcean App Platform
- AWS Lambda

## Usage Examples

### JavaScript/Node.js

```javascript
// Search products
const response = await fetch("/api/inventory/search?q=t-shirt&in_stock=true");
const data = await response.json();

// Get product details
const productResponse = await fetch(
  "/api/products/gid://shopify/Product/123456789"
);
const product = await productResponse.json();

// Check inventory
const inventoryResponse = await fetch(
  "/api/inventory/check?ids=variant-id-1,variant-id-2"
);
const inventory = await inventoryResponse.json();
```

### Python

```python
import requests

# Search products
response = requests.get('/api/inventory/search', params={
    'q': 't-shirt',
    'in_stock': 'true'
})
data = response.json()

# Get product details
product = requests.get('/api/products/gid://shopify/Product/123456789').json()
```

### cURL

```bash
# Search products
curl "http://localhost:3000/api/inventory/search?q=t-shirt&limit=5"

# Get product details
curl "http://localhost:3000/api/products/gid://shopify/Product/123456789"

# Check inventory
curl "http://localhost:3000/api/inventory/check?ids=variant-id-1,variant-id-2"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - feel free to use this in your projects!
