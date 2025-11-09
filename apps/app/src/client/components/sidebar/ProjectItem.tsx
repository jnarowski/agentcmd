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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/client/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import type { Project } from "@/shared/types/project.types";

interface ProjectItemProps {
  project: Project;
  isActive: boolean;
  onEditProject: (project: Project) => void;
  onToggleStar: (projectId: string, isStarred: boolean) => void;
  onToggleHidden: (projectId: string, isHidden: boolean) => void;
}

export function ProjectItem({
  project,
  isActive,
  onEditProject,
  onToggleStar,
  onToggleHidden,
}: ProjectItemProps) {
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [menuOpenProjectId, setMenuOpenProjectId] = useState<string | null>(
    null
  );

  const handleProjectClick = (projectId: string) => {
    if (isMobile) {
      setOpenMobile(false);
    }
    navigate(`/projects/${projectId}`);
  };

  const handleToggleStar = (
    projectId: string,
    isStarred: boolean,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    onToggleStar(projectId, isStarred);
  };

  const handleToggleHidden = (
    projectId: string,
    isHidden: boolean,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    onToggleHidden(projectId, isHidden);
  };

  const handleEditProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    onEditProject(project);
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
        <span className="truncate text-sm">{project.name}</span>
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
              onClick={(e) => handleToggleStar(project.id, project.is_starred, e)}
            >
              <Star
                className="size-4 mr-2"
                fill={project.is_starred ? "currentColor" : "none"}
              />
              {project.is_starred ? "Unfavorite" : "Favorite"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => handleToggleHidden(project.id, project.is_hidden, e)}
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
            <DropdownMenuItem onClick={(e) => handleEditProject(project, e)}>
              <Pencil className="size-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => handleNewSession(project.id, e)}>
              <MessageSquarePlus className="size-4 mr-2" />
              New Session
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleNewWorkflow(project.id, e)}>
              <Workflow className="size-4 mr-2" />
              New Workflow
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </SidebarMenuItem>
  );
}
