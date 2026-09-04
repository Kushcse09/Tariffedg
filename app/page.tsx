import { ArrowUpRight, Circle } from 'lucide-react'

const signals = [
  { source: 'GDELT', time: '09:41:12', ticker: 'XLE', text: 'Middle East supply risk repriced across energy complex' },
  { source: 'US ITC', time: '09:38:46', ticker: 'CAT', text: 'Section 301 review expands to heavy machinery imports' },
  { source: 'FREIGHTOS', time: '09:34:08', ticker: 'ZIM', text: 'Asia–US West Coast index rises 11.4% week over week' },
  { source: 'GDELT', time: '09:29:51', ticker: 'EEM', text: 'Trade ministry signals targeted retaliatory measures' },
  { source: 'US ITC', time: '09:24:17', ticker: 'NUE', text: 'Steel quota utilization reaches highest monthly print' },
  { source: 'FREIGHTOS', time: '09:18:03', ticker: 'FDX', text: 'Transpacific air capacity tightens ahead of peak season' },
  { source: 'GDELT', time: '09:11:42', ticker: 'TLT', text: 'Treasury demand rises as tariff headline risk broadens' },
  { source: 'US ITC', time: '09:05:26', ticker: 'AAPL', text: 'Consumer electronics excluded from draft levy schedule' },
  { source: 'FREIGHTOS', time: '08:57:19', ticker: 'UPS', text: 'Parcel surcharge guidance revised for Q4 lanes' },
]

const positions = [
  { ticker: 'XLE', structure: 'Put Spread · Dec 19', entry: '$92.40', current: '$94.18', pnl: '+$1,240.00', pct: '+18.6%', days: '106d', tone: 'positive' },
  { ticker: 'CAT', structure: 'Call Spread · Nov 21', entry: '$12.85', current: '$10.40', pnl: '-$735.00', pct: '-19.1%', days: '78d', tone: 'negative' },
  { ticker: 'ZIM', structure: 'Put · Oct 17', entry: '$4.72', current: '$5.31', pnl: '+$590.00', pct: '+12.5%', days: '43d', tone: 'positive' },
]

const timeline = [
  { time: '09:41', trigger: 'XLE signal ingested', thesis: 'Supply shock probability crossed 68% threshold.', risk: 'PASSED', tone: 'positive', order: 'ORD-8F21A' },
  { time: '09:38', trigger: 'CAT position rechecked', thesis: 'Volatility expansion offsets weak directional edge.', risk: 'BLOCKED', tone: 'negative', order: 'ORD-8F1D2' },
  { time: '09:34', trigger: 'ZIM mark updated', thesis: 'Freight index confirms continued upside pressure.', risk: 'PASSED', tone: 'positive', order: 'ORD-8F1B8' },
  { time: '09:26', trigger: 'Exposure limit evaluated', thesis: 'Sector concentration remains within mandate.', risk: 'PASSED', tone: 'positive', order: '—' },
  { time: '09:18', trigger: 'Macro regime scan', thesis: 'Tariff escalation regime remains active.', risk: 'PASSED', tone: 'positive', order: '—' },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{children}</h2>
}

function SignalCard({ signal }: { signal: (typeof signals)[number] }) {
  return (
    <div className="flex flex-col gap-2 border-b border-border/70 py-4 first:pt-0 last:border-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium tracking-wide text-tertiary">{signal.source}</span>
        <span className="font-mono text-[11px] text-tertiary">{signal.time}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-primary">{signal.ticker}</span>
        <p className="text-sm leading-5 text-secondary">{signal.text}</p>
      </div>
    </div>
  )
}

function PositionCard({ position }: { position: (typeof positions)[number] }) {
  const positive = position.tone === 'positive'
  return (
    <article className="border-b border-border/70 pb-5 last:border-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><span className="font-mono text-lg font-medium text-foreground">{position.ticker}</span><span className="text-sm text-secondary">{position.structure}</span></div>
          <div className="mt-3 flex items-center gap-5 text-xs"><span className="text-tertiary">ENTRY <strong className="font-mono font-normal text-secondary">{position.entry}</strong></span><span className="text-tertiary">MARK <strong className="font-mono font-normal text-secondary">{position.current}</strong></span></div>
        </div>
        <div className="text-right"><p className={`font-mono text-base ${positive ? 'text-positive' : 'text-negative'}`}>{position.pnl}</p><p className={`mt-1 font-mono text-xs ${positive ? 'text-positive' : 'text-negative'}`}>{position.pct}</p></div>
      </div>
      <div className="mt-4"><span className="rounded border border-border px-1.5 py-1 font-mono text-[11px] text-tertiary">{position.days} TO EXPIRY</span></div>
    </article>
  )
}

