import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/client/components/ui/sidebar";
import { useSpecs } from "@/client/hooks/useSpecs";
import { useRescanSpecs } from "@/client/hooks/useRescanSpecs";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Loader2, FileText } from "lucide-react";
import { useProjects } from "@/client/pages/projects/hooks/useProjects";
import { useSessions } from "@/client/pages/projects/sessions/hooks/useAgentSessions";
import { useNavigationStore } from "@/client/stores";
import { SessionItem } from "@/client/components/sidebar/SessionItem";
import type { SessionResponse } from "@/shared/types";
import type { AgentType } from "@/shared/types/agent.types";
import { formatDistanceToNow } from "date-fns";

export function NavSpecs() {
  const navigate = useNavigate();
  const { data: projects } = useProjects();
  const activeSessionId = useNavigationStore((s) => s.activeSessionId);
  const activeProjectId = useNavigationStore((s) => s.activeProjectId);

  // Use activeProjectId from navigationStore for filtering
  const { data, isLoading, error } = useSpecs(activeProjectId || undefined);
  const { data: allSessions } = useSessions({ projectId: activeProjectId || undefined });
  const rescanMutation = useRescanSpecs();

  const handleRescan = () => {
    rescanMutation.mutate();
  };

  const handleOpenWorkflow = (specPath: string, taskProjectId: string, taskName: string) => {
    // Remove 'todo/' prefix from specPath since API returns relative to .agent/specs/todo/
    const relativeSpecPath = specPath.startsWith("todo/")
      ? specPath.slice(5)
      : specPath;

    // Navigate to workflow creation page with spec and name pre-populated
    navigate(
      `/projects/${taskProjectId}/workflows/new?specFile=${encodeURIComponent(relativeSpecPath)}&name=${encodeURIComponent(taskName)}`
    );
  };

  if (error) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
          <div className="py-4 text-center text-sm text-destructive">
            Failed to load specs
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-2">
        {isLoading ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            Loading specs...
          </div>
        ) : (
          <>
            {/* Tasks (Specs) */}
            {data && data.specs.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Specs
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 w-6 p-0"
                    onClick={handleRescan}
                    disabled={rescanMutation.isPending || isLoading}
                    aria-label="Refresh specs"
                  >
                    {rescanMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5" />
                    )}
                  </Button>
                </div>
                <SidebarMenu className="mb-4">
                  {data.specs.map((task) => (
                    <SidebarMenuItem key={task.id}>
                      <SidebarMenuButton
                        onClick={() =>
                          handleOpenWorkflow(task.specPath, task.projectId, task.name)
                        }
                        className="h-auto min-h-[28px] px-2 py-1"
                      >
                        <FileText className="size-4 shrink-0 mr-1" />
                        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
                          <span className="text-sm min-w-0 truncate">
                            {task.name}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge
                              variant="secondary"
                              className="h-4 px-1.5 text-[10px] bg-muted/50 text-muted-foreground hover:bg-muted/50 truncate"
                            >
                              {task.status}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(task.created_at), {
                                addSuffix: true,
                              })}
                            </span>
                          </div>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </>
            )}

            {/* Planning Sessions */}
            {data && data.planningSessions.length > 0 && (
              <>
                <div className="mt-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Planning Sessions
                  </span>
                </div>
                <SidebarMenu>
                  {data.planningSessions.map((planningSummary) => {
                    const project = projects?.find((p) => p.id === planningSummary.projectId);
                    const projectName = project?.name ?? planningSummary.projectId;

                    // Look up full session with metadata from allSessions
                    const fullSession = allSessions?.find((s) => s.id === planningSummary.id);

                    // Fallback to synthetic session if not found (shouldn't happen but be safe)
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
                        lastMessageAt: new Date(planningSummary.updated_at).toISOString(),
                        firstMessagePreview: "",
                      },
                    };

                    return (
                      <SessionItem
                        key={planningSummary.id}
                        id={planningSummary.id}
                        projectId={planningSummary.projectId}
                        projectName={projectName}
                        status={planningSummary.state}
                        agent={planningSummary.agent as AgentType}
                        session={session}
                        isActive={planningSummary.id === activeSessionId}
                      />
                    );
                  })}
                </SidebarMenu>
              </>
            )}

            {/* Empty state */}
            {data &&
              data.specs.length === 0 &&
              data.planningSessions.length === 0 && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  {activeProjectId
                    ? "No specs in this project"
                    : "No pending specs or planning sessions"}
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}
