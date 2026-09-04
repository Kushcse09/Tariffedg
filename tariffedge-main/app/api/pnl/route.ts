/**
 * P&L API Endpoint
 * 
 * HACKATHON REQUIREMENT: Exposes trading performance metrics for frontend display.
 * 
 * GET /api/pnl
 * Returns comprehensive P&L summary including:
 * - Total/realized/unrealized P&L
 * - Win/loss statistics
 * - Performance metrics
 * - Current positions
 */

import { NextResponse } from 'next/server';
import { calculatePnLSummary } from '@/lib/pnl';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('[API /pnl] Calculating P&L summary...');

    const summary = await calculatePnLSummary();

    console.log(`[API /pnl] Summary complete: $${summary.totalPnL.toFixed(2)} P&L, ${summary.totalTrades} trades`);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API /pnl] Error:', message);

    return NextResponse.json(
      {
        success: false,
        error: `Failed to calculate P&L: ${message}`,
      },
      { status: 500 }
    );
  }
}
