import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useSessionStore, selectActiveSession } from '@/client/pages/projects/sessions/stores/sessionStore';
import type { UIMessage, UnifiedContent } from '@/shared/types/message.types';
import { formatDate } from '@/shared/utils/formatDate';

/**
 * Message structure inspector - shows current session messages with problem detection
 */
export function MessagesTab() {
  const currentSession = useSessionStore(selectActiveSession);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    errorsOnly: false,
    toolUsesOnly: false,
    streamingOnly: false,
  });

  const messages = currentSession?.messages || [];

  // Apply filters
  const filteredMessages = messages.filter((msg: UIMessage) => {
    if (filters.errorsOnly) {
      const hasError = Array.isArray(msg.content) && msg.content.some(
        (block: UnifiedContent) => block.type === 'text' && block.text?.toLowerCase().includes('error')
      );
      if (!hasError) return false;
    }
    if (filters.toolUsesOnly) {
      const hasToolUse = Array.isArray(msg.content) && msg.content.some(
        (block: UnifiedContent) => block.type === 'tool_use'
      );
      if (!hasToolUse) return false;
    }
    if (filters.streamingOnly && !msg.isStreaming) {
      return false;
    }
    return true;
  });

  // Calculate statistics
  const stats = {
    total: messages.length,
    emptyContent: messages.filter((m: UIMessage) => Array.isArray(m.content) && m.content.length === 0).length,
    emptyTextBlocks: messages.reduce((count: number, msg: UIMessage) => {
      if (!Array.isArray(msg.content)) return count;
      const emptyTexts = msg.content.filter(
        (block: UnifiedContent) => block.type === 'text' && (!block.text || block.text.trim() === '')
      );
      return count + emptyTexts.length;
    }, 0),
    toolUseBlocks: messages.reduce((count: number, msg: UIMessage) => {
      if (!Array.isArray(msg.content)) return count;
      return count + msg.content.filter((block: UnifiedContent) => block.type === 'tool_use').length;
    }, 0),
    streamingMessages: messages.filter((m: UIMessage) => m.isStreaming).length,
  };

  const copyMessageJson = async (msg: UIMessage) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(msg, null, 2));
      setCopiedMessageId(msg.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy message JSON:', err);
    }
  };

  // No active session
  if (!currentSession) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">💬</div>
          <div className="font-medium">No active session</div>
          <div className="text-sm mt-1">Navigate to a session page to see messages</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Statistics */}
      <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <div className="text-gray-400">Total</div>
            <div className="text-lg font-bold">{stats.total}</div>
          </div>
          <div>
            <div className="text-gray-400">Streaming</div>
            <div className="text-lg font-bold text-yellow-400">{stats.streamingMessages}</div>
          </div>
          <div>
            <div className="text-gray-400">Tool Uses</div>
            <div className="text-lg font-bold text-blue-400">{stats.toolUseBlocks}</div>
          </div>
          {(stats.emptyContent > 0 || stats.emptyTextBlocks > 0) && (
            <div className="col-span-3 pt-2 border-t border-gray-700 text-xs">
              <span className="text-red-400">⚠️ Empty Content: {stats.emptyContent}</span>
              {' | '}
              <span className="text-orange-400">Empty Text Blocks: {stats.emptyTextBlocks}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilters((f) => ({ ...f, errorsOnly: !f.errorsOnly }))}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            filters.errorsOnly
              ? 'bg-red-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Errors Only
        </button>
        <button
          onClick={() => setFilters((f) => ({ ...f, toolUsesOnly: !f.toolUsesOnly }))}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            filters.toolUsesOnly
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Tool Uses
        </button>
        <button
          onClick={() => setFilters((f) => ({ ...f, streamingOnly: !f.streamingOnly }))}
          className={`px-3 py-1 rounded text-sm transition-colors ${
            filters.streamingOnly
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Streaming
        </button>
        {(filters.errorsOnly || filters.toolUsesOnly || filters.streamingOnly) && (
          <button
            onClick={() => setFilters({ errorsOnly: false, toolUsesOnly: false, streamingOnly: false })}
            className="px-3 py-1 rounded text-sm bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Messages List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredMessages.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-8">
            No messages match the current filters
          </div>
        ) : (
          filteredMessages.map((msg: UIMessage, index: number) => {
            const isEmpty = Array.isArray(msg.content) && msg.content.length === 0;
            const hasEmptyText =
              Array.isArray(msg.content) &&
              msg.content.some((block: UnifiedContent) => block.type === 'text' && (!block.text || block.text.trim() === ''));
            const isSelected = selectedMessageIndex === index;

            return (
              <div key={msg.id || index} className="relative">
                {/* Message Summary */}
                <button
                  onClick={() => setSelectedMessageIndex(isSelected ? null : index)}
                  className={`w-full text-left p-2 rounded text-sm ${
                    isEmpty || hasEmptyText
                      ? 'bg-red-900/50 border border-red-700'
                      : 'bg-gray-800 border border-gray-700'
                  } hover:bg-gray-700 transition-colors`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-medium text-gray-400">#{index}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          msg.role === 'user' ? 'bg-blue-700' : 'bg-green-700'
                        }`}
                      >
                        {msg.role}
                      </span>
                      {msg.isStreaming && (
                        <span className="px-2 py-0.5 rounded text-xs bg-yellow-700 animate-pulse">
                          STREAMING
                        </span>
                      )}
                      {isEmpty && (
                        <span className="px-2 py-0.5 rounded text-xs bg-red-700 font-medium">EMPTY!</span>
                      )}
                      {hasEmptyText && (
                        <span className="px-2 py-0.5 rounded text-xs bg-orange-700">Empty Text</span>
                      )}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {Array.isArray(msg.content) ? `${msg.content.length} blocks` : 'string'}
                    </div>
                  </div>
                  {Array.isArray(msg.content) && msg.content.length > 0 && (
                    <div className="mt-1 text-gray-400 text-xs truncate">
                      {msg.content.map((b: UnifiedContent) => b.type).join(', ')}
                    </div>
                  )}
                </button>

                {/* Copy Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyMessageJson(msg);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
                  title="Copy message JSON"
                >
                  {copiedMessageId === msg.id ? (
                    <Check className="h-3 w-3 text-green-400" />
                  ) : (
                    <Copy className="h-3 w-3 text-gray-300" />
                  )}
                </button>

                {/* Expanded Details */}
                {isSelected && (
                  <div className="mt-1 ml-4 p-3 bg-gray-950 rounded border border-gray-700 text-xs space-y-2">
                    <div>
                      <span className="text-gray-400">ID:</span>{' '}
                      <span className="text-gray-300 font-mono">{msg.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Timestamp:</span>{' '}
                      <span className="text-gray-300">
                        {formatDate(msg.timestamp, "h:mm:ss a")}
                      </span>
                    </div>

                    {/* Content Blocks */}
                    {Array.isArray(msg.content) && msg.content.length > 0 && (
                      <div>
                        <div className="text-gray-400 mb-1 font-medium">Content Blocks:</div>
                        <div className="space-y-1 ml-2">
                          {msg.content.map((block: UnifiedContent, blockIndex: number) => {
                            const isEmptyText =
                              block.type === 'text' && (!block.text || block.text.trim() === '');

                            return (
                              <div
                                key={blockIndex}
                                className={`p-1.5 rounded ${
                                  isEmptyText
                                    ? 'bg-orange-900/50 border border-orange-700'
                                    : 'bg-gray-900'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-cyan-400 font-mono">[{blockIndex}]</span>
                                  <span className="text-purple-400">{block.type}</span>
                                  {isEmptyText && (
                                    <span className="text-orange-400 font-medium">⚠️ EMPTY</span>
                                  )}
                                </div>

                                {block.type === 'text' && (
                                  <div className="ml-6 mt-1 text-gray-400">
                                    Length: {block.text?.length || 0}
                                  </div>
                                )}

                                {block.type === 'tool_use' && (
                                  <div className="ml-6 mt-1 space-y-1">
                                    <div>
                                      <span className="text-gray-400">Name:</span>{' '}
                                      <span className="text-green-400">{block.name}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Has Result:</span>{' '}
                                      <span
                                        className={
                                          'result' in block && block.result
                                            ? 'text-green-400'
                                            : 'text-red-400'
                                        }
                                      >
                                        {'result' in block && block.result ? 'Yes' : 'No'}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Raw JSON */}
                    <details>
                      <summary className="text-gray-400 cursor-pointer hover:text-gray-300">
                        Raw JSON
                      </summary>
                      <pre className="mt-1 p-2 bg-black rounded text-[10px] overflow-x-auto max-h-40 overflow-y-auto">
                        {JSON.stringify(msg, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
