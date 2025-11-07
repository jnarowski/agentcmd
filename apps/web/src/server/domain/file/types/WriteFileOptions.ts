import { z } from "zod";

/**
 * Zod schema for writeFile options
 */
export const writeFileOptionsSchema = z.object({
  projectId: z.string().min(1, "Project ID required"),
  filePath: z.string().min(1, "File path required"),
  content: z.string(),
});

/**
 * TypeScript type for writeFile options (derived from schema)
 */
export type WriteFileOptions = z.infer<typeof writeFileOptionsSchema>;
