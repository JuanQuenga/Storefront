import { envSchema } from "./env";

/**
 * Test cases for environment variable validation
 * Run with: npx tsx src/lib/env.test.ts
 */

// Test valid environment variables (tokenless)
const validEnv = {
  SHOPIFY_STORE_DOMAIN: "mystore.myshopify.com",
  SHOPIFY_API_VERSION: "2024-04",
  NODE_ENV: "development" as const,
};

// Test invalid cases
const invalidCases = [
  {
    name: "Invalid store domain",
    env: { ...validEnv, SHOPIFY_STORE_DOMAIN: "invalid-domain.com" },
    expectedError: "SHOPIFY_STORE_DOMAIN must be a valid Shopify store domain",
  },
  {
    name: "Invalid API version format",
    env: { ...validEnv, SHOPIFY_API_VERSION: "invalid-version" },
    expectedError: "SHOPIFY_API_VERSION must be in format YYYY-MM",
  },
  {
    name: "Missing required field",
    env: { SHOPIFY_API_VERSION: "2024-04" }, // Missing required fields
    expectedError: "SHOPIFY_STORE_DOMAIN is required",
  },
];

console.log("🧪 Testing Environment Variable Validation...\n");

// Test valid case
try {
  const result = envSchema.parse(validEnv);
  console.log("✅ Valid environment variables parsed successfully");
  console.log("   Store Domain:", result.SHOPIFY_STORE_DOMAIN);
  console.log("   API Version:", result.SHOPIFY_API_VERSION);
  console.log("   Environment:", result.NODE_ENV);
} catch (error) {
  console.log("❌ Valid case failed:", error);
}

// Test invalid cases
invalidCases.forEach(({ name, env, expectedError }) => {
  try {
    envSchema.parse(env);
    console.log(`❌ ${name}: Should have failed but didn't`);
  } catch (error: any) {
    if (error.message.includes(expectedError)) {
      console.log(`✅ ${name}: Validation correctly failed`);
    } else {
      console.log(`❌ ${name}: Failed with unexpected error:`, error.message);
    }
  }
});

console.log("\n🎉 Environment validation testing complete!");

// Export for potential use in other test files
export { validEnv, invalidCases };
