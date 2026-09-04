/**
 * Order Submission Module
 * 
 * HACKATHON REQUIREMENT: Routes order submission through Alpaca CLI
 * instead of direct SDK calls (compliance with technology requirements).
 * 
 * Submits spread orders to Alpaca paper trading account after passing risk gate.
 * Logs all decisions (passed or blocked) to audit log.
 */

import { submitSpreadViaCLI } from "@/lib/alpaca-cli";
import { checkRiskGate } from "@/lib/risk/riskGate";
import { logDecision } from "@/lib/audit/logger";
import type { SpreadOrder } from "./spreadBuilder";
import type { Signal } from "@/lib/signals";

/**
 * Order submission result
 */
export interface SubmissionResult {
  success: boolean;
  orderId?: string;
  message: string;
  riskPassed: boolean;
  riskReason?: string;
}

/**
 * Submit a spread order to Alpaca
 * 
 * Flow:
 * 1. Run risk gate checks
 * 2. Log decision (pass or fail)
 * 3. If passed: submit to Alpaca and update log with order ID
 * 4. If blocked: return block reason
 * 
 * @param spread The spread order to submit
 * @param signal The triggering signal (for audit log)
 * @returns Submission result with order ID or block reason
 */
export async function submitSpreadOrder(
  spread: SpreadOrder,
  signal: Signal
): Promise<SubmissionResult> {
  try {
    console.log(`[SUBMIT] Starting submission flow for ${spread.ticker}...`);

    // Step 1: Run risk gate
    const riskResult = await checkRiskGate(spread);

    // Step 2: If risk gate blocked, log and return
    if (!riskResult.passed) {
      console.warn(
        `[SUBMIT] ❌ Risk gate BLOCKED: ${riskResult.reason}`
      );

      // Log blocked decision
      await logDecision({
        signal,
        spread,
        riskResult,
        // No order ID for blocked submissions
      });

      return {
        success: false,
        message: `Order blocked by risk gate: ${riskResult.reason}`,
        riskPassed: false,
        riskReason: riskResult.reason || undefined,
      };
    }

    console.log(`[SUBMIT] ✅ Risk gate PASSED - proceeding to order submission via CLI`);

    // Step 3: Submit to Alpaca via CLI (HACKATHON REQUIREMENT)
    console.log(`[SUBMIT] Submitting spread order for ${spread.ticker} via Alpaca CLI...`);

    const cliResult = await submitSpreadViaCLI(spread);

    if (!cliResult.success) {
      const errorMsg = cliResult.legs
        .map((leg, i) => `Leg ${i + 1}: ${leg.error || 'Failed'}`)
        .join('; ');
      
      console.error(`[SUBMIT] ❌ CLI submission failed: ${errorMsg}`);

      // Log failure (risk passed but submission failed)
      const riskResult = { passed: true, reason: null };
      await logDecision({
        signal,
        spread,
        riskResult,
        // No order ID on submission failure
      });

      return {
        success: false,
        message: `CLI order submission failed: ${errorMsg}`,
        riskPassed: true, // Risk passed but submission failed
      };
    }

    // Extract order IDs from successful legs
    const orderIds = cliResult.legs
      .map((leg) => leg.data?.id)
      .filter(Boolean);

    console.log(`[SUBMIT] ✅ Spread submitted via CLI: ${cliResult.clientOrderId}`);
    console.log(`[SUBMIT] Order IDs: ${orderIds.join(', ')}`);

    // Step 4: Log successful submission
    await logDecision({
      signal,
      spread,
      riskResult,
      orderId: cliResult.clientOrderId,
    });

    console.log(
      `[SUBMIT] ✅ SUCCESS - Order ${cliResult.clientOrderId} submitted via CLI and logged`
    );

    return {
      success: true,
      orderId: cliResult.clientOrderId,
      message: `Spread order submitted via CLI: ${orderIds.length} legs executed`,
      riskPassed: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[SUBMIT] ❌ Submission failed: ${message}`);

    // Log failure (risk passed but submission failed)
    const riskResult = { passed: true, reason: null };
    await logDecision({
      signal,
      spread,
      riskResult,
      // No order ID on submission failure
    });

    return {
      success: false,
      message: `Order submission failed: ${message}`,
      riskPassed: true, // Risk passed but submission failed
    };
  }
}
