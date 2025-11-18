import { spawn } from "node:child_process";
import { access, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { InstallWorkflowPackageOptions } from "@/server/domain/project/types/InstallWorkflowPackageOptions";

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
      // Check if stderr contains actual errors vs just warnings
      const stderrLower = stderr.toLowerCase();
      const hasError =
        // Check for ERR_ prefix (e.g., ERR_PNPM_ADDING_TO_ROOT)
        /\berr[_!]/i.test(stderr) ||
        // Check for npm/pnpm error codes (e.g., ELIFECYCLE, ENOENT)
        /\be[a-z]+\b/i.test(stderr) ||
        // Check for "error" keyword
        stderrLower.includes("error");

      const hasOnlyWarnings =
        stderr.trim() &&
        !hasError &&
        stderrLower.includes("warn");

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
 * Install agentcmd-workflows package in a project
 * - Creates package.json if it doesn't exist
 * - Detects package manager (pnpm, yarn, npm)
 * - Installs agentcmd-workflows as devDependency
 * - Runs agentcmd-workflows init --yes
 *
 * @param options - Options object with projectPath
 * @returns Success status and output messages
 */
export async function installWorkflowPackage({ projectPath }: InstallWorkflowPackageOptions): Promise<{
  success: boolean;
  message: string;
  output?: string;
}> {
  try {
    // Step 1: Ensure package.json exists
    await ensurePackageJson(projectPath);

    // Step 2: Detect package manager
    const packageManager = await detectPackageManager(projectPath);

    // Step 3: Install agentcmd-workflows
    const installArgs: Record<string, string[]> = {
      pnpm: ["add", "-D", "agentcmd-workflows"],
      yarn: ["add", "-D", "agentcmd-workflows"],
      npm: ["install", "--save-dev", "agentcmd-workflows"],
    };

    const { stdout: installOutput } = await runCommand(
      packageManager,
      installArgs[packageManager],
      projectPath
    );

    // Step 4: Run agentcmd-workflows init
    try {
      const initCommand =
        packageManager === "npm"
          ? "npx"
          : packageManager;

      const initArgs = ["agentcmd-workflows", "init"];

      const { stdout: initOutput } = await runCommand(
        initCommand,
        initArgs,
        projectPath
      );

      return {
        success: true,
        message: "Workflow package installed and initialized successfully",
        output: `${installOutput}\n${initOutput}`,
      };
    } catch (initError) {
      // Init failed, but install succeeded
      return {
        success: false,
        message:
          "Workflow package installed, but initialization failed. You may need to run 'agentcmd-workflows init' manually.",
        output: `${installOutput}\n\nInit Error:\n${initError instanceof Error ? initError.message : String(initError)}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to install agentcmd-workflows",
      output: error instanceof Error ? error.stack : String(error),
    };
  }
}
