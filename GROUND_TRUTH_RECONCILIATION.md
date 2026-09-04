# Ground Truth Reconciliation - Alpaca Account PA331I6VA51Z

**Date:** September 4, 2026 (Pre-submission audit)
**Account:** PA331I6VA51Z (Alpaca Paper Trading)

## Executive Summary

**CRITICAL FINDING:** Previous documentation claiming "9 real orders executed" was incorrect. The account has **ZERO filled orders** and **$0 real P&L**.

## Live Account Status (Direct API Query)

```
Account Number: PA331I6VA51Z
Equity: $100,000.00
Cash: $100,000.00
Buying Power: $200,000.00
Status: ACTIVE
```

**Result:** Account equity is unchanged from starting balance. No trades have been filled.

## Order History Analysis

### Total Orders: 11

**Breakdown by Status:**
- **Filled:** 0 ❌
- **Accepted (pending):** 4 (option legs, awaiting market open)
- **New (pending):** 5 (equity orders, awaiting market open)
- **Canceled:** 2 (early test orders)

### Order Details:

**Equity Orders (Status: NEW - Not Filled)**
1. XLE - Buy 5 shares - Submitted 2026-09-04 08:01 UTC
2. SMH - Sell 3 shares - Submitted 2026-09-04 08:01 UTC
3. NUE - Buy 4 shares - Submitted 2026-09-04 08:01 UTC
4. TLT - Buy 5 shares - Submitted 2026-09-04 08:01 UTC
5. EEM - Sell 10 shares - Submitted 2026-09-04 08:01 UTC

**Option Orders (Status: ACCEPTED - Not Filled)**
6-9. Four option legs (multi-leg spreads) - Submitted 2026-09-04 03:45 UTC

**Canceled Orders**
10-11. Two SPY test orders - Canceled 2026-09-03

## Open Positions

**Count:** 0

No open positions exist. All submitted orders remain unfilled.

## P&L Analysis

```
Realized P&L: $0.00
Unrealized P&L: $0.00
Total P&L: $0.00
Equity Change: $0.00 (0%)
```

**Explanation:** With zero filled orders, there is no profit or loss to calculate.

## Reconciliation with Audit Log

The file `data/audit-log.json` contains **18 entries** documenting:
- 3 test entries (Sept 3)
- 5 equity order submissions (Sept 4, 02:58 UTC)
- 5 option spread attempts (Sept 4, 03:16 UTC - 4 blocked by risk gate, 1 without order)
- 4 option spread submissions (Sept 4, 03:45 UTC)
- 1 additional blocked option attempt

**Key Finding:** The audit log records *order submissions*, not *order fills*. All 18 entries are decision/submission events, but none represent actual executed trades.

### Audit Log Claims vs. Reality

**Audit Log:**
- 9 entries show order IDs (submissions)
- 5 entries marked "BLOCKED" 
- 4 entries without order IDs

**Alpaca API Reality:**
- 11 orders submitted total
- 0 orders filled
- Orders remain in "new" or "accepted" status (never executed)

## Root Cause Analysis

### Why Orders Weren't Filled

1. **Market Hours:** Orders submitted outside market hours (02:58 UTC, 03:16 UTC, 03:45 UTC, 08:01 UTC)
2. **Market Closure:** US markets closed (orders await next open)
3. **Time Constraint:** Submitted too close to hackathon deadline
4. **Order Types:** Some may be limit orders awaiting price conditions

### Timing Issues

- Sept 3, 13:40 UTC: Test orders
- Sept 4, 02:58 UTC: Equity orders (pre-market, ~10pm EST previous day)
- Sept 4, 03:16 UTC: Option attempts (pre-market)
- Sept 4, 03:45 UTC: Option submissions (pre-market)
- Sept 4, 08:01 UTC: More equity orders (3am EST, pre-market)

**All submissions occurred outside regular market hours (9:30am-4pm EST).**

## CLI vs SDK Usage

### Investigation Needed

The codebase shows two execution paths:
1. **lib/alpaca-cli/** - CLI-based execution (hackathon requirement)
2. **lib/alpaca/** - REST SDK fallback

**Status:** Needs verification whether actual orders used CLI or SDK path. The audit log shows `"executionPath": "http_rest_sdk_fallback"` and `"executionPath": "options_rest_fallback"`, suggesting **SDK was used, not CLI**.

### Evidence from Audit Log

All order submissions show fallback execution paths:
```json
"executionPath": "http_rest_sdk_fallback"
"executionPath": "options_rest_fallback"
```

**Conclusion:** Orders were submitted via REST API/SDK, **not via Alpaca CLI** as originally claimed.

## What Actually Happened

1. **Development:** System was built with signal ingestion → risk gate → order submission
2. **Testing:** System was tested and orders were successfully *submitted* to Alpaca
3. **Submission:** Orders entered "new" or "accepted" status but never filled
4. **Documentation Error:** Earlier docs conflated "submitted" with "executed/filled"

## Corrected Statistics for Submission

### Honest Numbers

```
Starting Balance: $100,000
Current Equity: $100,000
Orders Submitted: 11
Orders Filled: 0
Realized P&L: $0
Unrealized P&L: $0
Total P&L: $0
Open Positions: 0
```

### What Can Be Claimed

**What Works (Demonstrated):**
- Signal ingestion from GDELT (live)
- Ticker mapping (functional)
- Risk gate validation (4 checks, logs show PASSED/BLOCKED decisions)
- Order submission to Alpaca API (11 orders submitted)
- Audit trail (18 decision entries logged)
- Live dashboard (fetches real data from Alpaca)

**What Doesn't Work Yet:**
- Actual trade execution (0 fills)
- Real P&L generation (no fills = no P&L)
- CLI-based order submission (fell back to REST SDK)
- Market timing (orders submitted outside market hours)

## Recommendations for Submission

### 1. Be Honest About Status

**DO NOT CLAIM:**
- "9 real orders executed"
- Any P&L numbers (realized or unrealized)
- "Production trading system"
- "CLI-based execution" (if SDK was used)

**DO CLAIM:**
- "11 orders submitted to Alpaca paper account"
- "System successfully submits orders via REST API"
- "Risk gate blocked 5 orders, approved 9 for submission"
- "Complete audit trail of 18 decision events"
- "Live dashboard with real Alpaca account integration"

### 2. Focus on Differentiators

- **Unique Signal Source:** Tariff/trade policy signals (nobody else in hackathon)
- **Risk Management:** 4-gate validation system with audit trail
- **Production Infrastructure:** Live API integration, audit logging
- **Dashboard:** Real-time data from Alpaca account

### 3. Acknowledge Limitations

- Orders submitted but not filled (market hours constraint)
- SDK fallback used instead of CLI (time constraint)
- No real P&L to demonstrate (consequence of no fills)

### 4. Path Forward

If time permits before deadline (tonight 8:30 PM IST):
1. Submit 2-3 small market orders during market hours
2. Wait for fills (if market open)
3. Update documentation with actual fill count
4. If market closed, acknowledge "submitted but unfilled"

## Conclusion

**Ground Truth:** The TariffEdge system successfully demonstrates:
- Signal ingestion and processing
- Risk validation with audit logging
- API integration with Alpaca
- Order submission capability

**What's Missing:** Actual filled trades due to market timing constraints.

**Recommendation:** Pivot submission narrative to focus on the system's unique approach (tariff signals) and infrastructure (risk gates, audit trail, live integration) rather than trading performance metrics that don't exist.

---

**This document represents the objective truth queried directly from Alpaca API on September 4, 2026, prior to hackathon submission.**
