import { MessageSquare } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/client/components/ui/empty";
import { SessionViewer } from "./SessionViewer";

interface SessionTabProps {
  projectId: string;
  selectedSessionId: string | null;
}

export function SessionTab({ projectId, selectedSessionId }: SessionTabProps) {
  // Early return with empty state if no session selected
  // This prevents any session loading logic from running
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

  // Only render SessionViewer when we have a valid sessionId
  return <SessionViewer projectId={projectId} sessionId={selectedSessionId} />;
}
