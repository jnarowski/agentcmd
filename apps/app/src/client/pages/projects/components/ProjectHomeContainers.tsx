import { useContainers } from "@/client/pages/projects/containers/hooks/useContainers";
import { useContainerWebSocket } from "@/client/pages/projects/containers/hooks/useContainerWebSocket";
import { ContainerCard } from "@/client/pages/projects/containers/components/ContainerCard";
import { Loader2 } from "lucide-react";

interface ProjectHomeContainersProps {
  projectId: string;
}

/**
 * Active Previews section for project home page
 * Shows running containers with real-time updates via WebSocket
 */
export function ProjectHomeContainers({
  projectId,
}: ProjectHomeContainersProps) {
  const { data: containers, isLoading } = useContainers(projectId, "running");

  // Subscribe to WebSocket updates
  useContainerWebSocket(projectId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!containers || containers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No active preview containers
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Use <code className="rounded bg-muted px-1 py-0.5">step.preview()</code> in
          workflows to create preview containers.{" "}
          <a
            href="https://agentcmd.dev/docs/reference/workflow-steps/preview"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            Learn more →
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Active Previews
          <span className="ml-2 text-xs text-muted-foreground">
            ({containers.length})
          </span>
        </h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {containers.map((container) => (
          <ContainerCard key={container.id} container={container} />
        ))}
      </div>
    </div>
  );
}
