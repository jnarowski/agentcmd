/**
 * Simple list renderer for chat messages
 * No processing, just iterates and renders each message
 */

import React, { useMemo } from "react";
import type { UIMessage } from "@/shared/types/message.types";
import { MessageRenderer } from "./claude/MessageRenderer";
import { shouldRenderMessage } from "../../utils/messageFilters";

interface MessageListProps {
  messages: UIMessage[];
  onApprove?: (toolUseId: string) => void;
}

/**
 * Simple list renderer for chat messages
 * No processing, just iterates and renders each message
 * Memoized to prevent re-renders when props haven't changed
 */
export const MessageList = React.memo(function MessageList({ messages, onApprove }: MessageListProps) {
  // Memoize filtered messages to avoid recalculating on every render
  const filteredMessages = useMemo(
    () => messages.filter(shouldRenderMessage),
    [messages]
  );

  return (
    <div className="space-y-2 session-message-list">
      {filteredMessages.map((message) => (
        <MessageRenderer key={message.id} message={message} onApprove={onApprove} />
      ))}
    </div>
  );
});
