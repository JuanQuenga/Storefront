// Test VAPI request format
const vapiRequestBody = {
  message: {
    id: "msg_test_123",
    role: "user",
    content: "Find me some red t-shirts",
    toolCallList: [
      {
        id: "call_tool_456",
        type: "function",
        function: {
          name: "search_inventory",
          parameters: {
            q: "red t-shirt",
            limit: 3,
          },
        },
        arguments: {
          q: "red t-shirt",
          limit: 3,
        },
      },
    ],
  },
};

// Test the request
const testVapiRequest = async () => {
  console.log("Testing VAPI request format...");
  console.log("Request body:", JSON.stringify(vapiRequestBody, null, 2));

  try {
    const response = await fetch("http://localhost:3000/api/inventory/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "VAPI/1.0",
      },
      body: JSON.stringify(vapiRequestBody),
    });

    // Add a small delay to ensure logs are processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    const responseData = await response.json();
    console.log("\nResponse status:", response.status);
    console.log("Response data:", JSON.stringify(responseData, null, 2));

    // Check if tool call ID is present
    if (responseData.results && responseData.results[0]) {
      const toolCallId = responseData.results[0].toolCallId;
      console.log("\n✅ Tool Call ID in response:", toolCallId);
      console.log("✅ Expected tool call ID: call_tool_456");
      console.log("✅ Match:", toolCallId === "call_tool_456" ? "YES" : "NO");
    } else {
      console.log("❌ No results found in response");
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
};

// Test VAPI inventory check request
const testVapiInventoryCheck = async () => {
  console.log("\n" + "=".repeat(50));
  console.log("Testing VAPI Inventory Check...");

  const vapiInventoryRequest = {
    message: {
      id: "msg_inventory_789",
      role: "user",
      content: "Check inventory for product variant 12345",
      toolCallList: [
        {
          id: "call_inventory_101",
          type: "function",
          function: {
            name: "check_inventory",
            parameters: {
              ids: "gid://shopify/ProductVariant/12345",
            },
          },
          arguments: {
            ids: "gid://shopify/ProductVariant/12345",
          },
        },
      ],
    },
  };

  try {
    const response = await fetch("http://localhost:3000/api/inventory/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "VAPI/1.0",
      },
      body: JSON.stringify(vapiInventoryRequest),
    });

    const responseData = await response.json();
    console.log("Response status:", response.status);
    console.log("Response data:", JSON.stringify(responseData, null, 2));

    // Check if tool call ID is present
    if (responseData.results && responseData.results[0]) {
      const toolCallId = responseData.results[0].toolCallId;
      console.log("\n✅ Inventory Tool Call ID in response:", toolCallId);
      console.log("✅ Expected tool call ID: call_inventory_101");
      console.log(
        "✅ Match:",
        toolCallId === "call_inventory_101" ? "YES" : "NO"
      );
    } else {
      console.log("❌ No results found in inventory response");
    }
  } catch (error) {
    console.error("❌ VAPI Inventory test failed:", error.message);
  }
};

// Also test a simple GET request
const testGetRequest = async () => {
  console.log("\n" + "=".repeat(50));
  console.log("Testing GET request...");

  try {
    const response = await fetch(
      "http://localhost:3000/api/inventory/search?q=blue%20dress&limit=2"
    );
    const responseData = await response.json();

    console.log("Response status:", response.status);
    console.log("Response data:", JSON.stringify(responseData, null, 2));
  } catch (error) {
    console.error("❌ GET test failed:", error.message);
  }
};

// Run tests
const runTests = async () => {
  await testVapiRequest();
  await testVapiInventoryCheck();
  await testGetRequest();
};

runTests();
