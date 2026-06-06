import { useEffect, useRef, useState, useCallback } from "react"
import type { SystemState } from "@/types"

const WS_URL = import.meta.env.VITE_WS_URL || `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:3001`
const BACKOFF_MAX = 10000

export function useTreasurySocket() {
  const [state, setState] = useState<SystemState | null>(null)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const retriesRef = useRef(0)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      retriesRef.current = 0
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SystemState
        setState(data)
      } catch {
        // malformed frame
      }
    }

    ws.onclose = () => {
      setConnected(false)
      wsRef.current = null
      const delay = Math.min(1000 * 2 ** retriesRef.current, BACKOFF_MAX)
      retriesRef.current++
      setTimeout(connect, delay)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [connect])

  return { state, connected }
}
