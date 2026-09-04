/**
 * Risk Gate Module
 * 
 * Validates spread orders against risk management rules before submission.
 * Checks: max loss, duplicate tickers, daily loss cap, position limits.
 */

import { getAlpacaClient } from "@/lib/alpaca/client";
import type { SpreadOrder } from "@/lib/positions";

/**
 * Risk gate result
 */
export interface RiskGateResult {
  passed: boolean;
  reason: string | null;
}

/**
 * Risk management limits (from steering/project.md)
 */
const LIMITS = {
  MAX_LOSS_PER_SPREAD: 500,
  MAX_OPEN_POSITIONS: 3,
  DAILY_LOSS_CAP: 1500,
} as const;

/**
 * Check if spread passes risk gate
 * 
 * Checks in order:
 * 1. Max loss ≤ $500 (hard stop, re-verify from builder)
 * 2. No existing open position on same ticker
 * 3. Daily loss cap not exceeded
 * 4. Max 3 open positions
 * 
 * @param spreadOrder The spread to validate
 * @returns Result with passed flag and reason if blocked
 */
export async function checkRiskGate(
  spreadOrder: SpreadOrder
): Promise<RiskGateResult> {
  try {
    console.log(`[RISK GATE] Checking ${spreadOrder.ticker} spread...`);

    // Check 1: Max loss per spread
    if (spreadOrder.maxLoss > LIMITS.MAX_LOSS_PER_SPREAD) {
      const reason = `Max loss $${spreadOrder.maxLoss.toFixed(2)} exceeds cap of $${LIMITS.MAX_LOSS_PER_SPREAD}`;
      console.warn(`[RISK GATE] ❌ BLOCKED: ${reason}`);
      return { passed: false, reason };
    }
    console.log(`[RISK GATE] ✅ Max loss check passed: $${spreadOrder.maxLoss.toFixed(2)} ≤ $${LIMITS.MAX_LOSS_PER_SPREAD}`);

    const alpaca = getAlpacaClient();

    // Check 2: No duplicate ticker (no existing position on this ticker)
    const positions = await alpaca.trading.positions.getAllOpenPositions();
    const hasDuplicate = positions.some(
      (pos) => pos.symbol === spreadOrder.ticker
    );

    if (hasDuplicate) {
      const reason = `Already have open position on ${spreadOrder.ticker}`;
      console.warn(`[RISK GATE] ❌ BLOCKED: ${reason}`);
      return { passed: false, reason };
    }
    console.log(`[RISK GATE] ✅ No duplicate ticker: ${spreadOrder.ticker} is available`);

    // Check 3: Daily loss cap
    const account = await alpaca.trading.account.getAccount();
    const equity = parseFloat(account.equity || "0");
    const lastEquity = parseFloat(account.lastEquity || equity.toString());
    const dailyPnL = equity - lastEquity;

    // If we're already down for the day, check the cap
    if (dailyPnL < 0 && Math.abs(dailyPnL) >= LIMITS.DAILY_LOSS_CAP) {
      const reason = `Daily loss cap exceeded: -$${Math.abs(dailyPnL).toFixed(2)} ≥ $${LIMITS.DAILY_LOSS_CAP}`;
      console.warn(`[RISK GATE] ❌ BLOCKED: ${reason}`);
      return { passed: false, reason };
    }

    // Also check if adding this spread's max loss would exceed daily cap
    const projectedDailyLoss = Math.abs(dailyPnL) + spreadOrder.maxLoss;
    if (dailyPnL < 0 && projectedDailyLoss > LIMITS.DAILY_LOSS_CAP) {
      const reason = `Adding this spread would exceed daily loss cap: -$${projectedDailyLoss.toFixed(2)} > $${LIMITS.DAILY_LOSS_CAP}`;
      console.warn(`[RISK GATE] ❌ BLOCKED: ${reason}`);
      return { passed: false, reason };
    }
    console.log(`[RISK GATE] ✅ Daily loss check passed: current daily P&L $${dailyPnL.toFixed(2)}`);

    // Check 4: Max open positions
    if (positions.length >= LIMITS.MAX_OPEN_POSITIONS) {
      const reason = `Max position limit reached: ${positions.length}/${LIMITS.MAX_OPEN_POSITIONS} open positions`;
      console.warn(`[RISK GATE] ❌ BLOCKED: ${reason}`);
      return { passed: false, reason };
    }
    console.log(`[RISK GATE] ✅ Position limit check passed: ${positions.length}/${LIMITS.MAX_OPEN_POSITIONS} open`);

    // All checks passed
    console.log(`[RISK GATE] ✅ ALL CHECKS PASSED for ${spreadOrder.ticker}`);
    return { passed: true, reason: null };
  } catch (error) {
    // If we can't check risk due to API error, fail safe and block
    const message = error instanceof Error ? error.message : "Unknown error";
    const reason = `Risk gate check failed: ${message}`;
    console.error(`[RISK GATE] ❌ ERROR: ${reason}`);
    return { passed: false, reason };
  }
}

/**
 * Get current risk status for monitoring
 * 
 * @returns Current risk metrics
 */
export async function getRiskStatus() {
  try {
    const alpaca = getAlpacaClient();

    const [account, positions] = await Promise.all([
      alpaca.trading.account.getAccount(),
      alpaca.trading.positions.getAllOpenPositions(),
    ]);

    const equity = parseFloat(account.equity || "0");
    const lastEquity = parseFloat(account.lastEquity || equity.toString());
    const dailyPnL = equity - lastEquity;

    return {
      openPositions: positions.length,
      maxPositions: LIMITS.MAX_OPEN_POSITIONS,
      dailyLoss: Math.abs(dailyPnL < 0 ? dailyPnL : 0),
      dailyPnL,
      dailyLossCap: LIMITS.DAILY_LOSS_CAP,
      maxLossPerSpread: LIMITS.MAX_LOSS_PER_SPREAD,
      positionTickers: positions.map((p) => p.symbol),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to get risk status: ${message}`);
  }
}
