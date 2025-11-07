/**
 * Reusable expand button component for tool blocks
 */

interface ExpandButtonProps {
  onClick: () => void;
}

export function ExpandButton({ onClick }: ExpandButtonProps) {
  return (
    <div className="absolute bottom-4 right-4">
      <button
        className="text-xs text-muted-foreground bg-background px-3 py-1 rounded-md border border-border hover:bg-muted/50 cursor-pointer"
        onClick={onClick}
      >
        Click to expand
      </button>
    </div>
  );
}
