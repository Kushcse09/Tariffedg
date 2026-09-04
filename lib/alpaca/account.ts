import { getAlpacaClient } from "./client";

/**
 * Account status information from Alpaca paper account
 */
export interface AccountStatus {
  /** Account equity (total value) */
  equity: string;
  /** Buying power available */
  buyingPower: string;
  /** Cash balance */
  cash: string;
  /** Account status (ACTIVE, etc.) */
  status: string;
  /** Account number */
  accountNumber: string;
  /** Total portfolio value */
  portfolioValue: string;
}

/**
 * Fetch account status from Alpaca paper trading account.
 * Returns account equity, buying power, cash, and status.
 * 
 * @returns {Promise<AccountStatus>} Account information
 * @throws {Error} If API call fails or credentials are invalid
 */
export async function getAccountStatus(): Promise<AccountStatus> {
  try {
    const alpaca = getAlpacaClient();
    const account = await alpaca.trading.account.getAccount();

    return {
      equity: account.equity || "0",
      buyingPower: account.buyingPower || "0",
      cash: account.cash || "0",
      status: account.status,
      accountNumber: account.accountNumber || "unknown",
      portfolioValue: account.portfolioValue || "0",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to fetch account status: ${message}`);
  }
}
