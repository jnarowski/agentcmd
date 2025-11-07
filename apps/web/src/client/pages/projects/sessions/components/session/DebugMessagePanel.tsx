/**
 * Debug panel for displaying message structure during development
 * This component helps troubleshoot empty message blocks and streaming issues
 *
 * Usage: Add to MessageList or ChatInterface during debugging
 * <DebugMessagePanel messages={messages} />
 */

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import type { UIMessage, UnifiedContent } from "@/shared/types/message.types";
import { useDebugMode } from "@/client/hooks/useDebugMode";

interface DebugMessagePanelProps {
  messages: UIMessage[];
}

function ContentBlocks({ content }: { content: UnifiedContent[] }) {
  if (!Array.isArray(content) || content.length === 0) return null;

  return (
    <div>
      <div className="text-gray-400 mb-1 font-medium">Content Blocks:</div>
      <div className="space-y-1 ml-2">
        {content.map((block, blockIndex) => {
          const isEmptyText = block.type === 'text' && (!block.text || block.text.trim() === '');

          return (
            <div
              key={blockIndex}
              className={`p-1.5 rounded ${
                isEmptyText ? 'bg-orange-900/50 border border-orange-700' : 'bg-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-mono">[{blockIndex}]</span>
                <span className="text-purple-400">{block.type}</span>
                {isEmptyText && (
                  <span className="text-orange-400 font-medium">⚠️ EMPTY</span>
                )}
              </div>

              {/* Block-specific details */}
              {block.type === 'text' && (
                <div className="ml-8 mt-1">
                  <span className="text-gray-400">Length:</span>{' '}
                  <span className="text-gray-300">{block.text?.length || 0}</span>
                  {block.text && block.text.length > 0 && (
                    <div className="mt-1 text-gray-400 break-words max-h-20 overflow-y-auto">
                      "{block.text.substring(0, 200)}{block.text.length > 200 ? '...' : ''}"
                    </div>
                  )}
                </div>
              )}

              {block.type === 'tool_use' && (
                <div className="ml-8 mt-1">
                  <div>
                    <span className="text-gray-400">Name:</span>{' '}
                    <span className="text-green-400">{block.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Has Result:</span>{' '}
                    <span className={'result' in block && block.result ? 'text-green-400' : 'text-red-400'}>
                      {'result' in block && block.result ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              )}

              {block.type === 'thinking' && (
                <div className="ml-8 mt-1">
                  <span className="text-gray-400">Length:</span>{' '}
                  <span className="text-gray-300">{block.thinking?.length || 0}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DebugMessagePanel({ messages }: DebugMessagePanelProps) {
  const debugMode = useDebugMode();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Copy message JSON to clipboard
  const copyMessageJson = async (msg: UIMessage) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(msg, null, 2));
      setCopiedMessageId(msg.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy message JSON:', err);
    }
  };

  // Only render when ?debug=true
  if (!debugMode) {
    return null;
  }

  // Calculate statistics
  const stats = {
    total: messages.length,
    emptyContent: messages.filter(m => Array.isArray(m.content) && m.content.length === 0).length,
    emptyTextBlocks: messages.reduce((count, msg) => {
      if (!Array.isArray(msg.content)) return count;
      const emptyTexts = msg.content.filter(
        block => block.type === 'text' && (!block.text || block.text.trim() === '')
      );
      return count + emptyTexts.length;
    }, 0),
    toolUseBlocks: messages.reduce((count, msg) => {
      if (!Array.isArray(msg.content)) return count;
      return count + msg.content.filter(block => block.type === 'tool_use').length;
    }, 0),
    streamingMessages: messages.filter(m => m.isStreaming).length,
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-2xl">
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-2 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-xs font-medium shadow-lg"
      >
        {isExpanded ? '🔍 Hide Debug Panel' : `🔍 Debug Panel (${stats.emptyContent} empty messages, ${stats.emptyTextBlocks} empty text blocks)`}
      </button>

      {/* Panel content */}
      {isExpanded && (
        <div className="bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-700 max-h-[70vh] overflow-hidden flex flex-col">
          {/* Header with stats */}
          <div className="p-3 border-b border-gray-700 bg-gray-800">
            <h3 className="text-sm font-semibold mb-2">Message Debug Panel</h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-gray-400">Total:</span>{' '}
                <span className="text-white font-medium">{stats.total}</span>
              </div>
              <div>
                <span className="text-gray-400">Streaming:</span>{' '}
                <span className="text-yellow-400 font-medium">{stats.streamingMessages}</span>
              </div>
              <div>
                <span className="text-gray-400">Tool Uses:</span>{' '}
                <span className="text-blue-400 font-medium">{stats.toolUseBlocks}</span>
              </div>
              <div className="col-span-3">
                <span className="text-red-400 font-medium">⚠️ Empty Content: {stats.emptyContent}</span>
                {' | '}
                <span className="text-orange-400 font-medium">Empty Text Blocks: {stats.emptyTextBlocks}</span>
              </div>
            </div>
          </div>

          {/* Message list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((msg, index) => {
              const isEmpty = Array.isArray(msg.content) && msg.content.length === 0;
              const hasEmptyText = Array.isArray(msg.content) && msg.content.some(
                block => block.type === 'text' && (!block.text || block.text.trim() === '')
              );
              const isSelected = selectedMessageIndex === index;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const contentBlocksEl = Array.isArray(msg.content) ? <ContentBlocks content={msg.content as any} /> : null;

              return (
                <div key={msg.id || index}>
                  {/* Message summary */}
                  <div className="relative">
                    <button
                      onClick={() => setSelectedMessageIndex(isSelected ? null : index)}
                      className={`w-full text-left p-2 rounded text-xs ${
                        isEmpty || hasEmptyText
                          ? 'bg-red-900/50 border border-red-700'
                          : 'bg-gray-800 border border-gray-700'
                      } hover:bg-gray-700 transition-colors`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="font-medium">#{index}</span>
                          <span className={`px-1.5 py-0.5 rounded ${
                            msg.role === 'user' ? 'bg-blue-700' : 'bg-green-700'
                          }`}>
                            {msg.role}
                          </span>
                          {msg.isStreaming && (
                            <span className="px-1.5 py-0.5 rounded bg-yellow-700 animate-pulse">
                              STREAMING
                            </span>
                          )}
                          {isEmpty && (
                            <span className="px-1.5 py-0.5 rounded bg-red-700 font-medium">
                              EMPTY!
                            </span>
                          )}
                          {hasEmptyText && (
                            <span className="px-1.5 py-0.5 rounded bg-orange-700">
                              Empty Text
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-xs">
                            {Array.isArray(msg.content) ? `${msg.content.length} blocks` : 'string'}
                          </span>
                        </div>
                      </div>
                    {Array.isArray(msg.content) && msg.content.length > 0 && (
                      <div className="mt-1 text-gray-400 truncate">
                        {msg.content.map(b => b.type).join(', ')}
                      </div>
                    )}
                  </button>

                  {/* Copy button */}
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
                </div>

                  {/* Expanded message details */}
                  {isSelected && (
                    <div className="mt-1 ml-4 p-2 bg-gray-950 rounded border border-gray-700 text-xs space-y-2">
                      <div>
                        <span className="text-gray-400">ID:</span>{' '}
                        <span className="text-gray-300 font-mono">{msg.id}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Timestamp:</span>{' '}
                        <span className="text-gray-300">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                      </div>

                      {/* Content blocks */}
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {contentBlocksEl as any}

                      {/* Original message (before enrichment) */}
                      {msg._original && (
                        <details className="mt-2">
                          <summary className="text-yellow-400 cursor-pointer hover:text-yellow-300 font-medium">
                            📦 Original Message (Before Enrichment)
                          </summary>
                          <div className="mt-1 p-2 bg-black rounded text-[10px]">
                            <div className="mb-2 text-gray-400">
                              Original content blocks: {Array.isArray((msg._original as Record<string, unknown>)?.content) ? ((msg._original as Record<string, unknown>).content as unknown[]).length : 'N/A'}
                            </div>
                            {Array.isArray((msg._original as Record<string, unknown>)?.content) && (
                              <div className="mb-2 text-gray-400">
                                Block types: {((msg._original as Record<string, unknown>).content as Array<{ type?: string }>).map((b: { type?: string }) => b.type).join(', ')}
                              </div>
                            )}
                            <pre className="overflow-x-auto max-h-40 overflow-y-auto">
                              {JSON.stringify(msg._original, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}

                      {/* Raw JSON (collapsed by default) */}
                      <details className="mt-2">
                        <summary className="text-gray-400 cursor-pointer hover:text-gray-300 flex items-center justify-between">
                          <span>Raw JSON (Enriched)</span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              copyMessageJson(msg);
                            }}
                            className="ml-2 p-1 rounded bg-gray-800 hover:bg-gray-700 transition-colors"
                            title="Copy message JSON"
                          >
                            {copiedMessageId === msg.id ? (
                              <Check className="h-3 w-3 text-green-400" />
                            ) : (
                              <Copy className="h-3 w-3 text-gray-400" />
                            )}
                          </button>
                        </summary>
                        <pre className="mt-1 p-2 bg-black rounded text-[10px] overflow-x-auto max-h-40 overflow-y-auto">
                          {JSON.stringify(msg, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
