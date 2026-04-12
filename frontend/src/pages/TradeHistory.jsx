import { useCallback, useEffect, useState } from 'react'
import api from '../api/client'

const outline = 'border-[rgba(70,69,84,0.15)]'

const MOCK_ROWS = [
  {
    id: '1',
    date: '2026-04-11 09:42:11',
    type: 'buy',
    symbol: 'NVDA',
    qty: 120,
    entry: 884.2,
    exit: 891.5,
    pnl: 876.0,
    pnlPct: 0.82,
    status: 'filled',
  },
  {
    id: '2',
    date: '2026-04-10 14:18:03',
    type: 'sell',
    symbol: 'BTC-USD',
    qty: 0.45,
    entry: 98200,
    exit: 97840,
    pnl: -162.0,
    pnlPct: -0.37,
    status: 'filled',
  },
  {
    id: '3',
    date: '2026-04-09 11:05:44',
    type: 'buy',
    symbol: 'ETH-USD',
    qty: 8,
    entry: 3180,
    exit: 3224,
    pnl: 352.0,
    pnlPct: 1.38,
    status: 'filled',
  },
  {
    id: '4',
    date: '2026-04-08 16:22:19',
    type: 'sell',
    symbol: 'AAPL',
    qty: 400,
    entry: 178.2,
    exit: 177.9,
    pnl: -120.0,
    pnlPct: -0.17,
    status: 'cancelled',
  },
  {
    id: '5',
    date: '2026-04-07 10:01:55',
    type: 'buy',
    symbol: 'SOL-USD',
    qty: 200,
    entry: 142.8,
    exit: 148.1,
    pnl: 1060.0,
    pnlPct: 3.71,
    status: 'filled',
  },
]

const AVATAR = {
  NVDA: '#c0c1ff',
  'BTC-USD': '#44dfa3',
  'ETH-USD': '#8b8fd1',
  AAPL: '#ffb3ac',
  'SOL-USD': '#6ee7b7',
}

function mapTrade(t) {
  const side = t.side === 'buy' ? 'buy' : 'sell'
  const pnl = (Number(t.price) * Number(t.quantity) * (side === 'sell' ? 0.002 : -0.002))
  return {
    id: t._id ?? t.id,
    date: t.filledAt ?? t.createdAt ?? '',
    type: side,
    symbol: t.symbol,
    qty: t.quantity,
    entry: Number(t.price),
    exit: Number(t.price) * (1 + (side === 'buy' ? 0.008 : -0.005)),
    pnl,
    pnlPct: side === 'buy' ? 0.8 : -0.2,
    status: t.status ?? 'filled',
  }
}

export default function TradeHistory() {
  const [rangeTab, setRangeTab] = useState('all')
  const [rows, setRows] = useState(MOCK_ROWS)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/portfolio/trades', { params: { limit: 5 } })
      const trades = data.trades ?? []
      if (trades.length) {
        setRows(
          trades.map(mapTrade).concat(MOCK_ROWS).slice(0, 8)
        )
      } else {
        setRows(MOCK_ROWS)
      }
    } catch {
      setRows(MOCK_ROWS)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => load())
  }, [load])

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-obs-bg px-4 py-4 lg:px-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-col gap-4 border-b border-[rgba(70,69,84,0.15)] pb-6 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
          <div>
            <h1 className="font-manrope text-2xl font-bold text-obs-text">
              Trade History
            </h1>
            <p className="mt-1 text-sm text-obs-muted">
              Execution-quality audit trail
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: 'All Time', id: 'all' },
              { label: '30D', id: '30d' },
              { label: '7D', id: '7d' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setRangeTab(t.id)}
                className={`rounded-[var(--radius-obs-lg)] px-3 py-1.5 font-mono text-[10px] font-bold uppercase ${
                  rangeTab === t.id
                    ? 'bg-obs-container-high text-obs-primary'
                    : `border ${outline} text-obs-muted hover:text-obs-text`
                }`}
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              className={`rounded-[var(--radius-obs-lg)] border ${outline} px-3 py-1.5 font-mono text-[10px] font-bold uppercase text-obs-muted`}
            >
              Asset class
            </button>
            <button
              type="button"
              className={`rounded-[var(--radius-obs-lg)] border ${outline} px-3 py-1.5 font-mono text-[10px] font-bold uppercase text-obs-muted`}
            >
              Advanced filters
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Win rate', val: '68.4%', color: 'text-obs-green' },
            { label: 'Total P&L', val: '+$12,450.21', color: 'text-obs-green' },
            { label: 'Avg execution', val: '14ms', color: 'text-obs-text' },
            { label: 'Active trades', val: '3', color: 'text-obs-primary' },
          ].map((c) => (
            <div
              key={c.label}
              className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-4 backdrop-blur-md`}
            >
              <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-obs-muted">
                {c.label}
              </p>
              <p className={`mt-1 font-manrope text-xl font-bold ${c.color}`}>
                {c.val}
              </p>
            </div>
          ))}
        </div>

        <div
          className={`overflow-hidden rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 backdrop-blur-md`}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-[rgba(70,69,84,0.15)] font-mono text-[10px] uppercase tracking-wide text-obs-muted">
                  <th className="px-4 py-3">Date / time</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Symbol</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Entry / exit</th>
                  <th className="px-4 py-3">P&amp;L total</th>
                  <th className="px-4 py-3">P&amp;L%</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[rgba(70,69,84,0.08)]"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-obs-muted">
                      {typeof r.date === 'string'
                        ? r.date.replace('T', ' ').slice(0, 19)
                        : new Date(r.date).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-[var(--radius-obs)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                          r.type === 'buy'
                            ? 'bg-obs-green/20 text-obs-green'
                            : 'bg-obs-coral/20 text-obs-coral'
                        }`}
                      >
                        {r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 font-mono font-semibold text-obs-text">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-obs)] text-xs font-bold text-[#111417]"
                          style={{
                            background: AVATAR[r.symbol] ?? '#323538',
                          }}
                        >
                          {r.symbol.replace('-USD', '').slice(0, 1)}
                        </span>
                        {r.symbol}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-obs-muted">
                      {r.qty}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-obs-muted">
                      {Number(r.entry).toFixed(2)} / {Number(r.exit).toFixed(2)}
                    </td>
                    <td
                      className={`px-4 py-3 font-mono font-semibold ${r.pnl >= 0 ? 'text-obs-green' : 'text-obs-coral'}`}
                    >
                      {r.pnl >= 0 ? '+' : ''}$
                      {Math.abs(r.pnl).toFixed(2)}
                    </td>
                    <td
                      className={`px-4 py-3 font-mono font-semibold ${r.pnlPct >= 0 ? 'text-obs-green' : 'text-obs-coral'}`}
                    >
                      {r.pnlPct >= 0 ? '+' : ''}
                      {r.pnlPct?.toFixed?.(2) ?? r.pnlPct}%
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-obs-muted">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            r.status === 'filled'
                              ? 'bg-obs-green'
                              : 'bg-obs-muted'
                          }`}
                        />
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end border-t border-[rgba(70,69,84,0.15)] px-4 py-2">
            <span className="font-mono text-[10px] text-obs-muted">
              Page 1 · 5 rows
            </span>
          </div>
        </div>

        <div
          className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-5 backdrop-blur-md`}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-manrope text-sm font-bold text-obs-text">
                AI execution insight
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-obs-muted">
                Slippage within predicted band on 94% of routed orders. Consider
                widening limit offsets during NYSE open auction.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase text-obs-green">
              <span className="obs-pulse-green h-2 w-2 rounded-full bg-obs-green" />
              Live market data connected
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
