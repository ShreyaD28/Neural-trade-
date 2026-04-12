import { useEffect, useState } from 'react'
import api from '../api/client'
import { mlApi } from '../api/client'

const outline = 'border-[rgba(70,69,84,0.15)]'

export default function AIInsights() {
  const [llmText, setLlmText] = useState('')
  const [signals, setSignals] = useState({
    sol: null,
    btc: null,
    nvda: null,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [sol, btc, nvda] = await Promise.all([
          mlApi.get('/signals/SOL-USD').then((r) => r.data).catch(() => null),
          mlApi.get('/signals/BTC-USD').then((r) => r.data).catch(() => null),
          mlApi.get('/signals/NVDA').then((r) => r.data).catch(() => null),
        ])
        if (!cancelled) setSignals({ sol, btc, nvda })
      } catch {
        if (!cancelled) setSignals({ sol: null, btc: null, nvda: null })
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await api.post('/signals/llm', {
          symbol: 'BTC-USD',
          candlesSummary: 'Multi-asset panel: SOL, BTC, NVDA signals loaded.',
          question: 'One paragraph: portfolio-level risk tone. Not financial advice.',
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

  const solSig = signals.sol ?? {
    signal: 'STRONG BUY',
    confidence: 0.88,
    rsi: 52,
    macd: 0.02,
  }
  const btcSig = signals.btc ?? {
    signal: 'HOLD',
    confidence: 0.55,
    rsi: 48,
    macd: -0.01,
  }
  const nvdaSig = signals.nvda ?? {
    signal: 'SELL SIGNAL',
    confidence: 0.72,
    rsi: 71,
    macd: 0.08,
  }

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
          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-5 backdrop-blur-md`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-obs-text">SOL/USDT</span>
              <span className="rounded-[var(--radius-obs)] bg-obs-green/20 px-2 py-0.5 font-mono text-[10px] font-bold text-obs-green">
                STRONG BUY
              </span>
            </div>
            <p className="mt-2 font-mono text-xs text-obs-muted">
              Spot {solSig.rsi != null ? `RSI ${Number(solSig.rsi).toFixed(1)}` : ''}{' '}
              · confidence-driven entry
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-[var(--radius-obs)] bg-obs-bg">
              <div
                className="h-full bg-obs-green"
                style={{
                  width: `${Math.min(100, (solSig.confidence ?? 0.5) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-3 text-xs text-obs-muted">
              Momentum + funding neutral: favorable for scaled long.
            </p>
            <button
              type="button"
              className="mt-4 w-full rounded-[var(--radius-obs-lg)] bg-obs-green py-2 font-manrope text-xs font-bold text-[#111417]"
            >
              Execute position
            </button>
          </div>

          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-5 backdrop-blur-md`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-obs-text">BTC/USD</span>
              <span className="rounded-[var(--radius-obs)] bg-obs-container-high px-2 py-0.5 font-mono text-[10px] font-bold text-obs-muted">
                HOLD
              </span>
            </div>
            <p className="mt-3 text-xs text-obs-muted">
              Range-bound chop: wait for volatility expansion or breakout
              confirmation above key gamma wall.
              {btcSig.rsi != null && (
                <span className="mt-1 block font-mono text-[10px] text-obs-muted/80">
                  RSI {Number(btcSig.rsi).toFixed(1)} · conf.{' '}
                  {((btcSig.confidence ?? 0) * 100).toFixed(0)}%
                </span>
              )}
            </p>
            <button
              type="button"
              className={`mt-4 w-full rounded-[var(--radius-obs-lg)] border ${outline} py-2 font-manrope text-xs font-semibold text-obs-text`}
            >
              View deep analysis
            </button>
          </div>

          <div
            className={`rounded-[var(--radius-obs-xl)] border ${outline} bg-obs-surface/70 p-5 backdrop-blur-md`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-obs-text">NVDA/USD</span>
              <span className="rounded-[var(--radius-obs)] bg-obs-coral/20 px-2 py-0.5 font-mono text-[10px] font-bold text-obs-coral">
                SELL SIGNAL
              </span>
            </div>
            <p className="mt-3 text-xs text-obs-muted">
              RSI overbought ({nvdaSig.rsi != null ? Number(nvdaSig.rsi).toFixed(0) : '70+'}
              ) — mean reversion risk into earnings drift.
            </p>
            <button
              type="button"
              className="mt-4 w-full rounded-[var(--radius-obs-lg)] bg-obs-coral py-2 font-manrope text-xs font-bold text-[#111417]"
            >
              Exit position
            </button>
          </div>
        </div>

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
