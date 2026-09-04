import { Alpaca } from "@alpacahq/alpaca-trade-api";

/**
 * Get the configured Alpaca client for paper trading.
 * Reads credentials from environment variables.
 * 
 * @throws {Error} If required environment variables are missing
 */
export function getAlpacaClient(): Alpaca {
  const keyId = process.env.ALPACA_API_KEY;
  const secret = process.env.ALPACA_SECRET_KEY;
  const baseUrl = process.env.ALPACA_BASE_URL || "https://paper-api.alpaca.markets";

  if (!keyId || !secret) {
    throw new Error(
      "Missing required environment variables: ALPACA_API_KEY and ALPACA_SECRET_KEY must be set"
    );
  }

  // Verify we're using paper trading endpoint
  if (!baseUrl.includes("paper-api")) {
    throw new Error(
      "ALPACA_BASE_URL must point to paper-api.alpaca.markets for paper trading only"
    );
  }

  return new Alpaca({
    keyId,
    secret,
    paper: true, // Explicitly set paper trading
  });
}
