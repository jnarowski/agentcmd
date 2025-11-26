import { z } from 'zod';

export const detachArtifactFromWorkflowEventOptionsSchema = z.object({
  artifactId: z.string().min(1, 'Artifact ID required'),
});

export type DetachArtifactFromWorkflowEventOptions = z.infer<typeof detachArtifactFromWorkflowEventOptionsSchema>;
