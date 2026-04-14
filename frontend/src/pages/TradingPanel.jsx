import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import CandlestickChart from '../components/CandlestickChart'
import { useSocket } from '../hooks/useSocket'

const outline = 'border-[rgba(70,69,84,0.15)]'

const ASSETS = [
  { sym: 'NVDA', name: 'NVIDIA Corp' },
  { sym: 'BTC-USD', name: 'Bitcoin' },
  { sym: 'ETH-USD', name: 'Ethereum' },
  { sym: 'AAPL', name: 'Apple Inc.' },
]
const TIMEFRAME_MAP = {
  '1H': { interval: '5m', period: '1d' },
  '4H': { interval: '15m', period: '5d' },
  '1D': { interval: '1h', period: '1mo' },
  '1W': { interval: '1d', period: '6mo' },
}

const CASH_KEY = 'neuraltrade_cash'

/** API + socket symbol for candles (e.g. NVDA → NVDA-USD). */
function toChartSymbol(sym) {
  if (sym === 'NVDA') return 'NVDA-USD'
  if (sym?.includes?.('-')) return sym
  if (!sym) return 'NVDA-USD'
  return `${sym}-USD`
}

function readCash() {
  const raw = localStorage.getItem(CASH_KEY)
  if (raw == null) {
    localStorage.setItem(CASH_KEY, '100000')
    return 100000
  }
  const n = Number(raw)
  return Number.isFinite(n) ? n : 100000
}

