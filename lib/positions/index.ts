/**
 * Options Position Construction Module
 * 
 * Provides tools to fetch option chains, build vertical spreads,
 * and construct positions based on signals.
 */

export { getOptionChain, getContractsInDteRange, findClosestExpiry } from "./optionChain";
export type { OptionContract, OptionChain } from "./optionChain";

export { buildVerticalSpread, determineDirection } from "./spreadBuilder";
export type { SpreadOrder } from "./spreadBuilder";

export { submitSpreadOrder } from "./submitOrder";
export type { SubmissionResult } from "./submitOrder";
