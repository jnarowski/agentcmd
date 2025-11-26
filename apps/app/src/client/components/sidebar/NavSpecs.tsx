import { useMemo } from "react";
import { Button } from "@/client/components/ui/button";
import { SidebarMenu, SidebarGroupLabel } from "@/client/components/ui/sidebar";
import { useSpecs } from "@/client/hooks/useSpecs";
import { useRescanSpecs } from "@/client/hooks/useRescanSpecs";
import { RefreshCw, Loader2 } from "lucide-react";
import { useNavigationStore } from "@/client/stores";
import { SpecItem } from "@/client/components/sidebar/SpecItem";
import type { Spec } from "@/shared/types/spec.types";
import { useProjects } from "@/client/pages/projects/hooks/useProjects";

interface SpecWithProject extends Spec {
  projectName: string;
}

export function NavSpecs() {
  const activeProjectId = useNavigationStore((s) => s.activeProjectId);

  // Use activeProjectId from navigationStore for filtering
  const { data, isLoading, error } = useSpecs(activeProjectId || undefined);
  const { data: projects } = useProjects();
  const rescanMutation = useRescanSpecs();

  // Group specs by status and add project names
  const { todoSpecs, doneSpecs, backlogSpecs } = useMemo(() => {
    if (!data?.specs) return { todoSpecs: [], doneSpecs: [], backlogSpecs: [] };

    const todo: SpecWithProject[] = [];
    const done: SpecWithProject[] = [];
    const backlog: SpecWithProject[] = [];

    for (const spec of data.specs) {
      const project = projects?.find((p) => p.id === spec.projectId);
      const projectName = project?.name ?? spec.projectId;

      const enrichedSpec: SpecWithProject = {
        ...spec,
        projectName:
          projectName && projectName.length > 30
            ? projectName.slice(0, 30) + "..."
            : projectName,
      };

      if (spec.status === "completed") {
        done.push(enrichedSpec);
      } else if (spec.status === "backlog") {
        backlog.push(enrichedSpec);
      } else {
        // draft, in-progress, review → Todo section
        todo.push(enrichedSpec);
      }
    }

    // Sort by created_at descending (newest first)
    const sortByDate = (a: Spec, b: Spec) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

    todo.sort(sortByDate);
    done.sort(sortByDate);
    backlog.sort(sortByDate);

    return {
      todoSpecs: todo,
      doneSpecs: done.slice(0, 5), // Limit to 5
      backlogSpecs: backlog.slice(0, 5), // Limit to 5
    };
  }, [data?.specs, projects]);

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

  const hasSpecs =
    todoSpecs.length > 0 || doneSpecs.length > 0 || backlogSpecs.length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-2 shrink-0 flex items-center gap-2">
        <SidebarGroupLabel>Todo</SidebarGroupLabel>
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
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="py-4 px-2 text-center text-sm text-muted-foreground">
            Loading specs...
          </div>
        ) : !hasSpecs ? (
          <div className="py-4 px-2 text-center text-sm text-muted-foreground">
            {activeProjectId ? "No specs in this project" : "No specs"}
          </div>
        ) : (
          <>
            {/* Todo Section */}
            {todoSpecs.length > 0 && (
              <div className="mb-3">
                <SidebarMenu className="border-t pt-2 px-2">
                  {todoSpecs.map((spec) => (
                    <SpecItem
                      key={spec.id}
                      spec={spec}
                      projectName={spec.projectName}
                    />
                  ))}
                </SidebarMenu>
              </div>
            )}

            {/* Done Section */}
            {doneSpecs.length > 0 && (
              <div className="mb-3">
                <SidebarGroupLabel className="pl-4">Done</SidebarGroupLabel>
                <SidebarMenu className="border-t pt-2 px-2">
                  {doneSpecs.map((spec) => (
                    <SpecItem
                      key={spec.id}
                      spec={spec}
                      projectName={spec.projectName}
                    />
                  ))}
                </SidebarMenu>
              </div>
            )}

            {/* Backlog Section */}
            {backlogSpecs.length > 0 && (
              <div className="mb-3">
                <SidebarGroupLabel className="pl-4">Backlog</SidebarGroupLabel>
                <SidebarMenu className="border-t pt-2 px-2">
                  {backlogSpecs.map((spec) => (
                    <SpecItem
                      key={spec.id}
                      spec={spec}
                      projectName={spec.projectName}
                    />
                  ))}
                </SidebarMenu>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
