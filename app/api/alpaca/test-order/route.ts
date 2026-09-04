import { NextResponse } from "next/server";
import { placeTestOrder } from "@/lib/alpaca";

/**
 * POST /api/alpaca/test-order
 * 
 * Places a small test limit order on SPY and immediately cancels it.
 * This verifies the order submission → cancellation flow works end-to-end.
 * 
 * The order is placed well below market price to avoid accidental fills.
 */
export async function POST() {
  try {
    const result = await placeTestOrder();
    
    return NextResponse.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    console.error("[API /alpaca/test-order] Error:", error);
    
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    
    return NextResponse.json(
      {
        success: false,
        error: message,
        hint: "Check your Alpaca credentials and ensure paper trading is enabled",
      },
      { status: 500 }
    );
  }
}
