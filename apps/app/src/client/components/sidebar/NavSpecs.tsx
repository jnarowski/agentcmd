import { Button } from "@/client/components/ui/button";
import { SidebarMenu } from "@/client/components/ui/sidebar";
import { useSpecs } from "@/client/hooks/useSpecs";
import { useRescanSpecs } from "@/client/hooks/useRescanSpecs";
import { RefreshCw, Loader2 } from "lucide-react";
import { useProjects } from "@/client/pages/projects/hooks/useProjects";
import { useSessions } from "@/client/pages/projects/sessions/hooks/useAgentSessions";
import { useNavigationStore } from "@/client/stores";
import { SessionItem } from "@/client/components/sidebar/SessionItem";
import { SpecItem } from "@/client/components/sidebar/SpecItem";
import type { SessionResponse } from "@/shared/types";
import type { AgentType } from "@/shared/types/agent.types";

export function NavSpecs() {
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
                  {data.specs.map((spec) => (
                    <SpecItem key={spec.id} spec={spec} />
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
