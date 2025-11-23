import { AgentSessionViewer } from "@/client/components/AgentSessionViewer";

interface SessionViewerProps {
  projectId: string;
  sessionId: string;
}

export function SessionViewer({ projectId, sessionId }: SessionViewerProps) {
  // AgentSessionViewer handles session loading, WebSocket subscription, and empty states
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
