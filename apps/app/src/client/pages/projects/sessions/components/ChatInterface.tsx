/**
 * Main chat interface component
 * Displays conversation history with auto-scroll and WebSocket streaming support
 */

import { AlertCircle, Loader2 } from "lucide-react";
import { ChatSkeleton } from "./ChatSkeleton";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import type { UIMessage } from "@/shared/types/message.types";
import type { AgentType } from "@/shared/types/agent.types";
import { MessageList } from "./session/MessageList";
import { AgentLoadingIndicator } from "./AgentLoadingIndicator";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/client/components/ai-elements/conversation";

interface ChatInterfaceProps {
  projectId: string;
  sessionId?: string;
  agent?: AgentType;
  messages?: UIMessage[];
  isLoading?: boolean;
  error?: Error | null;
  isStreaming?: boolean;
  isLoadingHistory?: boolean;
  onApprove?: (toolUseId: string) => void;
}

/**
 * Chat interface component for displaying Claude conversations
 * Supports both static JSONL message display and real-time WebSocket streaming
 */
export function ChatInterface({
  projectId,
  sessionId,
  messages = [],
  isLoading = false,
  error = null,
  isStreaming = false,
  isLoadingHistory = false,
  onApprove,
}: ChatInterfaceProps) {
  // Loading state
  if (isLoading) {
    return <ChatSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium">There was an error</div>
            <div className="text-sm mt-1">{error.message}</div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Empty state - show loading if history is being fetched or waiting for first message
  if (messages.length === 0) {
    if (isLoadingHistory) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
          <Loader2 className="h-12 w-12 mb-4 opacity-50 animate-spin" />
          <p className="text-lg font-medium">Loading conversation history...</p>
        </div>
      );
    }

    // Show loading indicator when streaming (waiting for first response)
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
        <Loader2 className="h-12 w-12 mb-4 opacity-50 animate-spin" />
        <p className="text-lg font-medium">Starting session...</p>
      </div>
    );
  }

  // Messages list
  return (
    <Conversation
      className="h-full overflow-y-auto"
      data-project-id={projectId}
      data-session-id={sessionId}
    >
      <ConversationContent>
        <div className="chat-container max-w-4xl mx-auto p-6">
          <MessageList messages={messages} onApprove={onApprove} />
          <AgentLoadingIndicator isStreaming={isStreaming} />
        </div>
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
