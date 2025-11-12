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
import { RefreshCw, Loader2, FileText } from "lucide-react";
import { useSettings } from "@/client/hooks/useSettings";
import { SessionListItem } from "@/client/pages/projects/sessions/components/SessionListItem";
import type { SessionResponse } from "@/shared/types";
import { formatDistanceToNow } from "date-fns";

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
                  {data.planningSessions.map((session) => (
                    <SidebarMenuItem key={session.id}>
                      <SessionListItem
                        session={session as SessionResponse}
                        projectId={session.projectId}
                      />
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
