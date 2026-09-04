/**
 * Account operations via Alpaca CLI
 * 
 * HACKATHON REQUIREMENT: Uses official Alpaca CLI for account status checks
 * instead of direct SDK calls.
 */

import { executeAlpacaCLI, type CLIResult } from './client';

/**
 * Account details from CLI
 */
export interface CLIAccountInfo {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  cash: string;
  portfolio_value: string;
  pattern_day_trader: boolean;
  trade_suspended_by_user: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
  shorting_enabled: boolean;
  long_market_value: string;
  short_market_value: string;
  equity: string;
  last_equity: string;
  multiplier: string;
  buying_power: string;
  initial_margin: string;
  maintenance_margin: string;
  sma: string;
  daytrade_count: number;
  last_maintenance_margin: string;
  daytrading_buying_power: string;
  regt_buying_power: string;
}

/**
 * Get account status via CLI
 * 
 * CLI command: alpaca account get --output json
 */
export async function getAccountViaCLI(): Promise<CLIResult<CLIAccountInfo>> {
  console.log('[CLI ACCOUNT] Fetching account info via Alpaca CLI...');
  return executeAlpacaCLI<CLIAccountInfo>(['account', 'get']);
}

/**
 * Get portfolio history via CLI
 * 
 * @param period Time period (e.g. '1D', '1W', '1M')
 * @param timeframe Timeframe (e.g. '1Min', '5Min', '1H', '1D')
 */
export async function getPortfolioHistoryViaCLI(
  period: string = '1D',
  timeframe: string = '5Min'
): Promise<CLIResult> {
  console.log(`[CLI ACCOUNT] Fetching portfolio history (${period}, ${timeframe})...`);
  return executeAlpacaCLI([
    'account',
    'portfolio',
    '--period',
    period,
    '--timeframe',
    timeframe,
  ]);
}

/**
 * Get account activities via CLI
 * 
 * @param activityType Activity type filter (e.g. 'FILL', 'DIVIDEND', 'DIV', 'ACATC', etc.)
 */
export async function getAccountActivitiesViaCLI(
  activityType?: string
): Promise<CLIResult> {
  console.log('[CLI ACCOUNT] Fetching account activities...');
  
  const args = ['account', 'activity', 'list'];
  if (activityType) {
    args.push('--activity-types', activityType);
  }
  
  return executeAlpacaCLI(args);
}
