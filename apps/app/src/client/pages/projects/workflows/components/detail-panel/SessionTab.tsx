import { MessageSquare, Loader2 } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/client/components/ui/empty";
import { AgentSessionViewer } from "@/client/components/AgentSessionViewer";
import { useSessionMessages } from "@/client/pages/projects/sessions/hooks/useAgentSessions";

interface SessionTabProps {
  projectId: string;
  selectedSessionId: string | null;
}

export function SessionTab({ projectId, selectedSessionId }: SessionTabProps) {
  // Check if session has messages
  const { data: messages, isLoading } = useSessionMessages(
    selectedSessionId || undefined,
    projectId
  );

  if (!selectedSessionId) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessageSquare />
          </EmptyMedia>
          <EmptyTitle>No session selected</EmptyTitle>
          <EmptyDescription>
            Press View Agent Session to view details here
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

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
            The agent session will appear here automatically once it starts. This usually takes a few seconds.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <AgentSessionViewer
      projectId={projectId}
      sessionId={selectedSessionId}
      height="100%"
      className="h-full"
      clearOnUnmount={true}
    />
  );
}