export default function Page() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-border pb-5">
          <div className="flex items-center gap-4"><div className="flex items-center gap-2"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /><span className="text-lg font-semibold tracking-tight">TariffEdge</span></div><span className="hidden text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:block">Live · Paper Trading</span></div>
          <div className="text-right"><p className="font-mono text-2xl tracking-tight text-primary">$248,610.42</p><p className="mt-1 flex items-center justify-end gap-1 font-mono text-xs text-positive"><ArrowUpRight className="h-3.5 w-3.5" /> +$2,184.60 · +0.89%</p></div>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-6 py-6 lg:grid-cols-12">
          <section className="rounded-lg border border-border bg-card p-6 lg:col-span-4"><SectionLabel>Incoming Signals <span className="ml-1 font-mono text-tertiary">09</span></SectionLabel><div className="mt-5">{signals.map((signal) => <SignalCard key={`${signal.time}-${signal.ticker}`} signal={signal} />)}</div></section>
          <section className="rounded-lg border border-border bg-card p-6 lg:col-span-5"><SectionLabel>Open Positions <span className="ml-1 font-mono text-tertiary">03</span></SectionLabel><div className="mt-5 flex flex-col gap-5">{positions.map((position) => <PositionCard key={position.ticker} position={position} />)}</div><div className="mt-6 border-t border-border pt-5"><SectionLabel>Exposure</SectionLabel><table className="mt-4 w-full text-left text-xs"><thead className="text-tertiary"><tr><th className="pb-3 font-medium">TICKER</th><th className="pb-3 font-medium">SECTOR</th><th className="pb-3 text-right font-medium">SIGNALS</th></tr></thead><tbody className="font-mono text-secondary"><tr className="border-t border-border/60"><td className="py-3 text-foreground">XLE</td><td className="py-3 font-sans">Energy</td><td className="py-3 text-right">04</td></tr><tr className="border-t border-border/60"><td className="py-3 text-foreground">CAT</td><td className="py-3 font-sans">Industrials</td><td className="py-3 text-right">03</td></tr><tr className="border-t border-border/60"><td className="py-3 text-foreground">ZIM</td><td className="py-3 font-sans">Shipping</td><td className="py-3 text-right">02</td></tr></tbody></table></div></section>
          <section className="rounded-lg border border-border bg-card p-6 lg:col-span-3"><SectionLabel>Decision Timeline</SectionLabel><div className="relative mt-5"><div className="absolute bottom-2 left-[3px] top-2 w-px bg-border" />{timeline.map((item) => <div className="relative flex gap-3 pb-6 last:pb-0" key={`${item.time}-${item.trigger}`}><span className="relative mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-border ring-4 ring-card" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><span className="text-sm leading-5 text-secondary">{item.trigger}</span><span className="shrink-0 font-mono text-[10px] text-tertiary">{item.time}</span></div><p className="mt-1 text-xs italic leading-5 text-tertiary">{item.thesis}</p><div className="mt-2 flex items-center justify-between gap-2"><span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium tracking-wide ${item.tone === 'positive' ? 'border-positive/20 bg-positive/10 text-positive' : 'border-negative/20 bg-negative/10 text-negative'}`}>{item.risk}</span><span className="font-mono text-[10px] text-tertiary">{item.order}</span></div></div></div>)}</div></section>
        </div>
        <footer className="flex flex-col gap-2 border-t border-border py-4 text-xs text-tertiary sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><Circle className="h-2 w-2 fill-primary text-primary" /> <span>All systems nominal</span></div><div className="flex gap-4 font-mono"><span>LAST POLL 09:41:12 UTC</span><span>UPTIME 14D 06H 22M</span></div></footer>
      </div>
    </main>
  )
}

