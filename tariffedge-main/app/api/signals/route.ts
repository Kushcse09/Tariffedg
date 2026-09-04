import { NextResponse } from "next/server";
import { fetchAllSignals } from "@/lib/signals";

/**
 * GET /api/signals
 * 
 * Returns real-time tariff and trade-policy signals from multiple sources.
 * 
 * Sources:
 * - GDELT 2.0 Doc API (trade policy, tariff news)
 * - Freight rates (when configured)
 * 
 * Signals are:
 * - Mapped to tickers (when confident match exists)
 * - Deduplicated
 * - Sorted newest first
 * - Gracefully handle source failures (never crash)
 */
export async function GET() {
  try {
    const signals = await fetchAllSignals();

    return NextResponse.json({
      success: true,
      count: signals.length,
      signals,
      sources: {
        gdelt: "active",
        freight: "stubbed", // TODO: activate when API key available
      },
    });
  } catch (error) {
    // This should rarely happen since individual sources handle their own errors
    console.error("[API /api/signals] Unexpected error:", error);

    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch signals",
        message,
        hint: "Check server logs for details",
      },
      { status: 500 }
    );
  }
}
