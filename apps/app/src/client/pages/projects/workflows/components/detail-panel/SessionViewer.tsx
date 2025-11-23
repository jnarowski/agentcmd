import { Loader2 } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/client/components/ui/empty";
import { AgentSessionViewer } from "@/client/components/AgentSessionViewer";
import { useSession } from "@/client/hooks/useSession";

interface SessionViewerProps {
  projectId: string;
  sessionId: string;
}

export function SessionViewer({ projectId, sessionId }: SessionViewerProps) {
  // Get session from Zustand
  const { messages, isLoading } = useSession(sessionId, projectId);

  // WebSocket subscription handled by AgentSessionViewer

  // Show loading state when session has no messages yet (agent hasn't started)
  const hasMessages = messages && messages.length > 0;
  if (!isLoading && !hasMessages) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Loader2 className="animate-spin" />
          </EmptyMedia>
          <EmptyTitle>Waiting for agent to start</EmptyTitle>
          <EmptyDescription>
            The agent session will appear here automatically once it starts.
            This usually takes a few seconds.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <AgentSessionViewer
      projectId={projectId}
      sessionId={sessionId}
      height="100%"
      className="h-full"
      clearOnUnmount={true}
    />
  );
}
