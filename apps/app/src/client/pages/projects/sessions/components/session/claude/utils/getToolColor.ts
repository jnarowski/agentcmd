/**
 * Maps tool names to Tailwind background color classes for the ToolDot indicator
 */
export function getToolColor(toolName: string, hasError?: boolean): string {
  // Red for errors
  if (hasError) {
    return "bg-red-500";
  }

  // Map tool names to colors
  switch (toolName.toLowerCase()) {
    case "read":
    case "grep":
    case "glob":
    case "websearch":
    case "todowrite":
    case "bash":
      return "bg-green-500";

    case "edit":
    case "write":
      return "bg-orange-500";

    default:
      return "bg-gray-500";
  }
}
