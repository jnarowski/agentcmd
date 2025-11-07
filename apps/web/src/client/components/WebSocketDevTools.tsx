import { useEffect, useState, useRef } from 'react';
import { useWebSocket } from '@/client/hooks/useWebSocket';
import { wsMetrics } from '@/client/utils/WebSocketMetrics';
import { type ChannelEvent } from '@/shared/types/websocket.types';
import { useDebugMode } from '@/client/hooks/useDebugMode';

/**
 * Message log entry for DevTools
 */
interface MessageLogEntry {
  id: string;
  timestamp: number;
  direction: 'sent' | 'received';
  channel: string;
  type: string;
  data: unknown;
}

/**
 * WebSocketDevTools
 *
 * Floating debugging panel for WebSocket development (debug mode only).
 * Features:
 * - Recent messages (last 50, filterable by channel)
 * - Active subscriptions list
 * - Metrics dashboard with latency graph
 * - Manual controls (reconnect, disconnect, clear logs)
 * - Keyboard shortcut: Ctrl+Shift+W (Cmd+Shift+W on Mac)
 *
 * Enable by adding ?debug=true to the URL
 */
export function WebSocketDevTools() {
  const isDebugMode = useDebugMode();
  const [isOpen, setIsOpen] = useState(false);
  const [messageLog, setMessageLog] = useState<MessageLogEntry[]>([]);
  const [channelFilter, setChannelFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'messages' | 'subscriptions' | 'metrics'>('messages');
  const messageLogRef = useRef<MessageLogEntry[]>([]);
  const { eventBus, reconnect, isConnected, isReady } = useWebSocket();

  // Keyboard shortcut to toggle (Ctrl+Shift+W or Cmd+Shift+W)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Intercept WebSocket messages for logging
  useEffect(() => {
    if (!isOpen) return;

    // Store original emit to intercept
    const originalEmit = eventBus.emit.bind(eventBus);

    // Override emit to log messages
    eventBus.emit = (channel: string, event: ChannelEvent) => {
      // Log received message
      const entry: MessageLogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        direction: 'received',
        channel,
        type: event.type,
        data: event.data,
      };

      messageLogRef.current = [...messageLogRef.current.slice(-49), entry];
      setMessageLog(messageLogRef.current);

      // Call original emit
      return originalEmit(channel, event);
    };

    return () => {
      // Restore original emit
      eventBus.emit = originalEmit;
    };
  }, [isOpen, eventBus]);

  // Get active subscriptions from EventBus
  const activeChannels = eventBus.getActiveChannels();

  // Filter messages by channel
  const filteredMessages = channelFilter
    ? messageLog.filter((msg) => msg.channel.includes(channelFilter))
    : messageLog;

  // Get metrics snapshot
  const metrics = wsMetrics.snapshot();

  // Clear message log
  const clearLogs = () => {
    messageLogRef.current = [];
    setMessageLog([]);
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  // Only render in debug mode (when ?debug=true is in URL)
  if (!isDebugMode) {
    return null;
  }

  // Render latency graph (simple sparkline)
  const renderLatencyGraph = () => {
    const latencies = wsMetrics.latencies;
    if (latencies.length === 0) {
      return <div className="text-gray-500 text-sm">No latency data yet</div>;
    }

    const max = Math.max(...latencies);
    const min = Math.min(...latencies);
    const range = max - min || 1;

    return (
      <div className="flex items-end gap-0.5 h-16">
        {latencies.map((latency, i) => {
          const height = ((latency - min) / range) * 100;
          return (
            <div
              key={i}
              className="flex-1 bg-blue-500 rounded-t"
              style={{ height: `${Math.max(height, 5)}%` }}
              title={`${latency}ms`}
            />
          );
        })}
      </div>
    );
  };

  if (!isOpen) {
    // Minimized floating button
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-800 transition-colors z-50 text-sm font-medium"
        title="Open WebSocket DevTools (Ctrl+Shift+W)"
      >
        WS DevTools
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-[600px] h-[500px] bg-white border border-gray-300 rounded-lg shadow-2xl z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm">WebSocket DevTools</h3>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`}
              title={isConnected ? 'Connected' : 'Disconnected'}
            />
            <span className="text-xs opacity-75">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:text-gray-300 text-xl leading-none"
          title="Close (Ctrl+Shift+W)"
        >
          ×
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex">
        {(['messages', 'subscriptions', 'metrics'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'messages' && (
          <div className="space-y-3">
            {/* Filter input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filter by channel..."
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
              />
              <button
                onClick={clearLogs}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
              >
                Clear
              </button>
            </div>

            {/* Messages list */}
            <div className="space-y-2">
              {filteredMessages.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-8">
                  No messages yet. Send or receive messages to see them here.
                </div>
              ) : (
                filteredMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2 rounded text-xs font-mono border ${
                      msg.direction === 'sent'
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-green-50 border-green-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">
                        {msg.direction === 'sent' ? '↑ SENT' : '↓ RECEIVED'}
                      </span>
                      <span className="text-gray-500">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className="text-gray-700">
                      <span className="font-semibold">Channel:</span> {msg.channel}
                    </div>
                    <div className="text-gray-700">
                      <span className="font-semibold">Type:</span> {msg.type}
                    </div>
                    <details className="mt-1">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                        View data
                      </summary>
                      <pre className="mt-1 p-2 bg-white rounded text-[10px] overflow-x-auto">
                        {JSON.stringify(msg.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="space-y-2">
            <div className="text-sm font-medium mb-3">
              Active Subscriptions ({activeChannels.length})
            </div>
            {activeChannels.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-8">
                No active subscriptions
              </div>
            ) : (
              activeChannels.map((channel) => (
                <div
                  key={channel}
                  className="p-2 bg-gray-50 border border-gray-200 rounded text-sm font-mono"
                >
                  {channel}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="space-y-4">
            {/* Metrics stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="text-xs text-blue-600 font-medium">Messages Sent</div>
                <div className="text-2xl font-bold text-blue-900">{metrics.messagesSent}</div>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <div className="text-xs text-green-600 font-medium">Messages Received</div>
                <div className="text-2xl font-bold text-green-900">
                  {metrics.messagesReceived}
                </div>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="text-xs text-yellow-600 font-medium">Reconnections</div>
                <div className="text-2xl font-bold text-yellow-900">{metrics.reconnections}</div>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                <div className="text-xs text-purple-600 font-medium">Avg Latency</div>
                <div className="text-2xl font-bold text-purple-900">
                  {metrics.averageLatency !== null ? `${metrics.averageLatency}ms` : 'N/A'}
                </div>
              </div>
            </div>

            {/* Latency graph */}
            <div>
              <div className="text-sm font-medium mb-2">Latency History</div>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                {renderLatencyGraph()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Last {wsMetrics.latencies.length} ping measurements
              </div>
            </div>

            {/* Reset button */}
            <button
              onClick={() => wsMetrics.reset()}
              className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium"
            >
              Reset Metrics
            </button>
          </div>
        )}
      </div>

      {/* Footer controls */}
      <div className="border-t border-gray-200 px-4 py-2 flex items-center gap-2">
        <button
          onClick={reconnect}
          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium"
          disabled={isConnected && isReady}
        >
          Reconnect
        </button>
        <div className="flex-1" />
        <div className="text-xs text-gray-500">
          Press <kbd className="px-1 bg-gray-200 rounded">Ctrl+Shift+W</kbd> to toggle
        </div>
      </div>
    </div>
  );
}
