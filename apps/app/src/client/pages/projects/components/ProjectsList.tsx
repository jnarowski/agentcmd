import { useNavigate } from "react-router-dom";
import { Badge } from "@/client/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { FolderOpen } from "lucide-react";
import { truncatePath } from "@/client/utils/cn";
import type { Project } from "@/shared/types/project.types";

interface ProjectsListProps {
  projects: Project[];
}

export function ProjectsList({ projects }: ProjectsListProps) {
  const navigate = useNavigate();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Path</TableHead>
          <TableHead className="text-right">Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <TableRow
            key={project.id}
            className="cursor-pointer"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <TableCell>
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{project.name}</span>
                {project.is_hidden && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    Hidden
                  </Badge>
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
