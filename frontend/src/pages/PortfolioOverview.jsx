import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import api, { mlApi } from '../api/client'

const outline = 'border-[rgba(70,69,84,0.15)]'

const CRYPTO_BASES = new Set(['BTC', 'ETH', 'SOL'])

const DOT = {
  BTC: '#c0c1ff',
  AAPL: '#44dfa3',
  ETH: '#ffb3ac',
  NVDA: '#8b9cff',
}

export default function PortfolioOverview() {
  const [rows, setRows] = useState([])
  const [cashBalance, setCashBalance] = useState(0)

  const load = useCallback(async () => {
    try {
      // Fetch portfolio summary and prices in parallel; fall back to backend prices if ML is down
      const [{ data: summary }, priceMap] = await Promise.all([
        api.get('/portfolio/summary'),
        mlApi.get('/prices').then((r) => r.data).catch(() =>
          api.get('/market/prices').then((r) => r.data).catch(() => ({}))
        ),
      ])
      setCashBalance(Number(summary?.cashBalance ?? 0))
      const mapped = (summary?.positions ?? []).map((p) => {
        const symbol = p.symbol?.toUpperCase() ?? ''
        const base = symbol.replace('-USD', '')
        const avg = Number(p.avgPrice ?? 0)
        const cmp = Number(priceMap?.[symbol] ?? priceMap?.[base] ?? p.markPrice ?? avg)
        const qty = Number(p.quantity ?? 0)
        const pnlPct = avg > 0 ? ((cmp - avg) / avg) * 100 : 0
        return {
          symbol: base || '—',
          qty,
          avg,
          cmp,
          pnlPct,
          up: pnlPct >= 0,
        }
      })
      setRows(mapped)
    } catch {
      setRows([])
      setCashBalance(0)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [load])

  const totals = useMemo(() => {
    const marketValue = rows.reduce((sum, r) => sum + r.qty * r.cmp, 0)
    const totalBalance = cashBalance + marketValue
    const totalCost = rows.reduce((sum, r) => sum + r.qty * r.avg, 0)
    const totalPnl = marketValue - totalCost

    const cryptoValue = rows
      .filter((r) => CRYPTO_BASES.has(r.symbol))
      .reduce((sum, r) => sum + r.qty * r.cmp, 0)
    const stocksValue = Math.max(0, marketValue - cryptoValue)

    const alloc = totalBalance > 0
      ? [
          { name: 'Crypto', value: (cryptoValue / totalBalance) * 100, color: '#c0c1ff' },
          { name: 'Stocks', value: (stocksValue / totalBalance) * 100, color: '#44dfa3' },
          { name: 'Cash', value: (cashBalance / totalBalance) * 100, color: '#ffb3ac' },
        ]
      : [
          { name: 'Crypto', value: 0, color: '#c0c1ff' },
          { name: 'Stocks', value: 0, color: '#44dfa3' },
          { name: 'Cash', value: 100, color: '#ffb3ac' },
        ]

    return { totalBalance, totalPnl, alloc }
  }, [rows, cashBalance])

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-obs-bg px-4 py-4 lg:px-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-5 backdrop-blur-md`}
          >
            <p className="text-xs text-obs-muted">Total balance</p>
            <p className="mt-1 font-manrope text-2xl font-bold text-obs-text">
              ${totals.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="mt-1 font-mono text-sm text-obs-muted">
              Available cash: ${cashBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-5 backdrop-blur-md`}
          >
            <p className="text-xs text-obs-muted">Daily P&amp;L</p>
            <p className={`mt-1 font-manrope text-2xl font-bold ${totals.totalPnl >= 0 ? 'text-obs-green' : 'text-obs-coral'}`}>
              {totals.totalPnl >= 0 ? '+' : '-'}$
              {Math.abs(totals.totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-[var(--radius-obs)] bg-obs-bg">
              <div
                className={`h-full rounded-[var(--radius-obs)] ${totals.totalPnl >= 0 ? 'bg-obs-green' : 'bg-obs-coral'}`}
                style={{ width: `${Math.min(100, Math.max(5, Math.abs(totals.totalPnl) / Math.max(1, totals.totalBalance) * 100))}%` }}
              />
            </div>
          </div>
          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-5 backdrop-blur-md`}
          >
            <p className="text-xs text-obs-muted">Total P&amp;L (annual)</p>
            <p className={`mt-1 font-manrope text-2xl font-bold ${totals.totalPnl >= 0 ? 'text-obs-green' : 'text-obs-coral'}`}>
              {totals.totalPnl >= 0 ? '+' : '-'}$
              {Math.abs(totals.totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-[var(--radius-obs)] bg-obs-bg">
              <div
                className="h-full rounded-[var(--radius-obs)] bg-obs-primary/80"
                style={{ width: `${Math.min(100, Math.max(5, Math.abs(totals.totalPnl) / Math.max(1, totals.totalBalance) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="inline-flex rounded-[var(--radius-obs-lg)] bg-obs-green/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-obs-green">
          Portfolio health is optimal
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-6 backdrop-blur-md`}
          >
            <h2 className="font-manrope text-lg font-bold text-obs-text">
              Asset allocation
            </h2>
            <div className="mt-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={totals.alloc}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {totals.alloc.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#1d2023',
                      border: '1px solid rgba(70,69,84,0.25)',
                      borderRadius: 4,
                      color: '#e1e2e7',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 flex flex-wrap justify-center gap-4 text-xs">
              {totals.alloc.map((a) => (
                <li key={a.name} className="flex items-center gap-2 text-obs-muted">
                  <span
                    className="h-2 w-2 rounded-[var(--radius-obs)]"
                    style={{ background: a.color }}
                  />
                  {a.name} {a.value.toFixed(1)}%
                </li>
              ))}
            </ul>
          </div>

          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 backdrop-blur-md`}
          >
            <div className="flex items-center justify-between border-b border-[rgba(70,69,84,0.15)] p-4">
              <h2 className="font-manrope text-lg font-bold text-obs-text">
                Detailed holdings
              </h2>
              <button
                type="button"
                className={`rounded-[var(--radius-obs-lg)] border ${outline} px-3 py-1.5 font-mono text-[10px] font-bold uppercase text-obs-muted hover:text-obs-text`}
              >
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[rgba(70,69,84,0.15)] font-mono text-[10px] uppercase tracking-wide text-obs-muted">
                    <th className="px-4 py-3">Symbol</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Avg cost</th>
                    <th className="px-4 py-3">CMP</th>
                    <th className="px-4 py-3">P&amp;L%</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-obs-muted" colSpan={5}>
                        No positions yet — make your first trade!
                      </td>
                    </tr>
                  )}
                  {rows.map((r) => (
                    <tr
                      key={r.symbol}
                      className="border-b border-[rgba(70,69,84,0.08)]"
                    >
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2 font-mono font-semibold text-obs-text">
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-obs)] text-[10px] font-bold text-[#111417]"
                            style={{
                              background: DOT[r.symbol] ?? '#323538',
                            }}
                          >
                            {r.symbol.slice(0, 1)}
                          </span>
                          {r.symbol}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-obs-muted">
                        {r.qty}
                      </td>
                      <td className="px-4 py-3 font-mono text-obs-muted">
                        ${r.avg?.toLocaleString?.() ?? r.avg}
                      </td>
                      <td className="px-4 py-3 font-mono text-obs-text">
                        ${typeof r.cmp === 'number' ? r.cmp.toFixed(2) : r.cmp}
                      </td>
                      <td
                        className={`px-4 py-3 font-mono font-semibold ${r.up ? 'text-obs-green' : 'text-obs-coral'}`}
                      >
                        {r.up ? '+' : ''}
                        {Number(r.pnlPct).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div
          className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-6 backdrop-blur-md`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <span className="material-symbols-outlined text-4xl text-obs-primary">
              neurology
            </span>
            <div className="flex-1">
              <h3 className="font-manrope text-sm font-bold text-obs-primary">
                NeuralTrade AI: Strategic recommendation
              </h3>
              <p className="mt-2 text-sm italic leading-relaxed text-obs-muted">
                Rotate <span className="text-obs-green font-semibold not-italic">4–6%</span> from
                extended tech into{' '}
                <span className="text-obs-green font-semibold not-italic">
                  commodities &amp; cash
                </span>{' '}
                to preserve convexity into FOMC week. Maintain core AI
                semiconductor exposure.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-[var(--radius-obs-lg)] bg-obs-primary/20 px-4 py-2 font-manrope text-xs font-bold text-obs-primary"
                >
                  Optimize exposure
                </button>
                <button
                  type="button"
                  className={`rounded-[var(--radius-obs-lg)] border ${outline} px-4 py-2 font-manrope text-xs font-semibold text-obs-muted`}
                >
                  View full analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
