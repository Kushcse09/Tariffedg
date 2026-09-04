import { NextResponse } from "next/server";
import { buildVerticalSpread } from "@/lib/positions";
import type { Signal } from "@/lib/signals";

/**
 * POST /api/positions/preview
 * 
 * Constructs an options spread from a signal WITHOUT submitting it.
 * Returns the complete SpreadOrder structure for review.
 * 
 * Request body:
 * {
 *   signal: Signal,              // The triggering signal
 *   direction?: 'bullish' | 'bearish'  // Optional override
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   spread: SpreadOrder,
 *   summary: string
 * }
 * 
 * This endpoint is for PREVIEW ONLY - no actual orders are submitted.
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
      `[API /positions/preview] Building spread for ${signal.ticker} from signal: "${signal.text}"`
    );

    // Build the spread (preview only, no submission)
    const spread = await buildVerticalSpread(
      signal.ticker,
      signal,
      direction
    );

    // Generate summary text
    const summary = `Preview: ${spread.type.replace(/_/g, " ")} on ${spread.ticker}. ` +
      `Buy ${spread.legs[0].strike} ${spread.type.includes("put") ? "put" : "call"}, ` +
      `Sell ${spread.legs[1].strike} ${spread.type.includes("put") ? "put" : "call"}. ` +
      `Expires ${spread.legs[0].expiry}. Max loss: $${spread.maxLoss.toFixed(2)}.`;

    return NextResponse.json({
      success: true,
      spread,
      summary,
      note: "This is a PREVIEW only. No order has been submitted.",
    });
  } catch (error) {
    console.error("[API /positions/preview] Error:", error);

    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to build spread",
        message,
        hint: "Check that the ticker has options available and pricing data is accessible",
      },
      { status: 500 }
    );
  }
}
