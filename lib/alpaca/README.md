# Alpaca Paper Trading Integration

This module provides a backend foundation for Alpaca paper trading integration.

## Setup

1. **Get Alpaca Paper Trading Credentials**
   - Sign up at [Alpaca](https://alpaca.markets)
   - Navigate to your [Paper Trading Dashboard](https://app.alpaca.markets/paper/dashboard/overview)
   - Generate API keys (Key ID and Secret Key)

2. **Configure Environment Variables**
   
   Create a `.env.local` file in the project root:
   
   ```bash
   ALPACA_API_KEY=your_api_key_here
   ALPACA_SECRET_KEY=your_secret_key_here
   ALPACA_BASE_URL=https://paper-api.alpaca.markets
   ```
   
   **Important:** Never commit your `.env.local` file. It's already in `.gitignore`.

## Module Structure

```
lib/alpaca/
├── client.ts       # Alpaca client initialization with credential validation
├── account.ts      # Account status functions (equity, buying power, etc.)
├── testOrder.ts    # Test order placement and cancellation
└── index.ts        # Public exports
```

## Usage

### Get Account Status

```typescript
import { getAccountStatus } from "@/lib/alpaca";

const status = await getAccountStatus();
console.log(status.equity);        // Total account value
console.log(status.buyingPower);   // Available buying power
console.log(status.cash);          // Cash balance
```

### Place Test Order

```typescript
import { placeTestOrder } from "@/lib/alpaca";

const result = await placeTestOrder();
// Places a small SPY order well below market, then cancels it
console.log(result.orderId);    // Created order ID
console.log(result.cancelled);  // Whether cancellation succeeded
```

### Direct Client Access

```typescript
import { getAlpacaClient } from "@/lib/alpaca";

const alpaca = getAlpacaClient();
const positions = await alpaca.trading.positions.getAllOpenPositions();
```

## API Endpoints

### GET /api/alpaca/status

Returns paper trading account status.

**Response:**
```json
{
  "success": true,
  "data": {
    "equity": "100000.00",
    "buyingPower": "100000.00",
    "cash": "100000.00",
    "status": "ACTIVE",
    "accountNumber": "PA...",
    "portfolioValue": "100000.00"
  }
}
```

### POST /api/alpaca/test-order

Places and cancels a test order to verify the connection.

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "orderId": "...",
    "clientOrderId": "test-...",
    "symbol": "SPY",
    "message": "Test order placed and cancelled successfully",
    "cancelled": true
  }
}
```

## Security Notes

- **Paper Trading Only:** The module enforces paper trading and will throw an error if you try to use live endpoints
- **No Hardcoded Credentials:** All credentials are read from environment variables
- **Environment Validation:** Missing or invalid credentials produce clear error messages

## Testing the Integration

1. Set up your `.env.local` with valid paper trading credentials
2. Start the dev server: `pnpm dev`
3. Test the connection:
   ```bash
   curl http://localhost:3000/api/alpaca/status
   ```
4. Test order flow:
   ```bash
   curl -X POST http://localhost:3000/api/alpaca/test-order
   ```
5. Check your [Alpaca Paper Trading Dashboard](https://app.alpaca.markets/paper/dashboard/overview) to see the test order in your activity log

## Next Steps

This is the backend foundation. To integrate with your frontend:

1. Call `/api/alpaca/status` from your components to display real account data
2. Build order submission flows using the Alpaca client
3. Add real-time updates using Alpaca's WebSocket streams
4. Replace mock data in Signal Feed, Positions, and Decision Timeline with real data

## Documentation

- [Alpaca TypeScript SDK Docs](https://alpacahq.github.io/alpaca-trade-api-js/)
- [Alpaca API Reference](https://docs.alpaca.markets/reference/)
- [Paper Trading Guide](https://docs.alpaca.markets/docs/about-paper-trading)
