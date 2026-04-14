import { useCallback, useEffect, useState } from 'react'
import api from '../api/client'
import CandlestickChart from '../components/CandlestickChart'
import { useSocket } from '../hooks/useSocket'

const outline = 'border-[rgba(70,69,84,0.15)]'

const SYMBOL_LABELS = {
  'BTC-USD': 'Bitcoin (BTC)',
  'ETH-USD': 'Ethereum (ETH)',
  'SOL-USD': 'Solana (SOL)',
  AAPL: 'Apple Inc.',
  MSFT: 'Microsoft',
  GOOGL: 'Alphabet',
  META: 'Meta',
  AMZN: 'Amazon',
  NVDA: 'NVIDIA',
  TSLA: 'Tesla',
}

// All symbols shown in the watchlist sidebar
const WATCHLIST = ['AAPL', 'MSFT', 'GOOGL', 'META', 'AMZN', 'NVDA', 'TSLA', 'BTC-USD', 'ETH-USD']

// Index ETF proxies: SPY ≈ S&P 500, QQQ ≈ NASDAQ 100, USO ≈ Crude Oil, VIXY ≈ VIX
const INDEX_MAP = [
  { key: 'SPY',  name: 'S&P 500' },
  { key: 'QQQ',  name: 'NASDAQ 100' },
  { key: 'USO',  name: 'CRUDE OIL' },
  { key: 'VIXY', name: 'VIX INDEX' },
]

const CASH_KEY = 'neuraltrade_cash'

function readCash() {
  const raw = localStorage.getItem(CASH_KEY)
  if (raw == null) {
    localStorage.setItem(CASH_KEY, '100000')
    return 100000
  }
  const n = Number(raw)
  return Number.isFinite(n) ? n : 100000
}

