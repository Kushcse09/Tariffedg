/**
 * Signal Ingestion Module
 * 
 * Combines signals from multiple sources (GDELT, freight data, etc.),
 * maps them to tickers, deduplicates, and sorts by time.
 */

import { fetchGdeltSignals, type Signal } from "./gdelt";
import { fetchFreightSignals } from "./freight";

/**
 * Ticker mapping configuration from steering/project.md
 */
const TICKER_MAPPING: Array<{
  keywords: string[];
  ticker: string;
  sector: string;
}> = [
  {
    keywords: ["energy", "oil", "petroleum", "supply shock", "middle east"],
    ticker: "XLE",
    sector: "Energy",
  },
  {
    keywords: ["heavy machinery", "construction equipment", "caterpillar"],
    ticker: "CAT",
    sector: "Industrials",
  },
  {
    keywords: [
      "shipping",
      "freight",
      "container",
      "asia-us",
      "transpacific",
      "zim",
    ],
    ticker: "ZIM",
    sector: "Shipping",
  },
  {
    keywords: ["emerging markets", "trade ministry", "retaliatory"],
    ticker: "EEM",
    sector: "Emerging Markets",
  },
  {
    keywords: ["steel", "quota", "section 232", "nucor"],
    ticker: "NUE",
    sector: "Industrials",
  },
  {
    keywords: ["air cargo", "parcel", "fedex"],
    ticker: "FDX",
    sector: "Logistics",
  },
  {
    keywords: ["treasury", "safe haven", "risk-off", "bonds"],
    ticker: "TLT",
    sector: "Treasuries",
  },
  {
    keywords: ["consumer electronics", "iphone", "apple"],
    ticker: "AAPL",
    sector: "Technology",
  },
  {
    keywords: ["ups", "united parcel"],
    ticker: "UPS",
    sector: "Logistics",
  },
  {
    keywords: ["semiconductors", "chips", "tsmc", "intel", "chip"],
    ticker: "SMH",
    sector: "Technology",
  },
  {
    keywords: ["retail", "consumer goods", "imports"],
    ticker: "XRT",
    sector: "Retail",
  },
];

/**
 * Map a signal to a ticker based on keyword matching
 * 
 * Returns null if no confident match is found (following steering/project.md rules).
 * 
 * @param text Signal text to analyze
 * @returns Ticker symbol or null
 */
export function mapSignalToTicker(text: string): string | null {
  const lowerText = text.toLowerCase();

  // Find the first mapping where any keyword matches
  for (const mapping of TICKER_MAPPING) {
    const hasMatch = mapping.keywords.some((keyword) =>
      lowerText.includes(keyword.toLowerCase())
    );

    if (hasMatch) {
      return mapping.ticker;
    }
  }

  // No confident match found
  return null;
}

/**
 * Deduplicate signals
 * 
 * Removes signals with the same source and very similar text within 1 hour.
 */
function deduplicateSignals(signals: Signal[]): Signal[] {
  const seen = new Set<string>();
  const deduplicated: Signal[] = [];

  for (const signal of signals) {
    // Create a key based on source and first 50 chars of text
    const textKey = signal.text.substring(0, 50).toLowerCase();
    const key = `${signal.source}:${textKey}`;

    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(signal);
    }
  }

  return deduplicated;
}

/**
 * Fetch all signals from all sources
 * 
 * Combines GDELT, freight, and other sources, maps to tickers,
 * deduplicates, and sorts newest first.
 * 
 * Gracefully handles failures - if one source errors, returns others.
 */
export async function fetchAllSignals(): Promise<Signal[]> {
  console.log("[SIGNALS] Fetching from all sources...");

  // Fetch from all sources in parallel
  // Each source handles its own errors gracefully
  const [gdeltSignals, freightSignals] = await Promise.all([
    fetchGdeltSignals(),
    fetchFreightSignals(),
  ]);

  // Combine all signals
  const allSignals = [...gdeltSignals, ...freightSignals];

  console.log(
    `[SIGNALS] Total signals before processing: ${allSignals.length} (GDELT: ${gdeltSignals.length}, FREIGHT: ${freightSignals.length})`
  );

  // Map signals to tickers
  const mappedSignals = allSignals.map((signal) => ({
    ...signal,
    ticker: mapSignalToTicker(signal.text),
  }));

  // Count how many got mapped
  const mappedCount = mappedSignals.filter((s) => s.ticker !== null).length;
  console.log(`[SIGNALS] Mapped ${mappedCount}/${mappedSignals.length} signals to tickers`);

  // Deduplicate
  const deduplicated = deduplicateSignals(mappedSignals);
  console.log(`[SIGNALS] After deduplication: ${deduplicated.length} signals`);

  // Sort by time (newest first)
  // Parse time strings for sorting
  const sorted = deduplicated.sort((a, b) => {
    // Compare time strings lexicographically (HH:mm:ss format sorts correctly)
    return b.time.localeCompare(a.time);
  });

  return sorted;
}

// Re-export types and individual fetchers
export { fetchGdeltSignals } from "./gdelt";
export { fetchFreightSignals } from "./freight";
export type { Signal } from "./gdelt";
