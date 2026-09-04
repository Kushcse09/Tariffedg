# Risk Gate Module

This module validates spread orders against risk management rules before submission.

## Risk Checks (Enforced in Order)

1. **Max loss per spread:** ≤ $500 (hard stop)
2. **No duplicate ticker:** No existing open position on same ticker
3. **Daily loss cap:** Cumulative daily loss ≤ $1,500
4. **Max open positions:** ≤ 3 concurrent positions

## Usage

```typescript
import { checkRiskGate, getRiskStatus } from "@/lib/risk";

// Check if spread passes risk gate
const result = await checkRiskGate(spreadOrder);

if (result.passed) {
  console.log("✅ Risk gate passed - ready to submit");
} else {
  console.log(`❌ Risk gate blocked: ${result.reason}`);
}

// Get current risk metrics
const status = await getRiskStatus();
console.log(`Open positions: ${status.openPositions}/${status.maxPositions}`);
console.log(`Daily P&L: $${status.dailyPnL.toFixed(2)}`);
```

## Risk Gate Result

```typescript
interface RiskGateResult {
  passed: boolean;
  reason: string | null; // Block reason if passed = false
}
```

## Risk Status

```typescript
{
  openPositions: number;
  maxPositions: number;
  dailyPnL: number;
  dailyLossCap: number;
  maxLossPerSpread: number;
  positionTickers: string[];
}
```

## Configuration

From `steering/project.md`:
- Max loss per spread: $500
- Max open positions: 3
- Daily loss cap: $1,500

Edit `lib/risk/riskGate.ts` to change limits.
