import { useEffect, useState, useRef } from 'react';
import { useWebSocket } from '@/client/hooks/useWebSocket';
import { wsMetrics } from '@/client/utils/WebSocketMetrics';
import type { ChannelEvent } from '@/shared/types/websocket.types';
import { formatDate } from '@/shared/utils/formatDate';

interface MessageLogEntry {
  id: string;
  timestamp: number;
  channel: string;
  type: string;
  data: unknown;
}

/**
 * WebSocket diagnostics tab - shows connection status, messages, and subscriptions
 */
export function WebSocketTab() {
  const [messageLog, setMessageLog] = useState<MessageLogEntry[]>([]);
  const [channelFilter, setChannelFilter] = useState('');
  const [isCollapsedSections, setIsCollapsedSections] = useState({
    messages: false,
    subscriptions: true,
    metrics: true,
  });
  const messageLogRef = useRef<MessageLogEntry[]>([]);
  const { eventBus, reconnect, isConnected } = useWebSocket();

  // Intercept WebSocket messages for logging (last 20 messages)
  useEffect(() => {
    const originalEmit = eventBus.emit.bind(eventBus);

    eventBus.emit = (channel: string, event: ChannelEvent) => {
      const entry: MessageLogEntry = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        channel,
        type: event.type,
        data: event.data,
      };

      messageLogRef.current = [...messageLogRef.current.slice(-19), entry];
      setMessageLog(messageLogRef.current);

      return originalEmit(channel, event);
    };

    return () => {
      eventBus.emit = originalEmit;
    };
  }, [eventBus]);

  const metrics = wsMetrics.snapshot();
  const activeChannels = eventBus.getActiveChannels();
  const filteredMessages = channelFilter
    ? messageLog.filter((msg) => msg.channel.includes(channelFilter))
    : messageLog;

  const formatTime = (timestamp: number) => {
    return formatDate(timestamp, "HH:mm:ss.SSS");
  };

  const toggleSection = (section: keyof typeof isCollapsedSections) => {
    setIsCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="space-y-3">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span className="font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <button
          onClick={reconnect}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
          disabled={isConnected}
        >
          Reconnect
        </button>
      </div>

      {/* Messages Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <button
          onClick={() => toggleSection('messages')}
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700 transition-colors"
        >
          <span className="font-medium">Recent Messages ({filteredMessages.length}/20)</span>
          <span className="text-gray-400">{isCollapsedSections.messages ? '▶' : '▼'}</span>
        </button>

        {!isCollapsedSections.messages && (
          <div className="p-3 space-y-2 border-t border-gray-700">
            {/* Filter Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filter by channel..."
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="flex-1 px-3 py-1 bg-gray-900 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => {
                  messageLogRef.current = [];
                  setMessageLog([]);
                }}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
              >
                Clear
              </button>
            </div>

            {/* Messages List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredMessages.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-4">
                  {channelFilter ? 'No matching messages' : 'No messages yet'}
                </div>
              ) : (
                filteredMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-2 bg-gray-900 rounded text-xs font-mono border border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-1 text-gray-400">
                      <span>{formatTime(msg.timestamp)}</span>
                      <span className="text-blue-400">{msg.channel}</span>
                    </div>
                    <div className="text-gray-300">
                      <span className="text-green-400">Type:</span> {msg.type}
                    </div>
                    <details className="mt-1">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-300">
                        View data
                      </summary>
                      <pre className="mt-1 p-2 bg-gray-950 rounded text-[10px] overflow-x-auto">
                        {JSON.stringify(msg.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Subscriptions Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <button
          onClick={() => toggleSection('subscriptions')}
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700 transition-colors"
        >
          <span className="font-medium">Active Subscriptions ({activeChannels.length})</span>
          <span className="text-gray-400">{isCollapsedSections.subscriptions ? '▶' : '▼'}</span>
        </button>

        {!isCollapsedSections.subscriptions && (
          <div className="p-3 space-y-2 border-t border-gray-700">
            {activeChannels.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-4">No active subscriptions</div>
            ) : (
              <div className="space-y-1">
                {activeChannels.map((channel) => (
                  <div
                    key={channel}
                    className="p-2 bg-gray-900 rounded text-sm font-mono text-gray-300"
                  >
                    {channel}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metrics Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <button
          onClick={() => toggleSection('metrics')}
          className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700 transition-colors"
        >
          <span className="font-medium">Metrics</span>
          <span className="text-gray-400">{isCollapsedSections.metrics ? '▶' : '▼'}</span>
        </button>

        {!isCollapsedSections.metrics && (
          <div className="p-3 grid grid-cols-2 gap-2 border-t border-gray-700">
            <div className="p-2 bg-gray-900 rounded">
              <div className="text-xs text-gray-400">Sent</div>
              <div className="text-xl font-bold text-blue-400">{metrics.messagesSent}</div>
            </div>
            <div className="p-2 bg-gray-900 rounded">
              <div className="text-xs text-gray-400">Received</div>
              <div className="text-xl font-bold text-green-400">{metrics.messagesReceived}</div>
            </div>
            <div className="p-2 bg-gray-900 rounded">
              <div className="text-xs text-gray-400">Reconnections</div>
              <div className="text-xl font-bold text-yellow-400">{metrics.reconnections}</div>
            </div>
            <div className="p-2 bg-gray-900 rounded">
              <div className="text-xs text-gray-400">Avg Latency</div>
              <div className="text-xl font-bold text-purple-400">
                {metrics.averageLatency !== null ? `${metrics.averageLatency}ms` : 'N/A'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
