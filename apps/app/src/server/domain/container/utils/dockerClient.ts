import { exec } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { promisify } from "util";
import type {
  DockerConfig,
  DockerConfigType,
  BuildAndRunOptions,
  BuildAndRunResult,
  StopContainerOptions,
  DockerGetLogsOptions,
} from "../services/types";
import { sanitizeContainerName } from "./sanitizeContainerName";

const execAsync = promisify(exec);

// PUBLIC API

/**
 * Checks if Docker is available on the system.
 *
 * @returns True if Docker is installed and accessible
 *
 * @example
 * ```ts
 * const available = await checkDockerAvailable();
 * if (!available) {
 *   console.warn("Docker not available, skipping preview");
 * }
 * ```
 */
export async function checkDockerAvailable(): Promise<boolean> {
  try {
    await execAsync("docker --version");
    return true;
  } catch {
    return false;
  }
}

/**
 * Detects Docker configuration in a working directory.
 * Priority: custom path → docker-compose.yml variants → Dockerfile
 *
 * @param workingDir - Directory to search for Docker files
 * @param customPath - Optional custom path to Docker file
 * @returns Docker configuration with type and file path
 * @throws Error if no Docker files found or custom path invalid
 *
 * @example
 * ```ts
 * const config = detectConfig("/tmp/project");
 * // { type: "compose", filePath: "/tmp/project/docker-compose.yml" }
 * ```
 */
export function detectConfig(
  workingDir: string,
  customPath?: string
): DockerConfig {
  // If custom path provided, validate and use it
  if (customPath) {
    if (!existsSync(customPath)) {
      throw new Error(`Docker file not found at custom path: ${customPath}`);
    }

    const fileName = customPath.toLowerCase();
    const type: DockerConfigType =
      fileName.includes("compose") || fileName.endsWith(".yml") || fileName.endsWith(".yaml")
        ? "compose"
        : "dockerfile";

    return { type, filePath: customPath };
  }

  // Check for compose variants (priority order)
  const composeFiles = [
    "docker-compose.yml",
    "docker-compose.yaml",
    "compose.yml",
    "compose.yaml",
  ];

  for (const file of composeFiles) {
    const filePath = join(workingDir, file);
    if (existsSync(filePath)) {
      return { type: "compose", filePath };
    }
  }

  // Check for Dockerfile
  const dockerfilePath = join(workingDir, "Dockerfile");
  if (existsSync(dockerfilePath)) {
    return { type: "dockerfile", filePath: dockerfilePath };
  }

  throw new Error(
    `No Dockerfile or docker-compose.yml found in ${workingDir}`
  );
}

/**
 * Builds and runs a Docker container or Compose project.
 * Sets port environment variables using the exact names provided (no transformation).
 *
 * @param options - Build and run options
 * @returns Container IDs and optional compose project name
 * @throws Error if Docker build/run fails
 *
 * @example
 * ```ts
 * const result = await buildAndRun({
 *   type: "compose",
 *   workingDir: "/tmp/project",
 *   containerId: "abc123",
 *   ports: { PORT: 5000, VITE_PORT: 5001 },
 *   env: { NODE_ENV: "preview" }
 * });
 * // Sets PORT=5000, VITE_PORT=5001 in container environment
 * // { containerIds: ["id1", "id2"], composeProject: "container-abc123" }
 * ```
 */
export async function buildAndRun(
  options: BuildAndRunOptions
): Promise<BuildAndRunResult> {
  const {
    type,
    workingDir,
    containerId,
    projectName,
    ports,
    env = {},
    maxMemory,
    maxCpus,
  } = options;

  // Build environment variables - use env var names directly (no transformation)
  const envVars = { ...env };
  for (const [envVarName, port] of Object.entries(ports)) {
    envVars[envVarName] = String(port);
  }

  const envString = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");

  if (type === "compose") {
    return await buildAndRunCompose(containerId, projectName, workingDir, envString);
  } else {
    return await buildAndRunDockerfile(
      containerId,
      projectName,
      workingDir,
      envString,
      ports,
      maxMemory,
      maxCpus
    );
  }
}

/**
 * Stops and removes a Docker container or Compose project.
 *
 * @param options - Stop options with container IDs or compose project
 *
 * @example
 * ```ts
 * await stop({
 *   composeProject: "container-abc123",
 *   workingDir: "/tmp/project"
 * });
 * ```
 */
