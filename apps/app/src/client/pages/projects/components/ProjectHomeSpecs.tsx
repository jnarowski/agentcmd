import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import { AgentIcon } from "@/client/components/AgentIcon";
import { SessionStateBadge } from "@/client/pages/projects/sessions/components/SessionStateBadge";
import { getSessionDisplayName } from "@/client/utils/getSessionDisplayName";
import { useSpecs } from "@/client/hooks/useSpecs";
import { useRescanSpecs } from "@/client/hooks/useRescanSpecs";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Loader2, FileText } from "lucide-react";
import { useSessions } from "@/client/pages/projects/sessions/hooks/useAgentSessions";
import type { SessionResponse } from "@/shared/types";
import type { AgentType } from "@/shared/types/agent.types";
import { format, formatDistanceToNow } from "date-fns";

interface ProjectHomeSpecsProps {
  projectId: string;
}

/**
 * Specs tab content for project home page
 * Shows Specs + Planning Sessions
 */
export function ProjectHomeSpecs({ projectId }: ProjectHomeSpecsProps) {
  const navigate = useNavigate();
  const { data, isLoading, error } = useSpecs(projectId);
  const { data: allSessions } = useSessions({ projectId });
  const rescanMutation = useRescanSpecs();

  const handleRescan = () => {
    rescanMutation.mutate();
  };

  const handleOpenWorkflow = (
    specPath: string,
    taskProjectId: string,
    taskName: string
  ) => {
    const relativeSpecPath = specPath.startsWith("todo/")
      ? specPath.slice(5)
      : specPath;

    navigate(
      `/projects/${taskProjectId}/workflows/new?specFile=${encodeURIComponent(relativeSpecPath)}&name=${encodeURIComponent(taskName)}`
    );
  };

  if (error) {
    return (
      <div className="py-8 text-center text-sm text-destructive">
        Failed to load specs
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Loading specs...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Specs Section */}
      {data && data.specs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Specs
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-8 w-8 p-0"
              onClick={handleRescan}
              disabled={rescanMutation.isPending || isLoading}
              aria-label="Refresh specs"
            >
              {rescanMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </Button>
          </div>
          <div className="border rounded-md">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.specs.map((task) => (
                  <tr
                    key={task.id}
                    className="border-b last:border-b-0 hover:bg-accent/50 cursor-pointer"
                    onClick={() =>
                      handleOpenWorkflow(task.specPath, task.projectId, task.name)
                    }
                  >
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">{task.name}</span>
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge
                        variant="secondary"
                        className="text-xs px-1.5 py-0 h-4 bg-muted/50 text-muted-foreground"
                      >
                        {task.status}
                      </Badge>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(task.created_at), {
                        addSuffix: true,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Planning Sessions Section */}
      {data && data.planningSessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            Planning Sessions
          </h3>
          <div className="border rounded-md">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground">Agent</th>
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-2 text-xs font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.planningSessions.map((planningSummary) => {
                  const fullSession = allSessions?.find(
                    (s) => s.id === planningSummary.id
                  );

                  const session: SessionResponse = fullSession || {
                    id: planningSummary.id,
                    projectId: planningSummary.projectId,
                    userId: planningSummary.userId,
                    name: planningSummary.name,
                    agent: planningSummary.agent as AgentType,
                    type: planningSummary.type as "chat" | "workflow",
                    permission_mode: "plan",
                    state: planningSummary.state as "idle" | "working" | "error",
                    is_archived: planningSummary.is_archived,
                    archived_at: null,
                    created_at: planningSummary.created_at,
                    updated_at: planningSummary.updated_at,
                    metadata: {
                      totalTokens: 0,
                      messageCount: 0,
                      lastMessageAt: new Date(
                        planningSummary.updated_at
                      ).toISOString(),
                      firstMessagePreview: "",
                    },
                  };

                  const displayName = getSessionDisplayName(session);
                  const timeAgo = format(new Date(session.created_at), "MM/dd 'at' h:mma");

                  return (
                    <tr
                      key={planningSummary.id}
                      className="border-b last:border-b-0 hover:bg-accent/50 cursor-pointer"
                      onClick={() => navigate(`/projects/${planningSummary.projectId}/sessions/${planningSummary.id}`)}
                    >
                      <td className="p-2">
                        <AgentIcon agent={planningSummary.agent as AgentType} className="size-4" />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{displayName}</span>
                          <Badge
                            variant="secondary"
                            className="text-xs px-1.5 py-0 h-4 bg-green-500/10 text-green-600 border-green-500/20"
                          >
                            Plan
                          </Badge>
                        </div>
                      </td>
                      <td className="p-2">
                        <SessionStateBadge
                          state={session.state}
                          errorMessage={session.error_message}
                          compact
                        />
                      </td>
                      <td className="p-2 text-xs text-muted-foreground tabular-nums">
                        {timeAgo}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {data &&
        data.specs.length === 0 &&
        data.planningSessions.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No specs in this project
          </div>
        )}
    </div>
  );
}
