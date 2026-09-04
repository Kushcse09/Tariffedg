/**
 * Live Paper Trading Scheduler
 * 
 * HACKATHON REQUIREMENT: Runs automated signal checking and order submission
 * to accumulate real P&L evidence by submission deadline (Sep 4, 8:30 PM IST).
 * 
 * This scheduler:
 * 1. Fetches signals every 15 minutes during market hours
 * 2. For each mapped signal, constructs a spread
 * 3. Runs through risk gate
 * 4. Submits via Alpaca CLI if passed
 * 5. Logs all decisions to audit trail
 * 
 * Run this continuously from now until Sep 4 to build real trading history.
 * 
 * Usage:
 *   npx tsx scripts/live-trading-scheduler.ts
 * 
 * Or run in background:
 *   nohup npx tsx scripts/live-trading-scheduler.ts > trader.log 2>&1 &
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { fetchAllSignals } from '../lib/signals';
import { buildVerticalSpread } from '../lib/positions/spreadBuilder';
import { submitSpreadOrder } from '../lib/positions/submitOrder';
import { getAccountViaCLI, getAllPositionsViaCLI } from '../lib/alpaca-cli';

interface TradingSession {
  startTime: Date;
  checksRun: number;
  signalsProcessed: number;
  ordersSubmitted: number;
  ordersBlocked: number;
  errors: number;
}

const session: TradingSession = {
  startTime: new Date(),
  checksRun: 0,
  signalsProcessed: 0,
  ordersSubmitted: 0,
  ordersBlocked: 0,
  errors: 0,
};

/**
 * Check if market is open (simplified check)
 * 
 * US market hours: 9:30 AM - 4:00 PM ET (Monday-Friday)
 * For the hackathon, we'll run 24/7 to maximize signal capture
 */
function isMarketHours(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = now.getHours();

  // Skip weekends
  if (day === 0 || day === 6) {
    return false;
  }

  // For hackathon: run extended hours to catch more signals
  // Regular hours: 9:30 AM - 4:00 PM ET (14:30 - 21:00 UTC)
  // Extended: 4:00 AM - 8:00 PM ET (9:00 - 1:00 UTC next day)
  return hour >= 9 || hour <= 1; // Extended hours
}

/**
 * Process signals and submit orders
 */
async function processSignals(): Promise<void> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🤖 TariffEdge Automated Trading - Check #${session.checksRun + 1}`);
  console.log(`📅 ${new Date().toISOString()}`);
  console.log('='.repeat(70));

  session.checksRun++;

  try {
    // Step 1: Check account status
    console.log('\n📊 Checking account status...');
    const accountResult = await getAccountViaCLI();
    
    if (!accountResult.success) {
      console.error('❌ Failed to fetch account:', accountResult.error);
      session.errors++;
      return;
    }

    console.log(`✅ Account: ${accountResult.data?.account_number}`);
    console.log(`   Equity: $${accountResult.data?.equity}`);
    console.log(`   Buying Power: $${accountResult.data?.buying_power}`);

    // Step 2: Check current positions
    console.log('\n📈 Checking current positions...');
    const positionsResult = await getAllPositionsViaCLI();
    
    if (positionsResult.success) {
      const positions = positionsResult.data || [];
      console.log(`   Open Positions: ${positions.length}/3`);
      
      if (positions.length > 0) {
        positions.forEach((pos) => {
          console.log(`   - ${pos.symbol}: ${pos.qty} @ $${pos.current_price} (P&L: $${pos.unrealized_pl})`);
        });
      }

      // Skip trading if we're at max positions
      if (positions.length >= 3) {
        console.log('\n⚠️  Max positions reached (3/3). Skipping signal processing.');
        return;
      }
    }

    // Step 3: Fetch signals
    console.log('\n📰 Fetching signals...');
    const signals = await fetchAllSignals();
    const mappedSignals = signals.filter((s) => s.ticker);

    console.log(`✅ Fetched ${signals.length} signals, ${mappedSignals.length} mapped to tickers`);

    if (mappedSignals.length === 0) {
      console.log('ℹ️  No mapped signals to process.');
      return;
    }

    // Step 4: Process first mapped signal (one at a time to avoid overloading)
    const signal = mappedSignals[0];
    session.signalsProcessed++;

    console.log(`\n🎯 Processing signal: ${signal.ticker}`);
    console.log(`   Source: ${signal.source}`);
    console.log(`   Text: ${signal.text.substring(0, 100)}...`);

    try {
      // Build spread
      console.log('\n🔨 Building spread...');
      const spread = await buildVerticalSpread(signal.ticker, signal);

      console.log(`✅ Spread: ${spread.type}`);
      console.log(`   Max Loss: $${spread.maxLoss.toFixed(2)}`);
      console.log(`   Estimated Cost: $${spread.estimatedCost.toFixed(2)}`);

      // Submit order (includes risk gate check and audit logging)
      console.log('\n🚀 Submitting order via CLI...');
      const result = await submitSpreadOrder(spread, signal);

      if (result.success) {
        console.log(`✅ ORDER SUBMITTED: ${result.orderId}`);
        console.log(`   Message: ${result.message}`);
        session.ordersSubmitted++;
      } else {
        console.log(`⛔ ORDER BLOCKED: ${result.message}`);
        session.ordersBlocked++;
      }
    } catch (error) {
      console.error(`❌ Error processing signal: ${error instanceof Error ? error.message : 'Unknown'}`);
      session.errors++;
    }
  } catch (error) {
    console.error(`❌ Signal processing failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    session.errors++;
  }
}

/**
 * Print session summary
 */
function printSummary(): void {
  const runtime = Math.floor((Date.now() - session.startTime.getTime()) / 1000);
  const hours = Math.floor(runtime / 3600);
  const minutes = Math.floor((runtime % 3600) / 60);

  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 SESSION SUMMARY');
  console.log('='.repeat(70));
  console.log(`   Runtime: ${hours}h ${minutes}m`);
  console.log(`   Checks Run: ${session.checksRun}`);
  console.log(`   Signals Processed: ${session.signalsProcessed}`);
  console.log(`   Orders Submitted: ${session.ordersSubmitted}`);
  console.log(`   Orders Blocked: ${session.ordersBlocked}`);
  console.log(`   Errors: ${session.errors}`);
  console.log('='.repeat(70));
}

/**
 * Main scheduler loop
 */
async function main() {
  console.log('🚀 TariffEdge Live Trading Scheduler');
  console.log('=====================================');
  console.log(`Started: ${session.startTime.toISOString()}`);
  console.log(`Target: Sep 4, 2026 8:30 PM IST (15:00 UTC)`);
  console.log(`Check Interval: 15 minutes`);
  console.log('\nPress Ctrl+C to stop\n');

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutdown signal received');
    printSummary();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n🛑 Shutdown signal received');
    printSummary();
    process.exit(0);
  });

  // Run immediately on start
  if (isMarketHours()) {
    await processSignals();
  } else {
    console.log('⏰ Outside market hours, waiting for next interval...');
  }

  // Then run every 15 minutes
  const CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes

  setInterval(async () => {
    if (isMarketHours()) {
      await processSignals();
    } else {
      console.log(`\n⏰ ${new Date().toISOString()} - Outside market hours, skipping check`);
    }

    // Print summary every hour
    if (session.checksRun % 4 === 0) {
      printSummary();
    }
  }, CHECK_INTERVAL);

  // Keep process alive
  console.log('✅ Scheduler running. Monitoring for signals...\n');
}

main().catch((error) => {
  console.error('❌ Scheduler crashed:', error);
  printSummary();
  process.exit(1);
});
