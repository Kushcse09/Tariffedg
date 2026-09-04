# Alpaca CLI Integration

**HACKATHON REQUIREMENT**: This module routes trading operations through Alpaca's official CLI tool instead of direct SDK calls, fulfilling the technology requirement for the Alpaca AI Trading Agents Hackathon.

## Why CLI Instead of SDK?

The hackathon explicitly requires projects to use either:
1. Alpaca's MCP Server, OR
2. Alpaca's CLI tools

We chose the **CLI** because:
- ✅ Designed specifically for AI agent automation
- ✅ No confirmation prompts (executes immediately)
- ✅ Structured JSON output for parsing
- ✅ Better for scheduled/cron-style workflows
- ✅ Simpler subprocess integration than MCP protocol

## Setup

### 1. Install Alpaca CLI

```bash
# Install via Go
go install github.com/alpacahq/cli/cmd/alpaca@latest

# Verify installation
alpaca version

# Check system readiness
alpaca doctor
```

**Important**: Ensure `$GOPATH/bin` (typically `~/go/bin` or `C:\Users\<username>\go\bin` on Windows) is on your PATH.

### 2. Authentication

The CLI automatically reads credentials from environment variables (no profile login needed):

```bash
# Already configured in .env.local
ALPACA_API_KEY=PKSQS7ST5D666YWV7E7G7Q2N7L
ALPACA_SECRET_KEY=2kMqXZkpHgQ71FhQ66sD1kaWtnuERG1fQaazPXNhssKJ

# Paper trading is the default
ALPACA_LIVE_TRADE=false
```

**Alternative**: Use profile-based auth:
```bash
alpaca profile login --api-key
```

### 3. Verify Setup

```bash
# Check account status
alpaca account get

# List positions
alpaca position list

# List orders
alpaca order list
```

## Usage

### Account Status (via CLI)

```typescript
import { getAccountViaCLI } from '@/lib/alpaca-cli';

const result = await getAccountViaCLI();
if (result.success) {
  console.log('Equity:', result.data.equity);
  console.log('Buying Power:', result.data.buying_power);
}
```

**CLI command executed:**
```bash
alpaca account get --output json
```

### Submit Order (via CLI)

```typescript
import { submitOrderViaCLI } from '@/lib/alpaca-cli';

const result = await submitOrderViaCLI({
  symbol: 'AAPL',
  qty: 10,
  side: 'buy',
  type: 'market',
  time_in_force: 'day',
});

if (result.success) {
  console.log('Order ID:', result.data.id);
}
```

**CLI command executed:**
```bash
alpaca order submit --symbol AAPL --side buy --qty 10 --type market --time-in-force day --output json
```

### Submit Options Spread (via CLI)

```typescript
import { submitSpreadViaCLI } from '@/lib/alpaca-cli';

const spread: SpreadOrder = {
  ticker: 'XLE',
  type: 'put_debit_spread',
  legs: [
    {
      action: 'buy',
      strike: 95,
      expiry: '2027-01-15',
      contractSymbol: 'XLE270115P00095000',
      limitPrice: 3.50,
    },
    {
      action: 'sell',
      strike: 90,
      expiry: '2027-01-15',
      contractSymbol: 'XLE270115P00090000',
      limitPrice: 1.20,
    },
  ],
  maxLoss: 230,
  estimatedCost: 230,
  thesisText: 'Bearish energy sector on tariff concerns',
};

const result = await submitSpreadViaCLI(spread);

if (result.success) {
  console.log('Spread submitted:', result.clientOrderId);
  result.legs.forEach((leg, i) => {
    console.log(`Leg ${i + 1}:`, leg.data?.id);
  });
}
```

**CLI commands executed:**
```bash
alpaca order submit --symbol XLE270115P00095000 --side buy --qty 1 --type limit --limit-price 3.50 --time-in-force day --client-order-id spread-123-leg1 --output json
alpaca order submit --symbol XLE270115P00090000 --side sell --qty 1 --type limit --limit-price 1.20 --time-in-force day --client-order-id spread-123-leg2 --output json
```

### Get Positions (via CLI)

```typescript
import { getAllPositionsViaCLI } from '@/lib/alpaca-cli';

const result = await getAllPositionsViaCLI();
if (result.success) {
  result.data.forEach((pos) => {
    console.log(`${pos.symbol}: ${pos.qty} @ ${pos.current_price}`);
    console.log(`P&L: ${pos.unrealized_pl} (${pos.unrealized_plpc}%)`);
  });
}
```

**CLI command executed:**
```bash
alpaca position list --output json
```

## Technology Stack Split

**For Hackathon Judges:**

| Component | Technology | Notes |
|-----------|------------|-------|
| Signal Ingestion | GDELT API | Direct HTTP calls, custom integration |
| Ticker Mapping | Custom Logic | Keyword-based heuristics |
| Option Chain Fetching | Alpaca SDK | Required for spread construction |
| Spread Construction | Custom Logic | Vertical debit spreads |
| Risk Gate | Custom Logic | 4-layer validation |
| **Order Submission** | **Alpaca CLI** ✅ | **HACKATHON REQUIREMENT** |
| **Account Status** | **Alpaca CLI** ✅ | **HACKATHON REQUIREMENT** |
| **Position Tracking** | **Alpaca CLI** ✅ | **HACKATHON REQUIREMENT** |
| Audit Logging | Custom JSON | Persistent file storage |

## CLI vs SDK: When to Use What

### Use CLI (via this module) for:
- ✅ Order submission (hackathon requirement)
- ✅ Account status checks (hackathon requirement)
- ✅ Position tracking (hackathon requirement)
- ✅ Automated/scheduled workflows
- ✅ Production order execution

### Use SDK (existing lib/alpaca) for:
- Option chain fetching (CLI doesn't support this yet)
- Market data queries (faster for real-time)
- Complex multi-leg order construction (before CLI submission)
- Account setup and configuration

## Error Handling

The CLI returns structured errors via stderr with exit codes:

```typescript
const result = await submitOrderViaCLI(params);

if (!result.success) {
  console.error('CLI Error:', result.error);
  console.error('Exit Code:', result.exitCode);
  console.error('Stderr:', result.stderr);
  
  // Exit codes:
  // 0 = success
  // 1 = general error
  // 2 = authentication failure
  // -1 = CLI not installed
}
```

## Troubleshooting

### "Failed to execute CLI: ... Ensure 'alpaca' CLI is installed"

The CLI is not installed or not on PATH:
```bash
# Install
go install github.com/alpacahq/cli/cmd/alpaca@latest

# Add to PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$PATH:$HOME/go/bin"

# Verify
alpaca version
```

### "Authentication failure" (exit code 2)

API keys are missing or invalid:
```bash
# Check env vars
echo $ALPACA_API_KEY
echo $ALPACA_SECRET_KEY

# Or login with profile
alpaca profile login --api-key
```

### "Command timed out"

Large operations may take time. Increase timeout in the subprocess call if needed.

## CLI Documentation

- **Official Docs**: https://docs.alpaca.markets/us/us/docs/alpacas-cli
- **GitHub**: https://github.com/alpacahq/cli
- **Launch Blog**: https://blog.alpaca.markets/blog/alpaca-introduces-cli-for-trading-api/

## Compliance Note

This integration layer ensures TariffEdge complies with the Alpaca AI Trading Agents Hackathon technology requirements by routing critical trading operations through Alpaca's official CLI tool rather than only using the raw SDK.
