import { NextResponse } from "next/server";
import { getAccountStatus } from "@/lib/alpaca";

/**
 * GET /api/alpaca/status
 * 
 * Returns paper trading account status including equity, buying power, and status.
 * Uses credentials from environment variables (ALPACA_API_KEY, ALPACA_SECRET_KEY).
 */
export async function GET() {
  try {
    const status = await getAccountStatus();
    
    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("[API /alpaca/status] Error:", error);
    
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    
    // Return clear error message for missing credentials or API failures
    return NextResponse.json(
      {
        success: false,
        error: message,
        hint: message.includes("environment variables")
          ? "Make sure ALPACA_API_KEY and ALPACA_SECRET_KEY are set in your .env.local file"
          : "Check your Alpaca credentials and network connection",
      },
      { status: 500 }
    );
  }
}
