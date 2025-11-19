import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  useProject,
  useToggleProjectStarred,
  useToggleProjectHidden,
} from "@/client/pages/projects/hooks/useProjects";
import { ProjectOnboardingSuggestions } from "@/client/pages/projects/components/ProjectOnboardingSuggestions";
import { ProjectHomeSpecs } from "@/client/pages/projects/components/ProjectHomeSpecs";
import { ProjectReadme } from "@/client/pages/projects/components/ProjectReadme";
import { ProjectDialog } from "@/client/pages/projects/components/ProjectDialog";
import { Skeleton } from "@/client/components/ui/skeleton";
import { Button } from "@/client/components/ui/button";
import { ButtonGroup } from "@/client/components/ui/button-group";
import { Badge } from "@/client/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import {
  Edit,
  Archive,
  ArchiveRestore,
  Star,
  ChevronDown,
} from "lucide-react";
import { useDocumentTitle } from "@/client/hooks/useDocumentTitle";

export default function ProjectHomePage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading } = useProject(id!);
  const [editingProject, setEditingProject] = useState(false);
  const toggleStarred = useToggleProjectStarred();
  const toggleHidden = useToggleProjectHidden();

  useDocumentTitle(
    project?.name ? `${project.name} | Agent Workflows` : undefined
  );

  const handleEdit = () => {
    setEditingProject(true);
  };

  const handleToggleFavorite = () => {
    if (!project) return;
    toggleStarred.mutate({ id: project.id, is_starred: !project.is_starred });
  };

  const handleToggleArchive = () => {
    if (!project) return;
    toggleHidden.mutate({ id: project.id, is_hidden: !project.is_hidden });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-semibold leading-tight break-words">
                {project.name}
              </h1>
              {project.is_starred && (
                <Star className="h-5 w-5 fill-yellow-500 text-yellow-500 shrink-0" />
              )}
            </div>
            {project.is_hidden && (
              <Badge variant="secondary">Hidden</Badge>
            )}
          </div>
          <ButtonGroup>
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More Options">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
          </ButtonGroup>
        </div>

      {/* Project Setup */}
      {!project.capabilities.workflow_sdk.installed && (
        <ProjectOnboardingSuggestions project={project} />
      )}

      {/* Specs */}
      <ProjectHomeSpecs projectId={id!} />

      {/* README Section */}
      <ProjectReadme project={project} />
      </div>

      <ProjectDialog
        open={editingProject}
        onOpenChange={(open) => !open && setEditingProject(false)}
        project={project}
      />
    </>
  );
}
