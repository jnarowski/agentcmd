import { z } from "zod";

/**
 * Zod schema for getFileTree options
 */
export const getFileTreeOptionsSchema = z.object({
  projectId: z.string().min(1, "Project ID required"),
});

/**
 * TypeScript type for getFileTree options (derived from schema)
 */
export type GetFileTreeOptions = z.infer<typeof getFileTreeOptionsSchema>;
