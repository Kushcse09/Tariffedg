/**
 * execute-options-now.mjs  (v2 — fixed)
 *
 * TariffEdge Hackathon — OPTIONS vertical spread execution
 * Uses LIMIT orders (accepted pre-market, fill at open).
 * Zero npm dependencies — Node built-in fetch() only.
 *
 * Run:  node --env-file=.env.local scripts/execute-options-now.mjs
 */

import { promises as fsp } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..');
const AUDIT_LOG = path.join(ROOT, 'data', 'audit-log.json');

const API_KEY    = process.env.ALPACA_API_KEY;
const SECRET_KEY = process.env.ALPACA_SECRET_KEY;
const TRADE_URL  = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';
const DATA_URL   = 'https://data.alpaca.markets';

if (!API_KEY || !SECRET_KEY) {
  console.error('ERROR: Set ALPACA_API_KEY and ALPACA_SECRET_KEY');
  process.exit(1);
}

const HEADERS = {
  'APCA-API-KEY-ID':     API_KEY,
  'APCA-API-SECRET-KEY': SECRET_KEY,
  'Content-Type':        'application/json',
};

// ── REST helpers ─────────────────────────────────────────────────────────

async function tradeGet(ep) {
  const r = await fetch(`${TRADE_URL}${ep}`, { headers: HEADERS });
  if (!r.ok) throw new Error(`GET ${ep} -> ${r.status}: ${await r.text()}`);
  return r.json();
}

