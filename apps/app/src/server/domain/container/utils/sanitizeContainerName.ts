/**
 * Sanitizes a project name for use in Docker container/image names.
 * Docker names must be lowercase and only contain [a-z0-9_.-]
 */
export function sanitizeContainerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-") // Replace non-alphanumeric with dash
    .replace(/-+/g, "-") // Collapse multiple dashes
    .replace(/^-|-$/g, "") // Trim leading/trailing dashes
    .slice(0, 30); // Limit length
}
