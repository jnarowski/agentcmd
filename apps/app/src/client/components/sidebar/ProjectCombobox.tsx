import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Star, ChevronsUpDown, Plus, FolderOpen } from "lucide-react";
import { cn } from "@/client/utils/cn";
import { Button } from "@/client/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/client/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/client/components/ui/popover";
import { useNavigationStore } from "@/client/stores";
import {
  useProjects,
  useToggleProjectStarred,
} from "@/client/pages/projects/hooks/useProjects";
import type { Project } from "@/shared/types/project.types";
import { ProjectDialog } from "@/client/pages/projects/components/ProjectDialog";

export function ProjectCombobox() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const activeProjectId = useNavigationStore((s) => s.activeProjectId);
  const setActiveProject = useNavigationStore((s) => s.setActiveProject);
  const { data: projectsData } = useProjects();
  const toggleStarred = useToggleProjectStarred();

  // Filter visible projects only
  const visibleProjects = useMemo(
    () => (projectsData || []).filter((p) => !p.is_hidden),
    [projectsData]
  );

  // Separate starred and non-starred projects
  const starredProjects = useMemo(
    () =>
      visibleProjects
        .filter((p) => p.is_starred)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [visibleProjects]
  );

  const nonStarredProjects = useMemo(
    () =>
      visibleProjects
        .filter((p) => !p.is_starred)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [visibleProjects]
  );

  // Find selected project
  const selectedProject = useMemo(
    () => visibleProjects.find((p) => p.id === activeProjectId),
    [visibleProjects, activeProjectId]
  );

  const handleSelect = (value: string) => {
    if (value === "__show_all__") {
      setActiveProject(null);
      navigate("/projects");
    } else {
      setActiveProject(value);
      navigate(`/projects/${value}`);
    }
    setOpen(false);
  };

  const handleToggleStar = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    toggleStarred.mutate({
      id: project.id,
      is_starred: !project.is_starred,
    });
  };

  const handleNewProject = () => {
    setOpen(false);
    setIsProjectDialogOpen(true);
  };

  const renderProjectItem = (project: Project) => (
    <div className="flex items-center justify-between w-full gap-2">
      <span>{project.name}</span>
      <button
        type="button"
        onClick={(e) => handleToggleStar(e, project)}
        className="p-1 hover:bg-accent rounded transition-colors shrink-0"
        aria-label={project.is_starred ? "Unstar project" : "Star project"}
      >
        <Star
          className={cn(
            "size-3.5",
            project.is_starred && "fill-current text-yellow-500"
          )}
        />
      </button>
    </div>
  );

  return (
    <div className="px-2 pt-3 pb-2">
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between h-9"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FolderOpen className="size-4 shrink-0 opacity-70" />
                <span className="truncate">
                  {selectedProject?.name || "Show all"}
                </span>
              </div>
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 -ml-2"
          align="start"
          style={{ width: "var(--radix-popover-trigger-width)" }}
        >
          <Command>
            <CommandInput placeholder="Search projects..." />
            <CommandList>
              <CommandEmpty>No projects found</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__show_all__"
                  onSelect={() => handleSelect("__show_all__")}
                >
                  Show all
                </CommandItem>
              </CommandGroup>
              {starredProjects.length > 0 && (
                <>
                  <CommandGroup heading="Favorites">
                    {starredProjects.map((project) => (
                      <CommandItem
                        key={project.id}
                        value={project.id}
                        keywords={[project.name]}
                        onSelect={() => handleSelect(project.id)}
                      >
                        {/* @ts-ignore - React type version conflict */}
                        {renderProjectItem(project)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
              {nonStarredProjects.length > 0 && (
                <>
                  <CommandGroup heading="All">
                    {nonStarredProjects.map((project) => (
                      <CommandItem
                        key={project.id}
                        value={project.id}
                        keywords={[project.name]}
                        onSelect={() => handleSelect(project.id)}
                      >
                        {/* @ts-ignore - React type version conflict */}
                        {renderProjectItem(project)}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
              <CommandGroup>
                <CommandItem onSelect={handleNewProject}>
                  <Plus className="size-4 mr-2" />
                  New Project
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleNewProject}
          aria-label="New project"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <ProjectDialog
        open={isProjectDialogOpen}
        onOpenChange={setIsProjectDialogOpen}
        onProjectCreated={(projectId) => {
          setIsProjectDialogOpen(false);
          setActiveProject(projectId);
          navigate(`/projects/${projectId}`);
        }}
      />
    </div>
  );
}
