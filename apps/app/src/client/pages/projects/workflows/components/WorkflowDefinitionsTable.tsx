import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { WorkflowDefinitionRow } from "./WorkflowDefinitionRow";
import type { WorkflowDefinition } from "@/client/pages/projects/workflows/types";

interface WorkflowDefinitionsTableProps {
  definitions: WorkflowDefinition[];
  onArchive?: (definition: WorkflowDefinition) => void;
  onUnarchive?: (definition: WorkflowDefinition) => void;
  isArchived: boolean;
  isLoading?: boolean;
}

export function WorkflowDefinitionsTable({
  definitions,
  onArchive,
  onUnarchive,
  isArchived,
  isLoading,
}: WorkflowDefinitionsTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (definitions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        {isArchived ? 'No archived workflows' : 'No active workflows'}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-center">Runs</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {definitions.map((definition) => (
            <WorkflowDefinitionRow
              key={definition.id}
              definition={definition}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              isArchived={isArchived}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
