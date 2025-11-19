/**
 * Assistant message component
 * Left-aligned with AI avatar
 */

import { AlertCircle } from "lucide-react";
import type { UIMessage } from "@/shared/types/message.types";
import { ContentBlockRenderer } from "./ContentBlockRenderer";

interface AssistantMessageProps {
  message: UIMessage;
  onApprove?: (toolUseId: string) => void;
}

export function AssistantMessage({ message, onApprove }: AssistantMessageProps) {
  const content = message.content;

  // Strip ANSI color codes from text
  const stripAnsiCodes = (text: string): string => {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1b\[[0-9;]*m/g, "");
  };

  // Handle string content (legacy or error messages)
  if (typeof content === "string") {
    // Check if this is an error message
    if (message.isError) {
      return (
        <div className="flex justify-center w-full session-message session-message-assistant session-message-error">
          <div className="w-full max-w-4xl session-message-error-wrapper">
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-4 session-message-error-box">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-red-900 dark:text-red-100 mb-2 session-message-error-title">
                    Error from Server
                  </div>
                  <div className="text-sm text-red-800 dark:text-red-200">
                    <div className="whitespace-pre-wrap break-words session-message-error-text">
                      {stripAnsiCodes(content)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Render plain text content
    return (
      <div className="w-full overflow-hidden session-message session-message-assistant">
        <div className="whitespace-pre-wrap break-words session-message-text">{content}</div>
      </div>
    );
  }

  // Check if this is an error message - render with special styling
  if (message.isError) {
    // Extract text from content blocks
    const errorText = content
      .filter((block) => block.type === "text")
      .map((block) => (block.type === "text" ? stripAnsiCodes(block.text) : ""))
      .join("\n");

    return (
      <div className="flex justify-center w-full session-message session-message-assistant session-message-error">
        <div className="w-full max-w-4xl session-message-error-wrapper">
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 p-4 session-message-error-box">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-red-900 dark:text-red-100 mb-2 session-message-error-title">
                  Error from Server
                </div>
                <div className="text-sm text-red-800 dark:text-red-200">
                  <div className="whitespace-pre-wrap break-words session-message-error-text">
                    {errorText}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter out empty text blocks
  const renderableContent = content.filter((block) => {
    if (block.type === 'text') {
      // Filter out empty or whitespace-only text blocks
      const isEmpty = !block.text || block.text.trim() === '';
      if (isEmpty) {
        console.warn('[AssistantMessage] Skipping empty text block in message:', message.id);
      }
      return !isEmpty;
    }
    // Keep all non-text blocks (tool_use, thinking, etc.)
    return true;
  });

  // Don't render if no content after filtering - show debug box instead
  if (renderableContent.length === 0) {
    const blockTypes = content.map(b => typeof b === 'string' ? 'string' : b.type);
    console.log(`[RENDER] Message ${message.id} renders blank - role: assistant, content.length: ${content.length}, blocks: ${blockTypes.join(', ')}, parentId: ${message.parentId || 'none'}`);

    // Show debug box for empty messages
    return (
      <div className="w-full overflow-hidden session-message session-message-assistant session-message-debug">
        <div className="rounded-lg border-2 border-red-500 bg-yellow-50 dark:bg-yellow-950/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-red-900 dark:text-red-100 mb-2">
                DEBUG: Empty Message Detected
              </div>
              <div className="text-xs text-red-800 dark:text-red-200 space-y-2 font-mono">
                <div><strong>Message ID:</strong> {message.id}</div>
                <div><strong>Role:</strong> {message.role}</div>
                <div><strong>Content Length:</strong> {content.length}</div>
                <div><strong>Timestamp:</strong> {new Date().toISOString()}</div>
                {content.length > 0 && (
                  <div>
                    <strong>Content Block Types:</strong>
                    <ul className="list-disc ml-4 mt-1">
                      {content.map((block, i) => (
                        <li key={i}>
                          {block.type}
                          {block.type === 'text' && ` (text: "${block.text?.substring(0, 50) || 'empty'}")`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <details className="mt-2">
                  <summary className="cursor-pointer hover:underline">Full Message JSON</summary>
                  <pre className="mt-2 p-2 bg-black/10 dark:bg-white/10 rounded overflow-auto max-h-64 text-xs">
                    {JSON.stringify(message, null, 2)}
                  </pre>
                </details>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(message, null, 2));
                    alert('Debug info copied to clipboard!');
                  }}
                  className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-sans"
                >
                  Copy Debug Info
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render content blocks with proper formatting
  return (
    <div
      className="w-full overflow-hidden session-message session-message-assistant"
      data-message-id={message.id}
      data-message-role={message.role}
      data-content-blocks={renderableContent.length}
      data-is-streaming={message.isStreaming}
      data-is-error={message.isError}
    >
      {/* Content blocks */}
      {renderableContent.map((block, index) => (
        <ContentBlockRenderer key={index} block={block} onApprove={onApprove} />
      ))}
    </div>
  );
}
