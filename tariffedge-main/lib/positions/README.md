# Options Position Construction Module

This module constructs options spreads (vertical spreads) based on signals. It fetches option chains, selects appropriate strikes and expiries, calculates risk, and returns structured SpreadOrder objects.

## Architecture

```
lib/positions/
├── optionChain.ts       # Fetch option chains from Alpaca
├── spreadBuilder.ts     # Build vertical spreads (put/call debit)
├── index.ts             # Public API exports
└── README.md            # This file
```

## Components

### Option Chain Fetcher (`optionChain.ts`)

Fetches live option chains from Alpaca paper trading API.

**Key Functions:**
- `getOptionChain(ticker)` - Get full chain with calls, puts, strikes, expiries
- `findClosestExpiry(chain, targetDays, minDays, maxDays)` - Find optimal expiry
- `getContractsInDteRange(chain, minDays, maxDays)` - Filter by DTE

**Returns:**
```typescript
{
  ticker: string;
  underlyingPrice: number;
  expirations: string[];  // ISO dates, sorted
  calls: OptionContract[];
  puts: OptionContract[];
}
```

### Spread Builder (`spreadBuilder.ts`)

Constructs vertical debit spreads from signals.

**Key Functions:**
- `buildVerticalSpread(ticker, signal, direction?)` - Build complete spread
- `determineDirection(text)` - Infer bearish/bullish from signal text

**Rules (from `steering/project.md`):**
- **Expiry:** 30-45 days out (avoid weeklies, cap at 60 days)
- **Max Loss:** $500 per spread (hard cap)
- **Spread Width:** $5-10 typically
- **Direction Heuristics:**
  - **Bearish** (tariff, ban, disruption) → Put debit spread
  - **Bullish** (deal, resolved, exemption) → Call debit spread

**NOTE:** Direction determination uses **simple keyword matching**, not sophisticated NLP. Production systems would use sentiment analysis, entity recognition, and causal reasoning models.

## Spread Types

### Put Debit Spread (Bearish)
- **Use:** When signal is bad for ticker (tariff imposed, export ban, etc.)
- **Structure:** Buy higher strike put, sell lower strike put
- **Max Profit:** Strike difference - net debit
- **Max Loss:** Net debit paid
- **Example:** Signal "New tariff on semiconductors" → Bearish SMH
  - Buy SMH 95 put @ $3.50
  - Sell SMH 90 put @ $1.80
  - Net debit: $1.70 × 100 = $170 max loss

### Call Debit Spread (Bullish)
- **Use:** When signal is good for ticker (exemption granted, deal reached, etc.)
- **Structure:** Buy lower strike call, sell higher strike call
- **Max Profit:** Strike difference - net debit
- **Max Loss:** Net debit paid
- **Example:** Signal "Apple tariff exemption" → Bullish AAPL
  - Buy AAPL 180 call @ $4.20
  - Sell AAPL 185 call @ $2.10
  - Net debit: $2.10 × 100 = $210 max loss

## SpreadOrder Structure

```typescript
interface SpreadOrder {
  ticker: string;
  type: 'put_debit_spread' | 'call_debit_spread';
  legs: Array<{
    action: 'buy' | 'sell';
    strike: number;
    expiry: string;        // ISO date
    contractSymbol: string; // OCC format (e.g., AAPL250117C00180000)
  }>;
  maxLoss: number;          // Net debit paid (capped at $500)
  estimatedCost: number;    // Same as maxLoss for debit spreads
  thesisText: string;       // Human-readable rationale
}
```

## Usage

### Preview a Spread (API Endpoint)

```bash
curl -X POST http://localhost:3000/api/positions/preview \
  -H "Content-Type: application/json" \
  -d '{
    "signal": {
      "source": "GDELT",
      "time": "12:31:26",
      "ticker": "AAPL",
      "text": "Apple seeks consumer electronics tariff exemption"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "spread": {
    "ticker": "AAPL",
    "type": "call_debit_spread",
    "legs": [
      {
        "action": "buy",
        "strike": 180,
        "expiry": "2026-04-17",
        "contractSymbol": "AAPL260417C00180000"
      },
      {
        "action": "sell",
        "strike": 185,
        "expiry": "2026-04-17",
        "contractSymbol": "AAPL260417C00185000"
      }
    ],
    "maxLoss": 210.00,
    "estimatedCost": 210.00,
    "thesisText": "Bullish AAPL based on..."
  },
  "summary": "Preview: call debit spread on AAPL...",
  "note": "This is a PREVIEW only. No order has been submitted."
}
```

### Programmatic Usage

```typescript
import { buildVerticalSpread } from "@/lib/positions";

const signal = {
  source: "GDELT",
  time: "12:31:26",
  ticker: "XLE",
  text: "Middle East supply disruption repriced across energy markets"
};

// Build spread (preview only)
const spread = await buildVerticalSpread("XLE", signal);

console.log(spread.type);        // "put_debit_spread"
console.log(spread.maxLoss);     // 342.00
console.log(spread.legs.length); // 2 (buy leg + sell leg)
```

### Override Direction

