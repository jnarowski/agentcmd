/**
 * Git domain Zod validation schemas
 */
import { z } from 'zod';

// File path query schema (deprecated - use body path instead)
export const gitFilePathQuerySchema = z.object({
  path: z.string(),
});

// Git status schema
export const gitStatusBodySchema = z.object({
  path: z.string().min(1),
});

// Branches schema
export const gitBranchesBodySchema = z.object({
  path: z.string().min(1),
});

// Create branch schema
export const gitBranchBodySchema = z.object({
  path: z.string().min(1),
  name: z.string().min(1),
  from: z.string().optional(),
});

// Switch branch schema
export const gitSwitchBranchBodySchema = z.object({
  path: z.string().min(1),
  name: z.string().min(1),
});

// Stage/unstage files schema
export const gitStageFilesBodySchema = z.object({
  path: z.string().min(1),
  files: z.array(z.string()).min(1),
});

// Commit schema
export const gitCommitBodySchema = z.object({
  path: z.string().min(1),
  message: z.string().min(1),
  files: z.array(z.string()).min(1),
});

// Push schema
export const gitPushBodySchema = z.object({
  path: z.string().min(1),
  branch: z.string(),
  remote: z.string().optional(),
});

// Fetch schema
export const gitFetchBodySchema = z.object({
  path: z.string().min(1),
  remote: z.string().optional(),
});

// History schema
export const gitHistoryBodySchema = z.object({
  path: z.string().min(1),
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0),
});

// Diff schema
export const gitDiffBodySchema = z.object({
  path: z.string().min(1),
  filepath: z.string().min(1),
});

// Commit diff schema
export const gitCommitDiffBodySchema = z.object({
  path: z.string().min(1),
  commitHash: z.string().min(1),
});

// PR data schema
export const gitPrDataBodySchema = z.object({
  path: z.string().min(1),
  baseBranch: z.string().default('main'),
});

// Create PR schema
export const gitCreatePrBodySchema = z.object({
  path: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  baseBranch: z.string().default('main'),
});

// Generate commit message schema
export const gitGenerateCommitMessageBodySchema = z.object({
  path: z.string().min(1),
  files: z.array(z.string()).min(1),
});

// Pull schema
export const gitPullBodySchema = z.object({
  path: z.string().min(1),
  remote: z.string().optional(),
  branch: z.string().optional(),
});

// Merge schema
export const gitMergeBodySchema = z.object({
  path: z.string().min(1),
  sourceBranch: z.string().min(1),
  noFf: z.boolean().optional(),
});

// Stash save schema
export const gitStashSaveBodySchema = z.object({
  path: z.string().min(1),
  message: z.string().optional(),
});

// Stash pop schema
export const gitStashPopBodySchema = z.object({
  path: z.string().min(1),
  index: z.number().optional(),
});

// Stash list schema
export const gitStashListBodySchema = z.object({
  path: z.string().min(1),
});

// Stash apply schema
export const gitStashApplyBodySchema = z.object({
  path: z.string().min(1),
  index: z.number().optional(),
});

// Reset schema
export const gitResetBodySchema = z.object({
  path: z.string().min(1),
  commitHash: z.string().min(1),
  mode: z.enum(['soft', 'mixed', 'hard']),
});

// Discard changes schema
export const gitDiscardBodySchema = z.object({
  path: z.string().min(1),
  files: z.array(z.string()).min(1),
});
