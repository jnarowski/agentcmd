interface ToolDotProps {
  color: string;
}

/**
 * A small colored dot indicator for tool blocks
 * Size: 6-8px circle with proper centering
 */
export function ToolDot({ color }: ToolDotProps) {
  return <div className={`h-2 w-2 rounded-full ${color} shrink-0`} />;
}
