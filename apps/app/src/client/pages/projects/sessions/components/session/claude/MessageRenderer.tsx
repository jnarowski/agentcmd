/**
 * Router for message renderers
 * Dispatches to UserMessage or AssistantMessage based on role
 */

import { useState } from "react";
import type { UIMessage } from "@/shared/types/message.types";
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { useDebugMode } from "@/client/hooks/useDebugMode";

interface MessageRendererProps {
  message: UIMessage;
  onApprove?: (toolUseId: string) => void;
}

export function MessageRenderer({ message, onApprove }: MessageRendererProps) {
  const isDebugMode = useDebugMode();
  const [isJsonExpanded, setIsJsonExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const copyMessageJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(message, null, 2));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message JSON:', err);
    }
  };

  const messageContent = (() => {
    switch (message.role) {
      case 'user':
        return <UserMessage message={message} />;

      case 'assistant':
        return <AssistantMessage message={message} onApprove={onApprove} />;

      default:
        console.warn('Unknown message role:', message.role);
        return null;
    }
  })();

  // Calculate filtered tool results count
  const filteredToolResultsCount = Array.isArray(message.content)
    ? message.content.filter(block => typeof block !== 'string' && block.type === 'tool_result').length
    : 0;

  // Data attributes for debugging
  const dataAttributes = {
    'data-message-id': message.id,
    'data-message-role': message.role,
    'data-is-streaming': message.isStreaming,
    'data-content-length': Array.isArray(message.content) ? message.content.length : 0,
    'data-has-empty-content': Array.isArray(message.content) && message.content.length === 0,
    'data-parent-id': message.parentId || 'none',
    'data-session-id': message.sessionId || 'none',
    'data-filtered-tool-results': filteredToolResultsCount,
  };

  return (
    <div
      className={isDebugMode ? "relative group session-message-wrapper" : "session-message-wrapper"}
      {...dataAttributes}
    >
      {/* Debug controls - top right icons - only when ?debug=true */}
      {isDebugMode && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button
            onClick={() => setIsJsonExpanded(!isJsonExpanded)}
            className="p-1.5 rounded bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle JSON viewer"
          >
            {isJsonExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={copyMessageJson}
            className="p-1.5 rounded bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Copy message JSON"
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )}

      {messageContent}

      {/* Inline JSON viewer - only when ?debug=true */}
      {isDebugMode && isJsonExpanded && (
        <div className="mt-2 rounded border border-border bg-muted/30 overflow-hidden">
          <div className="px-3 py-1.5 text-xs font-mono text-muted-foreground border-b border-border bg-muted/50">
            Message JSON (ID: {message.id.substring(0, 8)})
          </div>
          <pre className="px-3 py-2 text-xs overflow-x-auto">
            <code className="text-foreground/90">
              {JSON.stringify(message, null, 2)}
            </code>
          </pre>
        </div>
      )}
    </div>
  );
}
