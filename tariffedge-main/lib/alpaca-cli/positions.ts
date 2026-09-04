/**
 * Position operations via Alpaca CLI
 * 
 * HACKATHON REQUIREMENT: Uses official Alpaca CLI for position queries
 * instead of direct SDK calls.
 */

import { executeAlpacaCLI, type CLIResult } from './client';

/**
 * CLI position details
 */
export interface CLIPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  asset_marginable: boolean;
  qty: string;
  avg_entry_price: string;
  side: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl: string;
  unrealized_intraday_plpc: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
  qty_available: string;
}

/**
 * Get all positions via CLI
 * 
 * CLI command: alpaca position list --output json
 */
export async function getAllPositionsViaCLI(): Promise<CLIResult<CLIPosition[]>> {
  console.log('[CLI POSITION] Fetching all positions via CLI...');
  return executeAlpacaCLI<CLIPosition[]>(['position', 'list']);
}

/**
 * Get single position via CLI
 * 
 * @param symbol Position symbol
 */
export async function getPositionViaCLI(
  symbol: string
): Promise<CLIResult<CLIPosition>> {
  console.log(`[CLI POSITION] Fetching position for ${symbol} via CLI...`);
  return executeAlpacaCLI<CLIPosition>(['position', 'get', '--symbol', symbol]);
}

/**
 * Close position via CLI
 * 
 * @param symbol Position symbol
 * @param qty Optional quantity to close (defaults to all)
 */
export async function closePositionViaCLI(
  symbol: string,
  qty?: number
): Promise<CLIResult> {
  console.log(`[CLI POSITION] Closing position for ${symbol} via CLI...`);

  const args = ['position', 'close', '--symbol', symbol];
  if (qty !== undefined) {
    args.push('--qty', String(qty));
  }

  return executeAlpacaCLI(args);
}

/**
 * Close all positions via CLI
 */
export async function closeAllPositionsViaCLI(): Promise<CLIResult> {
  console.log('[CLI POSITION] Closing all positions via CLI...');
  return executeAlpacaCLI(['position', 'close-all']);
}
