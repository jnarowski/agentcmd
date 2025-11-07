import { useContext } from 'react';
import { WebSocketContext, type WebSocketContextValue } from '@/client/contexts/WebSocketContext';

/**
 * useWebSocket Hook
 *
 * Provides access to the global WebSocket connection and EventBus.
 * Must be used within a WebSocketProvider.
 *
 * @returns WebSocket context value with sendMessage, readyState, isConnected, and eventBus
 * @throws Error if used outside of WebSocketProvider
 *
 * @example
 * ```tsx
 * import { Channels } from '@/shared/websocket';
 * const { sendMessage, isConnected, eventBus } = useWebSocket();
 *
 * // Subscribe to events (use Channels helper for type safety)
 * useEffect(() => {
 *   const channel = Channels.session('123');
 *   const handler = (event) => console.log('Received:', event);
 *   eventBus.on(channel, handler);
 *   return () => eventBus.off(channel, handler);
 * }, [eventBus]);
 *
 * // Send messages (Phoenix Channels format: channel, type, data)
 * sendMessage(Channels.session('123'), {
 *   type: 'send_message',
 *   data: { message: 'Hello' }
 * });
 * ```
 */
export const useWebSocket = (): WebSocketContextValue => {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error(
      'useWebSocket must be used within a WebSocketProvider. ' +
        'Wrap your app with <WebSocketProvider> to use this hook.'
    );
  }

  return context;
};
