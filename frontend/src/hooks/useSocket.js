import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const PROD_BACKEND_ORIGIN = 'https://neural-trade-39s2.onrender.com'

function getDefaultSocketUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:5050'
  }

  const { hostname } = window.location
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5050'
  }

  return PROD_BACKEND_ORIGIN
}

const rawSocketUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  getDefaultSocketUrl()

const SOCKET_URL = rawSocketUrl.replace(/\/api\/?$/, '')

/**
 * @param {string | null} symbol - subscribe to this symbol's room
 * @param {{ onCandle?: (c: object) => void }} options
 */
export function useSocket(symbol, options = {}) {
  const { onCandle } = options
  const onCandleRef = useRef(onCandle)
  useEffect(() => {
    onCandleRef.current = onCandle
  }, [onCandle])

  const [prices, setPrices] = useState({})
  const [latency, setLatency] = useState(null)
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)

  const handleCandle = useCallback((c) => {
    if (!c?.symbol) return
    const close = Number(c.close)
    if (!Number.isFinite(close)) return
    setPrices((prev) => ({ ...prev, [c.symbol]: close }))
    if (c.timestamp) {
      const t = new Date(c.timestamp).getTime()
      if (Number.isFinite(t)) setLatency(Math.max(0, Date.now() - t))
    }
    onCandleRef.current?.(c)
  }, [])

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 12,
      reconnectionDelay: 1200,
    })
    socketRef.current = socket
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('candle', handleCandle)
    return () => {
      socket.off('candle', handleCandle)
      socket.close()
      socketRef.current = null
      setConnected(false)
    }
  }, [handleCandle])

  useEffect(() => {
    const s = socketRef.current
    if (!s || !symbol) return

    // Subscribe immediately and re-subscribe after reconnects
    const doSubscribe = () => s.emit('subscribe', symbol)
    doSubscribe()
    s.on('connect', doSubscribe)

    return () => {
      s.off('connect', doSubscribe)
      if (s.connected) {
        s.emit('unsubscribe', symbol)
      }
    }
  }, [symbol])

  return { prices, latency, connected }
}
