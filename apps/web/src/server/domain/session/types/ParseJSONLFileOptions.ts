import { z } from 'zod';

/**
 * Options for parsing a JSONL file
 * Action: uses flat parameters
 */
export const parseJSONLFileOptionsSchema = z.object({
  filePath: z.string().min(1, 'File path required'),
});

export type ParseJSONLFileOptions = z.infer<typeof parseJSONLFileOptionsSchema>;
