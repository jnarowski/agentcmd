/**
 * Git Operations Modal
 * Provides quick access to common git operations from project header
 */

import { useState, useMemo } from "react";
import { BaseDialog } from "@/client/components/BaseDialog";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/client/components/ui/dialog";
import { Combobox } from "@/client/components/ui/combobox";
import { Button } from "@/client/components/ui/button";
import { LoadingButton } from "@/client/components/ui/loading-button";
import { Textarea } from "@/client/components/ui/textarea";
import { Label } from "@/client/components/ui/label";
import { Badge } from "@/client/components/ui/badge";
import { Separator } from "@/client/components/ui/separator";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { ButtonGroup, ButtonGroupSeparator } from "@/client/components/ui/button-group";
import {
  GitBranch,
  GitCommit,
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  AlertCircle,
  Check,
  Sparkles,
  ChevronDown,
  GitPullRequest,
} from "lucide-react";
import {
  useGitStatus,
  useBranches,
  useSwitchBranch,
  useCreateBranch,
  useStageFiles,
  useCommit,
  usePush,
  usePull,
  useGenerateCommitMessage,
  useCreatePr,
} from "@/client/pages/projects/git/hooks/useGitOperations";
import { CreateBranchDialog } from "@/client/pages/projects/git/components/CreateBranchDialog";
import { useIsAiEnabled, useIsGhCliEnabled } from "@/client/hooks/useSettings";

interface GitOperationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath: string;
  currentBranch?: string;
}

