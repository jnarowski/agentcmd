/**
 * Collapsible commit card showing commit metadata
 */

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/client/components/ui/collapsible';
import { Badge } from '@/client/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import { CommitDiffView } from './CommitDiffView';
import type { GitCommit } from '@/shared/types/git.types';

interface CommitCardProps {
  commit: GitCommit;
  expanded: boolean;
  path: string | undefined;
  onToggleExpand: () => void;
}

export function CommitCard({
  commit,
  expanded,
  path,
  onToggleExpand,
}: CommitCardProps) {
  // Truncate long commit messages for display
  const truncatedMessage = commit.message.length > 72
    ? commit.message.substring(0, 72) + '...'
    : commit.message;

  return (
    <Collapsible open={expanded} onOpenChange={onToggleExpand}>
      <div className="border rounded-lg overflow-hidden hover:bg-muted/30 transition-colors">
        {/* Commit header */}
        <CollapsibleTrigger asChild>
          <div className="flex items-start gap-3 px-4 py-3 cursor-pointer">
            <ChevronRight
              className={`h-5 w-5 text-muted-foreground transition-transform flex-shrink-0 mt-0.5 ${
                expanded ? 'rotate-90' : ''
              }`}
            />

            <div className="flex-1 min-w-0 space-y-1">
              <div className="font-medium text-sm">{truncatedMessage}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{commit.author}</span>
                <span>•</span>
                <span>{commit.relativeDate}</span>
              </div>
            </div>

            <Badge variant="outline" className="font-mono text-xs flex-shrink-0">
              {commit.shortHash}
            </Badge>
          </div>
        </CollapsibleTrigger>

        {/* Commit details */}
        <CollapsibleContent>
          {expanded && (
            <div className="border-t">
              <CommitDiffView
                path={path}
                commitHash={commit.hash}
              />
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
