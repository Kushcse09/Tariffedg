# TariffEdge Project Rules

## Paper Trading Only

This system is configured for **paper trading only**. All Alpaca endpoints must use:
- `https://paper-api.alpaca.markets` (enforced in code)
- Never use live trading endpoints
- The `paper: true` flag is enforced in the client

## Tracked Sectors & Ticker Exposure Map

### Keywords to Track
- **Trade Policy:** tariff, trade policy, import duty, export ban, sanctions
- **Sectors:** 
  - semiconductors
  - shipping
  - retail imports
  - energy
  - industrials
  - steel
  - consumer electronics

### Ticker Mapping

Map signals to tickers based on keyword matches:

| Keywords | Ticker | Sector | Notes |
|----------|--------|--------|-------|
| energy, oil, petroleum, supply shock, Middle East | XLE | Energy | Energy sector ETF |
| heavy machinery, construction equipment, CAT | CAT | Industrials | Caterpillar |
| shipping, freight, container, Asia-US, transpacific | ZIM | Shipping | ZIM Integrated Shipping |
| emerging markets, trade ministry, retaliatory | EEM | Emerging Markets | Emerging markets ETF |
| steel, quota, Section 232 | NUE | Industrials | Nucor steel |
| air cargo, parcel, FedEx | FDX | Logistics | FedEx |
| Treasury, safe haven, risk-off | TLT | Treasuries | Long-term Treasury ETF |
| consumer electronics, iPhone, Apple | AAPL | Technology | Apple |
| UPS, parcel, logistics | UPS | Logistics | UPS |
| semiconductors, chips, TSMC, Intel | SMH | Technology | Semiconductor ETF |
| retail, imports, consumer goods | XRT | Retail | Retail ETF |

### Signal Confidence

Only map to a ticker if there's a **confident keyword match**. Return `null` if ambiguous.

## Signal Ingestion Rules

1. **Time Window:** Last 24 hours only
2. **Deduplication:** Same source + similar text within 1 hour = dedupe
3. **Freshness:** Sort newest first
4. **Graceful Failure:** If one source fails, return others with warning (never crash)
5. **Field Names (exact match required):**
   - `source` - string (e.g., "GDELT", "FREIGHTOS")
   - `time` - string in HH:mm:ss format
   - `ticker` - string | null (mapped ticker or null)
   - `text` - string (human-readable description)

## Data Sources

### GDELT 2.0 Doc API
- Endpoint: `https://api.gdeltproject.org/api/v2/doc/doc`
- Free, no auth required
- Query last 24 hours with tracked keywords

### Freightos Baltic Index
- If requires paid API key: stub with TODO and return empty array
- Don't block implementation on unavailable data sources

## Risk Management

- Paper trading account only
- Maximum 3 positions at once (guideline)
- Track sector exposure to avoid concentration
- **Maximum loss per spread:** $500 (hard cap)
- **Position sizing:** Never risk more than 2% of account equity on a single position
- **Daily loss cap:** $1,500 cumulative (realized + unrealized losses for the day)

### Risk Gate Checks (enforced in order)

1. **Max loss per spread:** ≤ $500 (hard stop)
2. **No duplicate ticker:** No existing open position on the same ticker
3. **Daily loss cap:** Cumulative daily loss (realized + unrealized) ≤ $1,500
4. **Max open positions:** ≤ 3 concurrent positions

### Audit Log Schema

All decisions (passed or blocked) are logged with these fields:
```typescript
{
  time: string;           // HH:mm format (matches timeline)
  trigger: string;        // e.g., "XLE signal ingested"
  thesis: string;         // Trade rationale
  risk: string;           // "PASSED" or "BLOCKED"
  tone: string;           // "positive" (passed) or "negative" (blocked)
  order: string;          // Order ID or "—" if blocked
  ticker: string;         // Underlying ticker
  signalText: string;     // Original signal text
  signalSource: string;   // Signal source (GDELT, etc.)
  riskReason: string | null; // Block reason if risk = "BLOCKED"
  submittedAt: string;    // ISO timestamp
}
```

## Options Position Construction Rules

### Spread Configuration
- **Expiry Selection:** 30-45 days out (DTE: days to expiration)
  - Avoid weeklies (too short-term)
  - Avoid anything past 60 days (too long-term, less liquid)
- **Spread Width:** Typically $5-10 wide for most tickers
- **Max Loss:** Capped at $500 per spread (enforced in code)

### Direction Heuristics

**Bearish Signals** (bad for ticker → buy put debit spread):
- Keywords: tariff, ban, disruption, risk, sanctions, quota, restriction
- Structure: Buy higher strike put, sell lower strike put
- Example: Signal about "new tariff on semiconductors" → bearish for SMH

**Bullish Signals** (good for ticker → buy call debit spread):
- Keywords: deal, resolved, eased, exemption, excluded, lifted, agreement
- Structure: Buy lower strike call, sell higher strike call
- Example: Signal about "tariff exemption granted" → bullish for AAPL

**Note:** These are simple keyword heuristics, not sophisticated NLP. Production systems would use sentiment analysis, entity recognition, and causal reasoning.

### Spread Order Structure