export default function MainDashboard() {
  const [symbols, setSymbols] = useState(['BTC-USD', 'ETH-USD', 'SOL-USD'])
  const [symbol, setSymbol] = useState('BTC-USD')
  const [tf, setTf] = useState('1D')
  const [lastCandle, setLastCandle] = useState(null)
  const [prevCandle, setPrevCandle] = useState(null)
  const [pricesRemote, setPricesRemote] = useState({})
  const [prevPricesRemote, setPrevPricesRemote] = useState({})
  const [indexStats, setIndexStats] = useState(INDEX_MAP.map((m) => ({ ...m, value: null, ch: null, up: null })))
  const [positions, setPositions] = useState([])
  const [cash] = useState(readCash)
  const [showPattern, setShowPattern] = useState(true)

  const onCandle = useCallback(
    (c) => {
      if (c.symbol === symbol) {
        setLastCandle((prev) => { setPrevCandle(prev); return c })
      }
    },
    [symbol]
  )

  const { prices: socketPrices, connected } = useSocket(symbol, { onCandle })

  const fetchPortfolio = useCallback(async () => {
    try {
      const { data } = await api.get('/portfolio/summary')
      setPositions(data.positions ?? [])
    } catch {
      setPositions([])
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => fetchPortfolio())
  }, [fetchPortfolio])

  // Load symbol list from backend
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await api.get('/market/symbols')
        const list = data.symbols?.length ? data.symbols : ['BTC-USD']
        if (!cancelled) {
          setSymbols(list)
          setSymbol((s) => (list.includes(s) ? s : list[0]))
        }
      } catch { /* keep default */ }
    })()
    return () => { cancelled = true }
  }, [])

  // Live prices from backend (Alpaca if configured, DB fallback otherwise)
  useEffect(() => {
    let cancelled = false
    async function fetchPrices() {
      try {
        const { data } = await api.get('/market/prices')
        if (!cancelled) {
          setPrevPricesRemote((p) => Object.keys(data).length ? p : p)
          setPricesRemote((prev) => { setPrevPricesRemote(prev); return data ?? {} })
        }
      } catch { /* keep stale */ }
    }
    fetchPrices()
    const id = setInterval(fetchPrices, 15_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  // Index ETF prices (SPY, QQQ, USO, VIXY) from backend prices endpoint
  useEffect(() => {
    let cancelled = false
    async function fetchIndex() {
      try {
        const { data } = await api.get('/market/prices')
        if (cancelled) return
        setIndexStats((prev) =>
          prev.map((ix) => {
            const cur = data[ix.key]
            // We don't have prev close here, so show price only
            if (cur == null) return ix
            const formatted = Number(cur).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            return { ...ix, value: formatted, ch: null, up: null }
          })
        )
      } catch { /* keep previous */ }
    }
    fetchIndex()
    const id = setInterval(fetchIndex, 30_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const headerTitle = SYMBOL_LABELS[symbol] ?? symbol.replace('-USD', '').replace('/', ' / ')

  const live = socketPrices[symbol]
  const remoteClose = pricesRemote[symbol]
  const displayPrice =
    live != null && Number.isFinite(live)
      ? live
      : remoteClose != null
        ? Number(remoteClose)
        : null

  // Real change %: compare current candle close vs previous candle close
  let changePct = null
  if (lastCandle?.close != null && prevCandle?.close != null) {
    changePct = ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100
  } else if (displayPrice != null && prevPricesRemote[symbol] != null) {
    const prevP = Number(prevPricesRemote[symbol])
    if (prevP > 0) changePct = ((displayPrice - prevP) / prevP) * 100
  }

  const positionsValue = positions.reduce(
    (s, p) => s + (p.marketValue ?? p.quantity * (p.markPrice ?? 0)),
    0
  )
  const totalEquity = cash + positionsValue

  const watchlistRows = WATCHLIST.map((sym) => {
    const live = socketPrices[sym]
    const remote = pricesRemote[sym]
    const prev = prevPricesRemote[sym]
    const p = live ?? remote
    const n = p != null ? Number(p) : null
    let pctVal = null
    if (n != null && prev != null && Number(prev) > 0) {
      pctVal = ((n - Number(prev)) / Number(prev)) * 100
    }
    return {
      sym,
      price: n,
      pct: pctVal,
      up: pctVal != null ? pctVal >= 0 : null,
    }
  })

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-obs-bg px-4 py-4 lg:px-6">
      <div
        className={`mb-4 rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/60 backdrop-blur-md lg:hidden`}
      >
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-[10px] font-mono text-obs-muted">
          <span className={connected ? 'text-obs-green' : 'text-obs-coral'}>
            ●
          </span>
          Feed {connected ? 'live' : 'reconnecting'}
        </div>
      </div>

      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 xl:flex-row">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-manrope text-xl font-bold text-obs-text md:text-2xl">
                  {headerTitle}
                </h1>
                <span className="rounded-[var(--radius-obs)] bg-obs-green/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-obs-green">
                  AI Recommended
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {['1H', '4H', '1D', '1W'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTf(t)}
                    className={`rounded-[var(--radius-obs)] px-3 py-1 font-mono text-xs font-semibold ${
                      tf === t
                        ? 'bg-obs-container-high text-obs-primary'
                        : 'text-obs-muted hover:bg-obs-surface hover:text-obs-text'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-3xl font-bold text-obs-text">
                {displayPrice != null
                  ? displayPrice.toLocaleString('en-US', {
                      maximumFractionDigits: 2,
                    })
                  : '—'}
              </p>
              {changePct != null ? (
                <p
                  className={`font-mono text-sm font-semibold ${changePct >= 0 ? 'text-obs-green' : 'text-obs-coral'}`}
                >
                  {changePct >= 0 ? '+' : ''}
                  {changePct.toFixed(2)}%
                </p>
              ) : null}
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
              <span className="obs-pulse-green inline-flex items-center gap-1.5 rounded-[var(--radius-obs-lg)] border border-obs-green/30 bg-obs-bg/90 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-obs-green backdrop-blur-md">
                <span className="h-1.5 w-1.5 rounded-full bg-obs-green" />
                Live feed active
              </span>
            </div>
            <select
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value)
                setLastCandle(null)
              }}
              className={`relative z-10 mb-2 rounded-[var(--radius-obs-lg)] border ${outline} bg-obs-surface/90 px-3 py-2 font-mono text-sm text-obs-text backdrop-blur-md`}
            >
              {symbols.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <CandlestickChart
              symbol={symbol}
              tf={tf}
              height={440}
              liveCandle={lastCandle}
            />

            {showPattern ? (
              <div
                className={`absolute bottom-16 left-1/2 z-10 w-[min(100%,420px)] -translate-x-1/2 rounded-[var(--radius-obs-xl)] border border-obs-primary/25 bg-obs-surface/95 p-4 shadow-2xl backdrop-blur-xl`}
              >
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-obs-primary">
                  Pattern detected
                </p>
                <p className="mt-2 text-sm text-obs-text">
                  Bullish Engulfing pattern identified with{' '}
                  <span className="font-semibold text-obs-green">84%</span>{' '}
                  historical accuracy on this timeframe.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="flex-1 rounded-[var(--radius-obs-lg)] bg-obs-green py-2 font-manrope text-xs font-bold text-[#111417]"
                  >
                    Long
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPattern(false)}
                    className={`flex-1 rounded-[var(--radius-obs-lg)] border ${outline} py-2 font-manrope text-xs font-semibold text-obs-muted`}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {indexStats.map((ix) => (
              <div
                key={ix.name}
                className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-4 backdrop-blur-md`}
              >
                <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-obs-muted">
                  {ix.name}
                </p>
                <p className="mt-1 font-manrope text-lg font-bold text-obs-text">
                  {ix.value != null ? `$${ix.value}` : '—'}
                </p>
                {ix.ch != null ? (
                  <p
                    className={`mt-1 font-mono text-xs font-semibold ${ix.up ? 'text-obs-green' : 'text-obs-coral'}`}
                  >
                    {ix.ch}
                  </p>
                ) : (
                  <p className="mt-1 font-mono text-xs text-obs-muted">live</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="w-full shrink-0 space-y-4 xl:w-[320px]">
          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-4 backdrop-blur-md`}
          >
            <h3 className="font-manrope text-sm font-bold text-obs-text">
              Watchlist
            </h3>
            <ul className="mt-3 space-y-2">
              {watchlistRows.map((w) => (
                <li
                  key={w.sym}
                  className="flex items-center justify-between rounded-[var(--radius-obs-lg)] bg-obs-bg/50 px-2 py-2 cursor-pointer hover:bg-obs-bg/70"
                  onClick={() => {
                    setSymbol(w.sym);
                    setLastCandle(null);
                  }}
                >
                  <span className="font-mono text-sm font-semibold text-obs-text">
                    {w.sym}
                  </span>
                  <span className="text-right">
                    <span className="block font-mono text-sm text-obs-text">
                      {w.price != null
                        ? `$${w.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                        : '—'}
                    </span>
                    {w.pct != null ? (
                      <span
                        className={`font-mono text-xs ${w.up ? 'text-obs-green' : 'text-obs-coral'}`}
                      >
                        {w.up ? '+' : ''}{w.pct.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-obs-muted">—</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-4 backdrop-blur-md`}
          >
            <p className="text-xs text-obs-muted">Portfolio value</p>
            <p className="mt-1 font-manrope text-2xl font-bold text-obs-green">
              $
              {totalEquity.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-[var(--radius-obs-lg)] bg-obs-green py-2 font-manrope text-xs font-bold text-[#111417]"
              >
                Deposit
              </button>
              <button
                type="button"
                className={`flex-1 rounded-[var(--radius-obs-lg)] border ${outline} py-2 font-manrope text-xs font-semibold text-obs-text`}
              >
                Withdraw
              </button>
            </div>
          </div>

          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-4 backdrop-blur-md`}
          >
            <h3 className="font-manrope text-sm font-bold text-obs-text">
              AI Sentiment Engine
            </h3>
            <div className="relative mx-auto mt-4 h-32 w-32">
              <svg className="-rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="rgba(70,69,84,0.25)"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#44dfa3"
                  strokeWidth="3"
                  strokeDasharray="76, 100"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-manrope text-2xl font-bold text-obs-text">
                  76%
                </span>
              </div>
            </div>
            <p className="mt-2 text-center text-sm text-obs-green">
              Overall Bullish Outlook
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
