import {
  CandlestickSeries,
  ColorType,
  createChart,
} from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import api from '../api/client'

const DEFAULT_HEIGHT = 400

function candleToBar(c) {
  const t = Math.floor(new Date(c.timestamp).getTime() / 1000)
  return {
    time: t,
    open: Number(c.open),
    high: Number(c.high),
    low: Number(c.low),
    close: Number(c.close),
  }
}

/**
 * @param {{ symbol: string, height?: number, liveCandle?: object | null }} props
 */
export default function CandlestickChart({
  symbol,
  tf = '1m',
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

    ;(async () => {
      try {
        const { data } = await api.get(`/market/candles/${encodeURIComponent(symbol)}`, {
          params: { limit: 400, interval: tf },
        })
        if (cancelled) return
        const raw = data.candles ?? []
        const bars = raw
          .map(candleToBar)
          .filter((b) => Number.isFinite(b.time) && Number.isFinite(b.close))
          .sort((a, b) => a.time - b.time)
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
  }, [symbol, height])

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
