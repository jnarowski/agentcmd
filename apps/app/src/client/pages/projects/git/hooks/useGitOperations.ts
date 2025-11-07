/**
 * React Query hooks for git operations
 * Provides hooks for status, branches, diffs, commits, and PR operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/client/utils/api';
import type {
  GitStatus,
  GitBranch,
  GitCommit,
  GitCommitDiff,
  PrData,
  PrResult,
  GitStashEntry,
  GitResetMode,
  GitMergeResult,
} from '@/shared/types/git.types';
import { toast } from 'sonner';
import { projectKeys } from '@/client/pages/projects/hooks/useProjects';

// Query keys factory - centralized key management
export const gitKeys = {
  all: ['git'] as const,
  status: (path: string) => [...gitKeys.all, 'status', path] as const,
  branches: (path: string) => [...gitKeys.all, 'branches', path] as const,
  diff: (path: string, filepath: string | null) =>
    [...gitKeys.all, 'diff', path, filepath] as const,
  history: (path: string, limit: number, offset: number) =>
    [...gitKeys.all, 'history', path, limit, offset] as const,
  commit: (path: string, commitHash: string | null) =>
    [...gitKeys.all, 'commit', path, commitHash] as const,
  prData: (path: string, baseBranch: string) =>
    [...gitKeys.all, 'pr-data', path, baseBranch] as const,
  stashList: (path: string) => [...gitKeys.all, 'stash', 'list', path] as const,
};

// Query hooks

/**
 * Fetch git status for a repository path
 * Auto-refreshes every 30 seconds
 */
export function useGitStatus(path: string | undefined) {
  return useQuery({
    queryKey: path ? gitKeys.status(path) : ['git', 'status'],
    queryFn: async () => {
      const response = await api.post<{ data: GitStatus }>(
        '/api/git/status',
        { path }
      );
      return response.data;
    },
    enabled: !!path,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

/**
 * Fetch all branches for a repository path
 */
export function useBranches(path: string | undefined) {
  return useQuery({
    queryKey: path ? gitKeys.branches(path) : ['git', 'branches'],
    queryFn: async () => {
      const response = await api.post<{ data: GitBranch[] }>(
        '/api/git/branches',
        { path }
      );
      return response.data;
    },
    enabled: !!path,
  });
}

/**
 * Fetch diff for a specific file
 */
export function useFileDiff(path: string | undefined, filepath: string | null) {
  return useQuery({
    queryKey: path ? gitKeys.diff(path, filepath) : ['git', 'diff'],
    queryFn: async () => {
      const response = await api.post<{ data: { diff: string } }>(
        '/api/git/diff',
        { path, filepath: filepath! }
      );
      return response.data.diff;
    },
    enabled: !!path && !!filepath,
  });
}

/**
 * Fetch commit history with pagination
 */
export function useCommitHistory(
  path: string | undefined,
  limit: number = 100,
  offset: number = 0
) {
  return useQuery({
    queryKey: path ? gitKeys.history(path, limit, offset) : ['git', 'history'],
    queryFn: async () => {
      const response = await api.post<{ data: GitCommit[] }>(
        '/api/git/history',
        { path, limit, offset }
      );
      return response.data;
    },
    enabled: !!path,
  });
}

/**
 * Fetch diff for a specific commit
 */
export function useCommitDiff(path: string | undefined, commitHash: string | null) {
  return useQuery({
    queryKey: path ? gitKeys.commit(path, commitHash) : ['git', 'commit'],
    queryFn: async () => {
      const response = await api.post<{ data: GitCommitDiff }>(
        '/api/git/commit-diff',
        { path, commitHash: commitHash! }
      );
      return response.data;
    },
    enabled: !!path && !!commitHash,
  });
}

/**
 * Fetch PR pre-fill data
 */
export function usePrData(
  path: string | undefined,
  baseBranch: string = 'main',
  enabled: boolean = false
) {
  return useQuery({
    queryKey: path ? gitKeys.prData(path, baseBranch) : ['git', 'pr-data'],
    queryFn: async () => {
      const response = await api.post<{ data: PrData }>(
        '/api/git/pr-data',
        { path, baseBranch }
      );
      return response.data;
    },
    enabled: enabled && !!path,
  });
}

/**
 * Fetch stash list
 */
export function useStashList(path: string | undefined) {
  return useQuery({
    queryKey: path ? gitKeys.stashList(path) : ['git', 'stash', 'list'],
    queryFn: async () => {
      const response = await api.post<{ data: GitStashEntry[] }>(
        '/api/git/stash/list',
        { path }
      );
      return response.data;
    },
    enabled: !!path,
  });
}

// Mutation hooks

/**
 * Create a new branch and switch to it
 */
export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      path,
      name,
      from,
    }: {
      path: string;
      name: string;
      from?: string;
    }) => {
      const response = await api.post<{ data: GitBranch }>(
        '/api/git/branch',
        { path, name, from }
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: gitKeys.branches(variables.path) });
      queryClient.invalidateQueries({ queryKey: gitKeys.status(variables.path) });
      // Invalidate projects query to update current_branch in ProjectHeader
      queryClient.invalidateQueries({ queryKey: projectKeys.withSessions() });
      toast.success(`Branch created: ${data.name}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create branch: ${error.message}`);
    },
  });
}

