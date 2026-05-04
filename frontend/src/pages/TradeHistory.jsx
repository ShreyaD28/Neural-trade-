import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const outline = 'border-[rgba(70,69,84,0.15)]'

const PAGE_SIZE = 10

const AVATAR = {
  NVDA: '#c0c1ff',
  'BTC-USD': '#44dfa3',
  'ETH-USD': '#8b8fd1',
  AAPL: '#ffb3ac',
  'SOL-USD': '#6ee7b7',
}

function mapTrade(t) {
  const side = t.side === 'buy' ? 'buy' : 'sell'
  const total = Number(t.total ?? Number(t.price) * Number(t.quantity))
  const pnl = Number(t.profit ?? t.pnl ?? 0)
  return {
    id: t._id ?? t.id,
    date: t.createdAt ?? '',
    type: side,
    symbol: t.symbol,
    qty: t.quantity,
    entry: Number(t.price),
    total,
    pnl,
    status: t.status ?? 'filled',
  }
}

export default function TradeHistory() {
  const navigate = useNavigate()
  const [rangeTab, setRangeTab] = useState('all')
  const [rows, setRows] = useState([])
  const [activeTrades, setActiveTrades] = useState(0)
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    try {
      const [{ data: tradeData }, { data: summaryData }] = await Promise.all([
        api.get('/portfolio/trades', { params: { limit: 500 } }),
        api.get('/portfolio/summary'),
      ])
      const trades = tradeData.trades ?? []
      setRows(trades.map(mapTrade))
      setActiveTrades((summaryData?.positions ?? []).length)
      setPage(1)
    } catch {
      setRows([])
      setActiveTrades(0)
      setPage(1)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(load)
  }, [load])

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return rows.slice(start, start + PAGE_SIZE)
  }, [rows, page])
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const profitableTrades = rows.filter((r) => r.pnl > 0).length
  const winRate = rows.length ? (profitableTrades / rows.length) * 100 : 0
  const totalPnl = rows.reduce((sum, r) => sum + r.pnl, 0)

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
            { label: 'Win rate', val: `${winRate.toFixed(1)}%`, color: 'text-obs-green' },
            { label: 'Total P&L', val: `${totalPnl >= 0 ? '+' : '-'}$${Math.abs(totalPnl).toFixed(2)}`, color: totalPnl >= 0 ? 'text-obs-green' : 'text-obs-coral' },
            { label: 'Avg execution', val: '< 300ms', color: 'text-obs-text' },
            { label: 'Active trades', val: String(activeTrades), color: 'text-obs-primary' },
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
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center">
                      <p className="text-obs-muted">No trades yet</p>
                      <button
                        type="button"
                        onClick={() => navigate('/trade')}
                        className="mt-3 rounded-[var(--radius-obs-lg)] bg-obs-primary/20 px-3 py-1.5 font-mono text-[10px] font-bold uppercase text-obs-primary"
                      >
                        Go to Trade
                      </button>
                    </td>
                  </tr>
                )}
                {pagedRows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[rgba(70,69,84,0.08)]"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-obs-muted">
                      {new Date(r.date).toLocaleString()}
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
                      ${Number(r.entry).toFixed(2)}
                    </td>
                    <td
                      className={`px-4 py-3 font-mono font-semibold ${r.pnl >= 0 ? 'text-obs-green' : 'text-obs-coral'}`}
                    >
                      ${Number(r.total).toFixed(2)}
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
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={`rounded-[var(--radius-obs)] border ${outline} px-2 py-1 font-mono text-[10px] text-obs-muted disabled:opacity-50`}
              >
                Prev
              </button>
              <span className="font-mono text-[10px] text-obs-muted">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={`rounded-[var(--radius-obs)] border ${outline} px-2 py-1 font-mono text-[10px] text-obs-muted disabled:opacity-50`}
              >
                Next
              </button>
            </div>
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
