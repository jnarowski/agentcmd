import { prisma } from "@/shared/prisma";
import { broadcast } from "@/server/websocket/infrastructure/subscriptions";
import { Channels } from "@/shared/websocket";
import { getProjectById } from "@/server/domain/project/services/getProjectById";
import type { ProjectPreviewConfig } from "@/shared/types/project.types";
import * as dockerClient from "../utils/dockerClient";
import * as portManager from "../utils/portManager";
import type {
  CreateContainerOptions,
  CreateContainerResult,
} from "./types";

// PUBLIC API

/**
 * Create and start a preview container for a project
 *
 * Merges project preview_config with step overrides, allocates ports,
 * builds and runs Docker container, creates DB record, and broadcasts events.
 *
 * @example
 * ```typescript
 * const container = await createContainer({
 *   projectId: "proj_123",
 *   workingDir: "/path/to/project",
 *   configOverrides: { ports: ["app", "server"] }
 * });
 * console.log(container.urls); // { app: "http://localhost:5000", ... }
 * ```
 */
export async function createContainer(
  options: CreateContainerOptions
): Promise<CreateContainerResult | null> {
  const { projectId, workingDir, workflowRunId, configOverrides = {} } =
    options;

  // Fetch project using domain service
  const project = await getProjectById({ id: projectId });

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // Check Docker availability
  const dockerAvailable = await dockerClient.checkDockerAvailable();
  if (!dockerAvailable) {
    console.warn(
      "Docker not available - skipping preview container creation",
      { projectId }
    );
    return null;
  }

  // Merge config: step override > project config > defaults
  const previewConfig: ProjectPreviewConfig = project.preview_config || {};
  const mergedConfig = {
    dockerFilePath: configOverrides.dockerFilePath || previewConfig.dockerFilePath,
    ports: configOverrides.ports || previewConfig.ports || ["app"],
    env: {
      ...(previewConfig.env || {}),
      ...(configOverrides.env || {}),
    },
    maxMemory: configOverrides.maxMemory || previewConfig.maxMemory,
    maxCpus: configOverrides.maxCpus || previewConfig.maxCpus,
  };

  // Detect Docker config
  const dockerConfig = dockerClient.detectConfig(
    workingDir,
    mergedConfig.dockerFilePath
  );

  // Allocate ports
  const { ports } = await portManager.allocatePorts({
    portNames: mergedConfig.ports,
  });

  // Create Container record with status "starting"
  const container = await prisma.container.create({
    data: {
      project_id: projectId,
      workflow_run_id: workflowRunId,
      status: "starting",
      ports,
      working_dir: workingDir,
    },
  });

  // Broadcast container.created event
  broadcast(Channels.project(projectId), {
    type: "container.created",
    data: {
      containerId: container.id,
      status: "starting",
      ports,
    },
  });

  try {
    // Build and run Docker container
    const dockerResult = await dockerClient.buildAndRun({
      type: dockerConfig.type,
      workingDir,
      containerId: container.id,
      ports,
      env: mergedConfig.env,
      maxMemory: mergedConfig.maxMemory,
      maxCpus: mergedConfig.maxCpus,
      dockerFilePath: mergedConfig.dockerFilePath,
    });

    // Update status to "running"
    const updatedContainer = await prisma.container.update({
      where: { id: container.id },
      data: {
        status: "running",
        started_at: new Date(),
        container_ids: dockerResult.containerIds,
        compose_project: dockerResult.composeProject,
      },
    });

    // Broadcast container.updated event
    broadcast(Channels.project(projectId), {
      type: "container.updated",
      data: {
        containerId: container.id,
        changes: { status: "running" },
      },
    });

    // Build URLs map
    const urls = Object.entries(ports).reduce(
      (acc, [name, port]) => {
        acc[name] = `http://localhost:${port}`;
        return acc;
      },
      {} as Record<string, string>
    );

    return {
      id: updatedContainer.id,
      status: updatedContainer.status,
      urls,
      ports,
    };
  } catch (error) {
    // Update status to "failed"
    await prisma.container.update({
      where: { id: container.id },
      data: {
        status: "failed",
        error_message: error instanceof Error ? error.message : String(error),
      },
    });

    // Broadcast container.updated event
    broadcast(Channels.project(projectId), {
      type: "container.updated",
      data: {
        containerId: container.id,
        changes: { status: "failed" },
      },
    });

    throw error;
  }
}
