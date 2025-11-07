interface UnimplementedAgentRendererProps {
  agent: string;
}

/**
 * Fallback component for agents that haven't been implemented yet
 */
export function UnimplementedAgentRenderer({ agent }: UnimplementedAgentRendererProps) {
  return (
    <div className="flex items-center justify-center p-8 text-center">
      <div className="max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Agent Not Supported
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          The <span className="font-mono font-semibold">{agent}</span> agent is not yet implemented.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
          Currently, only Claude sessions are supported.
        </p>
      </div>
    </div>
  );
}
