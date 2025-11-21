import { useState } from "react";
import { MoreVertical, Edit, Star, Archive, ArchiveRestore } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { Button } from "@/client/components/ui/button";
import { ProjectDialog } from "./ProjectDialog";
import { useToggleProjectStarred, useToggleProjectHidden } from "../hooks/useProjects";
import { cn } from "@/client/utils/cn";
import type { Project } from "@/shared/types/project.types";

interface ProjectDropdownMenuProps {
  project: Project;
  onEditSuccess?: () => void;
  onMenuOpenChange?: (open: boolean) => void;
  triggerClassName?: string;
}

/**
 * Reusable dropdown menu for project actions (edit, favorite, archive)
 * Manages its own state for dialog and menu open/close
 */
export function ProjectDropdownMenu({
  project,
  onEditSuccess,
  onMenuOpenChange,
  triggerClassName,
}: ProjectDropdownMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const toggleStarred = useToggleProjectStarred();
  const toggleHidden = useToggleProjectHidden();

  const handleMenuOpenChange = (open: boolean) => {
    setIsMenuOpen(open);
    onMenuOpenChange?.(open);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleMenuOpenChange(false);
    setEditDialogOpen(true);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleMenuOpenChange(false);
    toggleStarred.mutate({ id: project.id, is_starred: !project.is_starred });
  };

  const handleToggleArchive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleMenuOpenChange(false);
    toggleHidden.mutate({ id: project.id, is_hidden: !project.is_hidden });
  };

  const handleDialogClose = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      onEditSuccess?.();
    }
  };

  return (
    <>
      <DropdownMenu open={isMenuOpen} onOpenChange={handleMenuOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", triggerClassName)}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleFavorite}>
            <Star className="h-4 w-4" />
            {project.is_starred ? "Unfavorite" : "Favorite"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleToggleArchive}>
            {project.is_hidden ? (
              <>
                <ArchiveRestore className="h-4 w-4" />
                Unarchive
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                Archive
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProjectDialog
        open={editDialogOpen}
        onOpenChange={handleDialogClose}
        project={project}
      />
    </>
  );
}