/**
 * Switch to an existing branch
 */
export function useSwitchBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ path, name }: { path: string; name: string }) => {
      const response = await api.post<{ data: GitBranch }>(
        '/api/git/branch/switch',
        { path, name }
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: gitKeys.branches(variables.path) });
      queryClient.invalidateQueries({ queryKey: gitKeys.status(variables.path) });
      // Invalidate projects query to update current_branch in ProjectHeader
      queryClient.invalidateQueries({ queryKey: projectKeys.withSessions() });
      toast.success(`Switched to branch: ${data.name}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to switch branch: ${error.message}`);
    },
  });
}

/**
 * Stage files
 */
export function useStageFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ path, files }: { path: string; files: string[] }) => {
      await api.post('/api/git/stage', { path, files });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: gitKeys.status(variables.path) });
    },
    onError: (error: Error) => {
      toast.error(`Failed to stage files: ${error.message}`);
    },
  });
}

/**
 * Unstage files
 */
export function useUnstageFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ path, files }: { path: string; files: string[] }) => {
      await api.post('/api/git/unstage', { path, files });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: gitKeys.status(variables.path) });
    },
    onError: (error: Error) => {
      toast.error(`Failed to unstage files: ${error.message}`);
    },
  });
}

/**
 * Commit changes
 */
export function useCommit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      path,
      message,
      files,
    }: {
      path: string;
      message: string;
      files: string[];
    }) => {
      const response = await api.post<{ data: { hash: string } }>(
        '/api/git/commit',
        { path, message, files }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: gitKeys.status(variables.path) });
      queryClient.invalidateQueries({ queryKey: gitKeys.all });
      toast.success('Committed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to commit: ${error.message}`);
    },
  });
}

/**
 * Push to remote
 */
export function usePush() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      path,
      branch,
      remote = 'origin',
    }: {
      path: string;
      branch: string;
      remote?: string;
    }) => {
      await api.post('/api/git/push', { path, branch, remote });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: gitKeys.status(variables.path) });
      toast.success('Pushed to remote');
    },
    onError: (error: Error) => {
      toast.error(`Failed to push: ${error.message}`);
    },
  });
}

/**
 * Fetch from remote
 */
export function useFetch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      path,
      remote = 'origin',
    }: {
      path: string;
      remote?: string;
    }) => {
      await api.post('/api/git/fetch', { path, remote });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: gitKeys.status(variables.path) });
      queryClient.invalidateQueries({ queryKey: gitKeys.all });
      toast.success('Fetched from remote');
    },
    onError: (error: Error) => {
      toast.error(`Failed to fetch: ${error.message}`);
    },
  });
}

/**
 * Create pull request
 */
export function useCreatePr() {
  return useMutation({
    mutationFn: async ({
      path,
      title,
      description,
      baseBranch = 'main',
    }: {
      path: string;
      title: string;
      description: string;
      baseBranch?: string;
    }) => {
      const response = await api.post<{ data: PrResult }>(
        '/api/git/pr',
        { path, title, description, baseBranch }
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.prUrl) {
        window.open(data.prUrl, '_blank');
      }

      const method = data.useGhCli ? 'GitHub CLI' : 'GitHub web';
      toast.success(`Pull request created via ${method}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create PR: ${error.message}`);
    },
  });
}

