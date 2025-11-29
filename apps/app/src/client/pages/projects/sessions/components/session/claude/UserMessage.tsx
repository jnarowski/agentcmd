/**
 * User message component
 * Right-aligned chat bubble design
 */

import type { UIMessage } from "@/shared/types/message.types";
import { ContentBlockRenderer } from "./ContentBlockRenderer";
import { isDebugMode } from "@/client/utils/isDebugMode";

interface UserMessageProps {
  message: UIMessage;
}

export function UserMessage({ message }: UserMessageProps) {
  // Get images from message (if any)
  const images = message.images || [];

  // Handle string content
  if (typeof message.content === 'string') {
    if (!message.content.trim() && images.length === 0) {
      if (import.meta.env.DEV && isDebugMode()) {
        const blockTypes = ['string (empty)'];
        console.log(`[RENDER] Message ${message.id} renders blank - role: user, content.length: 0, blocks: ${blockTypes.join(', ')}, parentId: ${message.parentId || 'none'}`);
      }
      return null;
    }
    return (
      <div
        className="flex justify-end session-message session-message-user"
        data-message-id={message.id}
        data-message-role={message.role}
        data-content-type="string"
      >
        <div className="max-w-[85%] rounded-lg border border-border bg-muted/50 px-3 py-2 session-message-bubble session-message-user-bubble">
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {images.map((img, idx) => (
                <img
                  key={idx}
                  src={img.startsWith('data:') ? img : `data:image/png;base64,${img}`}
                  alt={`Uploaded image ${idx + 1}`}
                  className="max-w-[200px] max-h-[200px] rounded object-contain"
                />
              ))}
            </div>
          )}
          {message.content.trim() && (
            <div className="whitespace-pre-wrap break-words session-message-text">{message.content}</div>
          )}
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
      if (import.meta.env.DEV && isDebugMode() && isEmpty) {
        console.warn('[UserMessage] Skipping empty text block in message:', message.id);
      }
      return !isEmpty;
    }

    return true;
  });

  // If message has no renderable content and no images, don't render
  if (renderableBlocks.length === 0 && images.length === 0) {
    if (import.meta.env.DEV && isDebugMode()) {
      const blockTypes = Array.isArray(message.content)
        ? message.content.map(b => typeof b === 'string' ? 'string' : b.type)
        : [];
      const contentLength = Array.isArray(message.content) ? message.content.length : 0;
      console.log(`[RENDER] Message ${message.id} renders blank - role: user, content.length: ${contentLength}, blocks: ${blockTypes.join(', ')}, parentId: ${message.parentId || 'none'}`);
    }
    return null;
  }

  return (
    <div
      className="flex justify-end session-message session-message-user"
      data-message-id={message.id}
      data-message-role={message.role}
      data-content-blocks={renderableBlocks.length}
    >
      <div className="max-w-[85%] rounded-lg border border-border bg-muted/50 px-3 py-2 session-message-bubble session-message-user-bubble">
        {/* Render images if present */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {images.map((img, idx) => (
              <img
                key={idx}
                src={img.startsWith('data:') ? img : `data:image/png;base64,${img}`}
                alt={`Uploaded image ${idx + 1}`}
                className="max-w-[200px] max-h-[200px] rounded object-contain"
              />
            ))}
          </div>
        )}
        {/* Render all content blocks (text, slash_command, etc.) */}
        {renderableBlocks.map((block, index) => (
          <ContentBlockRenderer key={index} block={block} showDot={false} />
        ))}
      </div>
    </div>
  );
}