```typescript
interface SpreadOrder {
  ticker: string;
  type: 'put_debit_spread' | 'call_debit_spread';
  legs: Array<{
    action: 'buy' | 'sell';
    strike: number;
    expiry: string;        // ISO date format
    contractSymbol: string; // OCC format
  }>;
  maxLoss: number;          // Net debit paid
  estimatedCost: number;    // Same as maxLoss for debit spreads
  thesisText: string;       // Human-readable trade rationale
}
```

## Hackathon Compliance (Alpaca AI Trading Agents)

### Technology Requirements

**REQUIREMENT:** Must use either Alpaca MCP Server OR Alpaca CLI (not just raw SDK).

**OUR IMPLEMENTATION:** Alpaca CLI integration

| Component | Technology | Reason |
|-----------|------------|--------|
| Order Submission | **Alpaca CLI** | Hackathon requirement |
| Account Status | **Alpaca CLI** | Hackathon requirement |
| Position Tracking | **Alpaca CLI** | Hackathon requirement |
| Option Chain Fetching | Alpaca SDK | CLI doesn't support this yet |
| Market Data | Alpaca SDK | Faster for real-time queries |

**CLI Module:** `lib/alpaca-cli/`
- Subprocess calls to `alpaca` command
- Structured JSON parsing
- Error handling with exit codes
- Environment-based authentication

### P&L Evidence Requirements

**REQUIREMENT:** Demonstrate trading performance (highest-weighted judging criterion).

**OUR IMPLEMENTATION:**

1. **Backtesting Script** (`scripts/backtest.ts`)
   - 8 historical signals
   - Simulated P&L calculation
   - Win rate, profit factor, max drawdown
   - Immediate evidence for submission

2. **Live Paper Trading Scheduler** (`scripts/live-trading-scheduler.ts`)
   - Runs every 15 minutes
   - Real order submission via CLI
   - Accumulates actual P&L
   - Run from now until deadline

3. **P&L Dashboard** (`scripts/show-pnl.ts`)
   - Total/realized/unrealized P&L
   - Win/loss statistics
   - Performance metrics
   - Screenshot-ready output

4. **P&L API** (`/api/pnl`)
   - JSON endpoint for frontend
   - Comprehensive metrics
   - Real-time calculation

### Submission Checklist

Before Sep 4, 8:30 PM IST deadline:

- [ ] Alpaca CLI installed and verified (`alpaca version`)
- [ ] CLI authentication working (`alpaca account get`)
- [ ] Backtest executed successfully with results
- [ ] Live scheduler running (accumulating trades)
- [ ] P&L summary screenshot captured
- [ ] Audit log has entries (`data/audit-log.json`)
- [ ] Technology stack documented (CLI vs SDK split)
- [ ] Demo video showing CLI integration
- [ ] One-page write-up with P&L evidence

### Judging Criteria Coverage

| Criterion | Weight | Our Evidence | Location |
|-----------|--------|--------------|----------|
| Innovation & Creativity | High | Tariff-signal-driven options | Architecture, signal ingestion |
| **P&L Performance** | **Highest** | **Backtest + Live results** | **scripts/backtest.ts, scripts/show-pnl.ts** |
| **Technology Implementation** | **High** | **Alpaca CLI integration** | **lib/alpaca-cli/, HACKATHON_SETUP.md** |
| Code Quality | Medium | TypeScript, modular, documented | All code files, READMEs |
| Practicality | Medium | Automated agent, risk management | Full system integration |

### CLI Setup Instructions

1. **Install CLI:**
   ```bash
   go install github.com/alpacahq/cli/cmd/alpaca@latest
   ```

2. **Verify PATH:**
   ```bash
   export PATH="$PATH:$HOME/go/bin"
   alpaca version
   ```

3. **Test Access:**
   ```bash
   alpaca account get  # Should show PA331I6VA51Z
   ```

4. **Environment Variables** (already in `.env.local`):
   ```
   ALPACA_API_KEY=PKSQS7ST5D666YWV7E7G7Q2N7L
   ALPACA_SECRET_KEY=2kMqXZkpHgQ71FhQ66sD1kaWtnuERG1fQaazPXNhssKJ
   ```

### Running for Hackathon

**Immediate (for submission materials):**
```bash
npx tsx scripts/backtest.ts         # Get P&L evidence now
npx tsx scripts/show-pnl.ts         # Screenshot for write-up
```

**Continuous (until deadline):**
```bash
npx tsx scripts/live-trading-scheduler.ts  # Accumulate real trades
```

**Verification:**
```bash
alpaca position list                # Show open positions
cat data/audit-log.json | jq       # Show decision history
curl http://localhost:3000/api/pnl # Get P&L via API
```

### Documentation Links

- **Hackathon Setup:** [HACKATHON_SETUP.md](../HACKATHON_SETUP.md)
- **CLI Integration:** [lib/alpaca-cli/README.md](../lib/alpaca-cli/README.md)
- **Test Results:** [SYSTEM_TEST_RESULTS.md](../SYSTEM_TEST_RESULTS.md)
- **Quick Start:** [QUICK_START.md](../QUICK_START.md)
