import { NextResponse } from "next/server";
import { getRecentAuditLog } from "@/lib/audit/logger";

/**
 * GET /api/audit
 * 
 * Returns the audit log for the Decision Timeline component.
 * Entries are returned newest first.
 * 
 * Query parameters:
 * - limit: Maximum number of entries (default: 50)
 * 
 * Response:
 * {
 *   success: true,
 *   entries: AuditLogEntry[],
 *   count: number
 * }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    console.log(`[API /audit] Fetching audit log (limit: ${limit})...`);

    const entries = await getRecentAuditLog(limit);

    console.log(`[API /audit] Returning ${entries.length} entries`);

    return NextResponse.json({
      success: true,
      entries,
      count: entries.length,
    });
  } catch (error) {
    console.error("[API /audit] Error:", error);

    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch audit log",
        message,
      },
      { status: 500 }
    );
  }
}
