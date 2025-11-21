/**
 * Main Source Control page for project git operations
 * Provides tabs for Changes and History views with full git workflow
 */

import { useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/client/components/ui/tabs";
import { GitTopBar } from "./components/GitTopBar";
import { ChangesView } from "./components/ChangesView";
import { HistoryView } from "./components/HistoryView";
import {
  useGitStatus,
  useBranches,
  useCreateBranch,
  useSwitchBranch,
  useStageFiles,
  useCommit,
  usePush,
  useFetch,
} from "./hooks/useGitOperations";
import { gitKeys } from "./hooks/queryKeys";
import { useProject } from "../hooks/useProjects";
import { useProjectId } from "@/client/hooks/useProjectId";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDocumentTitle } from "@/client/hooks/useDocumentTitle";

export default function ProjectSourceControl() {
  const projectId = useProjectId();
  const queryClient = useQueryClient();

  // Fetch project to get path
  const { data: project } = useProject(projectId);

  useDocumentTitle(project?.name ? `Source Control - ${project.name} | Agent Workflows` : undefined);
  const projectPath = project?.path;

  // Fetch git status and branches
  const { data: gitStatus } = useGitStatus(projectPath);
  const { data: branches } = useBranches(projectPath);

  // Mutations
  const createBranchMutation = useCreateBranch();
  const switchBranchMutation = useSwitchBranch();
  const stageFilesMutation = useStageFiles();
  const commitMutation = useCommit();
  const pushMutation = usePush();
  const fetchMutation = useFetch();

  // Tab state
  const [activeTab, setActiveTab] = useState<"changes" | "history">("changes");

  // Changes tab state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [commitMessage, setCommitMessage] = useState("");

  // History tab state
  const [expandedCommits, setExpandedCommits] = useState<Set<string>>(
    new Set()
  );

  // Helper functions for Changes tab
  const handleToggleFile = (filepath: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filepath)) {
        next.delete(filepath);
      } else {
        next.add(filepath);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (gitStatus?.files) {
      setSelectedFiles(new Set(gitStatus.files.map((f) => f.path)));
    }
  };

  const handleDeselectAll = () => {
    setSelectedFiles(new Set());
  };

  const handleCommit = async () => {
    if (!projectPath || selectedFiles.size === 0 || !commitMessage.trim()) return;

    try {
      // Stage selected files first
      await stageFilesMutation.mutateAsync({
        path: projectPath,
        files: Array.from(selectedFiles),
      });

      // Then commit
      await commitMutation.mutateAsync({
        path: projectPath,
        message: commitMessage,
        files: Array.from(selectedFiles),
      });

      // Clear selections and message on success
      setSelectedFiles(new Set());
      setCommitMessage("");
    } catch (error) {
      // Error handling is done in the mutation hooks via toast
      console.error("Commit failed:", error);
    }
  };

  // Helper functions for History tab
  const handleToggleCommitExpand = (commitHash: string) => {
    setExpandedCommits((prev) => {
      const next = new Set(prev);
      if (next.has(commitHash)) {
        next.delete(commitHash);
      } else {
        next.add(commitHash);
      }
      return next;
    });
  };

  // GitTopBar callbacks
  const handleSwitchBranch = async (branchName: string) => {
    if (!projectPath) return;
    await switchBranchMutation.mutateAsync({ path: projectPath, name: branchName });
  };

  const handleCreateBranch = async (name: string, from?: string) => {
    if (!projectPath) return;
    await createBranchMutation.mutateAsync({ path: projectPath, name, from });
  };

  const handlePush = async () => {
    if (!projectPath || !gitStatus?.branch) return;
    await pushMutation.mutateAsync({
      path: projectPath,
      branch: gitStatus.branch,
    });
  };

  const handleFetch = async () => {
    if (!projectPath) return;
    await fetchMutation.mutateAsync({ path: projectPath });
  };

  const handleRefresh = () => {
    if (projectPath) {
      queryClient.invalidateQueries({ queryKey: gitKeys.status(projectPath) });
    }
    toast.success("Refreshed git status");
  };

  // Show not a git repo message if needed
  if (gitStatus && !gitStatus.isRepo) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="text-muted-foreground text-lg">
            Not a git repository
          </div>
          <p className="text-sm text-muted-foreground">
            Initialize git in this project to use source control features
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar with branch selector and actions */}
      <GitTopBar
        path={projectPath}
        currentBranch={gitStatus?.branch}
        branches={branches}
        ahead={gitStatus?.ahead ?? 0}
        behind={gitStatus?.behind ?? 0}
        onSwitchBranch={handleSwitchBranch}
        onCreateBranch={handleCreateBranch}
        onPush={handlePush}
        onFetch={handleFetch}
        onRefresh={handleRefresh}
      />

      {/* Main content with tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "changes" | "history")}
        className="flex-1 flex flex-col gap-0"
      >
        <div className="px-4 pt-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="changes">Changes</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="changes" className="h-full mt-0">
            <ChangesView
              path={projectPath}
              files={gitStatus?.files}
              selectedFiles={selectedFiles}
              commitMessage={commitMessage}
              onToggleFile={handleToggleFile}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onCommitMessageChange={setCommitMessage}
              onCommit={handleCommit}
              isCommitting={commitMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="history" className="h-full mt-0">
            <HistoryView
              path={projectPath}
              expandedCommits={expandedCommits}
              onToggleExpand={handleToggleCommitExpand}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
