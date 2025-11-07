"use client";

import { useState, useMemo, useEffect, type MouseEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useActiveProject } from "@/client/hooks/navigation";
import {
  ChevronRight,
  Folder,
  MoreHorizontal,
  Star,
  Edit,
  EyeOff,
  Eye,
  RefreshCw,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  useSidebar,
} from "@/client/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/client/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import {
  useProjectsWithSessions,
  useToggleProjectHidden,
  useToggleProjectStarred,
  projectKeys,
} from "@/client/pages/projects/hooks/useProjects";
import { SessionListItem } from "@/client/pages/projects/sessions/components/SessionListItem";
import { NewSessionButton } from "@/client/pages/projects/sessions/components/NewSessionButton";
import { CommandMenu } from "./CommandMenu";
import { ProjectDialog } from "@/client/pages/projects/components/ProjectDialog";
import type { Project } from "@/shared/types/project.types";

interface AppInnerSidebarProps {
  activeProjectId?: string;
  onProjectClick?: (projectId: string) => void;
  onSessionClick?: (projectId: string, sessionId: string) => void;
  onNewSession?: (projectId: string) => void;
}

export function AppInnerSidebar({
  activeProjectId: activeProjectIdProp,
  onProjectClick,
}: AppInnerSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { projectId: activeProjectIdFromHook } = useActiveProject();
  const { data: projectsData, isLoading, error } = useProjectsWithSessions();
  const { isMobile } = useSidebar();
  const [isSyncing, setIsSyncing] = useState(false);

  // Get the current session ID from the URL
  const sessionMatch = location.pathname.match(/\/session\/([^/]+)/);
  const activeSessionId = sessionMatch ? sessionMatch[1] : null;

  // Use navigation hook if available, otherwise use prop
  const activeProjectId = activeProjectIdFromHook || activeProjectIdProp;

  const [searchQuery, setSearchQuery] = useState("");
  const [openProjects, setOpenProjects] = useState<string[]>(
    activeProjectId ? [activeProjectId] : []
  );
  const [showAllSessions, setShowAllSessions] = useState<{
    [projectId: string]: boolean;
  }>({});
  const [isHiddenOpen, setIsHiddenOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | undefined>(
    undefined
  );

  // Get sessions for the active project from project data
  const activeProject = projectsData?.find((p) => p.id === activeProjectId);
  const sortedSessions = useMemo(() => {
    if (!activeProject?.sessions) return [];
    // Sort by created_at descending (most recent first)
    return [...activeProject.sessions].sort((a, b) => {
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [activeProject?.sessions]);

  const toggleHiddenMutation = useToggleProjectHidden();
  const toggleStarredMutation = useToggleProjectStarred();

  // Transform projects data with real session counts and separate into categories
  const { favoriteProjects, visibleProjects, hiddenProjects } = useMemo(() => {
    if (!projectsData)
      return { favoriteProjects: [], visibleProjects: [], hiddenProjects: [] };

    const allProjects = projectsData.map((project) => ({
      id: project.id,
      name: project.name,
      path: project.path,
      is_hidden: project.is_hidden,
      is_starred: project.is_starred,
      created_at: project.created_at,
      updated_at: project.updated_at,
      sessionCount: project.sessions?.length || 0,
    }));

    // Filter by search query
    const filteredProjects = searchQuery
      ? allProjects.filter((p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : allProjects;

    const favorites = filteredProjects
      .filter((p) => p.is_starred && !p.is_hidden)
      .sort((a, b) => a.name.localeCompare(b.name));

    const visible = filteredProjects
      .filter((p) => !p.is_hidden && !p.is_starred)
      .sort((a, b) => a.name.localeCompare(b.name));

    const hidden = filteredProjects
      .filter((p) => p.is_hidden)
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      favoriteProjects: favorites,
      visibleProjects: visible,
      hiddenProjects: hidden,
    };
  }, [projectsData, searchQuery]);

  const toggleProject = (projectId: string) => {
    // Always ensure the project is open when navigating to it
    setOpenProjects((prev) =>
      prev.includes(projectId) ? prev : [...prev, projectId]
    );
    onProjectClick?.(projectId);
    navigate(`/projects/${projectId}`);
  };

  const handleToggleHidden = (
    projectId: string,
    is_hidden: boolean,
    e: MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    toggleHiddenMutation.mutate({ id: projectId, is_hidden });
  };

  const handleToggleStarred = (
    projectId: string,
    is_starred: boolean,
    e: MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    toggleStarredMutation.mutate({ id: projectId, is_starred });
  };

  const handleEditProject = (project: Project, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToEdit(project);
    setEditDialogOpen(true);
  };

  const handleSyncProjects = async () => {
    setIsSyncing(true);
    try {
      // Invalidate the sync query to force a refetch
      await queryClient.invalidateQueries({ queryKey: projectKeys.sync() });

      // Get the sync result from cache after invalidation completes
      const syncResult = queryClient.getQueryData(projectKeys.sync());

      if (
        syncResult &&
        typeof syncResult === "object" &&
        "projectsImported" in syncResult &&
        "projectsUpdated" in syncResult
      ) {
        toast.success(
          `Projects synced: ${syncResult.projectsImported} imported, ${syncResult.projectsUpdated} updated`
        );
      } else {
        toast.success("Projects synced successfully");
      }
    } catch {
      toast.error("Failed to sync projects");
    } finally {
      setIsSyncing(false);
    }
  };

  // Ensure active project is open on mount or when activeProjectId changes
  useEffect(() => {
    if (activeProjectId && !openProjects.includes(activeProjectId)) {
      setOpenProjects((prev) => [...prev, activeProjectId]);
    }
  }, [activeProjectId, openProjects]);

  return (
    <Sidebar collapsible="none" className="flex-1">
      <SidebarHeader className="gap-3.5 p-4">
        <CommandMenu onSearchChange={setSearchQuery} />
      </SidebarHeader>
      <SidebarContent>
        {favoriteProjects.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Favorites</SidebarGroupLabel>
            {!isLoading && !error && (
              <SidebarMenu>
                {favoriteProjects.map((project) => {
                  const isOpen = openProjects.includes(project.id);
                  const isActive = project.id === activeProjectId;

                  return (
                    <Collapsible
                      key={project.id}
                      open={isOpen}
                      onOpenChange={() => toggleProject(project.id)}
                    >
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <CollapsibleTrigger className="w-full overflow-hidden flex items-center gap-2">
                            <Folder className="shrink-0" />
                            <div className="flex flex-1 flex-col items-start gap-0.5 min-w-0 overflow-hidden">
                              <span className="text-base md:text-sm truncate block">
                                {project.name.length > 20
                                  ? `${project.name.slice(0, 20)}...`
                                  : project.name}
                              </span>
                            </div>
                            {!isOpen && (
                              <ChevronRight className="ml-auto shrink-0" />
                            )}
                          </CollapsibleTrigger>
                        </SidebarMenuButton>
                        {isOpen && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <SidebarMenuAction className="mr-1">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">More</span>
                              </SidebarMenuAction>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              className="w-48 rounded-lg"
                              side={isMobile ? "bottom" : "right"}
                              align={isMobile ? "end" : "start"}
                            >
                              <DropdownMenuItem
                                onClick={(e) =>
                                  handleToggleStarred(
                                    project.id,
                                    !project.is_starred,
                                    e
                                  )
                                }
                              >
                                <Star className="text-muted-foreground fill-current" />
                                <span>Unfavorite</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => handleEditProject(project, e)}
                              >
                                <Edit className="text-muted-foreground" />
                                <span>Edit Project</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) =>
                                  handleToggleHidden(
                                    project.id,
                                    !project.is_hidden,
                                    e
                                  )
                                }
                              >
                                <EyeOff className="text-muted-foreground" />
                                <span>Hide Project</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        <CollapsibleContent>
                          <div className="ml-0 space-y-0.5 py-1">
                            {isActive && (
                              <div className="py-2 new-session-btn-wrapper">
                                <NewSessionButton
                                  projectId={project.id}
                                  variant="default"
                                  size="sm"
                                />
                              </div>
                            )}
                            {isActive &&
                            sortedSessions &&
                            sortedSessions.length > 0 ? (
                              <>
                                {(showAllSessions[project.id]
                                  ? sortedSessions
                                  : sortedSessions.slice(0, 5)
                                ).map((session) => (
                                  <SessionListItem
                                    key={session.id}
                                    session={session}
                                    projectId={project.id}
                                    isActive={session.id === activeSessionId}
                                  />
                                ))}
                                {sortedSessions.length > 5 &&
                                  !showAllSessions[project.id] && (
                                    <button
                                      onClick={() =>
                                        setShowAllSessions((prev) => ({
                                          ...prev,
                                          [project.id]: true,
                                        }))
                                      }
                                      className="w-full px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
                                    >
                                      Show {sortedSessions.length - 5} more...
                                    </button>
                                  )}
                              </>
                            ) : isActive ? (
                              <div className="px-2 py-2 text-xs text-muted-foreground">
                                No sessions yet
                              </div>
                            ) : null}
                          </div>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })}
              </SidebarMenu>
            )}
          </SidebarGroup>
        )}
        <SidebarGroup>
          <div className="flex items-center justify-between px-2 py-1.5">
            <SidebarGroupLabel className="flex-1">
              All Projects
            </SidebarGroupLabel>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSyncProjects}
                    disabled={isSyncing}
                    className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Sync projects from Claude CLI"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px]">
                  <p className="text-xs">Sync projects from Claude CLI</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Imports projects from ~/.claude/projects
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {isLoading && (
            <div className="px-2 py-1 text-sm text-muted-foreground">
              Loading projects...
            </div>
          )}
          {error && (
            <div className="px-2 py-1 text-sm text-destructive">
              Error loading projects: {error.message}
            </div>
          )}
          {!isLoading && !error && (
            <SidebarMenu>
              {visibleProjects.map((project) => {
                const isOpen = openProjects.includes(project.id);
                const isActive = project.id === activeProjectId;

                return (
                  <Collapsible
                    key={project.id}
                    open={isOpen}
                    onOpenChange={() => toggleProject(project.id)}
                  >
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <CollapsibleTrigger className="w-full overflow-hidden flex items-center gap-2">
                          <Folder className="shrink-0" />
                          <div className="flex flex-1 flex-col items-start gap-0.5 min-w-0 overflow-hidden">
                            <span className="text-base md:text-sm truncate block">
                              {project.name.length > 20
                                ? `${project.name.slice(0, 20)}...`
                                : project.name}
                            </span>
                          </div>
                          {!isOpen && (
                            <ChevronRight className="ml-auto shrink-0" />
                          )}
                        </CollapsibleTrigger>
                      </SidebarMenuButton>
                      {isOpen && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuAction className="mr-1">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">More</span>
                            </SidebarMenuAction>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-48 rounded-lg"
                            side={isMobile ? "bottom" : "right"}
                            align={isMobile ? "end" : "start"}
                          >
                            <DropdownMenuItem
                              onClick={(e) =>
                                handleToggleStarred(
                                  project.id,
                                  !project.is_starred,
                                  e
                                )
                              }
                            >
                              <Star className="text-muted-foreground" />
                              <span>Favorite</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => handleEditProject(project, e)}
                            >
                              <Edit className="text-muted-foreground" />
                              <span>Edit Project</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) =>
                                handleToggleHidden(
                                  project.id,
                                  !project.is_hidden,
                                  e
                                )
                              }
                            >
                              {project.is_hidden ? (
                                <>
                                  <Eye className="text-muted-foreground" />
                                  <span>Unhide Project</span>
                                </>
                              ) : (
                                <>
                                  <EyeOff className="text-muted-foreground" />
                                  <span>Hide Project</span>
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <CollapsibleContent>
                        <div className="ml-0 space-y-0.5 py-1">
                          {isActive && (
                            <div className="py-2 new-session-btn-wrapper">
                              <NewSessionButton
                                projectId={project.id}
                                variant="default"
                                size="sm"
                              />
                            </div>
                          )}
                          {isActive &&
                          sortedSessions &&
                          sortedSessions.length > 0 ? (
                            <>
                              {(showAllSessions[project.id]
                                ? sortedSessions
                                : sortedSessions.slice(0, 5)
                              ).map((session) => (
                                <SessionListItem
                                  key={session.id}
                                  session={session}
                                  projectId={project.id}
                                  isActive={session.id === activeSessionId}
                                />
                              ))}
                              {sortedSessions.length > 5 &&
                                !showAllSessions[project.id] && (
                                  <button
                                    onClick={() =>
                                      setShowAllSessions((prev) => ({
                                        ...prev,
                                        [project.id]: true,
                                      }))
                                    }
                                    className="w-full px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
                                  >
                                    Show {sortedSessions.length - 5} more...
                                  </button>
                                )}
                            </>
                          ) : isActive ? (
                            <div className="px-2 py-2 text-xs text-muted-foreground">
                              No sessions yet
                            </div>
                          ) : null}
                        </div>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          )}
        </SidebarGroup>
        {hiddenProjects.length > 0 && (
          <SidebarGroup>
            <Collapsible open={isHiddenOpen} onOpenChange={setIsHiddenOpen}>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="w-full flex items-center justify-between">
                  <span>Hidden ({hiddenProjects.length})</span>
                  <ChevronRight
                    className={`transition-transform ${
                      isHiddenOpen ? "rotate-90" : ""
                    }`}
                  />
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarMenu>
                  {hiddenProjects.map((project) => {
                    const isOpen = openProjects.includes(project.id);
                    const isActive = project.id === activeProjectId;

                    return (
                      <Collapsible
                        key={project.id}
                        open={isOpen}
                        onOpenChange={() => toggleProject(project.id)}
                      >
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActive}>
                            <CollapsibleTrigger className="w-full overflow-hidden flex items-center gap-2">
                              <Folder className="shrink-0" />
                              <div className="flex flex-1 flex-col items-start gap-0.5 min-w-0 overflow-hidden">
                                <span className="font-medium text-base md:text-sm truncate block">
                                  {project.name.length > 55
                                    ? `${project.name.slice(0, 55)}...`
                                    : project.name}
                                </span>
                              </div>
                              {!isOpen && (
                                <ChevronRight className="ml-auto shrink-0" />
                              )}
                            </CollapsibleTrigger>
                          </SidebarMenuButton>
                          {isOpen && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <SidebarMenuAction className="mr-1">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">More</span>
                                </SidebarMenuAction>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                className="w-48 rounded-lg"
                                side={isMobile ? "bottom" : "right"}
                                align={isMobile ? "end" : "start"}
                              >
                                <DropdownMenuItem
                                  onClick={(e) =>
                                    handleToggleStarred(
                                      project.id,
                                      !project.is_starred,
                                      e
                                    )
                                  }
                                >
                                  {project.is_starred ? (
                                    <>
                                      <Star className="text-muted-foreground fill-current" />
                                      <span>Unfavorite</span>
                                    </>
                                  ) : (
                                    <>
                                      <Star className="text-muted-foreground" />
                                      <span>Favorite</span>
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => handleEditProject(project, e)}
                                >
                                  <Edit className="text-muted-foreground" />
                                  <span>Edit Project</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) =>
                                    handleToggleHidden(
                                      project.id,
                                      !project.is_hidden,
                                      e
                                    )
                                  }
                                >
                                  {project.is_hidden ? (
                                    <>
                                      <Eye className="text-muted-foreground" />
                                      <span>Unhide Project</span>
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="text-muted-foreground" />
                                      <span>Hide Project</span>
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          <CollapsibleContent>
                            <div className="ml-0 space-y-0.5 py-1">
                              {isActive && (
                                <div className="py-2 new-session-btn-wrapper">
                                  <NewSessionButton
                                    projectId={project.id}
                                    variant="default"
                                    size="sm"
                                  />
                                </div>
                              )}
                              {isActive &&
                              sortedSessions &&
                              sortedSessions.length > 0 ? (
                                <>
                                  {(showAllSessions[project.id]
                                    ? sortedSessions
                                    : sortedSessions.slice(0, 5)
                                  ).map((session) => (
                                    <SessionListItem
                                      key={session.id}
                                      session={session}
                                      projectId={project.id}
                                      isActive={session.id === activeSessionId}
                                    />
                                  ))}
                                  {sortedSessions.length > 5 &&
                                    !showAllSessions[project.id] && (
                                      <button
                                        onClick={() =>
                                          setShowAllSessions((prev) => ({
                                            ...prev,
                                            [project.id]: true,
                                          }))
                                        }
                                        className="w-full px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
                                      >
                                        Show {sortedSessions.length - 5} more...
                                      </button>
                                    )}
                                </>
                              ) : isActive ? (
                                <div className="px-2 py-2 text-xs text-muted-foreground">
                                  No sessions yet
                                </div>
                              ) : null}
                            </div>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  })}
                </SidebarMenu>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}
      </SidebarContent>
      <ProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={projectToEdit}
      />
    </Sidebar>
  );
}
