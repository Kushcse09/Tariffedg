/**
 * Vertical Spread Builder
 * 
 * Constructs option spreads (put debit spreads, call debit spreads) based on
 * signals and market conditions. Selects appropriate strikes and expiries,
 * caps max loss, and returns structured SpreadOrder objects.
 */

import type { Signal } from "@/lib/signals";
import {
  getOptionChain,
  findClosestExpiry,
  type OptionContract,
} from "./optionChain";

/**
 * Maximum loss per spread (from steering/project.md)
 */
const MAX_LOSS_PER_SPREAD = 500;

/**
 * Spread order structure (ready for preview or submission)
 */
export interface SpreadOrder {
  ticker: string;
  type: "put_debit_spread" | "call_debit_spread";
  legs: Array<{
    action: "buy" | "sell";
    strike: number;
    expiry: string; // ISO date format
    contractSymbol: string; // OCC format
  }>;
  maxLoss: number; // Net debit paid
  estimatedCost: number; // Same as maxLoss for debit spreads
  thesisText: string; // Human-readable trade rationale
}

/**
 * Determine if a signal is bearish or bullish based on keyword heuristics.
 * 
 * NOTE: This is a SIMPLIFIED keyword-based approach, not sophisticated NLP.
 * Production systems would use:
 * - Sentiment analysis (BERT, FinBERT, etc.)
 * - Entity recognition and causal reasoning
 * - Market context and historical correlation
 * - Multi-signal ensemble models
 * 
 * @param text Signal text to analyze
 * @returns 'bearish' or 'bullish' based on simple keyword matching
 */
export function determineDirection(text: string): "bearish" | "bullish" {
  const lowerText = text.toLowerCase();

  // Bearish keywords (bad for ticker) - weighted scoring
  const bearishKeywords: Record<string, number> = {
    tariff: 1,
    ban: 2,
    disruption: 2,
    risk: 1,
    sanctions: 2,
    quota: 2,
    restriction: 2,
    threat: 1,
    escalation: 2,
    tension: 1,
    shortage: 2,
  };

  // Bullish keywords (good for ticker) - weighted scoring
  const bullishKeywords: Record<string, number> = {
    deal: 3,
    resolved: 2,
    eased: 2,
    exemption: 3,
    excluded: 3,
    lifted: 2,
    agreement: 3,
    breakthrough: 3,
    optimism: 2,
    relief: 2,
  };

  let bearishScore = 0;
  let bullishScore = 0;

  // Calculate weighted scores
  Object.entries(bearishKeywords).forEach(([keyword, weight]) => {
    if (lowerText.includes(keyword)) {
      bearishScore += weight;
    }
  });

  Object.entries(bullishKeywords).forEach(([keyword, weight]) => {
    if (lowerText.includes(keyword)) {
      bullishScore += weight;
    }
  });

  // Bullish keywords override bearish if present
  return bullishScore > bearishScore ? "bullish" : "bearish";
}

/**
 * Select strikes for a vertical spread
 * 
 * For debit spreads:
 * - Put debit: Buy higher strike (ITM/ATM), sell lower strike (OTM)
 * - Call debit: Buy lower strike (ITM/ATM), sell higher strike (OTM)
 * 
 * @param contracts Available contracts at the target expiry
 * @param underlyingPrice Current price of underlying
 * @param type Spread type
 * @returns Array of [buyStrike, sellStrike] or null if can't find suitable strikes
 */
function selectStrikes(
  contracts: OptionContract[],
  underlyingPrice: number,
  type: "put_debit_spread" | "call_debit_spread"
): [OptionContract, OptionContract] | null {
  // Sort by strike
  const sorted = contracts.sort((a, b) => a.strike - b.strike);

  if (sorted.length < 2) {
    return null;
  }

  if (type === "put_debit_spread") {
    // Buy put above current price, sell put below
    // Look for strikes: [below price ... spot ... above price]
    const atmIndex = sorted.findIndex((c) => c.strike >= underlyingPrice);
    if (atmIndex === -1 || atmIndex === 0) {
      return null;
    }

    // Buy the ATM or slightly ITM put
    const buyContract = sorted[atmIndex] || sorted[atmIndex - 1];
    // Sell a put $5-10 below
    const sellContract = sorted.find(
      (c) =>
        c.strike < buyContract.strike &&
        buyContract.strike - c.strike >= 5 &&
        buyContract.strike - c.strike <= 10
    );

    if (!sellContract) {
      return null;
    }

    return [buyContract, sellContract];
  } else {
    // Call debit spread: buy call below/at price, sell call above
    const atmIndex = sorted.findIndex((c) => c.strike >= underlyingPrice);
    if (atmIndex === -1 || atmIndex >= sorted.length - 1) {
      return null;
    }

    // Buy the ATM or slightly OTM call
    const buyContract = sorted[atmIndex];
    // Sell a call $5-10 above
    const sellContract = sorted.find(
      (c) =>
        c.strike > buyContract.strike &&
        c.strike - buyContract.strike >= 5 &&
        c.strike - buyContract.strike <= 10
    );

    if (!sellContract) {
      return null;
    }

    return [buyContract, sellContract];
  }
}

