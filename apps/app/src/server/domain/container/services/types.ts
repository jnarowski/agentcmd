// PUBLIC API

/**
 * Options for allocating ports for a container
 */
export interface PortAllocationOptions {
  /** Named ports to allocate (e.g., ["app", "server", "client"]) */
  portNames: string[];
}

/**
 * Result of port allocation
 */
export interface PortAllocationResult {
  /** Map of port names to port numbers */
  ports: Record<string, number>;
}

/**
 * Docker configuration type
 */
export type DockerConfigType = "compose" | "dockerfile";

/**
 * Docker configuration detected from working directory
 */
export interface DockerConfig {
  /** Type of Docker configuration found */
  type: DockerConfigType;
  /** Path to the Docker file (relative or absolute) */
  filePath: string;
}

/**
 * Options for building and running a Docker container
 */
export interface BuildAndRunOptions {
  /** Type of Docker configuration */
  type: DockerConfigType;
  /** Working directory where Docker files are located */
  workingDir: string;
  /** Container ID for naming */
  containerId: string;
  /** Named ports to expose */
  ports: Record<string, number>;
  /** Environment variables to pass to container */
  env?: Record<string, string>;
  /** Max memory limit (e.g., "1g", "512m") */
  maxMemory?: string;
  /** Max CPU limit (e.g., "1.0", "0.5") */
  maxCpus?: string;
  /** Path to Docker file (optional, overrides auto-detection) */
  dockerFilePath?: string;
}

/**
 * Result of building and running a Docker container
 */
export interface BuildAndRunResult {
  /** Docker container IDs created */
  containerIds: string[];
  /** Docker Compose project name (if using compose) */
  composeProject?: string;
}

/**
 * Options for stopping a container
 */
export interface StopContainerOptions {
  /** Docker container IDs to stop */
  containerIds: string[];
  /** Docker Compose project name (if using compose) */
  composeProject?: string;
  /** Working directory where Docker files are located */
  workingDir: string;
}

/**
 * Options for creating a container
 */
export interface CreateContainerOptions {
  /** Project ID */
  projectId: string;
  /** Working directory where Docker files are located */
  workingDir: string;
  /** Optional workflow run ID to associate with container */
  workflowRunId?: string;
  /** Configuration overrides from step */
  configOverrides?: {
    /** Custom Docker file path */
    dockerFilePath?: string;
    /** Named ports to expose */
    ports?: string[];
    /** Environment variables */
    env?: Record<string, string>;
    /** Max memory limit */
    maxMemory?: string;
    /** Max CPU limit */
    maxCpus?: string;
  };
}

/**
 * Result of creating a container
 */
export interface CreateContainerResult {
  /** Container ID */
  id: string;
  /** Container status */
  status: string;
  /** Map of port names to URLs */
  urls: Record<string, string>;
  /** Allocated ports */
  ports: Record<string, number>;
}

/**
 * Options for stopping a container by ID
 */
export interface StopContainerByIdOptions {
  /** Container ID */
  containerId: string;
}

/**
 * Options for getting a container by ID
 */
export interface GetContainerByIdOptions {
  /** Container ID */
  containerId: string;
}

/**
 * Options for getting containers by project
 */
export interface GetContainersByProjectOptions {
  /** Project ID */
  projectId: string;
  /** Optional status filter */
  status?: string;
}

/**
 * Options for getting container logs
 */
export interface GetContainerLogsOptions {
  /** Container ID */
  containerId: string;
}
