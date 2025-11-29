import { useEffect, useState } from "react";
import { ReadyState } from "@/shared/types/websocket.types";

interface ConnectionStatusBannerProps {
  readyState: ReadyState;
  reconnectAttempt: number;
  onReconnect: () => void;
  isOnline: boolean;
}

/**
 * ConnectionStatusBanner
 *
 * Compact notch overlay shown at top-center when connection is not established.
 * Shows for ALL non-OPEN states with 500ms delay to prevent flashing.
 * Handles: initial connecting, reconnecting, and disconnected states.
 */
export function ConnectionStatusBanner({
  readyState,
  reconnectAttempt,
  onReconnect,
  isOnline,
}: ConnectionStatusBannerProps) {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    // Show banner for any non-OPEN state or offline
    const shouldShow =
      !isOnline ||
      readyState === ReadyState.CONNECTING ||
      readyState === ReadyState.CLOSED;

    if (shouldShow) {
      // 500ms delay prevents flash during quick reconnects
      timer = setTimeout(() => setShowBanner(true), 500);
    } else {
      setShowBanner(false);
    }

    return () => clearTimeout(timer);
  }, [readyState, isOnline]);

  if (!showBanner) {
    return null;
  }

  // Determine connection status message
  const getConnectionStatus = () => {
    // Offline state (network is down)
    if (!isOnline) {
      return {
        message: "You're offline",
        showReconnect: false,
      };
    }

    // Connecting state
    if (readyState === ReadyState.CONNECTING) {
      if (reconnectAttempt === 0) {
        return {
          message: "Connecting...",
          showReconnect: false,
        };
      }
      return {
        message: `Reconnecting... (${reconnectAttempt})`,
        showReconnect: true,
      };
    }

    // Closed state
    if (readyState === ReadyState.CLOSED) {
      return {
        message: "Disconnected",
        showReconnect: true,
      };
    }

    return null;
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
