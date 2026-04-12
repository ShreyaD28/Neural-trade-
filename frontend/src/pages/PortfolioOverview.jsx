import { useCallback, useEffect, useState } from 'react'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import api from '../api/client'

const outline = 'border-[rgba(70,69,84,0.15)]'

const ALLOC = [
  { name: 'Crypto', value: 45, color: '#c0c1ff' },
  { name: 'Stocks', value: 35, color: '#44dfa3' },
  { name: 'Cash', value: 20, color: '#ffb3ac' },
]

const MOCK_HOLDINGS = [
  { symbol: 'BTC', qty: 2.4, avg: 42000, cmp: 94520, pnlPct: 125.8, up: true },
  { symbol: 'AAPL', qty: 1200, avg: 142, cmp: 176.7, pnlPct: 24.4, up: true },
  { symbol: 'ETH', qty: 48, avg: 3200, cmp: 3034, pnlPct: -5.2, up: false },
  { symbol: 'NVDA', qty: 800, avg: 412, cmp: 875, pnlPct: 112.3, up: true },
]

const DOT = {
  BTC: '#c0c1ff',
  AAPL: '#44dfa3',
  ETH: '#ffb3ac',
  NVDA: '#8b9cff',
}

export default function PortfolioOverview() {
  const [rows, setRows] = useState(MOCK_HOLDINGS)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/portfolio/summary')
      const pos = data.positions ?? []
      const mapped = pos.map((p) => {
        const avg = p.avgPrice ?? 0
        const cmp = p.markPrice ?? avg
        const pnlPct =
          avg && cmp ? ((cmp - avg) / avg) * 100 : 0
        return {
          symbol: p.symbol?.replace('-USD', '') ?? '—',
          qty: p.quantity,
          avg,
          cmp,
          pnlPct,
          up: pnlPct >= 0,
        }
      })
      if (mapped.length) {
        const keys = new Set(mapped.map((m) => m.symbol))
        const filler = MOCK_HOLDINGS.filter((m) => !keys.has(m.symbol))
        setRows([...mapped, ...filler].slice(0, 6))
      } else {
        setRows(MOCK_HOLDINGS)
      }
    } catch {
      setRows(MOCK_HOLDINGS)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => load())
  }, [load])

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-obs-bg px-4 py-4 lg:px-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-5 backdrop-blur-md`}
          >
            <p className="text-xs text-obs-muted">Total balance</p>
            <p className="mt-1 font-manrope text-2xl font-bold text-obs-text">
              $1,284,592.42
            </p>
            <p className="mt-1 font-mono text-sm text-obs-green">+2.4%</p>
          </div>
          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-5 backdrop-blur-md`}
          >
            <p className="text-xs text-obs-muted">Daily P&amp;L</p>
            <p className="mt-1 font-manrope text-2xl font-bold text-obs-green">
              +$14,203.11
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-[var(--radius-obs)] bg-obs-bg">
              <div
                className="h-full w-[72%] rounded-[var(--radius-obs)] bg-obs-green"
              />
            </div>
          </div>
          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-5 backdrop-blur-md`}
          >
            <p className="text-xs text-obs-muted">Total P&amp;L (annual)</p>
            <p className="mt-1 font-manrope text-2xl font-bold text-obs-text">
              +$412,094.00
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-[var(--radius-obs)] bg-obs-bg">
              <div
                className="h-full w-[84%] rounded-[var(--radius-obs)] bg-obs-primary/80"
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
                    data={ALLOC}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={100}
                    paddingAngle={2}
                  >
                    {ALLOC.map((entry) => (
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
              {ALLOC.map((a) => (
                <li key={a.name} className="flex items-center gap-2 text-obs-muted">
                  <span
                    className="h-2 w-2 rounded-[var(--radius-obs)]"
                    style={{ background: a.color }}
                  />
                  {a.name} {a.value}%
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
