/**
 * Expanded commit details showing metadata, stats, and diff
 */

import { useCommitDiff } from '@/client/pages/projects/git/hooks/useGitOperations';
import { Skeleton } from '@/client/components/ui/skeleton';
import { Badge } from '@/client/components/ui/badge';
import { Calendar, User, Hash } from 'lucide-react';
import { DiffViewer } from '@/client/components/DiffViewer';

interface CommitDiffViewProps {
  path: string | undefined;
  commitHash: string;
}

export function CommitDiffView({
  path,
  commitHash,
}: CommitDiffViewProps) {
  const { data: commitDiff, isLoading } = useCommitDiff(path, commitHash);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!commitDiff) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Failed to load commit details
      </div>
    );
  }

  return (
    <div className="bg-muted/30">
      {/* Commit metadata */}
      <div className="px-4 py-3 border-b space-y-2">
        <div className="flex items-start gap-2 text-sm">
          <Hash className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-mono text-xs text-muted-foreground">
              {commitDiff.hash}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-medium">{commitDiff.author}</span>
            <span className="text-muted-foreground text-xs ml-2">
              &lt;{commitDiff.email}&gt;
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-muted-foreground text-xs">
            {new Date(commitDiff.date).toLocaleString()}
          </div>
        </div>

        <div className="pt-2">
          <div className="text-sm">{commitDiff.message}</div>
        </div>
      </div>

      {/* Change stats */}
      <div className="px-4 py-3 border-b bg-background/50">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">
            {commitDiff.filesChanged} {commitDiff.filesChanged === 1 ? 'file' : 'files'} changed
          </span>
          <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
            +{commitDiff.insertions}
          </Badge>
          <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
            -{commitDiff.deletions}
          </Badge>
        </div>
      </div>

      {/* Diff content */}
      <div className="max-h-96 overflow-y-auto">
        <DiffViewer diff={commitDiff.diff} />
      </div>
    </div>
  );
}
