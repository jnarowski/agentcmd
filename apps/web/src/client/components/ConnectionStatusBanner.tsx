import { useEffect, useState } from "react";
import { ReadyState } from "@/shared/types/websocket.types";

interface ConnectionStatusBannerProps {
  readyState: ReadyState;
  connectionAttempts: number;
  onReconnect: () => void;
}

/**
 * ConnectionStatusBanner
 *
 * Compact notch overlay shown at the top-center of the viewport when there's a connection error.
 * Only displays for disconnected or reconnecting states (not during initial connection).
 * Uses fixed positioning to stay visible above all content.
 */
export function ConnectionStatusBanner({
  readyState,
  connectionAttempts,
  onReconnect,
}: ConnectionStatusBannerProps) {
  // Debounce showing "Disconnected" state to prevent flashing during hot reload
  const [showDisconnected, setShowDisconnected] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (readyState === ReadyState.CLOSED) {
      // Wait 2 seconds before showing disconnected banner
      // This prevents flashing during hot reload or quick reconnections
      timer = setTimeout(() => {
        setShowDisconnected(true);
      }, 2000);
    } else {
      // Connected or connecting - hide banner immediately
      setShowDisconnected(false);
    }

    return () => clearTimeout(timer);
  }, [readyState]);

  // Detect if auto-reconnection is in progress
  const isReconnecting =
    readyState === ReadyState.CONNECTING && connectionAttempts > 1;

  // Determine connection status message
  const getConnectionStatus = () => {
    if (readyState === ReadyState.CONNECTING && isReconnecting) {
      // Auto-reconnection in progress
      const attemptNumber = connectionAttempts - 1;
      const isFirstReconnect = attemptNumber === 1;
      return {
        message: isFirstReconnect
          ? `Connecting (${attemptNumber}/5)`
          : `Reconnecting... (${Math.min(attemptNumber, 5)}/5)`,
        showReconnect: true,
      };
    } else if (
      (readyState === ReadyState.CLOSING || readyState === ReadyState.CLOSED) &&
      showDisconnected
    ) {
      // Disconnected state (only shown after debounce)
      return {
        message: "Disconnected",
        showReconnect: true,
      };
    }
    return null; // Hide during initial connection and when fully connected
  };

  const status = getConnectionStatus();

  if (!status) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-100 animate-in slide-in-from-top-2 duration-200">
      <div className="bg-yellow-900 text-white px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 text-xs font-medium">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
        <span>{status.message}</span>
        {status.showReconnect && (
          <button
            onClick={onReconnect}
            className="ml-1 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-white font-medium transition-colors"
          >
            Reconnect
          </button>
        )}
      </div>
    </div>
  );
}
