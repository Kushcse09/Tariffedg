/**
 * Test script for position construction module
 * 
 * Run with: npx tsx scripts/test-position-construction.ts
 * 
 * Tests:
 * 1. Direction determination from signal text
 * 2. Option chain fetching (if available)
 * 3. Spread construction (if option data available)
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });

import { determineDirection } from "../lib/positions/spreadBuilder";
import { getOptionChain } from "../lib/positions/optionChain";
import { buildVerticalSpread } from "../lib/positions";

async function testPositionConstruction() {
  console.log("🧪 Testing Position Construction Module\n");
  console.log("=".repeat(60));

  // Test 1: Direction determination
  console.log("\n1️⃣  Testing direction determination...");

  const bearishSignals = [
    "New tariff on semiconductor imports takes effect",
    "Export ban disrupts supply chains",
    "Trade tensions escalate with new sanctions",
  ];

  const bullishSignals = [
    "Tariff exemption granted for consumer electronics",
    "Trade deal reached, easing restrictions",
    "Breakthrough in negotiations lifts market sentiment",
  ];

  console.log("\nBearish signals:");
  bearishSignals.forEach((text) => {
    const direction = determineDirection(text);
    const symbol = direction === "bearish" ? "✅" : "❌";
    console.log(`  ${symbol} "${text.substring(0, 50)}..." → ${direction}`);
  });

  console.log("\nBullish signals:");
  bullishSignals.forEach((text) => {
    const direction = determineDirection(text);
    const expected = "bullish";
    const symbol = direction === expected ? "✅" : "⚠️";
    console.log(`  ${symbol} "${text.substring(0, 50)}..." → ${direction}${direction !== expected ? " (expected bullish)" : ""}`);
  });

  // Test 2: Option chain fetching
  console.log("\n2️⃣  Testing option chain fetching...");

  const testTicker = "SPY"; // SPY usually has liquid options
  console.log(`\nAttempting to fetch option chain for ${testTicker}...`);

  try {
    const chain = await getOptionChain(testTicker);
    console.log(`✅ Successfully fetched chain for ${testTicker}`);
    console.log(`   Underlying price: $${chain.underlyingPrice.toFixed(2)}`);
    console.log(`   Available expirations: ${chain.expirations.length}`);
    console.log(`   Call contracts: ${chain.calls.length}`);
    console.log(`   Put contracts: ${chain.puts.length}`);

    if (chain.expirations.length > 0) {
      console.log(`   Nearest expiry: ${chain.expirations[0]}`);
      console.log(`   Furthest expiry: ${chain.expirations[chain.expirations.length - 1]}`);
    }

    // Test 3: Spread construction
    console.log("\n3️⃣  Testing spread construction...");

    const testSignal = {
      source: "GDELT",
      time: "12:00:00",
      ticker: testTicker,
      text: "Energy market disruption creates supply risk",
    };

    console.log(`\nBuilding spread for signal: "${testSignal.text}"`);

    try {
      const spread = await buildVerticalSpread(testTicker, testSignal);
      console.log("✅ Successfully built spread");
      console.log(`   Type: ${spread.type}`);
      console.log(`   Ticker: ${spread.ticker}`);
      console.log(`   Max loss: $${spread.maxLoss.toFixed(2)}`);
      console.log(`   Legs:`);
      spread.legs.forEach((leg, i) => {
        console.log(`     ${i + 1}. ${leg.action.toUpperCase()} ${leg.strike} ${spread.type.includes("put") ? "put" : "call"}`);
        console.log(`        Contract: ${leg.contractSymbol}`);
        console.log(`        Expiry: ${leg.expiry}`);
      });
      console.log(`   Thesis: ${spread.thesisText}`);
    } catch (error) {
      console.warn("⚠️  Could not build spread:", error instanceof Error ? error.message : error);
      console.warn("   This may be expected if:");
      console.warn("   - Option chain has no suitable expiries (need 30-60 DTE)");
      console.warn("   - No suitable strikes found");
      console.warn("   - Max loss would exceed $500 cap");
    }
  } catch (error) {
    console.warn("⚠️  Could not fetch option chain:", error instanceof Error ? error.message : error);
    console.warn("   This may be expected if:");
    console.warn("   - Alpaca paper account doesn't have options access");
    console.warn("   - Ticker doesn't support options");
    console.warn("   - API credentials are not configured");
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Position construction module tests complete\n");
  console.log("📝 Notes:");
  console.log("   - Direction heuristics use simple keyword matching");
  console.log("   - Option chain access depends on Alpaca account permissions");
  console.log("   - Spread construction requires live option data");
  console.log("   - All spreads are PREVIEW only (no orders submitted)");
  console.log("\n🔗 Next steps:");
  console.log("   - Test via API: curl -X POST http://localhost:3000/api/positions/preview");
  console.log("   - Use real signals from /api/signals");
  console.log("   - Integrate with order submission (future)");
  console.log("=".repeat(60) + "\n");
}

testPositionConstruction().catch((error) => {
  console.error("\n💥 Test failed:", error);
  process.exit(1);
});
