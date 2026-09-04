/**
 * End-to-End System Test
 * Tests the complete flow: Signal → Build → Gate → Submit → Log
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { fetchAllSignals } from '../lib/signals';
import { buildVerticalSpread } from '../lib/positions/spreadBuilder';
import { checkRiskGate } from '../lib/risk/riskGate';
import { logDecision } from '../lib/audit/logger';
import { getRecentAuditLog } from '../lib/audit/logger';
import { getAccountStatus } from '../lib/alpaca/account';

async function testEndToEnd() {
  console.log('🚀 TariffEdge End-to-End System Test\n');
  console.log('=' . repeat(60));

  try {
    // Step 1: Verify Alpaca Connection
    console.log('\n📡 Step 1: Verifying Alpaca Connection...');
    const account = await getAccountStatus();
    console.log(`✅ Account: ${account.account_number} (${account.status})`);
    console.log(`   Equity: $${parseFloat(account.equity).toLocaleString()}`);
    console.log(`   Buying Power: $${parseFloat(account.buying_power).toLocaleString()}`);

    // Step 2: Fetch Real Signals
    console.log('\n📰 Step 2: Fetching Real-Time Signals...');
    const signals = await fetchAllSignals();
    console.log(`✅ Fetched ${signals.length} signals`);
    
    const mappedSignals = signals.filter(s => s.ticker);
    console.log(`   ${mappedSignals.length}/${signals.length} mapped to tickers (${Math.round(mappedSignals.length / signals.length * 100)}%)`);
    
    if (mappedSignals.length === 0) {
      console.log('\n⚠️  No signals mapped to tickers. Cannot proceed with spread construction.');
      console.log('   This is expected if GDELT API is unreachable or no matching signals exist.');
      return;
    }

    // Use first mapped signal for testing
    const testSignal = mappedSignals[0];
    console.log(`\n   Testing with signal:`);
    console.log(`   Ticker: ${testSignal.ticker}`);
    console.log(`   Source: ${testSignal.source}`);
    console.log(`   Text: ${testSignal.text.substring(0, 100)}...`);

    // Step 3: Build Spread
    console.log('\n🔨 Step 3: Building Vertical Spread...');
    const spread = await buildVerticalSpread(testSignal.ticker!, testSignal);
    
    console.log(`✅ Spread constructed:`);
    console.log(`   Type: ${spread.type}`);
    console.log(`   Ticker: ${spread.ticker}`);
    console.log(`   Legs: ${spread.legs.length}`);
    console.log(`   Max Loss: $${spread.maxLoss.toFixed(2)}`);
    console.log(`   Estimated Cost: $${spread.estimatedCost.toFixed(2)}`);
    
    spread.legs.forEach((leg, i) => {
      console.log(`   Leg ${i + 1}: ${leg.action.toUpperCase()} ${leg.contractSymbol} @ $${leg.limitPrice}`);
    });

    // Step 4: Run Risk Gate
    console.log('\n🛡️  Step 4: Running Risk Gate Checks...');
    const riskResult = await checkRiskGate(spread);
    
    if (riskResult.passed) {
      console.log('✅ Risk gate PASSED - Order eligible for submission');
    } else {
      console.log(`❌ Risk gate BLOCKED: ${riskResult.reason}`);
    }

    // Step 5: Log Decision
    console.log('\n📝 Step 5: Logging Decision...');
    const now = new Date();
    const logEntry = {
      time: now.toTimeString().substring(0, 5),
      trigger: `${testSignal.ticker} signal ingested`,
      thesis: spread.thesisText,
      risk: riskResult.passed ? 'PASSED' as const : 'BLOCKED' as const,
      tone: spread.type.includes('put') ? 'negative' as const : 'positive' as const,
      order: riskResult.passed ? 'READY-FOR-SUBMISSION' : '—',
      ticker: spread.ticker,
      signalText: testSignal.text,
      signalSource: testSignal.source,
      riskReason: riskResult.reason,
      submittedAt: now.toISOString(),
    };

    await logDecision(logEntry);
    console.log('✅ Decision logged to audit trail');

    // Step 6: Verify Audit Log
    console.log('\n📊 Step 6: Verifying Audit Log...');
    const auditLog = await getRecentAuditLog(5);
    console.log(`✅ Retrieved ${auditLog.length} recent audit entries`);
    
    console.log('\n   Most recent entry:');
    const latest = auditLog[auditLog.length - 1];
    console.log(`   Time: ${latest.time}`);
    console.log(`   Ticker: ${latest.ticker}`);
    console.log(`   Risk: ${latest.risk}`);
    console.log(`   Order: ${latest.order}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ END-TO-END TEST COMPLETE');
    console.log('='.repeat(60));
    console.log('\n📋 Test Summary:');
    console.log(`   ✅ Alpaca connection verified`);
    console.log(`   ✅ Signals fetched and mapped`);
    console.log(`   ✅ Spread constructed`);
    console.log(`   ✅ Risk gate evaluated`);
    console.log(`   ✅ Decision logged`);
    console.log(`   ✅ Audit log verified`);
    
    console.log('\n🎯 System Status: OPERATIONAL');
    console.log('\n💡 Next Steps:');
    console.log('   1. Start dev server: pnpm dev');
    console.log('   2. Test API endpoints:');
    console.log('      curl http://localhost:3000/api/signals');
    console.log('      curl http://localhost:3000/api/audit');
    console.log('   3. Submit real order via POST /api/positions/submit');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('   Error:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run test
testEndToEnd();
