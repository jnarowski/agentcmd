import { Button } from "@/client/components/ui/button";
import { Badge } from "@/client/components/ui/badge";
import { TableCell, TableRow } from "@/client/components/ui/table";
import { Archive, ArchiveRestore, AlertCircle } from "lucide-react";
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
  const isGlobal = definition.scope === 'global';
  const runCount = definition._count?.runs ?? 0;

  return (
    <TableRow>
      <TableCell className="font-medium">
        {definition.name}
        {definition.load_error && (
          <Badge variant="destructive" className="ml-2">
            <AlertCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        )}
      </TableCell>
      <TableCell className="max-w-md truncate">
        {definition.description || '—'}
      </TableCell>
      <TableCell>
        {isGlobal ? (
          <Badge variant="secondary">Global</Badge>
        ) : (
          <Badge variant="outline">Project</Badge>
        )}
      </TableCell>
      <TableCell className="text-center">{runCount}</TableCell>
      <TableCell className="text-right">
        {isArchived ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUnarchive?.(definition)}
            disabled={isGlobal}
            title={isGlobal ? 'Global workflows cannot be unarchived' : 'Unarchive workflow'}
          >
            <ArchiveRestore className="w-4 h-4 mr-2" />
            Unarchive
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onArchive?.(definition)}
            disabled={isGlobal}
            title={isGlobal ? 'Global workflows cannot be archived' : 'Archive workflow'}
          >
            <Archive className="w-4 h-4 mr-2" />
            Archive
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
