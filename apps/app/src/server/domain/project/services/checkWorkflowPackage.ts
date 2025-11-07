import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CheckWorkflowPackageOptions } from "@/server/domain/project/types/CheckWorkflowPackageOptions";

/**
 * Result of agentcmd-workflows package check
 */
export interface WorkflowPackageCheckResult {
  hasPackageJson: boolean;
  installed: boolean;
  version?: string;
}

/**
 * Check if agentcmd-workflows is installed in a project
 * @param options - Options object with projectPath
 * @returns Check result with installation status
 */
export async function checkWorkflowPackage({ projectPath }: CheckWorkflowPackageOptions): Promise<WorkflowPackageCheckResult> {
  try {
    // Check for package.json
    const packageJsonPath = join(projectPath, "package.json");
    const packageJsonContent = await readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);

    // Check for agentcmd-workflows in dependencies or devDependencies
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};

    const version = deps["agentcmd-workflows"] || devDeps["agentcmd-workflows"];

    return {
      hasPackageJson: true,
      installed: !!version,
      version: version || undefined,
    };
  } catch {
    // If package.json doesn't exist or can't be read
    return {
      hasPackageJson: false,
      installed: false,
    };
  }
}
