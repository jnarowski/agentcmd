import { z } from "zod";

/**
 * Zod schema for readFile options
 */
export const readFileOptionsSchema = z.object({
  projectId: z.string().min(1, "Project ID required"),
  filePath: z.string().min(1, "File path required"),
});

/**
 * TypeScript type for readFile options (derived from schema)
 */
export type ReadFileOptions = z.infer<typeof readFileOptionsSchema>;
