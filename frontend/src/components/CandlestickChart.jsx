import {
  CandlestickSeries,
  ColorType,
  createChart,
} from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import api, { mlApi } from '../api/client'

const DEFAULT_HEIGHT = 400

function candleToBar(c) {
  const rawTime = c.timestamp != null ? c.timestamp : c.time
  const t = typeof rawTime === 'number'
    ? rawTime
    : Math.floor(new Date(rawTime).getTime() / 1000)
  return {
    time: t,
    open: Number(c.open),
    high: Number(c.high),
    low: Number(c.low),
    close: Number(c.close),
  }
}

function normalizeBars(raw) {
  const byTime = new Map()
  for (const item of raw ?? []) {
    const bar = candleToBar(item)
    const valid =
      Number.isFinite(bar.time) &&
      Number.isFinite(bar.open) &&
      Number.isFinite(bar.high) &&
      Number.isFinite(bar.low) &&
      Number.isFinite(bar.close)
    if (!valid) continue
    byTime.set(bar.time, bar)
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time)
}

function mapTimeframe(tf) {
  const byTf = {
    '1H': { interval: '1m', limit: 60 },
    '4H': { interval: '1m', limit: 240 },
    '1D': { interval: '1m', limit: 390 },
    '1W': { interval: '1m', limit: 1200 },
  }
  return byTf[tf] ?? { interval: '1m', limit: 390 }
}

/**
 * @param {{ symbol: string, height?: number, liveCandle?: object | null }} props
 */
export default function CandlestickChart({
  symbol,
  tf = '1m',
  source = 'backend',
  interval = '1h',
  period = '1mo',
  height = DEFAULT_HEIGHT,
  liveCandle = null,
}) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const liveCandleRef = useRef(liveCandle)
  useEffect(() => {
    liveCandleRef.current = liveCandle
  }, [liveCandle])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: '#111417' },
        textColor: '#c7c4d7',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: 'rgba(70,69,84,0.12)' },
        horzLines: { color: 'rgba(70,69,84,0.12)' },
      },
      crosshair: {
        vertLine: { color: 'rgba(192,193,255,0.35)' },
        horzLine: { color: 'rgba(192,193,255,0.35)' },
      },
      timeScale: {
        borderColor: 'rgba(70,69,84,0.15)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: { borderColor: 'rgba(70,69,84,0.15)' },
      width: Math.max(1, el.clientWidth || el.getBoundingClientRect().width),
      height,
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#44dfa3',
      downColor: '#ffb3ac',
      borderUpColor: '#44dfa3',
      borderDownColor: '#ffb3ac',
      wickUpColor: '#44dfa3',
      wickDownColor: '#ffb3ac',
    })

    chartRef.current = chart
    seriesRef.current = series

    let cancelled = false

    const { interval: backendInterval, limit } = mapTimeframe(tf)
    ;(async () => {
      try {
        const { data } = source === 'ml'
          ? await mlApi.get(`/candles/${encodeURIComponent(symbol)}`, {
              params: { interval, period },
            })
          : await api.get(`/market/candles/${encodeURIComponent(symbol)}`, {
              params: { limit, interval: backendInterval },
            })
        if (cancelled) return
        const raw = source === 'ml' ? (Array.isArray(data) ? data : []) : (data.candles ?? [])
        const bars = normalizeBars(raw)
        series.setData(bars)
        chart.timeScale().fitContent()

        const live = liveCandleRef.current
        if (
          live &&
          live.symbol === symbol &&
          bars.length > 0
        ) {
          const bar = candleToBar(live)
          if (Number.isFinite(bar.time)) {
            try {
              series.update(bar)
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        if (!cancelled) {
          series.setData([])
        }
      }
    })()

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (!cr || !chartRef.current) return
      chartRef.current.resize(Math.max(1, Math.floor(cr.width)), height)
    })
    ro.observe(el)

    return () => {
      cancelled = true
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [symbol, height, tf, source, interval, period])

  useEffect(() => {
    if (!liveCandle || liveCandle.symbol !== symbol || !seriesRef.current) {
      return
    }
    const bar = candleToBar(liveCandle)
    if (!Number.isFinite(bar.time)) return
    try {
      seriesRef.current.update(bar)
    } catch {
      /* ignore update before setData */
    }
  }, [liveCandle, symbol])

  return (
    <div
      ref={containerRef}
      className="w-full min-w-0 overflow-hidden rounded-[var(--radius-obs-xl)] border border-[rgba(70,69,84,0.15)] bg-obs-bg"
      style={{ height: `${height}px` }}
    />
  )
}
