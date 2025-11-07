/**
 * Changes view showing uncommitted files with inline diffs
 */

import { Button } from "@/client/components/ui/button";
import { Textarea } from "@/client/components/ui/textarea";
import { CheckCircle2, Wand2, Loader2 } from "lucide-react";
import type { GitFileStatus } from "@/shared/types/git.types";
import { DataTable } from "@/client/components/ui/data-table";
import { createGitChangesColumns } from "./git-changes-columns";
import type { Row } from "@tanstack/react-table";
import { DiffViewer } from "@/client/components/DiffViewer";
import {
  useFileDiff,
  useGenerateCommitMessage,
} from "@/client/pages/projects/git/hooks/useGitOperations";
import { Skeleton } from "@/client/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { useMemo } from "react";
import { toast } from "sonner";

interface ChangesViewProps {
  path: string | undefined;
  files: GitFileStatus[] | undefined;
  selectedFiles: Set<string>;
  commitMessage: string;
  onToggleFile: (filepath: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCommitMessageChange: (message: string) => void;
  onCommit: () => void;
  isCommitting?: boolean;
}

// Diff content component for expanded rows
function DiffContent({
  path,
  file,
}: {
  path: string | undefined;
  file: GitFileStatus;
}) {
  const { data: diff, isLoading } = useFileDiff(path, file.path);

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!diff) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No diff available</p>
      </div>
    );
  }

  // Check if it's a binary file or has actual diff content
  if (diff.includes("Binary files")) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Binary file - cannot display diff</p>
      </div>
    );
  }

  if (diff.trim() === "") {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No changes to display</p>
      </div>
    );
  }

  return <DiffViewer diff={diff} />;
}

export function ChangesView({
  path,
  files,
  selectedFiles,
  commitMessage,
  onToggleFile,
  onSelectAll,
  onDeselectAll,
  onCommitMessageChange,
  onCommit,
  isCommitting,
}: ChangesViewProps) {
  const canCommit = selectedFiles.size > 0 && commitMessage.trim().length > 0;
  const generateCommitMessage = useGenerateCommitMessage();

  // Create columns with selection handlers
  const columns = useMemo(
    () =>
      createGitChangesColumns(
        selectedFiles,
        onToggleFile,
        onSelectAll,
        onDeselectAll,
        files?.length || 0
      ),
    [selectedFiles, onToggleFile, onSelectAll, onDeselectAll, files?.length]
  );

  // Handle AI commit message generation
  const handleGenerateCommitMessage = async () => {
    if (!path || selectedFiles.size === 0) {
      return;
    }

    const filesArray = Array.from(selectedFiles);

    generateCommitMessage.mutate(
      { path, files: filesArray },
      {
        onSuccess: (message) => {
          onCommitMessageChange(message);
          toast.success("Commit message generated");
        },
      }
    );
  };

  // Empty state
  if (!files || files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto" />
          <div className="text-muted-foreground text-lg">
            No changes detected
          </div>
          <p className="text-sm text-muted-foreground">
            All changes have been committed
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Commit message section */}
      <div className="shrink-0 px-4 py-4 border-b bg-background">
        <div className="space-y-2">
          <div className="relative">
            <Textarea
              id="commit-message"
              placeholder="Enter commit message..."
              value={commitMessage}
              onChange={(e) => onCommitMessageChange(e.target.value)}
              rows={3}
              className="resize-none pr-24"
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-2">
              <div className="text-xs text-muted-foreground">
                {selectedFiles.size}{" "}
                {selectedFiles.size === 1 ? "file" : "files"}
              </div>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={handleGenerateCommitMessage}
                      disabled={
                        selectedFiles.size === 0 ||
                        generateCommitMessage.isPending
                      }
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                    >
                      {generateCommitMessage.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4" />
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={4}>
                  <div className="text-center">
                    <p>Generate commit message with AI</p>
                    <p className="text-xs opacity-70">
                      Requires ANTHROPIC_API_KEY
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
              <Button
                onClick={onCommit}
                disabled={!canCommit || isCommitting}
                size="sm"
                className="h-8"
              >
                {isCommitting ? "Committing..." : "Commit"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* File list section with DataTable */}
      <div className="flex-1 overflow-y-auto px-4 pt-4">
        <DataTable
          columns={columns}
          data={files}
          getRowId={(row) => row.path}
          renderExpandedRow={(row: Row<GitFileStatus>) => (
            <DiffContent path={path} file={row.original} />
          )}
        />
      </div>
    </div>
  );
}