export function GitOperationsModal({
  open,
  onOpenChange,
  projectPath,
  currentBranch,
}: GitOperationsModalProps) {
  const [createBranchOpen, setCreateBranchOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");

  // Feature flags
  const isAiEnabled = useIsAiEnabled();
  const isGhCliEnabled = useIsGhCliEnabled();

  // Queries
  const { data: gitStatus, refetch: refetchGitStatus } = useGitStatus(projectPath);
  const { data: branches } = useBranches(projectPath);

  // Mutations
  const switchBranchMutation = useSwitchBranch();
  const createBranchMutation = useCreateBranch();
  const stageFilesMutation = useStageFiles();
  const commitMutation = useCommit();
  const pushMutation = usePush();
  const pullMutation = usePull();
  const generateCommitMessageMutation = useGenerateCommitMessage();
  const createPrMutation = useCreatePr();

  // Convert branches to combobox options
  const branchOptions = useMemo(() => {
    if (!branches) return [];
    return branches.map((branch) => ({
      value: branch.name,
      label: branch.name,
      badge: branch.current ? "current" : undefined,
    }));
  }, [branches]);

  // Handlers
  const handleSwitchBranch = async (branchName: string) => {
    if (branchName === currentBranch) return;
    await switchBranchMutation.mutateAsync({
      path: projectPath,
      name: branchName,
    });
  };

  const handleCreateBranch = async (name: string, from?: string) => {
    await createBranchMutation.mutateAsync({
      path: projectPath,
      name,
      from,
    });
  };

  const handleGenerateCommitMessage = async () => {
    if (!gitStatus?.files?.length) return;

    const filePaths = gitStatus.files.map((f) => f.path);

    // Stage files first before generating commit message
    await stageFilesMutation.mutateAsync({
      path: projectPath,
      files: filePaths,
    });

    // Then generate the commit message based on staged changes
    const message = await generateCommitMessageMutation.mutateAsync({
      path: projectPath,
      files: filePaths,
    });

    setCommitMessage(message);
  };

  const handleCommit = async () => {
    if (!commitMessage.trim() || !gitStatus?.files?.length) return;

    await commitMutation.mutateAsync({
      path: projectPath,
      message: commitMessage.trim(),
      files: gitStatus.files.map((f) => f.path),
    });

    // Clear message on success
    setCommitMessage("");

    // Refetch git status to update ahead/behind counts
    await refetchGitStatus();
  };

  const handleCommitAndPush = async () => {
    if (!commitMessage.trim() || !gitStatus?.files?.length || !currentBranch) return;

    // First commit
    await commitMutation.mutateAsync({
      path: projectPath,
      message: commitMessage.trim(),
      files: gitStatus.files.map((f) => f.path),
    });

    // Then push
    await pushMutation.mutateAsync({
      path: projectPath,
      branch: currentBranch,
    });

    // Clear message on success
    setCommitMessage("");

    // Refetch git status
    await refetchGitStatus();
  };

  const handleCommitPushAndPr = async () => {
    if (!commitMessage.trim() || !gitStatus?.files?.length || !currentBranch) return;

    // First commit
    await commitMutation.mutateAsync({
      path: projectPath,
      message: commitMessage.trim(),
      files: gitStatus.files.map((f) => f.path),
    });

    // Then push
    await pushMutation.mutateAsync({
      path: projectPath,
      branch: currentBranch,
    });

    // Then create PR (using commit message as title)
    await createPrMutation.mutateAsync({
      path: projectPath,
      title: commitMessage.trim().split('\n')[0], // Use first line as title
      description: commitMessage.trim(),
    });

    // Clear message on success
    setCommitMessage("");

    // Refetch git status
    await refetchGitStatus();
  };

  const handlePush = async () => {
    if (!currentBranch) return;
    await pushMutation.mutateAsync({
      path: projectPath,
      branch: currentBranch,
    });
  };

  const handlePull = async () => {
    await pullMutation.mutateAsync({
      path: projectPath,
      branch: currentBranch,
    });
  };

  const modifiedFilesCount = gitStatus?.files?.length || 0;
  const ahead = gitStatus?.ahead || 0;
  const behind = gitStatus?.behind || 0;

  return (
    <>
      <BaseDialog
        open={open}
        onOpenChange={onOpenChange}
        contentProps={{ className: "sm:max-w-xl" }}
      >
        <DialogHeader>
          <DialogTitle>Git Operations</DialogTitle>
          <DialogDescription>
            Quick access to common git operations
          </DialogDescription>
        </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Branch Operations */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Branch</Label>
              <div className="flex gap-2">
                <Combobox
                  value={currentBranch}
                  onValueChange={handleSwitchBranch}
                  options={branchOptions}
                  placeholder="Select branch"
                  searchPlaceholder="Search branches..."
                  buttonClassName="flex-1 justify-start"
                  renderTrigger={(selectedOption) => (
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <GitBranch className="h-4 w-4 shrink-0" />
                      <span className="truncate">{selectedOption?.label || "Select branch"}</span>
                    </div>
                  )}
                  renderOption={(option) => (
                    <div className="flex items-center gap-2 w-full">
                      <span className="flex-1">{option.label}</span>
                      {option.badge && (
                        <Badge variant="outline" className="ml-auto">
                          <Check className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                  )}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCreateBranchOpen(true)}
                  title="Create new branch"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Commit Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Commit Changes</Label>
                {modifiedFilesCount > 0 && (
                  <Badge variant="secondary">
                    {modifiedFilesCount}{" "}
                    {modifiedFilesCount === 1 ? "file" : "files"} changed
                  </Badge>
                )}
              </div>

              {modifiedFilesCount > 0 ? (
                <>
                  <div className="relative">
                    <Textarea
                      placeholder="Commit message..."
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      rows={3}
                      disabled={
                        commitMutation.isPending ||
                        generateCommitMessageMutation.isPending ||
                        stageFilesMutation.isPending
                      }
                      className={isAiEnabled ? "pr-10" : ""}
                    />
                    {isAiEnabled && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <LoadingButton
                              variant="ghost"
                              size="icon"
                              onClick={handleGenerateCommitMessage}
                              disabled={modifiedFilesCount === 0}
                              isLoading={
                                stageFilesMutation.isPending ||
                                generateCommitMessageMutation.isPending
                              }
                              className="absolute bottom-2 right-2 h-7 w-7"
                            >
                              <Sparkles className="h-4 w-4" />
                            </LoadingButton>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Generate AI commit message</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <ButtonGroup className="w-full">
                    <LoadingButton
                      variant="default"
                      onClick={handleCommit}
                      disabled={
                        !commitMessage.trim() ||
                        commitMutation.isPending ||
                        pushMutation.isPending ||
                        createPrMutation.isPending
                      }
                      isLoading={commitMutation.isPending}
                      loadingText="Committing..."
                      className="flex-1"
                    >
                      <GitCommit className="h-4 w-4 mr-2" />
                      Commit
                    </LoadingButton>
                    <ButtonGroupSeparator />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="default"
                          size="icon"
                          disabled={
                            !commitMessage.trim() ||
                            commitMutation.isPending ||
                            pushMutation.isPending ||
                            createPrMutation.isPending
                          }
                          className="px-2"
                          aria-label="More commit options"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleCommitAndPush}>
                          <ArrowUpCircle className="h-4 w-4 mr-2" />
                          Commit & Push
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handleCommitPushAndPr}
                          disabled={!isGhCliEnabled}
                        >
                          <GitPullRequest className="h-4 w-4 mr-2" />
                          Commit, Push & Create PR
                          {!isGhCliEnabled && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              (gh CLI required)
                            </span>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </ButtonGroup>
                </>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>No changes to commit</AlertDescription>
                </Alert>
              )}
            </div>

            <Separator />

            {/* Push/Pull Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Remote Operations</Label>
              <div className="grid grid-cols-2 gap-2">
                <LoadingButton
                  variant="outline"
                  onClick={handlePush}
                  disabled={!currentBranch}
                  isLoading={pushMutation.isPending}
                  loadingText="Pushing..."
                  className="w-full"
                >
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Push
                  {ahead > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {ahead}
                    </Badge>
                  )}
                </LoadingButton>

                <LoadingButton
                  variant="outline"
                  onClick={handlePull}
                  isLoading={pullMutation.isPending}
                  loadingText="Pulling..."
                  className="w-full"
                >
                  <ArrowDownCircle className="h-4 w-4 mr-2" />
                  Pull
                  {behind > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {behind}
                    </Badge>
                  )}
                </LoadingButton>
              </div>
            </div>
          </div>
      </BaseDialog>

      {/* Create Branch Dialog */}
      <CreateBranchDialog
        open={createBranchOpen}
        onOpenChange={setCreateBranchOpen}
        currentBranch={currentBranch}
        onCreateBranch={handleCreateBranch}
      />
    </>
  );
}
