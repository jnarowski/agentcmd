import { Link } from "react-router-dom";
import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import { TableCell, TableRow } from "@/client/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { Archive, ArchiveRestore, AlertCircle } from "lucide-react";
import { useProjectId } from "@/client/hooks/useProjectId";
import type { WorkflowDefinition } from "@/client/pages/projects/workflows/types";

interface WorkflowDefinitionRowProps {
  definition: WorkflowDefinition;
  onArchive?: (definition: WorkflowDefinition) => void;
  onUnarchive?: (definition: WorkflowDefinition) => void;
  isArchived: boolean;
}

export function WorkflowDefinitionRow({
  definition,
  onArchive,
  onUnarchive,
  isArchived,
}: WorkflowDefinitionRowProps) {
  const projectId = useProjectId();
  const runCount = definition._count?.runs ?? 0;

  return (
    <TableRow>
      <TableCell className="font-medium">
        <Link
          to={`/projects/${projectId}/workflows/${definition.id}`}
          className="hover:underline"
        >
          {definition.name}
        </Link>
        {definition.load_error && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="ml-2">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Error
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="break-words">{definition.load_error}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </TableCell>
      <TableCell className="max-w-md truncate">
        {definition.description || '—'}
      </TableCell>
      <TableCell className="text-center">{runCount}</TableCell>
      <TableCell className="text-right">
        {isArchived ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUnarchive?.(definition)}
            title="Unarchive workflow"
          >
            <ArchiveRestore className="w-4 h-4 mr-2" />
            Unarchive
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onArchive?.(definition)}
            title="Archive workflow"
          >
            <Archive className="w-4 h-4 mr-2" />
            Archive
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
