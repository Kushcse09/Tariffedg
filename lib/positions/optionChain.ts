/**
 * Option Chain Fetcher
 * 
 * Fetches current option chains for a ticker from Alpaca's paper trading API.
 * Provides calls, puts, strikes, expiries, and pricing data.
 */

import { getAlpacaClient } from "@/lib/alpaca/client";

/**
 * Option contract from Alpaca
 */
export interface OptionContract {
  symbol: string;
  underlyingSymbol: string;
  type: "call" | "put";
  strike: number;
  expiry: string; // ISO date format
  bid: number;
  ask: number;
  lastPrice?: number;
  volume?: number;
  openInterest?: number;
  impliedVolatility?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

/**
 * Option chain grouped by expiry and type
 */
export interface OptionChain {
  ticker: string;
  underlyingPrice: number;
  expirations: string[]; // ISO dates, sorted
  calls: OptionContract[];
  puts: OptionContract[];
}

/**
 * Get the current option chain for a ticker
 * 
 * Fetches available option contracts from Alpaca's paper API.
 * Returns calls, puts, strikes, expiries, and pricing data.
 * 
 * @param ticker Underlying ticker symbol (e.g., "AAPL", "SPY")
 * @returns Option chain with contracts grouped by type
 * @throws Error if ticker is invalid or has no options available
 */
export async function getOptionChain(ticker: string): Promise<OptionChain> {
  try {
    console.log(`[OPTION CHAIN] Fetching chain for ${ticker}...`);

    const alpaca = getAlpacaClient();

    // Get current underlying price
    const latestQuote = await alpaca.marketData.stocks.stockLatestQuotes({
      symbols: ticker,
      feed: "iex",
    });

    const quote = (latestQuote as any)[ticker];
    if (!quote || !quote.bp) {
      throw new Error(`Could not fetch current price for ${ticker}`);
    }

    const underlyingPrice = (quote.bp + quote.ap) / 2; // Mid price
    console.log(`[OPTION CHAIN] ${ticker} current price: $${underlyingPrice.toFixed(2)}`);

    // Fetch option contracts for this underlying
    // Using iterateOptionsContracts from the Alpaca facade
    const contracts: OptionContract[] = [];

    for await (const contract of alpaca.trading.iterateOptionsContracts({
      underlyingSymbols: ticker,
      status: "active",
      limit: 1000, // Get up to 1000 contracts
    })) {
      // Parse the option contract
      const snapshot = await alpaca.marketData.options.optionSnapshots({
        symbols: contract.symbol,
      });

      const contractSnapshot = (snapshot as any)[contract.symbol];
      if (!contractSnapshot?.latestQuote) {
        continue; // Skip if no pricing data
      }

      const quote = contractSnapshot.latestQuote;

      contracts.push({
        symbol: contract.symbol,
        underlyingSymbol: contract.underlyingSymbol || ticker,
        type: contract.type === "call" ? "call" : "put",
        strike: parseFloat(contract.strikePrice || "0"),
        expiry: contract.expirationDate?.toString() || "",
        bid: quote.bp || 0,
        ask: quote.ap || 0,
        lastPrice: contractSnapshot.latestTrade?.p,
        volume: contractSnapshot.latestTrade?.s,
        openInterest: contract.openInterest ? parseInt(String(contract.openInterest)) : undefined,
        impliedVolatility: contractSnapshot.impliedVolatility,
        delta: contractSnapshot.greeks?.delta,
        gamma: contractSnapshot.greeks?.gamma,
        theta: contractSnapshot.greeks?.theta,
        vega: contractSnapshot.greeks?.vega,
      });
    }

    console.log(`[OPTION CHAIN] Found ${contracts.length} contracts for ${ticker}`);

    if (contracts.length === 0) {
      throw new Error(`No option contracts found for ${ticker}`);
    }

    // Extract unique expiration dates
    const expirations = Array.from(
      new Set(contracts.map((c) => c.expiry))
    ).sort();

    // Separate calls and puts
    const calls = contracts.filter((c) => c.type === "call");
    const puts = contracts.filter((c) => c.type === "put");

    return {
      ticker,
      underlyingPrice,
      expirations,
      calls,
      puts,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[OPTION CHAIN] Failed to fetch chain for ${ticker}:`, message);
    throw new Error(`Failed to fetch option chain for ${ticker}: ${message}`);
  }
}

/**
 * Get contracts expiring in a specific date range
 * 
 * @param chain The full option chain
 * @param minDays Minimum days to expiration
 * @param maxDays Maximum days to expiration
 * @returns Filtered contracts within the DTE range
 */
export function getContractsInDteRange(
  chain: OptionChain,
  minDays: number,
  maxDays: number
): { calls: OptionContract[]; puts: OptionContract[] } {
  const now = new Date();
  const minDate = new Date(now.getTime() + minDays * 24 * 60 * 60 * 1000);
  const maxDate = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);

  const inRange = (contract: OptionContract) => {
    const expiry = new Date(contract.expiry);
    return expiry >= minDate && expiry <= maxDate;
  };

  return {
    calls: chain.calls.filter(inRange),
    puts: chain.puts.filter(inRange),
  };
}

/**
 * Find the closest expiration date within a DTE range
 * 
 * @param chain The full option chain
 * @param targetDays Target days to expiration
 * @param minDays Minimum acceptable DTE
 * @param maxDays Maximum acceptable DTE
 * @returns The closest expiration date or null
 */
export function findClosestExpiry(
  chain: OptionChain,
  targetDays: number,
  minDays: number,
  maxDays: number
): string | null {
  const now = new Date();
  const targetDate = new Date(now.getTime() + targetDays * 24 * 60 * 60 * 1000);

  const validExpiries = chain.expirations.filter((expiry) => {
    const expiryDate = new Date(expiry);
    const dte = (expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
    return dte >= minDays && dte <= maxDays;
  });

  if (validExpiries.length === 0) {
    return null;
  }

  // Find closest to target
  return validExpiries.reduce((closest, current) => {
    const currentDte = Math.abs(
      new Date(current).getTime() - targetDate.getTime()
    );
    const closestDte = Math.abs(
      new Date(closest).getTime() - targetDate.getTime()
    );
    return currentDte < closestDte ? current : closest;
  });
}
