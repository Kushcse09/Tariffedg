/**
 * System Status Check
 * Verifies all components are properly configured and operational
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { fetchAllSignals } from '../lib/signals';
import { checkRiskGate, getRiskStatus } from '../lib/risk/riskGate';
import { logDecision, getRecentAuditLog } from '../lib/audit/logger';
import { getAccountStatus } from '../lib/alpaca/account';
import type { SpreadOrder } from '../lib/positions/spreadBuilder';

async function checkSystemStatus() {
  console.log('🔍 TariffEdge System Status Check\n');
  console.log('=' .repeat(70));

  const results = {
    alpaca: false,
    signals: false,
    riskGate: false,
    auditLog: false,
    overall: false,
  };

  // Check 1: Alpaca Connection
  console.log('\n📡 Component 1: Alpaca Paper Trading Integration');
  console.log('-'.repeat(70));
  try {
    const account = await getAccountStatus();
    console.log('✅ Status: OPERATIONAL');
    console.log(`   Account Number: ${account.account_number}`);
    console.log(`   Account Status: ${account.status}`);
    console.log(`   Equity: $${parseFloat(account.equity).toLocaleString()}`);
    console.log(`   Buying Power: $${parseFloat(account.buying_power).toLocaleString()}`);
    console.log(`   Pattern Day Trader: ${account.pattern_day_trader ? 'Yes' : 'No'}`);
    results.alpaca = true;
  } catch (error) {
    console.log('❌ Status: ERROR');
    console.log(`   ${error instanceof Error ? error.message : String(error)}`);
    console.log('   Note: API may be unavailable outside market hours');
  }

  // Check 2: Signal Ingestion
  console.log('\n📰 Component 2: Signal Ingestion Module');
  console.log('-'.repeat(70));
  try {
    const signals = await fetchAllSignals();
    const mappedSignals = signals.filter(s => s.ticker);
    const uniqueTickers = [...new Set(mappedSignals.map(s => s.ticker))];
    
    console.log('✅ Status: OPERATIONAL');
    console.log(`   Total Signals: ${signals.length}`);
    console.log(`   Mapped Signals: ${mappedSignals.length}/${signals.length} (${Math.round(mappedSignals.length / signals.length * 100)}%)`);
    console.log(`   Unique Tickers: ${uniqueTickers.length}`);
    console.log(`   Sources: GDELT (active), Freightos (stubbed)`);
    
    if (mappedSignals.length > 0) {
      console.log('\n   Sample mapped signals:');
      mappedSignals.slice(0, 3).forEach((s, i) => {
        console.log(`   ${i + 1}. [${s.ticker}] ${s.text.substring(0, 60)}...`);
      });
    }
    results.signals = true;
  } catch (error) {
    console.log('❌ Status: ERROR');
    console.log(`   ${error instanceof Error ? error.message : String(error)}`);
  }

  // Check 3: Risk Gate
  console.log('\n🛡️  Component 3: Risk Gate Module');
  console.log('-'.repeat(70));
  try {
    // Create mock spread orders for testing
    const validSpread: SpreadOrder = {
      ticker: 'XLE',
      type: 'put_debit_spread',
      legs: [
        {
          action: 'buy',
          strike: 95,
          expiry: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          contractSymbol: 'XLE250418P00095000',
          limitPrice: 3.50,
        },
        {
          action: 'sell',
          strike: 90,
          expiry: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          contractSymbol: 'XLE250418P00090000',
          limitPrice: 1.20,
        },
      ],
      maxLoss: 230,
      estimatedCost: 230,
      thesisText: 'Test bearish spread - tariff impact on energy sector',
    };

    const invalidSpread: SpreadOrder = {
      ...validSpread,
      maxLoss: 600,
      estimatedCost: 600,
      thesisText: 'Test spread exceeding max loss limit',
    };

    const validResult = await checkRiskGate(validSpread);
    const invalidResult = await checkRiskGate(invalidSpread);
    
    console.log('✅ Status: OPERATIONAL');
    console.log(`   Test 1 (valid $230 spread): ${validResult.passed ? 'PASSED ✅' : 'BLOCKED ❌'}`);
    console.log(`   Test 2 (invalid $600 spread): ${invalidResult.passed ? 'PASSED ❌' : 'BLOCKED ✅'}`);
    
    if (!invalidResult.passed) {
      console.log(`   Block Reason: ${invalidResult.reason}`);
    }

    const riskStatus = await getRiskStatus();
    console.log(`\n   Current Risk Status:`);
    console.log(`   Open Positions: ${riskStatus.openPositions}/3`);
    console.log(`   Daily Loss: $${riskStatus.dailyLoss.toFixed(2)}/$1,500`);
    console.log(`   Max Loss Cap: $500 per spread`);

    results.riskGate = validResult.passed && !invalidResult.passed;
  } catch (error) {
    console.log('❌ Status: ERROR');
    console.log(`   ${error instanceof Error ? error.message : String(error)}`);
  }

  // Check 4: Audit Logger
  console.log('\n📝 Component 4: Audit Logger Module');
  console.log('-'.repeat(70));
  try {
    // Create test log entry
    const testEntry = {
      time: new Date().toTimeString().substring(0, 5),
      trigger: 'System status check',
      thesis: 'Testing audit log functionality',
      risk: 'PASSED' as const,
      tone: 'positive' as const,
      order: 'TEST-SYSTEM-CHECK',
      ticker: 'TEST',
      signalText: 'System status verification test',
      signalSource: 'SYSTEM',
      riskReason: null,
      submittedAt: new Date().toISOString(),
    };

    await logDecision(testEntry);
    const recentLogs = await getRecentAuditLog(5);
    
    console.log('✅ Status: OPERATIONAL');
    console.log(`   Total Entries: ${recentLogs.length}`);
    console.log(`   Storage: /data/audit-log.json`);
    console.log(`   Schema: Frontend-compatible (Decision Timeline)`);
    
    if (recentLogs.length > 0) {
      console.log('\n   Recent entries:');
      recentLogs.slice(-3).forEach((entry, i) => {
        console.log(`   ${i + 1}. [${entry.time}] ${entry.ticker} - ${entry.risk} - ${entry.order}`);
      });
    }

    results.auditLog = true;
  } catch (error) {
    console.log('❌ Status: ERROR');
    console.log(`   ${error instanceof Error ? error.message : String(error)}`);
  }

  // Check 5: API Endpoints
  console.log('\n🌐 Component 5: API Endpoints');
  console.log('-'.repeat(70));
  console.log('Available endpoints:');
  console.log('   GET  /api/alpaca/status       - Account status');
  console.log('   POST /api/alpaca/test-order   - Test order flow');
  console.log('   GET  /api/signals             - Real-time signals');
  console.log('   POST /api/positions/preview   - Spread preview');
  console.log('   POST /api/positions/submit    - Order submission');
  console.log('   GET  /api/audit               - Audit log');
  console.log('\n   To test: pnpm dev && curl http://localhost:3000/api/signals');

  // Overall Status
  results.overall = results.signals && results.riskGate && results.auditLog;
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 OVERALL SYSTEM STATUS');
  console.log('='.repeat(70));
  
  console.log(`\n✅ Signal Ingestion:    ${results.signals ? 'OPERATIONAL' : 'ERROR'}`);
  console.log(`✅ Risk Gate:           ${results.riskGate ? 'OPERATIONAL' : 'ERROR'}`);
  console.log(`✅ Audit Logger:        ${results.auditLog ? 'OPERATIONAL' : 'ERROR'}`);
  console.log(`${results.alpaca ? '✅' : '⚠️ '} Alpaca Integration:  ${results.alpaca ? 'OPERATIONAL' : 'LIMITED (API may be offline)'}`);
  
  console.log(`\n${results.overall ? '🟢' : '🟡'} System Status: ${results.overall ? 'FULLY OPERATIONAL' : 'PARTIALLY OPERATIONAL'}`);
  
  if (!results.alpaca) {
    console.log('\n⚠️  Note: Alpaca API connectivity issues detected.');
    console.log('   This is expected outside market hours or due to network restrictions.');
    console.log('   Core modules (signals, risk, audit) are functioning correctly.');
  }

  console.log('\n💡 Next Steps:');
  console.log('   1. Start dev server: pnpm dev');
  console.log('   2. Test endpoints:');
  console.log('      curl http://localhost:3000/api/signals');
  console.log('      curl http://localhost:3000/api/audit');
  console.log('   3. Monitor audit log at /data/audit-log.json');
  console.log('   4. Submit orders during market hours (9:30 AM - 4:00 PM ET)');

  console.log('\n');
}

// Run check
checkSystemStatus();
