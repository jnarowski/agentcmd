import { getBranches } from "./getBranches";
import type { ValidateBranchOptions } from "../types/ValidateBranchOptions";

// ============================================================================
// PUBLIC API
// ============================================================================

export interface BranchValidationResult {
  valid: boolean;
  branchExists: boolean;
  baseBranchExists?: boolean;
  error?: string;
}

/**
 * Validate branch name against repository branches
 *
 * Checks:
 * 1. Branch name format (alphanumeric, dash, underscore, slash, dot)
 * 2. Branch does not already exist
 * 3. Base branch exists (if provided)
 */
export async function validateBranch({
  projectPath,
  branchName,
  baseBranch,
}: ValidateBranchOptions): Promise<BranchValidationResult> {
  // Validate branch name format
  const branchNameRegex = /^[a-zA-Z0-9_/.-]+$/;
  if (!branchNameRegex.test(branchName)) {
    return {
      valid: false,
      branchExists: false,
      error: "Invalid branch name format. Only letters, numbers, dash, underscore, slash, and dot allowed.",
    };
  }

  // Get current branches from repository
  const branches = await getBranches({ projectPath });
  const branchNames = branches.map((b) => b.name);

  // Check if branch already exists
  const branchExists = branchNames.includes(branchName);

  // Check base branch if provided
  let baseBranchExists: boolean | undefined;
  if (baseBranch !== undefined) {
    baseBranchExists = branchNames.includes(baseBranch);

    if (!baseBranchExists) {
      return {
        valid: false,
        branchExists,
        baseBranchExists,
        error: `Base branch "${baseBranch}" does not exist.`,
      };
    }
  }

  // Branch is valid if it doesn't exist and base branch exists (if provided)
  const valid = !branchExists && (baseBranch === undefined || baseBranchExists === true);

  return {
    valid,
    branchExists,
    baseBranchExists,
    error: branchExists ? `Branch "${branchName}" already exists.` : undefined,
  };
}
