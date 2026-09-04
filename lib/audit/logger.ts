/**
 * Audit Logger
 * 
 * Logs all trading decisions (passed and blocked) to a persistent audit log.
 * Schema matches the frontend Decision Timeline component.
 */

import { promises as fs } from "fs";
import path from "path";
import type { Signal } from "@/lib/signals";
import type { SpreadOrder } from "@/lib/positions";
import type { RiskGateResult } from "@/lib/risk/riskGate";

/**
 * Audit log entry (matches frontend Decision Timeline schema)
 */
export interface AuditLogEntry {
  time: string; // HH:mm format
  trigger: string; // e.g., "XLE signal ingested"
  thesis: string; // Trade rationale (from spread.thesisText)
  risk: "PASSED" | "BLOCKED"; // Risk gate result
  tone: "positive" | "negative"; // positive = passed, negative = blocked
  order: string; // Order ID or "—" if blocked
  ticker: string; // Underlying ticker
  signalText: string; // Original signal text
  signalSource: string; // Signal source (GDELT, etc.)
  riskReason: string | null; // Block reason if risk = BLOCKED
  submittedAt: string; // ISO timestamp
}

/**
 * Path to audit log file
 */
const AUDIT_LOG_PATH = path.join(process.cwd(), "data", "audit-log.json");

/**
 * Ensure data directory exists
 */
async function ensureDataDirectory() {
  const dataDir = path.dirname(AUDIT_LOG_PATH);
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    // Directory may already exist, that's fine
  }
}

/**
 * Read existing audit log
 */
async function readAuditLog(): Promise<AuditLogEntry[]> {
  try {
    await ensureDataDirectory();
    const content = await fs.readFile(AUDIT_LOG_PATH, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    // File doesn't exist yet or is empty, return empty array
    return [];
  }
}

/**
 * Write audit log
 */
async function writeAuditLog(entries: AuditLogEntry[]): Promise<void> {
  await ensureDataDirectory();
  await fs.writeFile(AUDIT_LOG_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

/**
 * Log a trading decision
 * 
 * Creates an audit log entry for every decision, whether passed or blocked.
 * Schema matches the frontend Decision Timeline component.
 * 
 * @param params Decision parameters (can be full params or direct entry)
 * @returns The created log entry
 */
export async function logDecision(
  params:
    | {
        signal: Signal;
        spread: SpreadOrder;
        riskResult: RiskGateResult;
        orderId?: string;
      }
    | AuditLogEntry
): Promise<AuditLogEntry> {
  let entry: AuditLogEntry;

  // Check if this is already a complete entry
  if ('trigger' in params && 'submittedAt' in params) {
    entry = params as AuditLogEntry;
  } else {
    // Build entry from structured params
    const { signal, spread, riskResult, orderId } = params as {
      signal: Signal;
      spread: SpreadOrder;
      riskResult: RiskGateResult;
      orderId?: string;
    };

    const now = new Date();
    const time = now.toISOString().substring(11, 16); // HH:mm format
    const submittedAt = now.toISOString();

    entry = {
      time,
      trigger: `${spread.ticker} signal ingested`,
      thesis: spread.thesisText,
      risk: riskResult.passed ? "PASSED" : "BLOCKED",
      tone: riskResult.passed ? "positive" : "negative",
      order: orderId || "—",
      ticker: spread.ticker,
      signalText: signal.text,
      signalSource: signal.source,
      riskReason: riskResult.reason,
      submittedAt,
    };
  }

  console.log(
    `[AUDIT] Logging decision: ${entry.ticker} ${entry.risk} ${entry.order !== '—' ? `(${entry.order})` : "(no order)"}`
  );

  try {
    // Read existing log
    const existingEntries = await readAuditLog();

    // Append new entry
    existingEntries.push(entry);

    // Write back (newest entries are at the end)
    await writeAuditLog(existingEntries);

    console.log(`[AUDIT] ✅ Logged to ${AUDIT_LOG_PATH}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[AUDIT] ❌ Failed to write log: ${message}`);
    // Don't throw - logging failure shouldn't block trading
  }

  return entry;
}

/**
 * Get all audit log entries
 * 
 * @returns All audit log entries, newest last
 */
export async function getAuditLog(): Promise<AuditLogEntry[]> {
  return readAuditLog();
}

/**
 * Get recent audit log entries
 * 
 * @param limit Maximum number of entries to return
 * @returns Recent entries, newest first
 */
export async function getRecentAuditLog(limit: number = 50): Promise<AuditLogEntry[]> {
  const entries = await readAuditLog();
  // Return newest first (reverse order)
  return entries.slice(-limit).reverse();
}

/**
 * Clear audit log (for testing only)
 */
export async function clearAuditLog(): Promise<void> {
  await writeAuditLog([]);
  console.log("[AUDIT] Cleared audit log");
}
