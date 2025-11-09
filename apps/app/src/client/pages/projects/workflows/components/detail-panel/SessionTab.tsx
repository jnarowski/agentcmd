import { MessageSquare } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/client/components/ui/empty";
import { AgentSessionViewer } from "@/client/components/AgentSessionViewer";

interface SessionTabProps {
  projectId: string;
  selectedSessionId: string | null;
}

export function SessionTab({ projectId, selectedSessionId }: SessionTabProps) {
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
