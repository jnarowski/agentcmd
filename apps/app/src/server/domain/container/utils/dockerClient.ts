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
 * Injects PREVIEW_PORT_{NAME} environment variables for each port.
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
 *   ports: { app: 5000, server: 5001 },
 *   env: { NODE_ENV: "preview" }
 * });
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
    ports,
    env = {},
    maxMemory,
    maxCpus,
  } = options;

  // Build environment variables with PREVIEW_PORT_{NAME}
  const envVars = { ...env };
  for (const [name, port] of Object.entries(ports)) {
    const envKey = `PREVIEW_PORT_${name.toUpperCase().replace(/-/g, "_")}`;
    envVars[envKey] = String(port);
  }

  const envString = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");

  if (type === "compose") {
    return await buildAndRunCompose(containerId, workingDir, envString);
  } else {
    return await buildAndRunDockerfile(
      containerId,
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
  workingDir: string,
  envString: string
): Promise<BuildAndRunResult> {
  const projectName = `container-${containerId}`;
  const cmd = `${envString} docker compose -p ${projectName} up -d`;

  const { stdout } = await execAsync(cmd, { cwd: workingDir });

  // Extract container IDs from output (rough parsing)
  const containerIds = stdout
    .split("\n")
    .filter((line) => line.trim().length > 0 && !line.includes("Creating"))
    .map((line) => line.trim());

  return {
    containerIds: containerIds.length > 0 ? containerIds : [projectName],
    composeProject: projectName,
  };
}

async function buildAndRunDockerfile(
  containerId: string,
  workingDir: string,
  envString: string,
  ports: Record<string, number>,
  maxMemory?: string,
  maxCpus?: string
): Promise<BuildAndRunResult> {
  const imageName = `container-${containerId}`;

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
