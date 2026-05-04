import { useCallback, useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api from '../api/client'

const outline = 'border-[rgba(70,69,84,0.15)]'

const SECTOR_BLOCKS = [
  { name: 'Technology', pct: 42.4, color: '#44dfa3' },
  { name: 'Energy', pct: 15.1, color: '#c0c1ff' },
  { name: 'Healthcare', pct: 12.8, color: '#8b8fd1' },
  { name: 'Finance', pct: 10.2, color: '#ffb3ac' },
  { name: 'Other', pct: 19.5, color: '#323538' },
]

export default function RiskAnalytics() {
  const [sharpeData, setSharpeData] = useState([
    { name: 'S', v: 0.6 },
    { name: 'H', v: 0.9 },
    { name: 'A', v: 0.75 },
    { name: 'R', v: 0.85 },
    { name: 'P', v: 0.95 },
    { name: 'E', v: 1 },
  ])
  const [sharpeVal, setSharpeVal] = useState(2.84)
  const [drawdown, setDrawdown] = useState(0)
  const [var95, setVar95] = useState(0)
  const [hasTrades, setHasTrades] = useState(false)

  const loadRisk = useCallback(async () => {
    try {
      const { data: tradeData } = await api.get('/portfolio/trades', { params: { limit: 500 } })
      const trades = tradeData?.trades ?? []
      setHasTrades(trades.length > 0)
      const returns = []
      for (let i = 1; i < trades.length; i += 1) {
        const prev = Number(trades[i - 1]?.price ?? 0)
        const cur = Number(trades[i]?.price ?? 0)
        if (prev > 0 && Number.isFinite(cur)) returns.push((cur - prev) / prev)
      }
      const { data } = await api.post('/signals/risk', { returns })
      const s = Number(data.sharpe)
      if (Number.isFinite(s)) {
        setSharpeVal(s)
        setDrawdown(Number(data.max_drawdown ?? 0))
        setVar95(Number(data.var_95 ?? 0))
        const norm = Math.min(1, Math.max(0.2, (s + 1) / 4))
        setSharpeData((prev) =>
          prev.map((row, i) => ({
            ...row,
            v: 0.35 + (norm * 0.65 * (i + 1)) / prev.length,
          }))
        )
      }
    } catch {
      /* keep mock */
    }
  }, [])

  useEffect(() => {
    queueMicrotask(loadRisk)
    const id = setInterval(loadRisk, 60_000)
    return () => clearInterval(id)
  }, [loadRisk])

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-obs-bg px-4 py-4 lg:px-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-col gap-4 border-b border-[rgba(70,69,84,0.15)] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-manrope text-2xl font-bold text-obs-text">
              Risk Analytics
            </h1>
            <p className="mt-1 text-sm text-obs-muted">
              Factor decomposition · stress overlays
            </p>
          </div>
          <div className="flex flex-wrap gap-6 font-mono text-sm">
            <div>
              <p className="text-[10px] uppercase text-obs-muted">Portfolio beta</p>
              <p className="font-bold text-obs-text">0.84</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-obs-muted">
                Value at risk
              </p>
              <p className="font-bold text-obs-coral">-$14.2k</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-6 backdrop-blur-md`}
          >
            <h2 className="font-manrope text-sm font-bold text-obs-text">
              Portfolio sector exposure
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {SECTOR_BLOCKS.map((b) => (
                <div
                  key={b.name}
                  className="flex flex-col justify-end rounded-[var(--radius-obs-lg)] p-3 font-mono text-[10px] font-bold uppercase text-[#111417]"
                  style={{
                    background: b.color,
                    flex: `${b.pct} 1 120px`,
                    minHeight: `${40 + b.pct * 2}px`,
                    minWidth: '100px',
                  }}
                >
                  <span>{b.name}</span>
                  <span className="text-sm">{b.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div
              className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-5 backdrop-blur-md`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-manrope text-sm font-bold text-obs-text">
                  Market volatility
                </h3>
                <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-obs-green">
                  <span className="h-2 w-2 rounded-full bg-obs-green" />
                  Market open
                </span>
              </div>
              <p className="mt-2 font-manrope text-3xl font-bold text-obs-text">
                VIX 14.28
              </p>
              <div className="mt-3 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { x: 'M', v: 12 },
                      { x: 'T', v: 15 },
                      { x: 'W', v: 11 },
                      { x: 'T', v: 18 },
                      { x: 'F', v: 14 },
                    ]}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(70,69,84,0.2)"
                    />
                    <XAxis dataKey="x" tick={{ fill: '#c7c4d7', fontSize: 10 }} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        background: '#1d2023',
                        border: '1px solid rgba(70,69,84,0.25)',
                        borderRadius: 4,
                      }}
                    />
                    <Bar dataKey="v" radius={[2, 2, 0, 0]}>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Cell
                          key={i}
                          fill={i === 3 ? '#c0c1ff' : '#323538'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div
              className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-5 backdrop-blur-md`}
            >
              <h3 className="font-manrope text-sm font-bold text-obs-primary">
                AI insight
              </h3>
              <p className="mt-2 text-sm italic text-obs-muted">
                Volatility compression into macro event — gamma pin risk elevated.
                Reduce gross into headline risk.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-5 backdrop-blur-md`}
          >
            <p className="font-mono text-[10px] font-bold uppercase text-obs-muted">
              Sharpe ratio
            </p>
            <p className="mt-1 font-manrope text-2xl font-bold text-obs-green">
              {sharpeVal.toFixed(2)}
            </p>
            <div className="mt-3 h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sharpeData}>
                  <Bar dataKey="v" fill="#44dfa3" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-5 backdrop-blur-md`}
          >
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] font-bold uppercase text-obs-muted">
                Max drawdown
              </p>
              <span className="rounded-[var(--radius-obs)] bg-obs-coral/20 px-2 py-0.5 font-mono text-[9px] font-bold text-obs-coral">
                Level 2 alert
              </span>
            </div>
            <p className="mt-1 font-manrope text-2xl font-bold text-obs-coral">
              {(drawdown * 100).toFixed(2)}%
            </p>
            <div className="mt-3 flex h-16 items-end gap-1">
              {[40, 55, 35, 70, 45, 60, 30].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-[var(--radius-obs)] bg-gradient-to-t from-obs-coral/80 to-obs-coral/30"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-obs-muted">
              Recovery est: 14 trading days
            </p>
          </div>

          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-5 backdrop-blur-md`}
          >
            <p className="font-mono text-[10px] font-bold uppercase text-obs-muted">
              Performance delta
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-obs-muted">VaR (95%)</span>
                  <span className="text-obs-coral">{(var95 * 100).toFixed(2)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-[var(--radius-obs)] bg-obs-bg">
                  <div className="h-full w-[82%] bg-obs-green" />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-obs-muted">S&amp;P 500</span>
                  <span className="text-obs-text">+14.2%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-[var(--radius-obs)] bg-obs-bg">
                  <div className="h-full w-[55%] bg-obs-primary/70" />
                </div>
              </div>
              <p className="pt-2 font-mono text-sm font-bold text-obs-green">
                {hasTrades ? 'Risk metrics updated from real trades' : 'Make trades to see risk metrics'}
              </p>
            </div>
          </div>
        </div>
        {!hasTrades ? <p className="text-sm text-obs-muted">Make trades to see risk metrics</p> : null}

        <footer
          className={`flex flex-wrap gap-3 rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-bg/90 p-4`}
        >
          {[
            'Correlation matrix 0.12',
            'Tail risk -0.4',
            'Portfolio stress test FAIL',
            'Active risk 4.2%',
          ].map((t) => (
            <span
              key={t}
              className={`rounded-[var(--radius-obs-lg)] border ${outline} px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide ${
                t.includes('FAIL')
                  ? 'border-obs-coral/40 text-obs-coral'
                  : 'text-obs-muted'
              }`}
            >
              {t}
            </span>
          ))}
        </footer>
      </div>
    </div>
  )
}
