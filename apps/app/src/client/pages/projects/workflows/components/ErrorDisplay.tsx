export interface ErrorDisplayProps {
  error: string;
  title?: string;
}

/**
 * Shared component for displaying error messages
 * Provides consistent destructive styling with pre/code formatting
 */
export function ErrorDisplay({ error, title = "Error" }: ErrorDisplayProps) {
  if (!error || error.trim().length === 0) {
    return null;
  }

  return (
    <div className="rounded-md bg-destructive/10 p-3">
      <p className="text-sm font-medium text-destructive mb-1">{title}</p>
      <pre className="text-xs text-destructive whitespace-pre-wrap font-mono">
        {error}
      </pre>
    </div>
  );
}
