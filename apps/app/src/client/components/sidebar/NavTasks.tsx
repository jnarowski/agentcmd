import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/client/components/ui/sidebar";
import { useTasks } from "@/client/hooks/useTasks";
import { useRescanTasks } from "@/client/hooks/useRescanTasks";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Loader2 } from "lucide-react";
import { useSettings } from "@/client/hooks/useSettings";

export function NavTasks() {
  const navigate = useNavigate();
  const { data: settings } = useSettings();

  // Get project filter: only use if explicitly set
  const projectFilter =
    settings?.userPreferences?.active_project_filter || undefined;

  const { data, isLoading, error } = useTasks(projectFilter);
  const rescanMutation = useRescanTasks();

  const handleRescan = () => {
    rescanMutation.mutate();
  };

  const handleOpenWorkflow = (specPath: string, taskProjectId: string) => {
    // Navigate to workflow creation page with spec pre-populated
    navigate(
      `/projects/${taskProjectId}/workflows/new?specFile=${encodeURIComponent(specPath)}`
    );
  };

  const handleViewSession = (sessionProjectId: string, sessionId: string) => {
    navigate(`/projects/${sessionProjectId}/sessions/${sessionId}`);
  };

  if (error) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
          <div className="py-4 text-center text-sm text-destructive">
            Failed to load tasks
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
            Loading tasks...
          </div>
        ) : (
          <>
            {/* Tasks (Specs) */}
            {data && data.tasks.length > 0 && (
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
                    aria-label="Refresh tasks"
                  >
                    {rescanMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5" />
                    )}
                  </Button>
                </div>
                <SidebarMenu className="mb-4">
                  {data.tasks.map((task) => (
                    <SidebarMenuItem key={task.id}>
                      <div className="flex flex-col gap-1 py-1">
                        <div className="flex items-center gap-2">
                          <SidebarMenuButton
                            asChild
                            className="flex-1 h-auto py-1"
                          >
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-sm truncate w-full">
                                {task.name}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {task.status}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(
                                    task.created_at
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </SidebarMenuButton>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs w-full"
                          onClick={() =>
                            handleOpenWorkflow(task.specPath, task.projectId)
                          }
                        >
                          Open Workflow
                        </Button>
                      </div>
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
                  {data.planningSessions.map((session) => (
                    <SidebarMenuItem key={session.id}>
                      <div className="flex flex-col gap-1 py-1">
                        <div className="flex items-center gap-2">
                          <SidebarMenuButton
                            asChild
                            className="flex-1 h-auto py-1"
                          >
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-sm truncate w-full">
                                {session.name || "Untitled Session"}
                              </span>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {session.agent}
                                </Badge>
                                {session.projectId && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Project
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </SidebarMenuButton>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs w-full"
                          onClick={() =>
                            handleViewSession(session.projectId, session.id)
                          }
                        >
                          View
                        </Button>
                      </div>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </>
            )}

            {/* Empty state */}
            {data &&
              data.tasks.length === 0 &&
              data.planningSessions.length === 0 && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  {projectFilter
                    ? "No tasks in this project"
                    : "No pending tasks or planning sessions"}
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}
