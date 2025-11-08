import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Detects if the given project path is the agentcmd development repository itself.
 * This is used to treat the agentcmd repo specially - it has example workflows and
 * workspace packages, so we don't want to prompt for package installation.
 */
export async function isAgentcmdRepo(projectPath: string): Promise<boolean> {
  try {
    const packageJsonPath = join(projectPath, "package.json");
    const content = await readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(content);
    return packageJson.name === "agentcmd";
  } catch {
    return false;
  }
}
