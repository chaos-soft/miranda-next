import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";

const url: string = import.meta.env.VITE_WEBSOCKET_URL;

function useWebSocket(onMessage_: (v: string) => void, error?: () => void) {
  const [status, setStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const isConnecting = useRef(false);
  const isMounted = useRef(true);
  const onError = useEffectEvent(() => error?.());
  const onMessage = useEffectEvent((v: string) => onMessage_(v));
  const socket = useRef<WebSocket | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!isMounted.current || isConnecting.current) {
      return;
    }
    isConnecting.current = true;
    setStatus("connecting");
    try {
      const w = new WebSocket(url);
      w.onclose = () => {
        if (isMounted.current) {
          isConnecting.current = false;
          onError();
          setStatus("disconnected");
          timeout.current = window.setTimeout(() => connect(), 5 * 1000);
        }
      };
      w.onmessage = (v) => {
        if (isMounted.current) {
          onMessage(v.data);
        }
      };
      w.onopen = () => {
        if (isMounted.current) {
          isConnecting.current = false;
          setStatus("connected");
        }
      };
      socket.current = w;
    } catch (e) {
      console.error("Failed to connect:", e);
      isConnecting.current = false;
      setStatus("disconnected");
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      isConnecting.current = false;
      isMounted.current = false;
      if (timeout.current) {
        clearTimeout(timeout.current);
        timeout.current = null;
      }
      if (socket.current) {
        socket.current.close();
        socket.current = null;
      }
      setStatus("disconnected");
    };
  }, [connect]);

  return status;
}

export default useWebSocket;
