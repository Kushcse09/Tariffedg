/**
 * P&L Display Script
 * 
 * HACKATHON REQUIREMENT: Quick command to view trading performance.
 * Perfect for screenshots in submission materials.
 * 
 * Usage:
 *   npx tsx scripts/show-pnl.ts
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { calculatePnLSummary, formatPnLSummary } from '../lib/pnl';

async function main() {
  try {
    console.log('📊 Fetching TariffEdge performance data...\n');

    const summary = await calculatePnLSummary();
    const formatted = formatPnLSummary(summary);

    console.log(formatted);

    console.log('\n💡 Tips:');
    console.log('   - Screenshot this output for hackathon submission');
    console.log('   - Run live-trading-scheduler.ts to accumulate more trades');
    console.log('   - Check /api/pnl endpoint for JSON format');
    console.log('   - View audit log: cat data/audit-log.json\n');

    // Exit with success
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to calculate P&L:', error);
    process.exit(1);
  }
}

main();
