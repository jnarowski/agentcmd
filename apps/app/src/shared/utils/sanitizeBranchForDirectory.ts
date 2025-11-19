/**
 * Sanitize a git branch name for use as a filesystem directory name.
 *
 * Git branches can contain characters like `/` that are valid in git but
 * problematic as directory names. This function transforms branch names
 * into safe filesystem paths.
 *
 * Transformations:
 * - `/` → `-` (directory separator to dash)
 * - `..` → `--` (prevent path traversal)
 * - Leading `.` → `_` (prevent hidden directories)
 * - Truncate to 255 characters (filesystem limit)
 *
 * Examples:
 * - `feature/auth` → `feature-auth`
 * - `user/john/fix` → `user-john-fix`
 * - `v1.0.0` → `v1.0.0` (no change)
 * - `..sneaky` → `--sneaky`
 */
export function sanitizeBranchForDirectory(branchName: string): string {
  return branchName
    .replace(/\//g, "-") // Replace slashes with dashes
    .replace(/\.\./g, "--") // Prevent path traversal
    .replace(/^\./, "_") // Prevent hidden directories
    .substring(0, 255); // Filesystem path length limit
}
