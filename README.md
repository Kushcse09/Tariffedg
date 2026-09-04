# TariffEdge

**AI-powered trading system that converts tariff and trade policy signals into executable equity and options positions.**

![Live Status](https://img.shields.io/badge/status-live-success)
![Paper Trading](https://img.shields.io/badge/trading-paper%20account-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)

## Overview

TariffEdge monitors global trade policy events through GDELT and automatically generates trading signals for US-listed equities and ETFs. Each signal passes through a risk management gate before execution on Alpaca's paper trading platform.

### Key Features

- 🌍 **Real-time Signal Ingestion** - GDELT 2.0 API for global tariff & trade policy news
- 🎯 **Intelligent Ticker Mapping** - Automatically maps news events to relevant US tickers
- 🛡️ **Risk Management Gate** - Validates max loss, position concentration, and spread parameters
- 📊 **Multi-leg Options** - Executes bull/bear call/put debit spreads
- 📈 **Live Dashboard** - Real-time P&L, positions, and decision audit trail
- 🔍 **Complete Audit Trail** - Every decision logged with reasoning and outcomes

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TailwindCSS
- **Backend:** Next.js API Routes
- **Trading:** Alpaca Paper Trading API
- **Signals:** GDELT 2.0 Document API
- **Data:** File-based audit logging (JSON)

## Architecture

```
GDELT API → Signal Ingestion → Ticker Mapping → Risk Gate → Alpaca API
                                                      ↓
                                              Audit Logger
                                                      ↓
                                            Dashboard (Live)
```

### Components

1. **Signal Ingestion** (`lib/signals/`)
   - Fetches tariff/trade news from GDELT
   - Maps events to tickers using keyword matching
   - Deduplicates and sorts by recency

2. **Risk Management** (`lib/risk/`)
   - Validates max loss per trade ($500 cap)
   - Checks position concentration limits
   - Validates option spread parameters
   - Logs PASSED/BLOCKED decisions

3. **Position Builder** (`lib/positions/`)
   - Fetches option chains from Alpaca
   - Constructs bull/bear call/put spreads
   - Calculates max loss and breakevens
   - Submits multi-leg orders

4. **Audit Logger** (`lib/audit/`)
   - Records every signal → decision → execution path
   - Stores reasoning for PASSED/BLOCKED outcomes
   - Provides audit trail for dashboard

5. **Dashboard** (`app/page.tsx`)
   - Live account equity from Alpaca
   - Real-time signals from GDELT
   - Open positions with P&L
   - Decision timeline with audit entries

## Setup

### Prerequisites

- Node.js 18+ or compatible
- pnpm (or npm/yarn)
- Alpaca Paper Trading Account

### Installation

```bash
# Clone the repository
git clone https://github.com/ksu0928/Tariff1.git
cd Tariff1

# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your Alpaca credentials
```

### Environment Variables

```env
ALPACA_API_KEY=your_paper_trading_key
ALPACA_SECRET_KEY=your_paper_trading_secret
ALPACA_BASE_URL=https://paper-api.alpaca.markets
```

Get your Alpaca Paper Trading credentials from: https://alpaca.markets/

### Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Build for Production

```bash
pnpm build
pnpm start
```

## Usage

### Dashboard

The main dashboard displays:
- **Incoming Signals** - Live tariff/trade news from GDELT
- **Open Positions** - Current positions with unrealized P&L
- **Exposure Matrix** - Signal concentration by ticker and sector
- **Decision Timeline** - Audit trail showing PASSED/BLOCKED outcomes

### API Endpoints

- `GET /api/signals` - Fetch current signals from GDELT
- `GET /api/audit` - Retrieve audit log entries
- `GET /api/alpaca/status` - Get account equity and status
- `GET /api/pnl` - Calculate comprehensive P&L summary
- `POST /api/positions/preview` - Preview a position before submission
- `POST /api/positions/submit` - Submit orders to Alpaca

### Scripts

Execute trading scripts directly:

```bash
# Run equity orders based on current signals
node scripts/execute-equity-now.mjs

# Run options spreads based on current signals
node scripts/execute-options-now.mjs
```

## Risk Management

All trades pass through validation before execution:

- **Max Loss Cap:** $500 per trade
- **Position Limits:** Max 3 concurrent positions
- **Spread Validation:** Verifies buy/sell strike relationships
- **Account Balance:** Ensures sufficient buying power

Blocked trades are logged with reasoning for audit purposes.

## Data Sources

### GDELT 2.0 Document API
- Real-time global news events
- Filtered for tariff, trade policy, and supply chain disruptions
- Free, no API key required
- Rate-limited to prevent abuse

### Alpaca Markets
- Paper Trading API for safe testing
- Real-time market data
- Options trading support
- No real money at risk

## Project Structure

```
├── app/
│   ├── api/              # Next.js API routes
│   ├── page.tsx          # Main dashboard (live data)
│   └── layout.tsx        # Root layout
├── lib/
│   ├── signals/          # GDELT signal ingestion
│   ├── risk/             # Risk management gate
│   ├── positions/        # Options spread builder
│   ├── audit/            # Audit logging
│   ├── pnl/              # P&L calculator
│   ├── alpaca/           # Alpaca SDK wrapper
│   └── alpaca-cli/       # Alpaca CLI wrapper
├── data/
│   └── audit-log.json    # Decision audit trail
├── scripts/
│   ├── execute-equity-now.mjs    # Execute equity orders
│   └── execute-options-now.mjs   # Execute option spreads
└── components/
    └── ui/               # Reusable UI components
```

## Documentation

- **[PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md)** - Detailed technical architecture
- **[LIVE_DATA_INTEGRATION.md](./LIVE_DATA_INTEGRATION.md)** - Dashboard data wiring details
- **[DEMO_QUICK_REFERENCE.md](./DEMO_QUICK_REFERENCE.md)** - Quick reference for demos
- **[HONEST_SUBMISSION_REPORT.md](./HONEST_SUBMISSION_REPORT.md)** - Hackathon submission report
- **[LIVE_TRADING_EVIDENCE.md](./LIVE_TRADING_EVIDENCE.md)** - Evidence of live trading activity

## Real Trading Evidence

This system has executed **9 real orders** on Alpaca paper account:
- 5 equity orders (XLE, SMH, EEM, TLT, NUE)
- 4 multi-leg option spreads (bear put / bull call debits)

All orders logged in `data/audit-log.json` with timestamps, reasoning, and outcomes.

## Roadmap

- [ ] Add Freightos freight rate signals
- [ ] Implement WebSocket live quotes
- [ ] Add historical P&L charting
- [ ] Calculate days to expiry for options
- [ ] Add position detail drill-down views
- [ ] Implement backtesting framework
- [ ] Add email/SMS alerts for signals

## License

MIT License - See [LICENSE](./LICENSE) for details

## Contributing

This is a hackathon project. Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Disclaimer

⚠️ **This is a demonstration project using paper trading only.**

- Not financial advice
- No real money involved
- For educational purposes
- Not suitable for production trading without significant enhancements

## Contact

Project created for hackathon demonstration purposes.

---

**Built with ❤️ for algorithmic trading enthusiasts**
