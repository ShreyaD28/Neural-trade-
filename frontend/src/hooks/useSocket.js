import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const rawSocketUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5050'

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
    s.emit('subscribe', symbol)
    return () => {
      s.emit('unsubscribe', symbol)
    }
  }, [symbol, connected])

  return { prices, latency, connected }
}
