import { spawn } from "node:child_process";
import { access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { InstallWorkflowSdkOptions } from "@/server/domain/project/types/InstallWorkflowSdkOptions";

/**
 * Detect which package manager to use based on lock files
 */
async function detectPackageManager(
  projectPath: string
): Promise<"pnpm" | "yarn" | "npm"> {
  try {
    await access(join(projectPath, "pnpm-lock.yaml"));
    return "pnpm";
  } catch {
    // File doesn't exist, try next
  }

  try {
    await access(join(projectPath, "yarn.lock"));
    return "yarn";
  } catch {
    // File doesn't exist, use default
  }

  return "npm"; // Default to npm
}

/**
 * Run a shell command and return output
 */
function runCommand(
  command: string,
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: "pipe",
      shell: true,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      // pnpm may return exit code 1 for non-fatal warnings (like missing env vars in .npmrc)
      // Check if stderr contains only warnings (not actual errors)
      const hasOnlyWarnings =
        stderr.trim() &&
        !stderr.toLowerCase().includes("error") &&
        stderr.toLowerCase().includes("warn");

      if (code === 0 || (code === 1 && hasOnlyWarnings)) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });

    proc.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Create a minimal package.json if it doesn't exist
 */
async function ensurePackageJson(projectPath: string): Promise<void> {
  const packageJsonPath = join(projectPath, "package.json");

  try {
    await access(packageJsonPath);
    // package.json already exists
  } catch {
    // Create minimal package.json
    const minimalPackageJson = {
      name: "project",
      version: "1.0.0",
      type: "module",
    };

    await writeFile(
      packageJsonPath,
      JSON.stringify(minimalPackageJson, null, 2) + "\n",
      "utf-8"
    );
  }
}

/**
 * Install workflow-sdk in a project
 * - Creates package.json if it doesn't exist
 * - Detects package manager (pnpm, yarn, npm)
 * - Installs @repo/workflow-sdk as devDependency
 * - Runs workflow-sdk init --yes
 *
 * @param options - Options object with projectPath
 * @returns Success status and output messages
 */
export async function installWorkflowSdk({ projectPath }: InstallWorkflowSdkOptions): Promise<{
  success: boolean;
  message: string;
  output?: string;
}> {
  try {
    // Step 1: Ensure package.json exists
    await ensurePackageJson(projectPath);

    // Step 2: Detect package manager
    const packageManager = await detectPackageManager(projectPath);

    // Step 3: Install workflow-sdk
    const installArgs: Record<string, string[]> = {
      pnpm: ["add", "-D", "@repo/workflow-sdk"],
      yarn: ["add", "-D", "@repo/workflow-sdk"],
      npm: ["install", "--save-dev", "@repo/workflow-sdk"],
    };

    const { stdout: installOutput } = await runCommand(
      packageManager,
      installArgs[packageManager],
      projectPath
    );

    // Step 4: Run workflow-sdk init with --yes flag
    try {
      const initCommand =
        packageManager === "pnpm"
          ? "pnpm"
          : packageManager === "yarn"
            ? "yarn"
            : "npx";

      const initArgs =
        packageManager === "npm"
          ? ["workflow-sdk", "init", "--yes"]
          : ["workflow-sdk", "init", "--yes"];

      const { stdout: initOutput } = await runCommand(
        initCommand,
        initArgs,
        projectPath
      );

      return {
        success: true,
        message: "Workflow SDK installed and initialized successfully",
        output: `${installOutput}\n${initOutput}`,
      };
    } catch (initError) {
      // Init failed, but install succeeded
      return {
        success: true,
        message:
          "Workflow SDK installed, but initialization failed. You may need to run 'workflow-sdk init' manually.",
        output: `${installOutput}\n${initError instanceof Error ? initError.message : String(initError)}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to install workflow-sdk",
      output: error instanceof Error ? error.stack : String(error),
    };
  }
}
