import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useParams } from "react-router-dom";
import { SidebarMenu } from "@/client/components/ui/sidebar";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/client/components/ui/toggle-group";
import { useSettings, useUpdateSettings } from "@/client/hooks/useSettings";
import {
  useProjectsWithSessions,
  useToggleProjectStarred,
  useToggleProjectHidden,
} from "@/client/pages/projects/hooks/useProjects";
import { ProjectDialog } from "@/client/pages/projects/components/ProjectDialog";
import { ProjectItem } from "@/client/components/sidebar/ProjectItem";
import type { Project } from "@/shared/types/project.types";

type ProjectsView = "all" | "favorites" | "hidden";

export function NavProjects() {
  const { projectId, id } = useParams();
  const activeProjectId = projectId || id;
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: projectsData } = useProjectsWithSessions();
  const toggleStarred = useToggleProjectStarred();
  const toggleHidden = useToggleProjectHidden();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | undefined>(
    undefined
  );
  const [hiddenExpanded, setHiddenExpanded] = useState(false);

  const view: ProjectsView = settings?.userPreferences?.projects_view || "all";

  // Separate visible and hidden projects
  const visibleProjects = (projectsData || []).filter((p) => !p.is_hidden);
  const hiddenProjects = (projectsData || []).filter((p) => p.is_hidden);

  // Filter visible projects based on view
  let filteredProjects = visibleProjects;
  if (view === "favorites") {
    filteredProjects = visibleProjects.filter((p) => p.is_starred);
  }

  // Sort alphabetically by name
  filteredProjects = filteredProjects.sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const sortedHiddenProjects = hiddenProjects.sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const handleToggleStar = (projectId: string, isStarred: boolean) => {
    toggleStarred.mutate({ id: projectId, is_starred: !isStarred });
  };

  const handleToggleHidden = (projectId: string, isHidden: boolean) => {
    toggleHidden.mutate({ id: projectId, is_hidden: !isHidden });
  };

  const handleEditProject = (project: Project) => {
    setProjectToEdit(project);
    setEditDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-2 pb-2 shrink-0">
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(value) => {
            if (value) {
              updateSettings.mutate({ projects_view: value as ProjectsView });
            }
          }}
          className="justify-start gap-0.5"
        >
          <ToggleGroupItem
            value="all"
            aria-label="Show all projects"
            className="h-6 px-2 text-xs"
          >
            All
          </ToggleGroupItem>
          <ToggleGroupItem
            value="favorites"
            aria-label="Show favorites only"
            className="h-6 px-2 text-xs"
          >
            Favorites
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {filteredProjects.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No projects
          </div>
        ) : (
          <SidebarMenu>
            {filteredProjects.map((project) => {
              const isActive = project.id === activeProjectId;

              return (
                <ProjectItem
                  key={project.id}
                  project={project}
                  isActive={isActive}
                  onEditProject={handleEditProject}
                  onToggleStar={handleToggleStar}
                  onToggleHidden={handleToggleHidden}
                />
              );
            })}
          </SidebarMenu>
        )}

        {sortedHiddenProjects.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setHiddenExpanded(!hiddenExpanded)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground w-full"
            >
              <ChevronRight
                className={`size-3.5 transition-transform ${hiddenExpanded ? "rotate-90" : ""}`}
              />
              Hidden ({sortedHiddenProjects.length})
            </button>
            {hiddenExpanded && (
              <SidebarMenu>
                {sortedHiddenProjects.map((project) => {
                  const isActive = project.id === activeProjectId;

                  return (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      isActive={isActive}
                      onEditProject={handleEditProject}
                      onToggleStar={handleToggleStar}
                      onToggleHidden={handleToggleHidden}
                    />
                  );
                })}
              </SidebarMenu>
            )}
          </div>
        )}
      </div>
      <ProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={projectToEdit}
      />
    </div>
  );
}
