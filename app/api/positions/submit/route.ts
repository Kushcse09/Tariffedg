import { NextResponse } from "next/server";
import { buildVerticalSpread } from "@/lib/positions";
import { submitSpreadOrder } from "@/lib/positions/submitOrder";
import type { Signal } from "@/lib/signals";

/**
 * POST /api/positions/submit
 * 
 * End-to-end flow: signal → spread build → risk gate → submit → log
 * 
 * Request body:
 * {
 *   signal: Signal,              // The triggering signal
 *   direction?: 'bullish' | 'bearish'  // Optional override
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   orderId?: string,           // If submitted
 *   message: string,
 *   spread?: SpreadOrder,       // The constructed spread
 *   riskPassed: boolean,
 *   riskReason?: string         // If blocked by risk gate
 * }
 * 
 * This endpoint performs REAL ORDER SUBMISSION to Alpaca paper trading.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { signal, direction } = body as {
      signal: Signal;
      direction?: "bullish" | "bearish";
    };

    // Validate signal
    if (!signal || !signal.ticker || !signal.text) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid signal",
          hint: "Signal must have ticker and text fields",
        },
        { status: 400 }
      );
    }

    if (!signal.ticker) {
      return NextResponse.json(
        {
          success: false,
          error: "Signal has no ticker mapping",
          hint: "Only signals with mapped tickers can generate positions",
        },
        { status: 400 }
      );
    }

    console.log(
      `[API /positions/submit] Starting submission flow for ${signal.ticker}`
    );

    // Step 1: Build spread
    console.log(`[API /positions/submit] Building spread...`);
    const spread = await buildVerticalSpread(
      signal.ticker,
      signal,
      direction
    );

    console.log(
      `[API /positions/submit] Spread built: ${spread.type} with max loss $${spread.maxLoss}`
    );

    // Step 2: Submit (includes risk gate and logging)
    console.log(`[API /positions/submit] Submitting order...`);
    const result = await submitSpreadOrder(spread, signal);

    console.log(
      `[API /positions/submit] Submission ${result.success ? "SUCCESS" : "FAILED"}: ${result.message}`
    );

    // Return result
    return NextResponse.json({
      success: result.success,
      orderId: result.orderId,
      message: result.message,
      spread,
      riskPassed: result.riskPassed,
      riskReason: result.riskReason,
    });
  } catch (error) {
    console.error("[API /positions/submit] Error:", error);

    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to submit order",
        message,
        hint: "Check server logs for details",
      },
      { status: 500 }
    );
  }
}
