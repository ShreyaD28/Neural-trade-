import { useEffect, useState } from 'react'
import api from '../api/client'

const outline = 'border-[rgba(70,69,84,0.15)]'
const SYMBOLS = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'BTC-USD']

export default function AIInsights() {
  const [llmText, setLlmText] = useState('')
  const [signals, setSignals] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const results = await Promise.all(
          SYMBOLS.map((s) =>
            api.get(`/signals/ml/${s}`).then((r) => [s, r.data]).catch(() => [s, null])
          )
        )
        if (!cancelled) setSignals(Object.fromEntries(results))
      } catch {
        if (!cancelled) setSignals({})
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const id = setInterval(load, 60_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await api.post('/signals/llm', {
          symbol: 'BTC-USD',
          question: 'Give me a 2 sentence trading insight',
        })
        if (!cancelled) setLlmText(data.narrative ?? '')
      } catch {
        if (!cancelled) setLlmText('')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const cards = SYMBOLS.map((symbol) => ({ symbol, ...signals[symbol] }))

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-obs-bg px-4 py-4 lg:px-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-col gap-4 border-b border-[rgba(70,69,84,0.15)] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-manrope text-2xl font-bold text-obs-text">
              AI Intelligence Panel
            </h1>
            <p className="mt-1 text-sm text-obs-muted">
              Multi-model ensemble · regime-aware routing
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-[var(--radius-obs-lg)] bg-obs-green/15 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-obs-green">
            <span className="obs-pulse-green h-2 w-2 rounded-full bg-obs-green" />
            Live intelligence stream
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-6 backdrop-blur-md`}
          >
            <h2 className="font-manrope text-sm font-bold text-obs-text">
              Portfolio risk score
            </h2>
            <div className="relative mx-auto mt-6 h-40 w-40">
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
                  strokeDasharray="32, 100"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-manrope text-3xl font-bold text-obs-text">
                  32
                </span>
                <span className="text-xs font-semibold text-obs-green">
                  OPTIMIZED
                </span>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className={`rounded-[var(--radius-obs-lg)] border ${outline} bg-obs-bg/60 p-3`}>
                <p className="text-[10px] uppercase text-obs-muted">
                  Volatility index
                </p>
                <p className="font-mono font-bold text-obs-text">12.4%</p>
                <p className="text-xs text-obs-green">Low</p>
              </div>
              <div className={`rounded-[var(--radius-obs-lg)] border ${outline} bg-obs-bg/60 p-3`}>
                <p className="text-[10px] uppercase text-obs-muted">
                  Max drawdown
                </p>
                <p className="font-mono font-bold text-obs-text">4.2%</p>
                <p className="text-xs text-obs-muted">Stable</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div
              className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-5 backdrop-blur-md`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-manrope text-sm font-bold text-obs-coral">
                    High exposure alerts
                  </h3>
                  <p className="mt-2 text-sm text-obs-muted">
                    Technology sector oversaturation vs. target policy weight.
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-[var(--radius-obs-lg)] bg-obs-primary/20 px-3 py-1.5 font-mono text-[10px] font-bold uppercase text-obs-primary"
                >
                  Rebalance
                </button>
              </div>
            </div>
            <div
              className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-5 backdrop-blur-md`}
            >
              <h3 className="font-manrope text-sm font-bold text-obs-text">
                Diversification strategy
              </h3>
              <ul className="mt-3 space-y-2 font-mono text-xs text-obs-muted">
                <li>
                  <span className="text-obs-green">BUY HEDGE:</span> GOLD/USD
                </li>
                <li>
                  <span className="text-obs-primary">SECTOR ENTRY:</span>{' '}
                  ENERGY
                </li>
                <li>
                  <span className="text-obs-coral">LIQUIDITY:</span> +5% CASH
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {cards.map((c) => {
            const statusColor =
              c.signal === 'BUY' ? 'bg-obs-green/20 text-obs-green' : c.signal === 'SELL' ? 'bg-obs-coral/20 text-obs-coral' : 'bg-obs-container-high text-obs-muted'
            return (
              <div key={c.symbol} className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-5 backdrop-blur-md`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-obs-text">{c.symbol}</span>
                  <span className={`rounded-[var(--radius-obs)] px-2 py-0.5 font-mono text-[10px] font-bold ${statusColor}`}>{c.signal ?? '—'}</span>
                </div>
                <p className="mt-3 text-xs text-obs-muted">
                  RSI {c.rsi != null ? Number(c.rsi).toFixed(1) : '—'} · MACD {c.macd != null ? Number(c.macd).toFixed(4) : '—'}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-[var(--radius-obs)] bg-obs-bg">
                  <div className="h-full bg-obs-primary" style={{ width: `${Math.min(100, Math.max(0, Number(c.confidence ?? 0) * 100))}%` }} />
                </div>
                <p className="mt-2 text-xs text-obs-muted">Confidence {Math.round(Number(c.confidence ?? 0) * 100)}%</p>
              </div>
            )
          })}
        </div>

        {loading ? <p className="text-obs-muted">Loading signals...</p> : null}
        {llmText ? (
          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-5 backdrop-blur-md`}
          >
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-obs-primary">
              LLM commentary
            </h3>
            <p className="mt-2 text-sm italic leading-relaxed text-obs-muted">
              {llmText}
            </p>
          </div>
        ) : null}

        <footer
          className={`flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-bg/80 px-4 py-3 font-mono text-[10px] uppercase tracking-wide text-obs-muted`}
        >
          <span>Neural engine: V3.4 NeuralTrade-Core</span>
          <span>Confidence 94.2%</span>
          <span>Training epochs 1,240</span>
          <span className="text-obs-green">Latency 24ms</span>
        </footer>
      </div>
    </div>
  )
}
