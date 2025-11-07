import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CheckWorkflowSdkOptions } from "@/server/domain/project/types/CheckWorkflowSdkOptions";

/**
 * Result of workflow-sdk check
 */
export interface WorkflowSdkCheckResult {
  hasPackageJson: boolean;
  installed: boolean;
  version?: string;
}

/**
 * Check if workflow-sdk is installed in a project
 * @param options - Options object with projectPath
 * @returns Check result with installation status
 */
export async function checkWorkflowSdk({ projectPath }: CheckWorkflowSdkOptions): Promise<WorkflowSdkCheckResult> {
  try {
    // Check for package.json
    const packageJsonPath = join(projectPath, "package.json");
    const packageJsonContent = await readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);

    // Check for @repo/workflow-sdk in dependencies or devDependencies
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};

    const version = deps["@repo/workflow-sdk"] || devDeps["@repo/workflow-sdk"];

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
