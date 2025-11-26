/**
 * Top bar component with branch selector and git action buttons
 */

import { useState } from 'react';
import { Button } from '@/client/components/ui/button';
import { Badge } from '@/client/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectSeparator,
} from '@/client/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/client/components/ui/dropdown-menu';
import { GitBranch, ArrowUpCircle, ArrowDownCircle, RefreshCw, GitPullRequest, MoreVertical } from 'lucide-react';
import { CreateBranchDialog } from './CreateBranchDialog';
import { CreatePullRequestDialog } from './CreatePullRequestDialog';
import type { GitBranch as GitBranchType } from '@/shared/types/git.types';

interface GitTopBarProps {
  path: string | undefined;
  currentBranch: string | undefined;
  branches: GitBranchType[] | undefined;
  ahead: number;
  behind: number;
  onSwitchBranch: (branchName: string) => void;
  onCreateBranch: (name: string, from?: string) => Promise<void>;
  onPush: () => void;
  onFetch: () => void;
  onRefresh: () => void;
}

export function GitTopBar({
  path,
  currentBranch,
  branches,
  ahead,
  behind,
  onSwitchBranch,
  onCreateBranch,
  onPush,
  onFetch,
  onRefresh,
}: GitTopBarProps) {
  const [createBranchOpen, setCreateBranchOpen] = useState(false);
  const [createPrOpen, setCreatePrOpen] = useState(false);

  const handleBranchSelect = (value: string) => {
    if (value === '__create__') {
      setCreateBranchOpen(true);
    } else {
      onSwitchBranch(value);
    }
  };

  const handleCreateBranch = async (name: string, from?: string) => {
    await onCreateBranch(name, from);
    setCreateBranchOpen(false);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 gap-2">
      {/* Left side - Branch selector */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Select value={currentBranch} onValueChange={handleBranchSelect}>
          <SelectTrigger className="w-full sm:w-[280px]">
            <div className="flex items-center gap-2 min-w-0">
              <GitBranch className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{currentBranch || "Select branch"}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            {branches?.map((branch) => (
              <SelectItem key={branch.name} value={branch.name}>
                <div className="flex items-center gap-2">
                  {branch.name}
                  {branch.current && <Badge variant="outline" className="ml-2">Current</Badge>}
                </div>
              </SelectItem>
            ))}
            <SelectSeparator />
            <SelectItem value="__create__">
              <div className="flex items-center gap-2 text-primary">
                <span>+ Create new branch</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Right side - Action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Desktop: Individual buttons */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPush}
            disabled={ahead === 0}
            className="relative"
          >
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Push
            {ahead > 0 && (
              <Badge variant="default" className="ml-2 h-5 px-1.5">
                {ahead}
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onFetch}
            className="relative"
          >
            <ArrowDownCircle className="h-4 w-4 mr-2" />
            Fetch
            {behind > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {behind}
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          {ahead > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setCreatePrOpen(true)}
            >
              <GitPullRequest className="h-4 w-4 mr-2" />
              Create PR
            </Button>
          )}
        </div>

        {/* Mobile: Dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="sm:hidden relative">
              <MoreVertical className="h-4 w-4" />
              {(ahead > 0 || behind > 0) && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onPush} disabled={ahead === 0}>
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Push
              {ahead > 0 && (
                <Badge variant="default" className="ml-2 h-5 px-1.5">
                  {ahead}
                </Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onFetch}>
              <ArrowDownCircle className="h-4 w-4 mr-2" />
              Fetch
              {behind > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {behind}
                </Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </DropdownMenuItem>
            {ahead > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setCreatePrOpen(true)}>
                  <GitPullRequest className="h-4 w-4 mr-2" />
                  Create PR
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dialogs */}
      <CreateBranchDialog
        open={createBranchOpen}
        onOpenChange={setCreateBranchOpen}
        currentBranch={currentBranch}
        onCreateBranch={handleCreateBranch}
      />

      <CreatePullRequestDialog
        open={createPrOpen}
        onOpenChange={setCreatePrOpen}
        path={path}
        currentBranch={currentBranch}
      />
    </div>
  );
}
