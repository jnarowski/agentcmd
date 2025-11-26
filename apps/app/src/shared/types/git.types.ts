// Git file status types
export type GitFileStatusType = 'M' | 'A' | 'D' | '??' | 'R' | 'C';

export interface GitFileStatus {
  path: string;
  status: GitFileStatusType;
  staged: boolean;
}

export interface GitStatus {
  branch: string;
  files: GitFileStatus[];
  ahead: number;
  behind: number;
  isRepo: boolean;
}

export interface GitBranch {
  name: string;
  current: boolean;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  email: string;
  date: string;
  relativeDate: string;
}

export interface GitCommitDiff {
  hash: string;
  message: string;
  author: string;
  email: string;
  date: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
  diff: string;
}

export interface PrData {
  title: string;
  description: string;
  commits: GitCommit[];
}

export interface PrResult {
  success: boolean;
  prUrl?: string;
  useGhCli: boolean;
  error?: string;
}

// Git stash types
export interface GitStashEntry {
  index: number;
  message: string;
  date: string;
}

// Git reset modes
export type GitResetMode = 'soft' | 'mixed' | 'hard';

// Git merge options
export interface GitMergeOptions {
  noFf?: boolean;
}

export interface GitMergeResult {
  success: boolean;
  conflicts?: string[];
}
