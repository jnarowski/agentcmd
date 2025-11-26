// Git domain types
// All types are imported from shared types to maintain consistency
export type {
  GitStatus,
  GitFileStatus,
  GitBranch,
  GitCommit,
  GitCommitDiff,
  PrResult,
  GitStashEntry,
  GitResetMode,
  GitMergeResult,
} from '@/shared/types/git.types'

// Git service options types and Zod schemas

// Branch operations
export * from './GetCurrentBranchOptions'
export * from './GetBranchesOptions'
export * from './SwitchBranchOptions'
export * from './CreateAndSwitchBranchOptions'

// Status and diff operations
export * from './GetGitStatusOptions'
export * from './GetFileDiffOptions'
export * from './GetCommitDiffOptions'

// Commit operations
export * from './GetCommitHistoryOptions'
export * from './GetCommitsSinceBaseOptions'
export * from './CommitChangesOptions'
export * from './GenerateCommitMessageOptions'

// Staging operations
export * from './StageFilesOptions'
export * from './UnstageFilesOptions'
export * from './DiscardChangesOptions'

// Stash operations
export * from './StashSaveOptions'
export * from './StashPopOptions'
export * from './StashApplyOptions'
export * from './StashListOptions'

// History manipulation
export * from './ResetToCommitOptions'

// Remote operations
export * from './FetchFromRemoteOptions'
export * from './PullFromRemoteOptions'
export * from './PushToRemoteOptions'

// Branch operations (advanced)
export * from './MergeBranchOptions'

// Pull request operations
export * from './CreatePullRequestOptions'
export * from './CheckGhCliAvailableOptions'
