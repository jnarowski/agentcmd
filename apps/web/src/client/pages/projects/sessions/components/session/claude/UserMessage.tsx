/**
 * User message component
 * Bordered box design for better scannability
 */

import type { UIMessage } from "@/shared/types/message.types";
import { ContentBlockRenderer } from "./ContentBlockRenderer";

interface UserMessageProps {
  message: UIMessage;
}

export function UserMessage({ message }: UserMessageProps) {
  // Handle string content
  if (typeof message.content === 'string') {
    if (!message.content.trim()) {
      console.warn('[UserMessage] Message has empty string content:', message.id);
      return null;
    }
    return (
      <div
        className="max-w-full"
        data-message-id={message.id}
        data-message-role={message.role}
        data-content-type="string"
      >
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        </div>
      </div>
    );
  }

  // Filter out tool_result blocks (already shown inline with tool_use)
  // and empty text blocks
  const renderableBlocks = message.content.filter((block) => {
    // Skip string blocks (shouldn't happen but guard against it)
    if (typeof block === 'string') return false;

    // Filter out tool_result blocks
    if (block.type === "tool_result") {
      return false;
    }

    // Filter out empty text blocks
    if (block.type === "text") {
      const isEmpty = !block.text || block.text.trim() === '';
      if (isEmpty) {
        console.warn('[UserMessage] Skipping empty text block in message:', message.id);
      }
      return !isEmpty;
    }

    return true;
  });

  // If message has no renderable content, don't render
  if (renderableBlocks.length === 0) {
    console.warn('[UserMessage] Message has no renderable content (all empty):', message.id);
    return null;
  }

  return (
    <div
      className="max-w-full"
      data-message-id={message.id}
      data-message-role={message.role}
      data-content-blocks={renderableBlocks.length}
    >
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
        {/* Render all content blocks (text, slash_command, etc.) */}
        {renderableBlocks.map((block, index) => (
          <ContentBlockRenderer key={index} block={block} />
        ))}
      </div>
    </div>
  );
}
