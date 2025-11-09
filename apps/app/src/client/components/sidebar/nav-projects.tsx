import { useState } from "react";
import {
  Folder,
  FolderOpen,
  MoreHorizontal,
  Star,
  EyeOff,
  Eye,
  Pencil,
  MessageSquarePlus,
  Workflow,
  ChevronRight,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/client/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
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
import type { Project } from "@/shared/types/project.types";

type ProjectsView = "all" | "favorites" | "hidden";

export function NavProjects() {
  const navigate = useNavigate();
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
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [menuOpenProjectId, setMenuOpenProjectId] = useState<string | null>(
    null
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

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const handleToggleStar = (
    projectId: string,
    isStarred: boolean,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    toggleStarred.mutate({ id: projectId, is_starred: !isStarred });
  };

  const handleToggleHidden = (
    projectId: string,
    isHidden: boolean,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    toggleHidden.mutate({ id: projectId, is_hidden: !isHidden });
  };

  const handleEditProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjectToEdit(project);
    setEditDialogOpen(true);
  };

  const handleNewSession = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/projects/${projectId}/sessions/new`);
  };

  const handleNewWorkflow = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/projects/${projectId}/workflows/new`);
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
                <SidebarMenuItem
                  key={project.id}
                  onMouseEnter={() => setHoveredProjectId(project.id)}
                  onMouseLeave={() => setHoveredProjectId(null)}
                  className="relative"
                >
                  <SidebarMenuButton
                    onClick={() => handleProjectClick(project.id)}
                    isActive={isActive}
                    className="h-7 px-2"
                  >
                    {isActive ? (
                      <FolderOpen className="size-4 shrink-0" />
                    ) : (
                      <Folder className="size-4 shrink-0" />
                    )}
                    <span className="truncate text-sm">
                      {project.name}
                    </span>
                    {project.is_starred && (
                      <Star className="size-3 shrink-0 fill-current ml-1" />
                    )}
                    <span className="flex-1" />
                  </SidebarMenuButton>
                  {(hoveredProjectId === project.id ||
                    menuOpenProjectId === project.id) && (
                    <DropdownMenu
                      onOpenChange={(open) =>
                        setMenuOpenProjectId(open ? project.id : null)
                      }
                    >
                      <DropdownMenuTrigger
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-accent rounded-sm flex items-center justify-center data-[state=open]:bg-accent"
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) =>
                            handleToggleStar(project.id, project.is_starred, e)
                          }
                        >
                          <Star
                            className="size-4 mr-2"
                            fill={project.is_starred ? "currentColor" : "none"}
                          />
                          {project.is_starred ? "Unfavorite" : "Favorite"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) =>
                            handleToggleHidden(project.id, project.is_hidden, e)
                          }
                        >
                          {project.is_hidden ? (
                            <>
                              <Eye className="size-4 mr-2" />
                              Unhide
                            </>
                          ) : (
                            <>
                              <EyeOff className="size-4 mr-2" />
                              Hide
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleEditProject(project, e)}
                        >
                          <Pencil className="size-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => handleNewSession(project.id, e)}
                        >
                          <MessageSquarePlus className="size-4 mr-2" />
                          New Session
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleNewWorkflow(project.id, e)}
                        >
                          <Workflow className="size-4 mr-2" />
                          New Workflow
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </SidebarMenuItem>
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
                    <SidebarMenuItem
                      key={project.id}
                      onMouseEnter={() => setHoveredProjectId(project.id)}
                      onMouseLeave={() => setHoveredProjectId(null)}
                      className="relative"
                    >
                      <SidebarMenuButton
                        onClick={() => handleProjectClick(project.id)}
                        isActive={isActive}
                        className="h-7 px-2"
                      >
                        {isActive ? (
                          <FolderOpen className="size-4 shrink-0" />
                        ) : (
                          <Folder className="size-4 shrink-0" />
                        )}
                        <span className="truncate text-sm">
                          {project.name}
                        </span>
                        {project.is_starred && (
                          <Star className="size-3 shrink-0 fill-current ml-1" />
                        )}
                        <span className="flex-1" />
                      </SidebarMenuButton>
                      {(hoveredProjectId === project.id ||
                        menuOpenProjectId === project.id) && (
                        <DropdownMenu
                          onOpenChange={(open) =>
                            setMenuOpenProjectId(open ? project.id : null)
                          }
                        >
                          <DropdownMenuTrigger
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-accent rounded-sm flex items-center justify-center data-[state=open]:bg-accent"
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) =>
                                handleToggleStar(project.id, project.is_starred, e)
                              }
                            >
                              <Star
                                className="size-4 mr-2"
                                fill={project.is_starred ? "currentColor" : "none"}
                              />
                              {project.is_starred ? "Unfavorite" : "Favorite"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) =>
                                handleToggleHidden(project.id, project.is_hidden, e)
                              }
                            >
                              <Eye className="size-4 mr-2" />
                              Unhide
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleEditProject(project, e)}
                            >
                              <Pencil className="size-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => handleNewSession(project.id, e)}
                            >
                              <MessageSquarePlus className="size-4 mr-2" />
                              New Session
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleNewWorkflow(project.id, e)}
                            >
                              <Workflow className="size-4 mr-2" />
                              New Workflow
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </SidebarMenuItem>
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
