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
}

export function MessageRenderer({ message }: MessageRendererProps) {
  const debugMode = useDebugMode();
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
        return <AssistantMessage message={message} />;

      default:
        console.warn('Unknown message role:', message.role);
        return null;
    }
  })();

  if (!debugMode) {
    return (
      <div
        data-message-id={message.id}
        data-message-role={message.role}
        data-is-streaming={message.isStreaming}
        data-content-length={Array.isArray(message.content) ? message.content.length : 0}
      >
        {messageContent}
      </div>
    );
  }

  return (
    <div
      className="space-y-2"
      data-message-id={message.id}
      data-message-role={message.role}
      data-is-streaming={message.isStreaming}
      data-content-length={Array.isArray(message.content) ? message.content.length : 0}
    >
      {messageContent}

      {/* Debug JSON viewer */}
      <div className="border border-orange-300 dark:border-orange-700 rounded-lg overflow-hidden bg-orange-50 dark:bg-orange-950/20">
        <div className="flex items-center">
          <button
            onClick={() => setIsJsonExpanded(!isJsonExpanded)}
            className="flex-1 px-3 py-2 flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
          >
            {isJsonExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span>Message JSON ({message.role})</span>
            <span className="text-xs opacity-70 ml-auto">ID: {message.id.substring(0, 8)}</span>
          </button>
          <button
            onClick={copyMessageJson}
            className="px-3 py-2 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
            title="Copy message JSON"
          >
            {isCopied ? (
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>

        {isJsonExpanded && (
          <pre className="px-3 py-2 text-xs overflow-x-auto bg-white dark:bg-gray-950 border-t border-orange-200 dark:border-orange-800">
            <code className="text-gray-800 dark:text-gray-200">
              {JSON.stringify(message, null, 2)}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}
