import { useState } from "react";
import { Folder, ChevronRight } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/client/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/client/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/client/components/ui/toggle-group";
import type { ProjectsView } from "./types";
import { useSettings, useUpdateSettings } from "@/client/hooks/useSettings";

// Mock project data
const mockProjects = [
  { id: "project-1", name: "agentcmd", isFavorite: true, isHidden: false },
  { id: "project-2", name: "My Website", isFavorite: false, isHidden: false },
  { id: "project-3", name: "API Server", isFavorite: true, isHidden: false },
  { id: "project-4", name: "Old Project", isFavorite: false, isHidden: true },
];

export function NavProjects() {
  const navigate = useNavigate();
  const { projectId: activeProjectId } = useParams();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const view: ProjectsView = settings?.userPreferences?.projects_view || "all";
  const [openProjects, setOpenProjects] = useState<string[]>(
    activeProjectId ? [activeProjectId] : []
  );

  // Filter projects based on view
  let filteredProjects = mockProjects;
  if (view === "favorites") {
    filteredProjects = mockProjects.filter((p) => p.isFavorite && !p.isHidden);
  } else if (view === "hidden") {
    filteredProjects = mockProjects.filter((p) => p.isHidden);
  } else {
    // "all" - show non-hidden projects
    filteredProjects = mockProjects.filter((p) => !p.isHidden);
  }

  const toggleProject = (projectId: string) => {
    setOpenProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleProjectClick = (projectId: string) => {
    toggleProject(projectId);
    navigate(`/projects/${projectId}`);
  };

  return (
    <div className="px-2 py-2">
      <div className="pb-2">
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
          <ToggleGroupItem
            value="hidden"
            aria-label="Show hidden projects"
            className="h-6 px-2 text-xs"
          >
            Hidden
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {filteredProjects.length === 0 ? (
        <div className="py-4 text-center text-sm text-muted-foreground">
          No projects
        </div>
      ) : (
        <SidebarMenu>
          {filteredProjects.map((project) => {
            const isOpen = openProjects.includes(project.id);
            const isActive = project.id === activeProjectId;

            return (
              <Collapsible
                key={project.id}
                open={isOpen}
                onOpenChange={() => handleProjectClick(project.id)}
              >
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <CollapsibleTrigger className="w-full flex items-center gap-2 h-7 px-2">
                      <Folder className="size-4" />
                      <span className="flex-1 truncate text-sm">
                        {project.name}
                      </span>
                      {!isOpen && (
                        <ChevronRight className="size-4 transition-transform" />
                      )}
                    </CollapsibleTrigger>
                  </SidebarMenuButton>
                  <CollapsibleContent>
                    <div className="ml-6 px-2 py-1 text-xs text-muted-foreground">
                      Project details (sessions will appear here)
                    </div>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          })}
        </SidebarMenu>
      )}
    </div>
  );
}
