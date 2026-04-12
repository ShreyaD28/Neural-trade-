import { useEffect, useState } from 'react'
import { mlApi } from '../api/client'

const DEFAULT_ITEMS = [
  { label: 'BTC/USD', key: 'BTC-USD' },
  { label: 'ETH/USD', key: 'ETH-USD' },
  { label: 'TSLA', key: 'TSLA' },
  { label: 'NVDA', key: 'NVDA' },
  { label: 'GOLD', key: 'GC=F' },
  { label: 'AMZN', key: 'AMZN' },
]

function fmt(n) {
  if (n == null || Number.isNaN(n)) return '—'
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export default function TickerTape({ livePrices = {} }) {
  const [remote, setRemote] = useState({})

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await mlApi.get('/prices')
        if (!cancelled) setRemote(data ?? {})
      } catch {
        if (!cancelled) setRemote({})
      }
    }
    load()
    const id = setInterval(load, 45_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const staticPct = {
    'BTC-USD': 1.24,
    'ETH-USD': 0.88,
    TSLA: -0.42,
    NVDA: 2.11,
    'GC=F': 0.15,
    AMZN: 0.67,
  }

  const row = DEFAULT_ITEMS.map(({ label, key }) => {
    const v = livePrices[key] ?? remote[key]
    const p = staticPct[key] ?? 0
    const up = p >= 0
    return { label, price: fmt(v), pct: p.toFixed(2), up }
  })

  const doubled = [...row, ...row]

  return (
    <div className="relative overflow-hidden border-b border-[rgba(70,69,84,0.15)] bg-obs-bg py-2">
      <div className="flex whitespace-nowrap animate-obs-ticker">
        {doubled.map((item, i) => (
          <span
            key={`${item.label}-${i}`}
            className="inline-flex shrink-0 items-center gap-3 px-8 font-mono text-xs text-obs-muted"
          >
            <span className="font-semibold text-obs-text">{item.label}</span>
            <span className="text-obs-text">${item.price}</span>
            <span
              className={item.up ? 'text-obs-green' : 'text-obs-coral'}
            >
              {item.up ? '+' : ''}
              {item.pct}%
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
