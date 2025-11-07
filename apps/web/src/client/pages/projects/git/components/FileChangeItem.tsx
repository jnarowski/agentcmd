/**
 * Individual file change item with checkbox and collapsible diff
 */

import { Checkbox } from '@/client/components/ui/checkbox';
import { Badge } from '@/client/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/client/components/ui/collapsible';
import { ChevronRight } from 'lucide-react';
import { DiffViewer } from '@/client/components/DiffViewer';
import { useFileDiff } from '@/client/pages/projects/git/hooks/useGitOperations';
import type { GitFileStatus } from '@/shared/types/git.types';
import { Skeleton } from '@/client/components/ui/skeleton';

interface FileChangeItemProps {
  file: GitFileStatus;
  selected: boolean;
  expanded: boolean;
  path: string | undefined;
  onToggle: () => void;
  onToggleExpand: () => void;
}

export function FileChangeItem({
  file,
  selected,
  expanded,
  path,
  onToggle,
  onToggleExpand,
}: FileChangeItemProps) {
  // Fetch diff when expanded
  const { data: diff, isLoading } = useFileDiff(path, expanded ? file.path : null);

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

  return (
    <Collapsible open={expanded} onOpenChange={onToggleExpand}>
      <div className="border rounded-lg overflow-hidden">
        {/* File header */}
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 cursor-pointer">
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox checked={selected} onCheckedChange={onToggle} />
            </div>

            <Badge variant="outline" className={getStatusColor(file.status)}>
              {file.status}
            </Badge>

            <span className="font-mono text-sm flex-1">{file.path}</span>

            <span className="text-xs text-muted-foreground">
              {getStatusLabel(file.status)}
            </span>

            <ChevronRight
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                expanded ? 'rotate-90' : ''
              }`}
            />
          </div>
        </CollapsibleTrigger>

        {/* Diff content */}
        <CollapsibleContent>
          <div className="border-t bg-muted/30 p-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : diff ? (
              // Check if it's a binary file or has actual diff content
              diff.includes('Binary files') ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Binary file - cannot display diff</p>
                </div>
              ) : diff.trim() === '' ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No changes to display</p>
                </div>
              ) : (
                <DiffViewer diff={diff} />
              )
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No diff available</p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