async function tradePost(ep, body) {
  const r = await fetch(`${TRADE_URL}${ep}`, {
    method: 'POST', headers: HEADERS, body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`POST ${ep} -> ${r.status}: ${JSON.stringify(d)}`);
  return d;
}

async function dataGet(ep) {
  const r = await fetch(`${DATA_URL}${ep}`, { headers: HEADERS });
  if (!r.ok) throw new Error(`DATA GET ${ep} -> ${r.status}: ${await r.text()}`);
  return r.json();
}

// ── Signals ──────────────────────────────────────────────────────────────

const SIGNALS = [
  { ticker: 'XLE', direction: 'bearish',
    text: 'US oil import tariffs escalate - energy sector disruption',
    thesis: 'Bearish XLE: tariff escalation disrupts energy supply chains. Bear put debit spread.' },
  { ticker: 'SMH', direction: 'bearish',
    text: 'Chip export restrictions to China - semiconductor disruption risk',
    thesis: 'Bearish SMH: chip export ban reduces semiconductor ETF revenue. Bear put debit spread.' },
  { ticker: 'EEM', direction: 'bearish',
    text: 'Retaliatory tariffs from emerging markets - EM risk-off',
    thesis: 'Bearish EEM: retaliatory trade measures hurt EM growth. Bear put debit spread.' },
  { ticker: 'TLT', direction: 'bullish',
    text: 'Trade war escalates - safe haven treasury bond rally',
    thesis: 'Bullish TLT: risk-off rotation into treasuries. Bull call debit spread.' },
  { ticker: 'NUE', direction: 'bullish',
    text: 'US Section 232 steel tariffs maintained - domestic steel benefits',
    thesis: 'Bullish NUE: steel tariffs favor domestic producers. Bull call debit spread.' },
];

// ── Risk Gate ────────────────────────────────────────────────────────────

const RISK = { MAX_LOSS: 500, MAX_POS: 10, DAILY_CAP: 1500 };

async function checkRisk(ticker, maxLoss) {
  const [acct, positions] = await Promise.all([
    tradeGet('/v2/account'), tradeGet('/v2/positions'),
  ]);
  const eq  = parseFloat(acct.equity || '0');
  const leq = parseFloat(acct.last_equity || String(eq));
  const dpnl = eq - leq;

  if (maxLoss > RISK.MAX_LOSS)
    return { passed: false, reason: `Max loss $${maxLoss} > $${RISK.MAX_LOSS} cap` };
  console.log(`    [RISK 1/4] Max loss OK: $${maxLoss}`);

  const optTickers = positions.filter(p =>
    p.asset_class === 'option' || (p.symbol && p.symbol.length > 10)
  ).map(p => { const m = p.symbol.match(/^([A-Z]+)\d/); return m ? m[1] : p.symbol; });
  if (optTickers.includes(ticker))
    return { passed: false, reason: `Duplicate option position: ${ticker}` };
  console.log(`    [RISK 2/4] No duplicate: ${ticker}`);

  if (dpnl < 0 && Math.abs(dpnl) >= RISK.DAILY_CAP)
    return { passed: false, reason: `Daily loss cap: -$${Math.abs(dpnl).toFixed(2)}` };
  console.log(`    [RISK 3/4] Daily PnL: $${dpnl.toFixed(2)}`);

  if (positions.length >= RISK.MAX_POS)
    return { passed: false, reason: `Max positions (${RISK.MAX_POS}) reached` };
  console.log(`    [RISK 4/4] Positions: ${positions.length}/${RISK.MAX_POS}`);

  return { passed: true, reason: null };
}

// ── Audit Logger ─────────────────────────────────────────────────────────

async function appendAudit(entry) {
  await fsp.mkdir(path.dirname(AUDIT_LOG), { recursive: true });
  let existing = [];
  try { existing = JSON.parse(await fsp.readFile(AUDIT_LOG, 'utf-8')); } catch {}
  existing.push(entry);
  await fsp.writeFile(AUDIT_LOG, JSON.stringify(existing, null, 2), 'utf-8');
  console.log('    [AUDIT] Written');
}

// ── Option Chain ─────────────────────────────────────────────────────────

function dateStr(d) { return d.toISOString().split('T')[0]; }

async function getOptionContracts(ticker, type, minDTE, maxDTE) {
  const now = new Date();
  const minDate = new Date(now.getTime() + minDTE * 86400000);
  const maxDate = new Date(now.getTime() + maxDTE * 86400000);

  let all = [];
  let pageToken = null;
  let page = 0;

  do {
    let url = `/v2/options/contracts?underlying_symbols=${ticker}`
      + `&status=active&type=${type}`
      + `&expiration_date_gte=${dateStr(minDate)}`
      + `&expiration_date_lte=${dateStr(maxDate)}`
      + `&limit=100`;
    if (pageToken) url += `&page_token=${pageToken}`;

    const resp = await tradeGet(url);
    const contracts = resp.option_contracts || [];
    if (Array.isArray(contracts)) all = all.concat(contracts);

    pageToken = resp.next_page_token || null;
    page++;
  } while (pageToken && page < 10);

  return all.filter(c => c.tradable !== false);
}

// ── Underlying Price ─────────────────────────────────────────────────────

async function getPrice(ticker) {
  try {
    const data = await dataGet(`/v2/stocks/${ticker}/quotes/latest?feed=iex`);
    const q = data.quote || data;
    const mid = ((q.bp || 0) + (q.ap || 0)) / 2;
    if (mid > 0) return mid;
    const bars = await dataGet(`/v2/stocks/${ticker}/bars/latest?feed=iex`);
    return (bars.bar || bars).c || 0;
  } catch (e) {
    console.warn(`    Price error for ${ticker}: ${e.message}`);
    return 0;
  }
}

// ── Spread Builder (v2: single-expiry, max width $5) ─────────────────────

function buildSpread(ticker, direction, contracts, underlyingPrice) {
  if (!contracts.length || !underlyingPrice) return null;

  // FIX v2: Group by expiration, pick the one with most ATM strikes
  const byExpiry = {};
  for (const c of contracts) {
    const exp = c.expiration_date;
    if (!byExpiry[exp]) byExpiry[exp] = [];
    byExpiry[exp].push(c);
  }

  // Pick expiry with most contracts near ATM (within 20% of price)
  let bestExpiry = null;
  let bestCount = 0;
  for (const [exp, cs] of Object.entries(byExpiry)) {
    const nearATM = cs.filter(c => {
      const s = parseFloat(c.strike_price);
      return Math.abs(s - underlyingPrice) / underlyingPrice < 0.20;
    });
    if (nearATM.length > bestCount) {
      bestCount = nearATM.length;
      bestExpiry = exp;
    }
  }
  if (!bestExpiry) return null;

  const expiryContracts = byExpiry[bestExpiry];
  console.log(`    Using expiry: ${bestExpiry} (${expiryContracts.length} contracts)`);

  // Get unique strikes sorted
  const strikes = [...new Set(expiryContracts.map(c => parseFloat(c.strike_price)))]
    .filter(s => s > 0).sort((a, b) => a - b);

  if (strikes.length < 2) return null;

  // Find ATM
  let atmIdx = 0;
  let minDist = Infinity;
  for (let i = 0; i < strikes.length; i++) {
    const dist = Math.abs(strikes[i] - underlyingPrice);
    if (dist < minDist) { minDist = dist; atmIdx = i; }
  }

  // Try to find a spread with width <= $5 (max loss <= $500)
  let buyStrike, sellStrike;

  if (direction === 'bearish') {
    // Bear PUT debit: buy higher strike put, sell lower strike put
    // Try ATM as buy, find the closest lower strike with width <= 5
    for (let gap = 1; gap <= 5 && atmIdx - gap >= 0; gap++) {
      const candidate = strikes[atmIdx - gap];
      const width = strikes[atmIdx] - candidate;
      if (width <= 5) {
        buyStrike = strikes[atmIdx];
        sellStrike = candidate;
        break;
      }
    }
    // If ATM is at index 0, use ATM as sell, next up as buy
    if (!buyStrike && atmIdx < strikes.length - 1) {
      buyStrike = strikes[atmIdx + 1];
      sellStrike = strikes[atmIdx];
      if (buyStrike - sellStrike > 5) return null;
    }
  } else {
    // Bull CALL debit: buy lower strike call, sell higher strike call
    for (let gap = 1; gap <= 5 && atmIdx + gap < strikes.length; gap++) {
      const candidate = strikes[atmIdx + gap];
      const width = candidate - strikes[atmIdx];
      if (width <= 5) {
        buyStrike = strikes[atmIdx];
        sellStrike = candidate;
        break;
      }
    }
    if (!buyStrike && atmIdx > 0) {
      buyStrike = strikes[atmIdx - 1];
      sellStrike = strikes[atmIdx];
      if (sellStrike - buyStrike > 5) return null;
    }
  }

  if (!buyStrike || !sellStrike) return null;

  const width = Math.abs(sellStrike - buyStrike);
  const maxLoss = width * 100;

  // Find contract objects (SAME expiry guaranteed)
  const buyContract  = expiryContracts.find(c => parseFloat(c.strike_price) === buyStrike);
  const sellContract = expiryContracts.find(c => parseFloat(c.strike_price) === sellStrike);
  if (!buyContract || !sellContract) return null;

  return {
    ticker, direction,
    spreadType: direction === 'bearish' ? 'bear_put_debit' : 'bull_call_debit',
    optionType: direction === 'bearish' ? 'put' : 'call',
    buySymbol:  buyContract.symbol,
    sellSymbol: sellContract.symbol,
    buyStrike, sellStrike, width, maxLoss,
    expiry: bestExpiry,
    // FIX v2: limit price = width (guarantees fill, max possible cost)
    limitPrice: width.toFixed(2),
  };
}

// ── Submit mleg Order (v2: LIMIT instead of MARKET) ─────────────────────

async function submitSpread(spread) {
  const clientOrderId = `te-opt-${Date.now()}-${spread.ticker.toLowerCase()}`;

  // Primary: mleg limit order
  const mlegPayload = {
    order_class:   'mleg',
    type:          'limit',
    time_in_force: 'day',
    qty:           '1',
    limit_price:   spread.limitPrice,
    legs: [
      {
        symbol:          spread.buySymbol,
        side:            'buy',
        ratio_qty:       '1',
        position_intent: 'buy_to_open',
      },
      {
        symbol:          spread.sellSymbol,
        side:            'sell',
        ratio_qty:       '1',
        position_intent: 'sell_to_open',
      },
    ],
  };

  console.log(`    [MLEG LIMIT] BUY ${spread.buySymbol} / SELL ${spread.sellSymbol} @ $${spread.limitPrice}`);

  try {
    const order = await tradePost('/v2/orders', mlegPayload);
    console.log(`    [MLEG] OK: ${order.id} (${order.status})`);
    return { success: true, orderId: order.id, method: 'mleg_limit', status: order.status };
  } catch (e) {
    console.warn(`    [MLEG] Failed: ${e.message}`);

    // Fallback 1: try market order (works during market hours)
    console.log('    [FALLBACK] Trying mleg market order...');
    try {
      const mktPayload = { ...mlegPayload, type: 'market' };
      delete mktPayload.limit_price;
      const order = await tradePost('/v2/orders', mktPayload);
      console.log(`    [MLEG MKT] OK: ${order.id} (${order.status})`);
      return { success: true, orderId: order.id, method: 'mleg_market', status: order.status };
    } catch (e2) {
      console.warn(`    [MLEG MKT] Failed: ${e2.message}`);
    }

    // Fallback 2: individual limit legs
    console.log('    [FALLBACK] Trying individual leg limit orders...');
    try {
      const leg1 = await tradePost('/v2/orders', {
        symbol: spread.buySymbol, qty: '1', side: 'buy',
        type: 'limit', time_in_force: 'day',
        limit_price: spread.limitPrice,
        client_order_id: clientOrderId + '-buy',
      });
      console.log(`    [LEG1 BUY]  ${leg1.id} (${leg1.status})`);

      const leg2 = await tradePost('/v2/orders', {
        symbol: spread.sellSymbol, qty: '1', side: 'sell',
        type: 'limit', time_in_force: 'day',
        limit_price: '0.01',
        client_order_id: clientOrderId + '-sell',
      });
      console.log(`    [LEG2 SELL] ${leg2.id} (${leg2.status})`);

      return {
        success: true,
        orderId: `${leg1.id}+${leg2.id}`,
        method: 'individual_limit_legs',
        status: `${leg1.status}/${leg2.status}`,
      };
    } catch (e3) {
      return { success: false, error: e3.message, method: 'all_failed' };
    }
  }
}

// ── Main with Retry ──────────────────────────────────────────────────────

const MAX_RETRIES  = 30;
const RETRY_DELAY  = 60000;

async function main() {
  console.log('\n===================================================');
  console.log('  TariffEdge: OPTIONS Spread Execution (v2)');
  console.log('  Limit orders | Single-expiry | Width <= $5');
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log('===================================================\n');

  const acct = await tradeGet('/v2/account');
  const eq0  = parseFloat(acct.equity || '0');
  console.log(`Account: ${acct.account_number} | Equity: $${eq0.toLocaleString()} | Status: ${acct.status}\n`);

  // Get underlying prices
  console.log('Fetching underlying prices...');
  const prices = {};
  for (const s of SIGNALS) {
    prices[s.ticker] = await getPrice(s.ticker);
    console.log(`  ${s.ticker}: $${prices[s.ticker].toFixed(2)}`);
  }
  console.log('');

  // Retry loop: fetch option chains
  let spreads = [];
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    attempt++;
    console.log(`--- Option chain attempt ${attempt}/${MAX_RETRIES} ---`);
    spreads = [];

    for (const s of SIGNALS) {
      const optType = s.direction === 'bearish' ? 'put' : 'call';
      console.log(`  ${s.ticker} (${optType}s, ${s.direction})...`);

      try {
        // DTE range: 20-75 days out (wider than 30-60 for more contract availability)
        const contracts = await getOptionContracts(s.ticker, optType, 20, 75);
        console.log(`    Found ${contracts.length} ${optType} contracts`);

        if (contracts.length >= 2) {
          const spread = buildSpread(s.ticker, s.direction, contracts, prices[s.ticker]);
          if (spread) {
            console.log(`    Spread: BUY $${spread.buyStrike} / SELL $${spread.sellStrike}`);
            console.log(`    Width=$${spread.width} MaxLoss=$${spread.maxLoss} Limit=$${spread.limitPrice} Exp=${spread.expiry}`);
            spreads.push({ signal: s, spread });
          } else {
            console.log('    Could not build spread (no strikes within $5 width)');
          }
        }
      } catch (e) {
        console.log(`    Chain error: ${e.message}`);
      }
    }

    if (spreads.length > 0) {
      console.log(`\n${spreads.length} spreads ready. Submitting...\n`);
      break;
    }

    if (attempt < MAX_RETRIES) {
      console.log(`\nNo spreads available. Retrying in 60s... (${attempt}/${MAX_RETRIES})\n`);
      await new Promise(r => setTimeout(r, RETRY_DELAY));
      for (const s of SIGNALS) {
        try { prices[s.ticker] = await getPrice(s.ticker); } catch {}
      }
    }
  }

  if (spreads.length === 0) {
    console.error('ERROR: No spreads after all retries.');
    process.exit(1);
  }

  // Submit spreads
  const results = [];

  for (let i = 0; i < spreads.length; i++) {
    const { signal, spread } = spreads[i];
    const ts = new Date().toISOString();

    console.log(`=== Spread ${i+1}/${spreads.length}: ${spread.ticker} ${spread.spreadType} ===`);
    console.log(`  ${spread.optionType.toUpperCase()} spread: BUY ${spread.buySymbol} / SELL ${spread.sellSymbol}`);
    console.log(`  Strikes: $${spread.buyStrike}/$${spread.sellStrike} | Width: $${spread.width} | MaxLoss: $${spread.maxLoss} | Limit: $${spread.limitPrice}`);

    // Risk gate
    let risk;
    try { risk = await checkRisk(spread.ticker, spread.maxLoss); }
    catch (e) { risk = { passed: false, reason: `Risk error: ${e.message}` }; }

    if (!risk.passed) {
      console.warn(`    [RISK] BLOCKED: ${risk.reason}`);
      await appendAudit({
        time: ts.substring(11, 16), trigger: `${spread.ticker} option spread`,
        thesis: signal.thesis, risk: 'BLOCKED', tone: 'negative', order: '-',
        ticker: spread.ticker, signalText: signal.text, signalSource: 'GDELT',
        riskReason: risk.reason, submittedAt: ts,
        executionPath: 'options_rest_fallback',
        spreadType: spread.spreadType,
        buySymbol: spread.buySymbol, sellSymbol: spread.sellSymbol,
        maxLoss: spread.maxLoss,
      });
      results.push({ ticker: spread.ticker, ok: false, blocked: true, reason: risk.reason });
      console.log('');
      continue;
    }

    // Submit
    const orderResult = await submitSpread(spread);

    await appendAudit({
      time: ts.substring(11, 16), trigger: `${spread.ticker} option spread`,
      thesis: signal.thesis, risk: 'PASSED',
      tone: orderResult.success ? 'positive' : 'negative',
      order: orderResult.orderId || '-',
      ticker: spread.ticker, signalText: signal.text, signalSource: 'GDELT',
      riskReason: null, submittedAt: ts,
      executionPath: 'options_rest_fallback',
      spreadType: spread.spreadType,
      buySymbol: spread.buySymbol, sellSymbol: spread.sellSymbol,
      maxLoss: spread.maxLoss,
      orderMethod: orderResult.method,
    });

    results.push({
      ticker: spread.ticker, ok: orderResult.success,
      oid: orderResult.orderId, method: orderResult.method,
      status: orderResult.status, err: orderResult.error,
      spread: `$${spread.buyStrike}/$${spread.sellStrike} ${spread.optionType}`,
    });

    if (i < spreads.length - 1) await new Promise(r => setTimeout(r, 1000));
    console.log('');
  }

  // ── Final Summary ────────────────────────────────────────────────────

  console.log('===================================================');
  console.log('  FINAL OPTIONS SUMMARY');
  console.log('===================================================');

  try {
    const [fa, pos, ords] = await Promise.all([
      tradeGet('/v2/account'),
      tradeGet('/v2/positions'),
      tradeGet('/v2/orders?status=all&limit=30'),
    ]);
    const eq1 = parseFloat(fa.equity || '0');
    console.log(`\nAccount:        ${fa.account_number}`);
    console.log(`Equity:         $${eq1.toLocaleString()}`);
    console.log(`Session PnL:    ${eq1 - eq0 >= 0 ? '+' : ''}$${(eq1 - eq0).toFixed(2)}`);
    console.log(`Open positions: ${pos.length}`);

    const optOrders = ords.filter(o =>
      o.order_class === 'mleg' || (o.symbol && o.symbol.length > 10)
    );
    if (optOrders.length > 0) {
      console.log('\nOption orders:');
      optOrders.forEach(o => {
        if (o.legs) {
          console.log(`  [${o.status}] mleg id=${o.id}`);
          o.legs.forEach(l => console.log(`    ${l.side.padEnd(5)} ${l.symbol} ratio=${l.ratio_qty} ${l.status || ''}`));
        } else {
          console.log(`  [${o.status}] ${o.symbol} ${o.side} qty=${o.qty} id=${o.id}`);
        }
      });
    }
  } catch (e) {
    console.warn('Could not fetch final status:', e.message);
  }

  const ok = results.filter(r => r.ok);
  const bl = results.filter(r => r.blocked);
  const er = results.filter(r => !r.ok && !r.blocked);

  console.log(`\nOptions submitted: ${ok.length}`);
  console.log(`Risk-blocked:      ${bl.length}`);
  console.log(`Errors:            ${er.length}`);
  console.log('Execution path:    options_rest_fallback');
  console.log('');
  results.forEach(r => {
    const tag = r.ok ? 'SUBMITTED' : r.blocked ? 'BLOCKED' : 'ERROR';
    console.log(`  [${tag}] ${r.ticker} ${r.spread || ''} ${r.oid || r.err || r.reason || ''}`);
    if (r.method) console.log(`         method=${r.method} status=${r.status || ''}`);
  });

  console.log('\nAudit log: data/audit-log.json');
  console.log('Dashboard: https://app.alpaca.markets/paper/dashboard/overview');
  console.log('');
}

main().catch(e => { console.error('Fatal:', e.message || e); process.exit(1); });