export default function TradingPanel() {
  const [side, setSide] = useState('buy')
  const [asset, setAsset] = useState('NVDA')
  const [orderType, setOrderType] = useState('MARKET')
  const [qty, setQty] = useState('')
  const [oneTap, setOneTap] = useState(false)
  const [busy, setBusy] = useState(false)
  const [lastCandle, setLastCandle] = useState(null)
  const [recent, setRecent] = useState([])
  const [cash, setCash] = useState(readCash)
  const [ownedQty, setOwnedQty] = useState(0)
  const [timeframe, setTimeframe] = useState('1D')
  const [toast, setToast] = useState({ open: false, type: 'success', message: '' })

  const chartSymbol = useMemo(() => toChartSymbol(asset), [asset])

  const onCandle = useCallback(
    (c) => {
      if (c.symbol === chartSymbol) setLastCandle(c)
    },
    [chartSymbol]
  )

  const { prices } = useSocket(chartSymbol, { onCandle })

  const price = prices[asset] ?? prices[chartSymbol]
  const q = Number(qty)
  const validQ = Number.isFinite(q) && q > 0
  const px = Number.isFinite(price) ? price : null
  const estCost = validQ && px != null ? q * px : null
  const commission = estCost != null ? 1.5 : 0
  const totalEst = estCost != null ? estCost + commission : null
  const canBuy = validQ && totalEst != null && totalEst <= cash
  const canSell = validQ && q <= ownedQty
  const timeframeConfig = TIMEFRAME_MAP[timeframe] ?? TIMEFRAME_MAP['1D']

  const loadRecent = useCallback(async () => {
    try {
      const [{ data: tradesData }, { data: summaryData }] = await Promise.all([
        api.get('/portfolio/trades', { params: { limit: 3 } }),
        api.get('/portfolio/summary'),
      ])
      setRecent(tradesData.trades ?? [])
      const nextCash = Number(summaryData?.cashBalance ?? 0)
      setCash(nextCash)
      localStorage.setItem(CASH_KEY, String(nextCash))
      const pos = (summaryData?.positions ?? []).find((p) => p.symbol === asset)
      setOwnedQty(Number(pos?.quantity ?? 0))
    } catch {
      setRecent([])
    }
  }, [asset])

  useEffect(() => {
    queueMicrotask(() => loadRecent())
  }, [loadRecent])

  useEffect(() => {
    if (!toast.open) return undefined
    const id = setTimeout(() => {
      setToast((t) => ({ ...t, open: false }))
    }, 3000)
    return () => clearTimeout(id)
  }, [toast.open])

  function pctFill(p) {
    const v = (cash * p) / 100
    if (!px || !Number.isFinite(px)) return
    setQty(String(Math.floor((v / px) * 1e6) / 1e6))
  }

  function fillMaxQty() {
    if (side === 'buy') {
      if (!px || px <= 0) return
      setQty(String(Math.floor(cash / px)))
      return
    }
    setQty(String(Math.max(0, ownedQty)))
  }

  async function resolveCashBalance() {
    const local = Number(localStorage.getItem(CASH_KEY))
    if (Number.isFinite(local) && local >= 0) {
      return local
    }
    const token = localStorage.getItem('token')
    const { data } = await api.get('/portfolio/summary', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const fetched = Number(data?.cashBalance ?? 0)
    localStorage.setItem(CASH_KEY, String(fetched))
    setCash(fetched)
    return fetched
  }

  async function handleTrade() {
    if (!asset) {
      setToast({ open: true, type: 'error', message: 'Please select a symbol' })
      return
    }
    if (!validQ || q <= 0 || px == null) {
      setToast({ open: true, type: 'error', message: 'Quantity must be greater than 0' })
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      setToast({ open: true, type: 'error', message: 'Authentication required' })
      return
    }

    setBusy(true)
    try {
      const availableCash = await resolveCashBalance()
      const tradeTotal = q * px

      if (side === 'buy' && tradeTotal > availableCash) {
        setToast({ open: true, type: 'error', message: 'Insufficient funds' })
        return
      }

      const { data } = await api.post('/portfolio/trades', {
        symbol: asset,
        side,
        quantity: Number(qty),
        price: px,
        total: tradeTotal,
        status: 'filled',
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const newCash = Number(data?.newCashBalance ?? cash)
      setCash(newCash)
      localStorage.setItem(CASH_KEY, String(newCash))
      setToast({
        open: true,
        type: 'success',
        message: `✓ ${side === 'buy' ? 'Bought' : 'Sold'} ${q} ${asset} @ $${px.toFixed(2)}`,
      })
      setQty('')
      await loadRecent()
    } catch (e) {
      setToast({
        open: true,
        type: 'error',
        message: e.response?.data?.error ?? e.message ?? 'Trade failed',
      })
    } finally {
      setBusy(false)
    }
  }

  const pnl24h = '+$2,840.12'

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-obs-bg px-4 py-4 lg:px-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6 flex flex-col gap-4 border-b border-[rgba(70,69,84,0.15)] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-manrope text-2xl font-bold text-obs-text">
              Trade Execution
            </h1>
            <p className="mt-1 text-sm text-obs-muted">
              Institutional routing · smart order types
            </p>
          </div>
          <div className="flex flex-wrap gap-6 font-mono text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-obs-muted">
                Available margin
              </p>
              <p className="font-semibold text-obs-text">
                $
                {cash.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-obs-muted">
                Total P&amp;L (24H)
              </p>
              <p className="font-semibold text-obs-green">{pnl24h}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 xl:flex-row">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-manrope text-lg font-bold text-obs-text">
                  {asset}
                </span>
                <span className="text-obs-muted">/ USD</span>
              </div>
              <div className="flex gap-1">
                {['1H', '4H', '1D', '1W'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeframe(t)}
                    className={`rounded-[var(--radius-obs)] px-3 py-1 font-mono text-xs font-semibold ${
                      timeframe === t
                        ? 'bg-obs-green text-black'
                        : 'bg-obs-container text-obs-muted'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <CandlestickChart
              symbol={asset}
              height={400}
              liveCandle={lastCandle}
              source="ml"
              interval={timeframeConfig.interval}
              period={timeframeConfig.period}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div
                className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-4 backdrop-blur-md`}
              >
                <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-obs-primary">
                  AI Sentiment
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-obs-muted">
                  Accumulation detected on institutional tape. Flow skew
                  positive vs. 20-session VWAP. Consider layered entries.
                </p>
              </div>
              <div
                className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-4 backdrop-blur-md`}
              >
                <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-obs-coral">
                  Risk profile
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-obs-muted">
                  Volatility regime: moderate. Suggested stop:{' '}
                  <span className="text-obs-text">2.1× ATR</span> below entry
                  for long bias.
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-manrope text-sm font-bold text-obs-text">
                Recent executions
              </h3>
              <div className="space-y-2">
                {recent.length === 0 ? (
                  <p className="text-sm text-obs-muted">No trades yet.</p>
                ) : (
                  recent.map((t) => (
                    <div
                      key={t._id ?? `${t.symbol}-${t.createdAt}`}
                      className={`flex items-center justify-between rounded-[var(--radius-obs-lg)] border ${outline} bg-obs-surface/50 px-3 py-2`}
                    >
                      <span
                        className={`rounded-[var(--radius-obs)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                          t.side === 'buy'
                            ? 'bg-obs-green/15 text-obs-green'
                            : 'bg-obs-coral/15 text-obs-coral'
                        }`}
                      >
                        {t.side}
                      </span>
                      <span className="font-mono text-sm text-obs-text">
                        {t.symbol}
                      </span>
                      <span className="font-mono text-xs text-obs-muted">
                        {t.quantity} @ {Number(t.price).toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div
            className={`w-full shrink-0 rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-5 backdrop-blur-md xl:sticky xl:top-20 xl:w-[380px] xl:self-start`}
          >
            <div className="mb-4 flex rounded-[var(--radius-obs-lg)] bg-obs-bg p-1">
              <button
                type="button"
                onClick={() => setSide('buy')}
                className={`flex-1 rounded-[var(--radius-obs)] py-2 font-manrope text-sm font-bold ${
                  side === 'buy'
                    ? 'bg-obs-green text-[#111417]'
                    : 'text-obs-muted'
                }`}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setSide('sell')}
                className={`flex-1 rounded-[var(--radius-obs)] py-2 font-manrope text-sm font-bold ${
                  side === 'sell'
                    ? 'bg-obs-coral text-[#111417]'
                    : 'text-obs-muted'
                }`}
              >
                SELL
              </button>
            </div>

            <label className="mb-4 block">
              <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wide text-obs-muted">
                Select asset
              </span>
              <select
                value={asset}
                onChange={(e) => {
                  setAsset(e.target.value)
                  setLastCandle(null)
                }}
                className={`w-full rounded-[var(--radius-obs-lg)] border ${outline} bg-obs-bg px-3 py-2.5 font-inter text-sm text-obs-text`}
              >
                {ASSETS.map((a) => (
                  <option key={a.sym} value={a.sym}>
                    {a.sym} · {a.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="mb-4">
              <span className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-wide text-obs-muted">
                Order type
              </span>
              <div className="flex flex-wrap gap-1">
                {['MARKET', 'LIMIT', 'STOP'].map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setOrderType(o)}
                    className={`rounded-[var(--radius-obs)] px-3 py-1.5 font-mono text-[10px] font-bold ${
                      orderType === o
                        ? 'bg-obs-container-high text-obs-primary'
                        : 'border border-[rgba(70,69,84,0.15)] text-obs-muted'
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <label className="mb-4 block">
              <span className="mb-1 flex justify-between font-mono text-[10px] font-bold uppercase tracking-wide text-obs-muted">
                <span>Quantity</span>
                <span>Units</span>
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className={`w-full rounded-[var(--radius-obs-lg)] border ${outline} bg-obs-bg px-3 py-2.5 font-mono text-sm text-obs-text`}
                placeholder="0"
              />
              <div className="mt-2 flex gap-1">
                <button
                  type="button"
                  onClick={fillMaxQty}
                  className="rounded-[var(--radius-obs)] border border-[rgba(70,69,84,0.15)] px-2 py-1 font-mono text-[10px] text-obs-primary"
                >
                  MAX
                </button>
                {[25, 50, 75, 100].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => pctFill(p)}
                    className="flex-1 rounded-[var(--radius-obs)] border border-[rgba(70,69,84,0.15)] py-1 font-mono text-[10px] text-obs-muted hover:border-obs-primary/40 hover:text-obs-text"
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </label>

            <div
              className={`mb-4 space-y-2 rounded-[var(--radius-obs-lg)] border ${outline} bg-obs-bg/80 p-3 font-mono text-xs`}
            >
              <div className="flex justify-between text-obs-muted">
                <span>Est. price</span>
                <span className="text-obs-text">
                  {px != null ? `$${px.toFixed(4)}` : '—'}
                </span>
              </div>
              <div className="flex justify-between text-obs-muted">
                <span>Commission</span>
                <span className="text-obs-text">
                  ${commission.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[rgba(70,69,84,0.15)] pt-2 font-semibold text-obs-text">
                <span>Total est.</span>
                <span>
                  {totalEst != null
                    ? `$${totalEst.toFixed(2)}`
                    : '—'}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={busy || (side === 'buy' && !canBuy)}
              onClick={handleTrade}
              className="mb-4 w-full rounded-[var(--radius-obs-lg)] bg-gradient-to-r from-[#8b8fd1] to-obs-primary py-3.5 font-manrope text-sm font-bold text-[#111417] shadow-lg shadow-obs-primary/20 disabled:opacity-40"
            >
              EXECUTE TRADE
            </button>

            <label className="mb-4 flex cursor-pointer items-center gap-2 text-xs text-obs-muted">
              <input
                type="checkbox"
                checked={oneTap}
                onChange={(e) => setOneTap(e.target.checked)}
                className="rounded-[var(--radius-obs)] border-obs-outline"
              />
              Enable One-Tap Execution
            </label>

            <p className="text-center font-mono text-[9px] uppercase tracking-widest text-obs-muted">
              End-to-end encrypted execution
            </p>
          </div>
        </div>
      </div>
      {toast.open ? (
        <div className="fixed bottom-5 right-5 z-50">
          <div
            className={`rounded-[var(--radius-obs-lg)] border px-4 py-3 text-sm shadow-lg ${
              toast.type === 'success'
                ? 'border-obs-green/40 bg-obs-green/15 text-obs-green'
                : 'border-obs-coral/40 bg-obs-coral/15 text-obs-coral'
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </div>
  )
}
