import { createContext } from 'react';
import type { WebSocketEventBus } from '@/client/utils/WebSocketEventBus';
import type { ReadyState, ChannelEvent } from '@/shared/types/websocket.types';

/**
 * WebSocket context interface
 */
export interface WebSocketContextValue {
  sendMessage: (channel: string, event: ChannelEvent) => void;
  readyState: ReadyState;
  isConnected: boolean;
  isReady: boolean;
  reconnectAttempt: number;
  eventBus: WebSocketEventBus;
  reconnect: () => void;
  isOnline: boolean;
}

/**
 * WebSocket context - provides access to the global WebSocket connection
 */
export const WebSocketContext = createContext<WebSocketContextValue | null>(null);
