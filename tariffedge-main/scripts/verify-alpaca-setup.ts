/**
 * Verification script for Alpaca paper trading setup
 * 
 * Run with: npx tsx scripts/verify-alpaca-setup.ts
 * 
 * This script:
 * 1. Checks environment variables are set
 * 2. Tests connection to Alpaca paper trading API
 * 3. Retrieves account status
 * 4. Places and cancels a test order
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { getAccountStatus, placeTestOrder } from "../lib/alpaca";

async function verifySetup() {
  console.log("🔍 Verifying Alpaca Paper Trading Setup\n");
  console.log("=" .repeat(60));
  
  // Step 1: Check environment variables
  console.log("\n1️⃣  Checking environment variables...");
  const requiredVars = ["ALPACA_API_KEY", "ALPACA_SECRET_KEY", "ALPACA_BASE_URL"];
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error("❌ Missing environment variables:", missing.join(", "));
    console.error("\n💡 Create a .env.local file with:");
    console.error("   ALPACA_API_KEY=your_key");
    console.error("   ALPACA_SECRET_KEY=your_secret");
    console.error("   ALPACA_BASE_URL=https://paper-api.alpaca.markets");
    process.exit(1);
  }
  
  console.log("✅ All required environment variables are set");
  
  // Step 2: Test account connection
  console.log("\n2️⃣  Testing account connection...");
  try {
    const account = await getAccountStatus();
    console.log("✅ Successfully connected to Alpaca paper trading account");
    console.log("\n📊 Account Status:");
    console.log(`   Account Number: ${account.accountNumber}`);
    console.log(`   Status: ${account.status}`);
    console.log(`   Equity: $${parseFloat(account.equity).toLocaleString()}`);
    console.log(`   Cash: $${parseFloat(account.cash).toLocaleString()}`);
    console.log(`   Buying Power: $${parseFloat(account.buyingPower).toLocaleString()}`);
  } catch (error) {
    console.error("❌ Failed to connect to Alpaca:", error);
    process.exit(1);
  }
  
  // Step 3: Test order flow
  console.log("\n3️⃣  Testing order placement and cancellation...");
  try {
    const result = await placeTestOrder();
    
    if (result.success && result.cancelled) {
      console.log("✅ Order flow test successful");
      console.log(`   Order ID: ${result.orderId}`);
      console.log(`   Client Order ID: ${result.clientOrderId}`);
      console.log(`   Symbol: ${result.symbol}`);
      console.log(`   Status: Placed and cancelled successfully`);
    } else if (result.success && !result.cancelled) {
      console.warn("⚠️  Order was placed but cancellation failed");
      console.warn(`   Order ID: ${result.orderId}`);
      console.warn("   Please manually cancel the order in your Alpaca dashboard");
    } else {
      console.error("❌ Order flow test failed:", result.message);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Test order failed:", error);
    process.exit(1);
  }
  
  // Success!
  console.log("\n" + "=".repeat(60));
  console.log("✅ All verification checks passed!");
  console.log("\n📝 Next steps:");
  console.log("   1. Start your dev server: pnpm dev");
  console.log("   2. Test the API endpoint: http://localhost:3000/api/alpaca/status");
  console.log("   3. Check your Alpaca dashboard for the test order");
  console.log("   4. Start building your trading features!");
  console.log("\n🔗 Alpaca Paper Dashboard:");
  console.log("   https://app.alpaca.markets/paper/dashboard/overview");
  console.log("=" .repeat(60) + "\n");
}

verifySetup().catch(error => {
  console.error("\n💥 Verification failed:", error);
  process.exit(1);
});
