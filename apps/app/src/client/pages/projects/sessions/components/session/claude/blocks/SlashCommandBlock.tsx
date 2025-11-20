interface SlashCommandBlockProps {
  command: string;
  message?: string;
  args?: string;
}

/**
 * Renders slash command run blocks
 * SDK extracts these from user messages with <command-name> tags
 */
export function SlashCommandBlock({ command, message, args }: SlashCommandBlockProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-mono text-muted-foreground">
      <span className="text-foreground">{command}</span>
      {args && <span className="text-foreground break-all">{args}</span>}
      {message && <span className="text-xs break-words">• {message}</span>}
    </div>
  );
}