/**
 * Build a vertical spread (put or call debit spread)
 * 
 * Steps:
 * 1. Fetch option chain for ticker
 * 2. Determine direction from signal (bearish → put spread, bullish → call spread)
 * 3. Select expiry 30-45 days out
 * 4. Choose appropriate strikes
 * 5. Calculate max loss (net debit)
 * 6. Ensure max loss < $500 cap
 * 7. Return structured SpreadOrder
 * 
 * @param ticker Underlying ticker
 * @param signal The signal triggering this position
 * @param direction Optional override ('bullish' or 'bearish'), otherwise inferred from signal
 * @returns SpreadOrder ready for preview or submission
 * @throws Error if unable to construct a valid spread
 */
export async function buildVerticalSpread(
  ticker: string,
  signal: Signal,
  direction?: "bullish" | "bearish"
): Promise<SpreadOrder> {
  try {
    console.log(`[SPREAD BUILDER] Building spread for ${ticker}...`);

    // 1. Fetch option chain
    const chain = await getOptionChain(ticker);

    // 2. Determine direction (use override if provided, else infer from signal)
    const tradeDirection = direction || determineDirection(signal.text);
    console.log(`[SPREAD BUILDER] Direction: ${tradeDirection} (from signal: "${signal.text}")`);

    const spreadType =
      tradeDirection === "bearish" ? "put_debit_spread" : "call_debit_spread";

    // 3. Select expiry 30-45 days out
    const targetExpiry = findClosestExpiry(chain, 37, 30, 60);
    if (!targetExpiry) {
      throw new Error(`No suitable expiry found for ${ticker} (need 30-60 DTE)`);
    }

    const daysToExpiry = Math.round(
      (new Date(targetExpiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );
    console.log(`[SPREAD BUILDER] Selected expiry: ${targetExpiry} (${daysToExpiry} DTE)`);

    // 4. Get contracts at this expiry
    const contractsAtExpiry =
      spreadType === "put_debit_spread"
        ? chain.puts.filter((c) => c.expiry === targetExpiry)
        : chain.calls.filter((c) => c.expiry === targetExpiry);

    if (contractsAtExpiry.length < 2) {
      throw new Error(
        `Not enough ${spreadType === "put_debit_spread" ? "put" : "call"} contracts at ${targetExpiry}`
      );
    }

    // 5. Select strikes
    const strikes = selectStrikes(
      contractsAtExpiry,
      chain.underlyingPrice,
      spreadType
    );

    if (!strikes) {
      throw new Error(
        `Could not find suitable strikes for ${spreadType} on ${ticker}`
      );
    }

    const [buyContract, sellContract] = strikes;

    console.log(
      `[SPREAD BUILDER] Selected strikes: Buy $${buyContract.strike}, Sell $${sellContract.strike}`
    );

    // 6. Calculate max loss (net debit = buy premium - sell premium)
    // Use ask price for buys, bid price for sells (conservative estimate)
    const buyPremium = buyContract.ask || buyContract.lastPrice || 0;
    const sellPremium = sellContract.bid || sellContract.lastPrice || 0;

    if (buyPremium === 0 || sellPremium === 0) {
      throw new Error(
        `Missing pricing data for ${ticker} options (buy: ${buyPremium}, sell: ${sellPremium})`
      );
    }

    const netDebit = (buyPremium - sellPremium) * 100; // Convert to dollar amount (1 contract = 100 shares)

    console.log(
      `[SPREAD BUILDER] Net debit: $${netDebit.toFixed(2)} (buy: $${buyPremium}, sell: $${sellPremium})`
    );

    // 7. Check max loss cap
    if (netDebit > MAX_LOSS_PER_SPREAD) {
      throw new Error(
        `Max loss $${netDebit.toFixed(2)} exceeds cap of $${MAX_LOSS_PER_SPREAD}`
      );
    }

    // 8. Build thesis text
    const thesisText = `${tradeDirection === "bearish" ? "Bearish" : "Bullish"} ${ticker} based on: "${signal.text}". ${spreadType === "put_debit_spread" ? "Put" : "Call"} debit spread ${buyContract.strike}/${sellContract.strike} expires ${targetExpiry}.`;

    // 9. Return structured SpreadOrder
    return {
      ticker,
      type: spreadType,
      legs: [
        {
          action: "buy",
          strike: buyContract.strike,
          expiry: targetExpiry,
          contractSymbol: buyContract.symbol,
        },
        {
          action: "sell",
          strike: sellContract.strike,
          expiry: targetExpiry,
          contractSymbol: sellContract.symbol,
        },
      ],
      maxLoss: Math.round(netDebit * 100) / 100, // Round to cents
      estimatedCost: Math.round(netDebit * 100) / 100,
      thesisText,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[SPREAD BUILDER] Failed to build spread for ${ticker}:`, message);
    throw new Error(`Failed to build spread for ${ticker}: ${message}`);
  }
}