/**
 * Generate AI-powered commit message based on staged files
 */
export function useGenerateCommitMessage() {
  return useMutation({
    mutationFn: async ({ path, files }: { path: string; files: string[] }) => {
      const response = await api.post<{ data: { message: string } }>(
        '/api/git/generate-commit-message',
        { path, files }
      );
      return response.data.message;
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate commit message: ${error.message}`);
    },
  });
}

/**
 * Pull from remote
 */
export function usePull() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      path,
      remote = 'origin',
      branch,
    }: {
      path: string;
      remote?: string;
      branch?: string;
    }) => {
      await api.post('/api/git/pull', { path, remote, branch });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: gitKeys.status(variables.path) });
      queryClient.invalidateQueries({ queryKey: gitKeys.all });
      toast.success('Pulled from remote');
    },
    onError: (error: Error) => {
      toast.error(`Failed to pull: ${error.message}`);
    },
  });
}

/**
 * Merge a branch
 */
export function useMerge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      path,
      sourceBranch,
      noFf,
    }: {
      path: string;
      sourceBranch: string;
      noFf?: boolean;
    }) => {
      const response = await api.post<{ data: GitMergeResult }>(
        '/api/git/merge',
        { path, sourceBranch, noFf }
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: gitKeys.status(variables.path) });
      queryClient.invalidateQueries({ queryKey: gitKeys.branches(variables.path) });
      queryClient.invalidateQueries({ queryKey: gitKeys.all });

      if (data.success) {
        toast.success('Merged successfully');
      } else {
        toast.error(`Merge failed with conflicts: ${data.conflicts?.join(', ')}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to merge: ${error.message}`);
    },
  });
}

/**
 * Save current changes to stash
 */
export function useStashSave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      path,
      message,
    }: {
      path: string;
      message?: string;
    }) => {
      await api.post('/api/git/stash/save', { path, message });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: gitKeys.status(variables.path) });
      queryClient.invalidateQueries({ queryKey: gitKeys.stashList(variables.path) });
      toast.success('Changes stashed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to stash: ${error.message}`);
    },
  });
}

/**
 * Pop stash (apply and remove)
 */
export function useStashPop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      path,
      index,
    }: {
      path: string;
      index?: number;
    }) => {
      await api.post('/api/git/stash/pop', { path, index });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: gitKeys.status(variables.path) });
      queryClient.invalidateQueries({ queryKey: gitKeys.stashList(variables.path) });
      toast.success('Stash applied and removed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to pop stash: ${error.message}`);
    },
  });
}

/**
 * Apply stash (without removing)
 */
export function useStashApply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      path,
      index,
    }: {
      path: string;
      index?: number;
    }) => {
      await api.post('/api/git/stash/apply', { path, index });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: gitKeys.status(variables.path) });
      toast.success('Stash applied');
    },
    onError: (error: Error) => {
      toast.error(`Failed to apply stash: ${error.message}`);
    },
  });
}

/**
 * Reset to a specific commit
 */
export function useReset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      path,
      commitHash,
      mode = 'mixed',
    }: {
      path: string;
      commitHash: string;
      mode?: GitResetMode;
    }) => {
      await api.post('/api/git/reset', { path, commitHash, mode });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: gitKeys.status(variables.path) });
      queryClient.invalidateQueries({ queryKey: gitKeys.all });
      toast.success(`Reset to commit (${variables.mode})`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to reset: ${error.message}`);
    },
  });
}

/**
 * Discard changes in specific files
 */
export function useDiscardChanges() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      path,
      files,
    }: {
      path: string;
      files: string[];
    }) => {
      await api.post('/api/git/discard', { path, files });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: gitKeys.status(variables.path) });
      toast.success('Changes discarded');
    },
    onError: (error: Error) => {
      toast.error(`Failed to discard changes: ${error.message}`);
    },
  });
}
