import { useEffect, useRef, useCallback } from "react";

const WS_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000")
  .replace("https://", "wss://")
  .replace("http://", "ws://") + "/ws";

export function useWebSocket(onMessage) {
  const ws       = useRef(null);
  const retries  = useRef(0);
  const timer    = useRef(null);
  const onMsgRef = useRef(onMessage);

  useEffect(() => { onMsgRef.current = onMessage; }, [onMessage]);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        retries.current = 0;
        ws.current.send(JSON.stringify({ type: "DASHBOARD_HELLO" }));
        console.log("🔁 WebSocket conectado");
      };

      ws.current.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          onMsgRef.current?.(msg);
        } catch {}
      };

      ws.current.onclose = () => {
        console.log("🔌 WebSocket desconectado, reconectando...");
        const delay = Math.min(1000 * 2 ** retries.current, 30000);
        retries.current++;
        timer.current = setTimeout(connect, delay);
      };

      ws.current.onerror = () => ws.current?.close();
    } catch (e) {
      console.error("WebSocket erro:", e);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(timer.current);
      ws.current?.close();
    };
  }, [connect]);

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
}
