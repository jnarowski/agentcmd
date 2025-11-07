import type { ColumnDef } from '@tanstack/react-table';
import { Checkbox } from '@/client/components/ui/checkbox';
import { Badge } from '@/client/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import type { GitFileStatus } from '@/shared/types/git.types';

// Get status badge color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'M':
      return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
    case 'A':
      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    case 'D':
      return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    case '??':
      return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
    default:
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'M':
      return 'Modified';
    case 'A':
      return 'Added';
    case 'D':
      return 'Deleted';
    case '??':
      return 'Untracked';
    case 'R':
      return 'Renamed';
    case 'C':
      return 'Copied';
    default:
      return status;
  }
};

export const createGitChangesColumns = (
  selectedFiles: Set<string>,
  onToggleFile: (filepath: string) => void,
  onSelectAll: () => void,
  onDeselectAll: () => void,
  totalFiles: number
): ColumnDef<GitFileStatus>[] => [
  {
    id: 'select',
    header: () => (
      <Checkbox
        checked={selectedFiles.size === totalFiles && totalFiles > 0}
        onCheckedChange={() => {
          if (selectedFiles.size === totalFiles) {
            onDeselectAll();
          } else {
            onSelectAll();
          }
        }}
        aria-label="Select all"
        ref={(el) => {
          if (el) {
            const checkboxElement = el as HTMLButtonElement & { indeterminate?: boolean };
            if (selectedFiles.size > 0 && selectedFiles.size < totalFiles) {
              checkboxElement.indeterminate = true;
            }
          }
        }}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={selectedFiles.has(row.original.path)}
        onCheckedChange={() => onToggleFile(row.original.path)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <Badge variant="outline" className={getStatusColor(status)}>
          {status}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'path',
    header: 'File',
    cell: ({ row }) => {
      const path = row.getValue('path') as string;
      return <span className="font-mono text-xs">{path}</span>;
    },
  },
  {
    id: 'statusLabel',
    header: 'Type',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <span className="text-xs text-muted-foreground">
          {getStatusLabel(status)}
        </span>
      );
    },
  },
  {
    id: 'expand',
    header: '',
    cell: () => (
      <ChevronRight
        className="h-4 w-4 text-muted-foreground transition-transform"
      />
    ),
  },
];
