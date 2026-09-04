# Signal Ingestion Module

This module fetches real-time tariff and trade-policy signals from multiple sources, maps them to tickers, and provides a unified API.

## Architecture

```
lib/signals/
├── gdelt.ts      # GDELT 2.0 Doc API integration
├── freight.ts    # Freight rate signals (stubbed)
├── index.ts      # Signal aggregation, ticker mapping, deduplication
└── README.md     # This file
```

## Data Sources

### GDELT 2.0 Doc API (Active)
- **Endpoint:** `https://api.gdeltproject.org/api/v2/doc/doc`
- **Coverage:** Global news articles mentioning tariffs, trade policy, sanctions, etc.
- **Update Frequency:** Real-time (24-hour window)
- **Keywords Tracked:**
  - Trade policy: tariff, import duty, export ban, sanctions
  - Sectors: semiconductors, shipping, retail imports, energy, steel
- **Fallback:** If API is unreachable (network restrictions), returns sample signals

### Freightos Baltic Index (Stubbed)
- **Status:** TODO - requires paid API key
- **Future Coverage:** Container rates, air freight, port congestion
- **See:** `freight.ts` for implementation structure

## Signal Format

All signals follow this structure (matches frontend mock data):

```typescript
{
  source: string;    // "GDELT", "FREIGHTOS", etc.
  time: string;      // HH:mm:ss format
  ticker: string | null;  // Mapped ticker or null if no confident match
  text: string;      // Human-readable description
}
```

## Ticker Mapping

Signals are automatically mapped to tickers using keyword matching (see `steering/project.md`):

| Keywords | Ticker | Sector |
|----------|--------|--------|
| energy, oil, Middle East, supply shock | XLE | Energy |
| heavy machinery, construction, Caterpillar | CAT | Industrials |
| shipping, freight, container, transpacific | ZIM | Shipping |
| emerging markets, trade ministry, retaliatory | EEM | Emerging Markets |
| steel, quota, Section 232 | NUE | Industrials |
| air cargo, FedEx | FDX | Logistics |
| Treasury, safe haven, bonds | TLT | Treasuries |
| consumer electronics, Apple, iPhone | AAPL | Technology |
| UPS, parcel | UPS | Logistics |
| semiconductors, chips, TSMC, Intel | SMH | Technology |
| retail, consumer goods, imports | XRT | Retail |

**Confidence Rule:** Only map if keyword match is confident. Return `null` otherwise.

## Usage

### Fetch All Signals

```typescript
import { fetchAllSignals } from "@/lib/signals";

const signals = await fetchAllSignals();
// Returns deduplicated, ticker-mapped, sorted (newest first)
```

### Fetch from Individual Sources

```typescript
import { fetchGdeltSignals, fetchFreightSignals } from "@/lib/signals";

const gdelt = await fetchGdeltSignals();
const freight = await fetchFreightSignals(); // Currently returns []
```

### Map Text to Ticker

```typescript
import { mapSignalToTicker } from "@/lib/signals";

const ticker = mapSignalToTicker("Middle East supply disruption");
// Returns: "XLE"

const noMatch = mapSignalToTicker("Generic news headline");
// Returns: null
```

## API Endpoint

### GET /api/signals

Returns all current signals.

**Response:**
```json
{
  "success": true,
  "count": 8,
  "signals": [
    {
      "source": "GDELT",
      "time": "12:31:26",
      "ticker": "XLE",
      "text": "Middle East supply disruption..."
    }
  ],
  "sources": {
    "gdelt": "active",
    "freight": "stubbed"
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/signals
```

## Graceful Failure

Each source handles errors independently:

- ✅ If GDELT fails → logs warning, returns sample data
- ✅ If Freight fails → logs warning, returns empty array
- ✅ Endpoint never crashes
- ✅ Partial results always returned

## Signal Processing Pipeline

1. **Fetch** from all sources in parallel
2. **Map** signals to tickers using keyword matching
3. **Deduplicate** based on source + text similarity
4. **Sort** by time (newest first)
5. **Return** combined results

## Testing

### Test the Endpoint
```bash
pnpm dev
curl http://localhost:3000/api/signals
```

### Test Ticker Mapping
```typescript
import { mapSignalToTicker } from "@/lib/signals";

// Should map to XLE
console.log(mapSignalToTicker("Oil prices surge"));

// Should map to AAPL
console.log(mapSignalToTicker("Apple iPhone tariff exemption"));

// Should return null
console.log(mapSignalToTicker("Generic headline"));
```

## Configuration

### Environment Variables
None required for GDELT (public API).

For Freightos (when implemented):
```bash
FREIGHTOS_API_KEY=your_key_here
```

### Tracked Keywords
Edit `steering/project.md` to add new sectors or keywords.

Then update the `TICKER_MAPPING` array in `lib/signals/index.ts`.

## Network Restrictions

If GDELT API is blocked by firewall/proxy:
- Module automatically falls back to sample signals
- Sample signals demonstrate ticker mapping
- Real integration code remains for when API is accessible

Check logs:
```
[GDELT] Failed to fetch signals: fetch failed
[GDELT] Returning sample data (API may be unreachable...)
```

## Future Enhancements

- [ ] Add Freightos Baltic Index integration
- [ ] Add US ITC (International Trade Commission) data
- [ ] Implement real-time WebSocket updates
- [ ] Add signal sentiment analysis
- [ ] Cache signals to reduce API calls
- [ ] Add more granular sector mappings
- [ ] Historical signal backtesting

## Related Files

- **Steering Rules:** `steering/project.md` - Ticker mappings and project rules
- **API Route:** `app/api/signals/route.ts` - HTTP endpoint
- **Frontend:** `app/page.tsx` - Signal display component (uses same format)