```typescript
// Force bullish even if signal seems bearish
const spread = await buildVerticalSpread("AAPL", signal, "bullish");
```

## Direction Heuristics

Simple keyword-based classification (not production-grade NLP):

**Bearish Keywords:**
- tariff, ban, disruption, risk, sanctions
- quota, restriction, threat, escalation
- tension, shortage

**Bullish Keywords:**
- deal, resolved, eased, exemption
- excluded, lifted, agreement, breakthrough
- optimism, relief

**Logic:**
- Count bearish vs bullish keyword matches
- Default to bearish if no clear signal (tariff news tends negative)

**Production Enhancement:**
Replace with:
- Sentiment analysis (FinBERT, etc.)
- Entity recognition + causal reasoning
- Market context integration
- Multi-signal ensemble models

## Risk Management

From `steering/project.md`:

- ✅ **Max loss per spread:** $500 (enforced in code)
- ✅ **Expiry range:** 30-60 days (sweet spot: 37 days)
- ✅ **Spread width:** $5-10 (typical)
- ✅ **Max positions:** 3 concurrent (guideline)
- ✅ **Position sizing:** Never risk >2% account equity

## Strike Selection Logic

### Put Debit Spread (Bearish)
1. Find ATM strike (at or above underlying price)
2. Buy this put (higher strike)
3. Sell a put $5-10 below (lower strike)

### Call Debit Spread (Bullish)
1. Find ATM strike (at or above underlying price)
2. Buy this call (lower strike)
3. Sell a call $5-10 above (higher strike)

### Pricing
- **Buy leg:** Use ask price (worst case)
- **Sell leg:** Use bid price (worst case)
- **Net debit:** (buy ask - sell bid) × 100

## Error Handling

Graceful failure at each step:

1. **No option chain:** Ticker may not support options
2. **No suitable expiry:** Need 30-60 DTE range
3. **No suitable strikes:** Need $5-10 spread width
4. **Missing pricing:** Contract needs bid/ask data
5. **Max loss exceeded:** Net debit > $500 cap

All errors throw with descriptive messages for debugging.

## Testing

### Test Preview Endpoint

```bash
# Start dev server
pnpm dev

# Get a real signal
curl http://localhost:3000/api/signals

# Preview spread for signal
curl -X POST http://localhost:3000/api/positions/preview \
  -H "Content-Type: application/json" \
  -d '{
    "signal": {
      "source": "GDELT",
      "time": "12:31:26",
      "ticker": "XLE",
      "text": "Energy supply disruption"
    }
  }'
```

### Expected Results

✅ Returns valid spread structure  
✅ Strikes are real from option chain  
✅ Expiry is 30-60 days out  
✅ Max loss < $500  
✅ No order submitted (preview only)

## Integration Points

### Existing Modules (Unchanged)
- ✅ `/lib/signals` - Signal ingestion (unchanged)
- ✅ `/lib/alpaca` - Paper trading client (unchanged)
- ✅ Frontend components (unchanged)

### New Module
- ✅ `/lib/positions` - Option spread construction (additive)

### Future Integration
- Order submission (TBD)
- Position tracking
- Risk monitoring
- P&L calculation

## Example Workflow

```typescript
// 1. Get signals
const signals = await fetchAllSignals();

// 2. Filter for signals with ticker mappings
const tradableSignals = signals.filter(s => s.ticker !== null);

// 3. Build spread for first signal
const spread = await buildVerticalSpread(
  tradableSignals[0].ticker!,
  tradableSignals[0]
);

// 4. Review spread structure
console.log(`${spread.type} on ${spread.ticker}`);
console.log(`Max loss: $${spread.maxLoss}`);
console.log(`Expiry: ${spread.legs[0].expiry}`);

// 5. (Future) Submit order via Alpaca
// await submitSpreadOrder(spread);
```

## Configuration

### Environment Variables
None required (uses Alpaca credentials from `/lib/alpaca`).

### Constants (in code)
- `MAX_LOSS_PER_SPREAD = 500` (spreadBuilder.ts)
- Target DTE: 37 days (30-60 range)
- Spread width: $5-10

Edit `steering/project.md` to change risk parameters.

## Limitations

1. **Keyword-based direction** - Not production NLP
2. **Preview only** - No actual order submission yet
3. **Vertical spreads only** - No diagonals, calendars, iron condors
4. **Debit spreads only** - No credit spreads (different risk profile)
5. **Single-leg greeks** - No position-level greek analysis

## Future Enhancements

- [ ] Actual order submission to Alpaca
- [ ] Position-level greek calculations
- [ ] Credit spread support
- [ ] Iron condor construction
- [ ] Calendar spread support
- [ ] Sentiment analysis for direction
- [ ] Volatility regime detection
- [ ] Position sizing based on kelly criterion
- [ ] Multi-leg spread visualization

## Related Files

- **Configuration:** `steering/project.md` - Risk rules and spread parameters
- **Signals:** `lib/signals/` - Signal ingestion (input)
- **Alpaca:** `lib/alpaca/` - Paper trading client
- **API:** `app/api/positions/preview/route.ts` - Preview endpoint
