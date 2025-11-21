import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
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
import { FolderOpen, Star, ChevronRight } from "lucide-react";
import { truncatePath } from "@/client/utils/cn";
import type { Project } from "@/shared/types/project.types";
import { ProjectDropdownMenu } from "./ProjectDropdownMenu";

interface ProjectsListProps {
  projects: Project[];
}

function ProjectRow({ project }: { project: Project }) {
  const navigate = useNavigate();

  return (
    <TableRow
      className="cursor-pointer"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <TableCell>
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium">{project.name}</span>
          {project.is_starred && (
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 shrink-0" />
          )}
        </div>
      </TableCell>
      <TableCell>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="font-mono text-xs text-muted-foreground truncate cursor-help max-w-md">
                {truncatePath(
                  project.path,
                  typeof window !== "undefined" && window.innerWidth < 768
                    ? 30
                    : 60
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-md break-all">
              <p className="font-mono text-xs">{project.path}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="text-right text-muted-foreground">
        {new Date(project.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </TableCell>
      <TableCell>
        <ProjectDropdownMenu project={project} />
      </TableCell>
    </TableRow>
  );
}

export function ProjectsList({ projects }: ProjectsListProps) {
  const [hiddenOpen, setHiddenOpen] = useState(false);

  const { activeProjects, hiddenProjects } = useMemo(() => {
    const active = projects
      .filter((p) => !p.is_hidden)
      .sort((a, b) => {
        // Sort favorites first
        if (a.is_starred && !b.is_starred) return -1;
        if (!a.is_starred && b.is_starred) return 1;
        // Then alphabetically by name
        return a.name.localeCompare(b.name);
      });

    const hidden = projects
      .filter((p) => p.is_hidden)
      .sort((a, b) => a.name.localeCompare(b.name));

    return { activeProjects: active, hiddenProjects: hidden };
  }, [projects]);

  return (
    <div className="space-y-6">
      {/* Active Projects Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Path</TableHead>
            <TableHead className="text-right">Created</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeProjects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </TableBody>
      </Table>

      {/* Hidden Projects Collapsible */}
      {hiddenProjects.length > 0 && (
        <Collapsible open={hiddenOpen} onOpenChange={setHiddenOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <ChevronRight
                className={`h-4 w-4 transition-transform ${hiddenOpen ? "rotate-90" : ""}`}
              />
              <span className="font-medium">Hidden Projects</span>
              <Badge variant="secondary" className="ml-2">
                {hiddenProjects.length}
              </Badge>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hiddenProjects.map((project) => (
                  <ProjectRow key={project.id} project={project} />
                ))}
              </TableBody>
            </Table>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
