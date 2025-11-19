import { z } from "zod";

export const validateBranchOptionsSchema = z.object({
  projectPath: z.string().min(1, "Project path required"),
  branchName: z.string().min(1, "Branch name required"),
  baseBranch: z.string().optional(),
});

export type ValidateBranchOptions = z.infer<typeof validateBranchOptionsSchema>;
