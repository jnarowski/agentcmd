import { useState, useEffect } from "react";
import { api } from "@/client/utils/api";

export interface BranchValidationResult {
  valid: boolean;
  branchExists: boolean;
  baseBranchExists?: boolean;
  error?: string;
}

interface ValidationState {
  isValidating: boolean;
  branchExists: boolean;
  baseBranchExists?: boolean;
  error?: string;
}

/**
 * Debounced branch validation hook
 *
 * Validates branch names against the git repository with 500ms debounce
 * to prevent excessive API calls while user types.
 */
export function useBranchValidation(
  projectId: string,
  branchName: string,
  baseBranch?: string
): ValidationState {
  const [state, setState] = useState<ValidationState>({
    isValidating: false,
    branchExists: false,
    baseBranchExists: undefined,
    error: undefined,
  });

  useEffect(() => {
    // Skip validation if branch name is empty
    if (!branchName || branchName.length === 0) {
      setState({
        isValidating: false,
        branchExists: false,
        baseBranchExists: undefined,
        error: undefined,
      });
      return;
    }

    // Set validating state
    setState((prev) => ({ ...prev, isValidating: true }));

    // Debounce API call by 500ms
    const timer = setTimeout(async () => {
      try {
        const response = await api.post<{ data: BranchValidationResult }>(
          `/api/projects/${projectId}/validate-branch`,
          { branchName, baseBranch }
        );

        setState({
          isValidating: false,
          branchExists: response.data.branchExists,
          baseBranchExists: response.data.baseBranchExists,
          error: response.data.error,
        });
      } catch {
        setState({
          isValidating: false,
          branchExists: false,
          baseBranchExists: undefined,
          error: "Failed to validate branch name",
        });
      }
    }, 500);

    // Cleanup timeout on unmount or when dependencies change
    return () => clearTimeout(timer);
  }, [projectId, branchName, baseBranch]);

  return state;
}