export async function stop(options: StopContainerOptions): Promise<void> {
  const { containerIds, composeProject, workingDir } = options;

  try {
    if (composeProject) {
      // Stop compose project
      const cmd = `docker compose -p ${composeProject} down`;
      await execAsync(cmd, { cwd: workingDir });
    } else if (containerIds.length > 0) {
      // Stop and remove individual containers
      for (const id of containerIds) {
        try {
          await execAsync(`docker stop ${id}`);
          await execAsync(`docker rm ${id}`);
        } catch (err) {
          // Ignore errors for individual containers (may already be stopped)
          console.warn(`Failed to stop container ${id}:`, err);
        }
      }
    }
  } catch (err) {
    // Log but don't throw - container may already be stopped
    console.warn("Error stopping containers:", err);
  }
}

/**
 * Checks if Docker containers or a compose project are running.
 *
 * @param options - Check options with container IDs or compose project
 * @returns True if all containers are running
 *
 * @example
 * ```ts
 * const isRunning = await isContainerRunning({
 *   composeProject: "container-abc123",
 *   workingDir: "/tmp/project"
 * });
 * ```
 */
export async function isContainerRunning(options: {
  containerIds?: string[];
  composeProject?: string;
  workingDir?: string;
}): Promise<boolean> {
  const { containerIds, composeProject, workingDir } = options;

  try {
    if (composeProject && workingDir) {
      // Check compose project status
      const { stdout } = await execAsync(
        `docker compose -p ${composeProject} ps --status running -q`,
        { cwd: workingDir }
      );
      // If any containers are running, consider it running
      return stdout.trim().length > 0;
    } else if (containerIds && containerIds.length > 0) {
      // Check individual containers
      for (const id of containerIds) {
        try {
          const { stdout } = await execAsync(
            `docker inspect -f '{{.State.Running}}' ${id}`
          );
          if (stdout.trim() !== "true") {
            return false;
          }
        } catch {
          // Container doesn't exist or error
          return false;
        }
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Fetches logs from Docker containers.
 *
 * @param options - Log options with container IDs
 * @returns Combined logs from all containers
 *
 * @example
 * ```ts
 * const logs = await getLogs({ containerIds: ["id1", "id2"] });
 * console.log(logs);
 * ```
 */
export async function getLogs(
  options: DockerGetLogsOptions
): Promise<string> {
  const { containerIds } = options;

  try {
    const logsPromises = containerIds.map(async (id: string) => {
      try {
        const { stdout } = await execAsync(`docker logs ${id}`);
        return `\n=== Container ${id} ===\n${stdout}`;
      } catch (err) {
        return `\n=== Container ${id} ===\nError fetching logs: ${err}\n`;
      }
    });

    const logs = await Promise.all(logsPromises);
    return logs.join("\n");
  } catch (err) {
    return `Error fetching logs: ${err}`;
  }
}

// PRIVATE HELPERS

async function buildAndRunCompose(
  containerId: string,
  projectName: string | undefined,
  workingDir: string,
  envString: string
): Promise<BuildAndRunResult> {
  const sanitized = sanitizeContainerName(projectName || "unknown");
  const composeProjectName = `agentcmd-${sanitized}-container-${containerId}`;
  const upCmd = `${envString} docker compose -p ${composeProjectName} up -d`;

  // Start containers
  await execAsync(upCmd, { cwd: workingDir });

  // Get actual container IDs using docker compose ps
  const psCmd = `docker compose -p ${composeProjectName} ps -q`;
  const { stdout } = await execAsync(psCmd, { cwd: workingDir });

  const containerIds = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return {
    containerIds: containerIds.length > 0 ? containerIds : [composeProjectName],
    composeProject: composeProjectName,
  };
}

async function buildAndRunDockerfile(
  containerId: string,
  projectName: string | undefined,
  workingDir: string,
  envString: string,
  ports: Record<string, number>,
  maxMemory?: string,
  maxCpus?: string
): Promise<BuildAndRunResult> {
  const sanitized = sanitizeContainerName(projectName || "unknown");
  const imageName = `agentcmd-${sanitized}-container-${containerId}`;

  // Build image
  const buildCmd = `docker build -t ${imageName} .`;
  await execAsync(buildCmd, { cwd: workingDir });

  // Build port mappings
  const portFlags = Object.values(ports)
    .map((port) => `-p ${port}:${port}`)
    .join(" ");

  // Build resource limit flags
  let resourceFlags = "";
  if (maxMemory) {
    resourceFlags += `--memory ${maxMemory} `;
  }
  if (maxCpus) {
    resourceFlags += `--cpus ${maxCpus} `;
  }

  // Run container
  const runCmd = `${envString} docker run -d ${portFlags} ${resourceFlags}--name ${imageName} ${imageName}`;
  const { stdout } = await execAsync(runCmd, { cwd: workingDir });

  const dockerContainerId = stdout.trim();

  return {
    containerIds: [dockerContainerId],
  };
}
