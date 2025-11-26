/**
 * History view showing commit list with pagination
 */

import { useState } from 'react';
import { Button } from '@/client/components/ui/button';
import { CommitCard } from './CommitCard';
import { useCommitHistory } from '@/client/pages/projects/git/hooks/useGitOperations';
import { GitBranch, Loader2 } from 'lucide-react';
import { Skeleton } from '@/client/components/ui/skeleton';

interface HistoryViewProps {
  path: string | undefined;
  expandedCommits: Set<string>;
  onToggleExpand: (commitHash: string) => void;
}

export function HistoryView({
  path,
  expandedCommits,
  onToggleExpand,
}: HistoryViewProps) {
  const [limit] = useState(100);
  const [offset, setOffset] = useState(0);

  const { data: commits, isLoading, isError } = useCommitHistory(path, limit, offset);

  const hasMore = commits && commits.length === limit;

  const handleLoadMore = () => {
    setOffset((prev) => prev + limit);
  };

  // Loading state
  if (isLoading && offset === 0) {
    return (
      <div className="h-full overflow-y-auto px-4 py-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="text-destructive text-lg">Failed to load commit history</div>
          <p className="text-sm text-muted-foreground">
            Please try refreshing the page
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!commits || commits.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <GitBranch className="h-12 w-12 text-muted-foreground mx-auto" />
          <div className="text-muted-foreground text-lg">No commits yet</div>
          <p className="text-sm text-muted-foreground">
            Commit some changes to see them here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-4 space-y-2">
        {commits.map((commit) => (
          <CommitCard
            key={commit.hash}
            commit={commit}
            expanded={expandedCommits.has(commit.hash)}
            path={path}
            onToggleExpand={() => onToggleExpand(commit.hash)}
          />
        ))}
      </div>

      {/* Load More button */}
      {hasMore && (
        <div className="px-4 pb-4 flex justify-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
