'use client'

import { ArrowUpRight, Circle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Signal {
  source: string
  time: string
  ticker: string | null
  text: string
}

interface Position {
  ticker: string
  structure: string
  entry: string
  current: string
  pnl: string
  pct: string
  days: string
  tone: 'positive' | 'negative'
}

interface TimelineItem {
  time: string
  trigger: string
  thesis: string
  risk: string
  tone: 'positive' | 'negative'
  order: string
}

interface ExposureItem {
  ticker: string
  sector: string
  count: number
}

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
  const [signals, setSignals] = useState<Signal[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [exposure, setExposure] = useState<ExposureItem[]>([])
  const [equity, setEquity] = useState('0.00')
  const [equityChange, setEquityChange] = useState({ amount: '0.00', percent: '0.00', positive: true })
  const [loading, setLoading] = useState(true)
  const [lastPoll, setLastPoll] = useState<string>('')

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch all data in parallel
        const [signalsRes, auditRes, accountRes, pnlRes] = await Promise.all([
          fetch('/api/signals').then(r => r.json()),
          fetch('/api/audit?limit=20').then(r => r.json()),
          fetch('/api/alpaca/status').then(r => r.json()),
          fetch('/api/pnl').then(r => r.json()),
        ])

        // Process signals
        if (signalsRes.success && signalsRes.signals) {
          const mapped = signalsRes.signals
            .filter((s: any) => s.ticker) // Only show mapped signals
            .slice(0, 9) // Take top 9
            .map((s: any) => ({
              source: s.source,
              time: s.time,
              ticker: s.ticker,
              text: s.text,
            }))
          setSignals(mapped)
        }

        // Process audit log for timeline
        if (auditRes.success && auditRes.entries) {
          const timelineData = auditRes.entries.slice(0, 10).map((entry: any) => ({
            time: entry.time,
            trigger: entry.trigger,
            thesis: entry.thesis,
            risk: entry.risk,
            tone: entry.risk === 'PASSED' ? 'positive' as const : 'negative' as const,
            order: entry.order || '—',
          }))
          setTimeline(timelineData)

          // Calculate exposure from audit log (count signals per ticker)
          const tickerCounts = new Map<string, { sector: string; count: number }>()
          const sectorMap: Record<string, string> = {
            XLE: 'Energy',
            SMH: 'Technology', 
            EEM: 'Emerging Markets',
            TLT: 'Treasuries',
            NUE: 'Industrials',
            XRT: 'Retail',
            CAT: 'Industrials',
            ZIM: 'Shipping',
            FDX: 'Logistics',
            UPS: 'Logistics',
            AAPL: 'Technology',
          }

          auditRes.entries.forEach((entry: any) => {
            if (entry.ticker && entry.ticker !== 'TEST') {
              const current = tickerCounts.get(entry.ticker) || { 
                sector: sectorMap[entry.ticker] || 'Other', 
                count: 0 
              }
              tickerCounts.set(entry.ticker, {
                sector: current.sector,
                count: current.count + 1,
              })
            }
          })

          const exposureData = Array.from(tickerCounts.entries())
            .map(([ticker, data]) => ({
              ticker,
              sector: data.sector,
              count: data.count,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
          setExposure(exposureData)
        }

        // Process account status
        if (accountRes.success && accountRes.data) {
          const eq = parseFloat(accountRes.data.equity)
          setEquity(eq.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
        }

        // Process P&L for equity change
        if (pnlRes.success && pnlRes.data) {
          const change = pnlRes.data.equityChange || 0
          const changePct = pnlRes.data.equityChangePercent || 0
          setEquityChange({
            amount: Math.abs(change).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            percent: Math.abs(changePct).toFixed(2),
            positive: change >= 0,
          })

          // Convert positions from P&L data
          if (pnlRes.data.positionsDetail && pnlRes.data.positionsDetail.length > 0) {
            // Group positions by underlying ticker
            const positionGroups = new Map<string, any[]>()
            
            pnlRes.data.positionsDetail.forEach((p: any) => {
              // Parse option symbol if it's an option (format: TICKER+YYMMDD+P/C+STRIKE)
              const optionMatch = p.symbol.match(/^([A-Z]+)(\d{6})([PC])(\d+)$/)
              const ticker = optionMatch ? optionMatch[1] : p.symbol
              
              if (!positionGroups.has(ticker)) {
                positionGroups.set(ticker, [])
              }
              positionGroups.get(ticker)!.push(p)
            })

            // Convert groups to display format
            const posData: Position[] = []
            positionGroups.forEach((positions, ticker) => {
              if (positions.length === 1) {
                // Single position (equity or single option)
                const p = positions[0]
                const unrealizedPnL = parseFloat(p.unrealizedPnL || '0')
                const unrealizedPct = parseFloat(p.unrealizedPnLPercent || '0') * 100
                const isPositive = unrealizedPnL >= 0

                let structure = 'Equity'
                const optionMatch = p.symbol.match(/^([A-Z]+)(\d{6})([PC])(\d+)$/)
                if (optionMatch) {
                  const dateStr = optionMatch[2]
                  const putCall = optionMatch[3] === 'P' ? 'Put' : 'Call'
                  const month = dateStr.substring(2, 4)
                  const day = dateStr.substring(4, 6)
                  structure = `${putCall} · ${month}/${day}`
                }

                posData.push({
                  ticker,
                  structure,
                  entry: `$${parseFloat(p.entryPrice || '0').toFixed(2)}`,
                  current: `$${parseFloat(p.currentPrice || '0').toFixed(2)}`,
                  pnl: `${isPositive ? '+' : ''}$${Math.abs(unrealizedPnL).toFixed(2)}`,
                  pct: `${isPositive ? '+' : ''}${unrealizedPct.toFixed(1)}%`,
                  days: '—',
                  tone: isPositive ? 'positive' : 'negative',
                })
              } else {
                // Multi-leg spread - aggregate P&L
                const totalUnrealizedPnL = positions.reduce((sum, p) => sum + parseFloat(p.unrealizedPnL || '0'), 0)
                const totalCostBasis = positions.reduce((sum, p) => {
                  const qty = parseFloat(p.qty || '0')
                  const entry = parseFloat(p.entryPrice || '0')
                  return sum + Math.abs(qty * entry)
                }, 0)
                const unrealizedPct = totalCostBasis > 0 ? (totalUnrealizedPnL / totalCostBasis) * 100 : 0
                const isPositive = totalUnrealizedPnL >= 0

                // Determine spread type from legs
                const legs = positions.map(p => {
                  const match = p.symbol.match(/^([A-Z]+)(\d{6})([PC])(\d+)$/)
                  return {
                    qty: parseFloat(p.qty || '0'),
                    type: match ? (match[3] === 'P' ? 'Put' : 'Call') : 'Unknown',
                    date: match ? match[2] : '',
                  }
                })

                const isPutSpread = legs.every(l => l.type === 'Put')
                const isCallSpread = legs.every(l => l.type === 'Call')
                const spreadType = isPutSpread ? 'Put Spread' : isCallSpread ? 'Call Spread' : 'Spread'
                
                // Get expiration from first leg
                const firstLeg = positions[0]
                const dateMatch = firstLeg.symbol.match(/\d{6}/)
                let dateStr = ''
                if (dateMatch) {
                  const d = dateMatch[0]
                  dateStr = ` · ${d.substring(2, 4)}/${d.substring(4, 6)}`
                }

                // Use weighted average for entry/current
                const avgEntry = totalCostBasis / Math.abs(positions.reduce((sum, p) => sum + parseFloat(p.qty || '0'), 0))
                const totalMarketValue = positions.reduce((sum, p) => {
                  const qty = parseFloat(p.qty || '0')
                  const current = parseFloat(p.currentPrice || '0')
                  return sum + Math.abs(qty * current)
                }, 0)
                const avgCurrent = totalMarketValue / Math.abs(positions.reduce((sum, p) => sum + parseFloat(p.qty || '0'), 0))

                posData.push({
                  ticker,
                  structure: `${spreadType}${dateStr}`,
                  entry: `$${avgEntry.toFixed(2)}`,
                  current: `$${avgCurrent.toFixed(2)}`,
                  pnl: `${isPositive ? '+' : ''}$${Math.abs(totalUnrealizedPnL).toFixed(2)}`,
                  pct: `${isPositive ? '+' : ''}${unrealizedPct.toFixed(1)}%`,
                  days: '—',
                  tone: isPositive ? 'positive' : 'negative',
                })
              }
            })

            setPositions(posData.slice(0, 10))
          }
        }

        // Set last poll time
        const now = new Date()
        setLastPoll(now.toISOString().substring(11, 19) + ' UTC')

        setLoading(false)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
        setLoading(false)
      }
    }

    loadData()
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-[1600px] items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-sm text-tertiary">Loading live data...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-border pb-5">
          <div className="flex items-center gap-4"><div className="flex items-center gap-2"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /><span className="text-lg font-semibold tracking-tight">TariffEdge</span></div><span className="hidden text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:block">Live · Paper Trading</span></div>
          <div className="text-right">
            <p className="font-mono text-2xl tracking-tight text-primary">${equity}</p>
            <p className={`mt-1 flex items-center justify-end gap-1 font-mono text-xs ${equityChange.positive ? 'text-positive' : 'text-negative'}`}>
              <ArrowUpRight className="h-3.5 w-3.5" /> {equityChange.positive ? '+' : '-'}${equityChange.amount} · {equityChange.positive ? '+' : '-'}{equityChange.percent}%
            </p>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-6 py-6 lg:grid-cols-12">
          <section className="rounded-lg border border-border bg-card p-6 lg:col-span-4">
            <SectionLabel>Incoming Signals <span className="ml-1 font-mono text-tertiary">{signals.length.toString().padStart(2, '0')}</span></SectionLabel>
            <div className="mt-5">
              {signals.length === 0 ? (
                <p className="text-sm text-tertiary italic">No signals available</p>
              ) : (
                signals.map((signal, idx) => <SignalCard key={`${signal.time}-${signal.ticker}-${idx}`} signal={signal} />)
              )}
            </div>
          </section>
          
          <section className="rounded-lg border border-border bg-card p-6 lg:col-span-5">
            <SectionLabel>Open Positions <span className="ml-1 font-mono text-tertiary">{positions.length.toString().padStart(2, '0')}</span></SectionLabel>
            <div className="mt-5 flex flex-col gap-5">
              {positions.length === 0 ? (
                <p className="text-sm text-tertiary italic">No open positions</p>
              ) : (
                positions.map((position, idx) => <PositionCard key={`${position.ticker}-${idx}`} position={position} />)
              )}
            </div>
            <div className="mt-6 border-t border-border pt-5">
              <SectionLabel>Exposure</SectionLabel>
              {exposure.length === 0 ? (
                <p className="mt-4 text-sm text-tertiary italic">No exposure data</p>
              ) : (
                <table className="mt-4 w-full text-left text-xs">
                  <thead className="text-tertiary">
                    <tr>
                      <th className="pb-3 font-medium">TICKER</th>
                      <th className="pb-3 font-medium">SECTOR</th>
                      <th className="pb-3 text-right font-medium">SIGNALS</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-secondary">
                    {exposure.map((item) => (
                      <tr key={item.ticker} className="border-t border-border/60">
                        <td className="py-3 text-foreground">{item.ticker}</td>
                        <td className="py-3 font-sans">{item.sector}</td>
                        <td className="py-3 text-right">{item.count.toString().padStart(2, '0')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
          
          <section className="rounded-lg border border-border bg-card p-6 lg:col-span-3">
            <SectionLabel>Decision Timeline</SectionLabel>
            <div className="relative mt-5">
              <div className="absolute bottom-2 left-[3px] top-2 w-px bg-border" />
              {timeline.length === 0 ? (
                <p className="text-sm text-tertiary italic">No timeline data</p>
              ) : (
                timeline.map((item, idx) => (
                  <div className="relative flex gap-3 pb-6 last:pb-0" key={`${item.time}-${item.trigger}-${idx}`}>
                    <span className="relative mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-border ring-4 ring-card" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm leading-5 text-secondary">{item.trigger}</span>
                        <span className="shrink-0 font-mono text-[10px] text-tertiary">{item.time}</span>
                      </div>
                      <p className="mt-1 text-xs italic leading-5 text-tertiary">{item.thesis}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium tracking-wide ${item.tone === 'positive' ? 'border-positive/20 bg-positive/10 text-positive' : 'border-negative/20 bg-negative/10 text-negative'}`}>
                          {item.risk}
                        </span>
                        <span className="font-mono text-[10px] text-tertiary">{item.order}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
        
        <footer className="flex flex-col gap-2 border-t border-border py-4 text-xs text-tertiary sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Circle className="h-2 w-2 fill-primary text-primary" /> 
            <span>All systems nominal</span>
          </div>
          <div className="flex gap-4 font-mono">
            <span>LAST POLL {lastPoll}</span>
            <span>LIVE DATA</span>
          </div>
        </footer>
      </div>
    </main>
  )
}

