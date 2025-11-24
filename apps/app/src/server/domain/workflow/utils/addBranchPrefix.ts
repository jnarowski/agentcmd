/**
 * Maps spec type to conventional git branch prefix
 */
function getSpecTypePrefix(specType: string): string | null {
  const prefixMap: Record<string, string> = {
    feature: "feature",
    bug: "bug",
    issue: "issue",
  };

  return prefixMap[specType] ?? null;
}

/**
 * Adds spec type prefix to branch name if not already present
 *
 * @param branchName - The branch name (e.g., "dark-mode")
 * @param specType - The spec type (e.g., "feature", "bug", "issue")
 * @returns Branch name with prefix (e.g., "feature/dark-mode")
 */
export function addBranchPrefix(
  branchName: string,
  specType?: string,
): string {
  if (!specType || !branchName) {
    return branchName;
  }

  const prefix = getSpecTypePrefix(specType);
  if (!prefix) {
    return branchName;
  }

  // Check if branch name already has a prefix (contains /)
  if (branchName.includes("/")) {
    return branchName;
  }

  return `${prefix}/${branchName}`;
}
