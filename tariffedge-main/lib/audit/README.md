# Audit Logger Module

This module logs all trading decisions to a persistent audit log. Schema matches the frontend Decision Timeline component.

## Audit Log Entry

```typescript
interface AuditLogEntry {
  time: string;           // HH:mm format
  trigger: string;        // e.g., "XLE signal ingested"
  thesis: string;         // Trade rationale
  risk: "PASSED" | "BLOCKED";
  tone: "positive" | "negative";
  order: string;          // Order ID or "—"
  ticker: string;
  signalText: string;
  signalSource: string;
  riskReason: string | null;
  submittedAt: string;    // ISO timestamp
}
```

## Usage

```typescript
import { logDecision, getRecentAuditLog } from "@/lib/audit";

// Log a decision
await logDecision({
  signal,
  spread,
  riskResult,
  orderId, // Optional - omit if blocked
});

// Get recent entries
const entries = await getRecentAuditLog(50);
entries.forEach(entry => {
  console.log(`${entry.time} - ${entry.ticker} ${entry.risk}`);
});
```

## Storage

Audit log is stored at `/data/audit-log.json` (excluded from git).

Every decision (passed or blocked) produces exactly one log entry.

## API Endpoint

```bash
GET /api/audit?limit=50
```

Returns recent audit log entries for the frontend Decision Timeline component.
