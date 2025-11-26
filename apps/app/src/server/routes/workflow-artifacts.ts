import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as fs from "node:fs/promises";
import {
  uploadArtifact,
  downloadArtifact,
} from "@/server/domain/workflow/services";
import { attachArtifactToWorkflowEvent } from "@/server/domain/workflow/services/artifacts/attachArtifactToWorkflowEvent";
import { detachArtifactFromWorkflowEvent } from "@/server/domain/workflow/services/artifacts/detachArtifactFromWorkflowEvent";
import { attachArtifactSchema } from "@/shared/schemas/workflow.schemas";
import type { ArtifactType } from "@/shared/schemas/workflow.schemas";
import { NotFoundError } from "@/server/errors";

const artifactIdSchema = z.object({
  id: z.string().cuid(),
});

export async function workflowArtifactRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/workflow-runs/:id/artifacts
   * Upload an artifact (multipart form data)
   */
  fastify.post<{
    Params: { id: string };
  }>(
    "/api/workflow-runs/:id/artifacts",
    {
      preHandler: fastify.authenticate,
    },
    async (request, reply) => {
      const data = await request.file({
        limits: { fileSize: 100 * 1024 * 1024 },
      }); // 100MB limit

      if (!data) {
        return reply
          .code(400)
          .send({ error: { message: "No file provided", statusCode: 400 } });
      }

      // Parse form fields
      const fields = data.fields as Record<string, { value: string }>;
      const phase = fields.phase?.value;
      const name = fields.name?.value || data.filename;
      const fileType = fields.file_type?.value;

      if (!phase || !fileType) {
        return reply.code(400).send({
          error: {
            message: "phase and file_type are required",
            statusCode: 400,
          },
        });
      }

      // Read file buffer
      const buffer = await data.toBuffer();

      // Generate relative file path
      const runId = request.params.id;
      const filePath = `.agent/workflows/runs/${runId}/artifacts/${phase}/${data.filename}`;

      const artifact = await uploadArtifact(
        {
          workflow_run_id: runId,
          phase,
          name,
          file_path: filePath,
          file_type: fileType as ArtifactType,
          mime_type: data.mimetype || "application/octet-stream",
          size_bytes: buffer.length,
        },
        buffer
      );

      if (!artifact) {
        throw new NotFoundError("Workflow run not found");
      }

      return reply.code(201).send({ data: artifact });
    }
  );

  /**
   * GET /api/artifacts/:id
   * Download an artifact
   */
  fastify.get<{
    Params: z.infer<typeof artifactIdSchema>;
  }>(
    "/api/artifacts/:id",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: artifactIdSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const result = await downloadArtifact(id);

      if (!result) {
        throw new NotFoundError("Artifact not found");
      }

      const { artifact, filePath } = result;

      // Check file exists
      try {
        await fs.access(filePath);
      } catch {
        throw new NotFoundError("Artifact file not found on filesystem");
      }

      // Stream file
      return reply
        .type(artifact.mime_type)
        .header(
          "Content-Disposition",
          `attachment; filename="${artifact.name}"`
        )
        .send(await fs.readFile(filePath));
    }
  );

  /**
   * PATCH /api/artifacts/:id/attach
   * Attach an artifact to a comment
   */
  fastify.patch<{
    Params: z.infer<typeof artifactIdSchema>;
    Body: z.infer<typeof attachArtifactSchema>;
  }>(
    "/api/artifacts/:id/attach",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: artifactIdSchema,
        body: attachArtifactSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { event_id } = request.body;

      const artifact = await attachArtifactToWorkflowEvent(id, event_id);

      if (!artifact) {
        throw new NotFoundError(
          "Artifact or event not found, or they do not belong to the same workflow run"
        );
      }

      return reply.send({ data: artifact });
    }
  );

  /**
   * DELETE /api/artifacts/:id/detach
   * Detach an artifact from an event
   */
  fastify.delete<{
    Params: z.infer<typeof artifactIdSchema>;
  }>(
    "/api/artifacts/:id/detach",
    {
      preHandler: fastify.authenticate,
      schema: {
        params: artifactIdSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const artifact = await detachArtifactFromWorkflowEvent({ artifactId: id });

      if (!artifact) {
        throw new NotFoundError("Artifact not found");
      }

      return reply.send({ data: artifact });
    }
  );
}
