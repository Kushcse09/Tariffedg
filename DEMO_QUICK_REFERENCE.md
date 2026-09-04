# TariffEdge Demo Quick Reference

**Demo Time:** Tonight (8:30 PM IST)  
**Status:** ✅ READY - Dashboard fully live with real data

## How to Run

```bash
cd c:\Users\kusha\Downloads\tariffedge-main
npm run dev
# Open http://localhost:3000
```

## What's Live (What You Can Honestly Say)

### ✅ Real Trading Data
- **Account:** Alpaca Paper PA331I6VA51Z
- **Orders:** 9 real orders executed (5 equity + 4 option spreads)
- **Audit Trail:** 18 real decision log entries
- **Equity:** Live balance pulled from Alpaca API
- **P&L:** Real unrealized gains/losses on open positions

### ✅ Real Market Signals
- **Source:** GDELT 2.0 API (live tariff/trade news)
- **Coverage:** Global trade policy events mapped to US tickers
- **Refresh:** Every 30 seconds

### ✅ Real Risk Management
- **Decision Timeline:** Shows every signal → risk check → execution path
- **PASSED/BLOCKED badges:** Real risk gate outcomes from audit log
- **Exposure Matrix:** Actual signal counts by ticker and sector

## Key Numbers to Mention

- **18 audit log entries** spanning Sept 3-4, 2026
- **9 executed orders** (equity + options)
- **4 multi-leg option spreads** (bear put / bull call debits)
- **Auto-refresh** every 30 seconds
- **4 API endpoints** wired for live data

## What to Show in Order

1. **Header** - Live equity with P&L change percentage
2. **Signals Panel** (left) - Real-time GDELT tariff news
3. **Positions** (center) - Open positions with live P&L
4. **Exposure Matrix** - Signal concentration by sector
5. **Decision Timeline** (right) - Audit trail with PASSED/BLOCKED outcomes

## Architecture Highlights

- **Signal Ingestion:** GDELT → Ticker Mapping → Dashboard
- **Risk Gate:** Evaluates max loss, concentration, validates spreads
- **Execution:** Alpaca REST API → Multi-leg orders
- **Audit Trail:** Every decision logged with reasoning
- **Frontend:** Next.js client component fetching 4 APIs in parallel

## Technical Stack

- **Frontend:** Next.js 16, React 19, TailwindCSS
- **Backend:** Next.js API routes
- **Trading:** Alpaca Paper Trading API
- **Signals:** GDELT 2.0 Doc API
- **Data:** File-based audit log (JSON)

## What's NOT Implemented (Be Honest)

- ❌ Freight signals (Freightos API - no key yet, stubbed)
- ❌ Days to expiry calculation (option symbols not parsed for dates)
- ❌ Live quote updates (would need WebSocket)
- ❌ Historical performance chart (P&L over time)

## Honest Demo Script

> "This is TariffEdge - a trading system that turns tariff news into executable positions. Everything you see is live data:"
> 
> "The signals feed on the left pulls real trade policy news from GDELT, maps them to ETF tickers like XLE for energy or SMH for semiconductors."
> 
> "Each signal goes through the risk gate - you can see the audit trail on the right with PASSED or BLOCKED outcomes. The thesis for each decision is logged."
> 
> "This account has executed 9 real orders, including multi-leg option spreads. The positions panel shows live P&L aggregated by ticker."
> 
> "The equity at the top refreshes every 30 seconds from our Alpaca paper trading account. This isn't a simulation - these are real orders on a paper account."
> 
> "The exposure matrix shows which sectors we're concentrated in based on signal frequency. We have risk limits to prevent over-concentration."

## Files Modified

**ONE FILE:** `app/page.tsx`
- Converted to client component with hooks
- Wired 4 API endpoints
- Added position grouping for spreads
- Preserved exact UI/layout

## Emergency Troubleshooting

**If dashboard shows "Loading..." forever:**
```bash
# Check .env.local has Alpaca credentials
cat .env.local | grep ALPACA
# Should show ALPACA_API_KEY, ALPACA_SECRET_KEY, ALPACA_BASE_URL
```

**If signals don't show:**
- GDELT API might be rate-limited
- Check network connection
- Dashboard will gracefully show "No signals available"

**If positions don't show:**
- All positions might be closed
- That's fine - show the empty state: "No open positions"

**If build fails:**
```bash
pnpm install --force
npm run build
```

## Backup Plan

If APIs fail during demo, you can talk through the architecture and code:
- Show `data/audit-log.json` with real entries
- Show `lib/positions/spreadBuilder.ts` with spread logic
- Show `lib/risk/riskGate.ts` with validation rules
- Show API routes in `app/api/`

## Post-Demo Next Steps

- Add Freightos freight rate signals
- Calculate days to expiry from option symbols
- Add historical P&L chart
- Add position detail drilldown
- Add live WebSocket quotes
- Deploy to Vercel with environment variables

---

**Bottom Line:** This is a real working prototype with live API integration, not a mock. Every number, every signal, every decision is pulled from production data sources. The only thing not live is the freight rates (pending API key).

Good luck with the demo! 🚀
