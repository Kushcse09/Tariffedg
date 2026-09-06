# TariffEdge - Alpaca AI Trading Agents Hackathon Submission

The only submission trading tariff and trade policy signals instead of traditional price/volume/IV signals.

**Live Dashboard:** https://tariffedge-main.vercel.app/
**Status:** Live · Paper Trading

## What Makes This Different

While other submissions likely trade momentum, mean-reversion, or options Greeks, TariffEdge trades macro-economic policy shifts — tariff announcements, trade negotiations, supply chain disruptions — converted into directional equity and options positions.

- **Signal Source:** GDELT 2.0 global news API (real-time trade policy events)
- **Alpaca Account:** PA331I6VA51Z (paper trading)
- **Unique Approach:** Geopolitical events → US equity/ETF positions

## Overview

TariffEdge monitors global trade policy events through GDELT and automatically generates trading signals for US-listed equities and ETFs. Each signal passes through a risk management gate before submission to Alpaca's paper trading platform.

## Current Status (Honest Assessment)

**What Works:**
- **Real-time Signal Ingestion** – GDELT 2.0 API for global tariff & trade policy news (7 live signals as of last check: XLE, EEM, ZIM, NUE, AAPL, TLT and others)
- **Intelligent Ticker Mapping** – Maps news events to US tickers (XLE, SMH, EEM, TLT, NUE, ZIM) via keyword matching
- **Risk Management Gate** – Validation system with a complete audit trail; every decision logged as PASSED or BLOCKED with a plain-English reason and a unique ID
- **Order Fills** – Orders have filled. Account equity is currently $99,822.95, down $177.05 (-0.18%) from the $100,000 starting balance
- **Live Dashboard** – Real-time positions, signals, and decision timeline pulling directly from the Alpaca API

**Open Positions (as of last check):**

| Ticker | Type | Entry | Mark | Unrealized P&L |
|---|---|---|---|---|
| EEM | Spread | $68.12 | $68.95 | -$64.60 (-9.5%) |
| NUE | Equity* | $264.22 | $261.07 | -$12.61 (-1.2%) |
| SMH | Spread | $559.68 | $567.10 | -$57.14 (-3.4%) |
| TLT | Spread | $82.73 | $82.60 | -$5.53 (-1.3%) |

\*See "Known Issues" below — this position needs a decision before final submission.

**Decision Timeline (sample):**
- TLT option spread — Bullish TLT: risk-off rotation into treasuries → Bull call debit spread → **PASSED**
- EEM option spread — Bearish EEM: retaliatory trade measures hurt EM growth → Bear put debit spread → **PASSED**
- SMH option spread — Bearish SMH: chip export ban reduces semiconductor ETF revenue → Bear put debit spread → **PASSED**
- XLE option spread — Bearish XLE: tariff escalation disrupts energy supply chains → Bear put debit spread → **PASSED**
- NUE option spread — Bullish NUE: steel tariffs favor domestic producers → Bull call debit spread → **BLOCKED**

**What Doesn't Work Yet / Known Issues:**
- Portfolio is net negative so far this session (-0.18%); the strategy has not yet turned a profit over the judged window
- The NUE option spread shown above was **BLOCKED** by the risk gate, but a bare NUE **equity** position is currently open instead. The hackathon rules require every strategy to incorporate options trading — this needs to be resolved before final submission, either by closing the equity leg, replacing it with an options structure, or documenting why it exists (e.g. as a covered-call equity leg) if that's the intent
- "Time to expiry" is not currently rendering on the dashboard for open positions (display bug, not a data issue — the underlying expiry data exists in Alpaca)
- CLI Execution – SDK fallback used (Alpaca CLI requires Go, which was not installed in the build environment)

## Key Features

- Novel Signal Source - Only hackathon submission trading tariff/trade policy signals
- Risk-First Architecture - Risk gate validation before submission, with PASSED/BLOCKED outcomes logged
- Complete Audit Trail - Every decision logged with reasoning, timestamp, and a unique ID
- Multi-leg Options Support - Bear put and bull call debit spreads
- Live Integration - Real Alpaca account data, not simulated

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

## Components

**Signal Ingestion** (`lib/signals/`)
- Fetches tariff/trade news from GDELT
- Maps events to tickers using keyword matching
- Deduplicates and sorts by recency

**Risk Management** (`lib/risk/`)
- Validates max loss per trade ($500 cap)
- Checks position concentration limits
- Validates option spread parameters
- Logs PASSED/BLOCKED decisions

**Position Builder** (`lib/positions/`)
- Fetches option chains from Alpaca
- Constructs bull/bear call/put spreads
- Calculates max loss and breakevens
- Submits multi-leg orders

**Audit Logger** (`lib/audit/`)
- Records every signal → decision → execution path
- Stores reasoning for PASSED/BLOCKED outcomes
- Provides audit trail for dashboard

**Dashboard** (`app/page.tsx`)
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
git clone https://github.com/Kushcse09/Tariffedg.git
cd Tariffedg

# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your Alpaca credentials
```

### Environment Variables

```
ALPACA_API_KEY=your_paper_trading_key
ALPACA_SECRET_KEY=your_paper_trading_secret
ALPACA_BASE_URL=https://paper-api.alpaca.markets
```

Get your Alpaca Paper Trading credentials from: https://alpaca.markets/

### Run Development Server

```bash
pnpm dev
```

Open http://localhost:3000 to view the dashboard.

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
- **Decision Timeline** - Audit trail showing PASSED/BLOCKED outcomes with reasoning

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

**GDELT 2.0 Document API**
- Real-time global news events
- Filtered for tariff, trade policy, and supply chain disruptions
- Free, no API key required
- Rate-limited to prevent abuse

**Alpaca Markets**
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

- `HACKATHON_SUBMISSION.md` - Primary hackathon submission write-up
- `GROUND_TRUTH_RECONCILIATION.md` - Alpaca API audit and ground truth verification
- `SUBMISSION_CHECKLIST.md` - Submission verification and checklist
- `PROJECT_SUMMARY.md` - Complete technical architecture and implementation summary

## Hackathon Submission Evidence

**Alpaca Account:** PA331I6VA51Z (paper trading)

**Ground Truth (updated):**
- Starting Balance: $100,000
- Current Equity: $99,822.95
- Unrealized P&L: -$177.05 (-0.18%)
- Open Positions: 5 (EEM Spread, NUE Equity, SMH Spread, TLT Spread, plus 1 additional)
- Audit Trail: Decision log includes both PASSED and BLOCKED outcomes with full reasoning per entry (see `data/audit-log.json`)

See `HACKATHON_SUBMISSION.md` and `GROUND_TRUTH_RECONCILIATION.md` for complete details.

## Roadmap

- [ ] Resolve the NUE equity-vs-options discrepancy noted above
- [ ] Fix "time to expiry" rendering on the dashboard
- [ ] Add Freightos freight rate signals
- [ ] Implement WebSocket live quotes
- [ ] Add historical P&L charting
- [ ] Add position detail drill-down views
- [ ] Implement backtesting framework
- [ ] Add email/SMS alerts for signals

## License

MIT License - See LICENSE for details

## Contributing

This is a hackathon project. Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Disclaimer

**WARNING: This is a demonstration project using paper trading only.**

- Not financial advice
- No real money involved
- For educational purposes
- Not suitable for production trading without significant enhancements

## Contact

Project created for hackathon demonstration purposes.

Built for algorithmic trading enthusiasts.
