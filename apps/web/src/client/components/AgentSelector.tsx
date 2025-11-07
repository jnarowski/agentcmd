import { AgentIcon } from "@/client/components/AgentIcon";
import type { AgentType } from "@/shared/types/agent.types";
import { cn } from "@/client/utils/cn";
import { useSettings } from "@/client/hooks/useSettings";

interface AgentSelectorProps {
  value: AgentType;
  onChange: (agent: AgentType) => void;
  disabled?: boolean;
}

const agents: Array<{
  id: AgentType;
  name: string;
  description: string;
  status: "available" | "coming-soon";
}> = [
  {
    id: "claude",
    name: "Claude Code",
    description: "Anthropic Claude - Advanced reasoning and coding",
    status: "available",
  },
  {
    id: "codex",
    name: "OpenAI Codex",
    description: "OpenAI Codex - Code generation and understanding",
    status: "available",
  },
];

const installInstructions: Record<
  AgentType,
  { command?: string; url?: string; message?: string }
> = {
  claude: {
    url: "https://docs.claude.com/en/docs/claude-code/setup",
  },
  codex: {
    url: "https://github.com/openai/codex",
  },
  cursor: {
    message: "Coming soon",
  },
  gemini: {
    message: "Coming soon",
  },
};

export function AgentSelector({
  value,
  onChange,
  disabled,
}: AgentSelectorProps) {
  const { data: settings } = useSettings();

  return (
    <div className="space-y-2">
      {agents.map((agent) => {
        const capabilities = settings?.agents[agent.id];
        const isInstalled = capabilities?.installed ?? true; // Default to true if capabilities not loaded
        const isAvailable = agent.status === "available" && isInstalled;
        const isDisabled =
          disabled || agent.status === "coming-soon" || !isInstalled;
        const instructions = installInstructions[agent.id];

        return (
          <button
            key={agent.id}
            type="button"
            onClick={() => {
              if (isAvailable && !disabled) {
                onChange(agent.id);
              }
            }}
            disabled={isDisabled}
            className={cn(
              "flex w-full items-start space-x-3 rounded-lg border p-3 text-left transition-colors",
              // Background color changes when not installed
              !isInstalled && agent.status === "available" && "bg-muted/30",
              (agent.status === "coming-soon" || !isInstalled) &&
                "opacity-50 cursor-not-allowed",
              isAvailable && !disabled && "cursor-pointer hover:bg-accent",
              value === agent.id && isAvailable && "border-primary bg-accent",
              disabled && "cursor-not-allowed opacity-60"
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border",
                value === agent.id && isAvailable
                  ? "border-primary"
                  : "border-input"
              )}
            >
              {value === agent.id && isAvailable && (
                <div className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <AgentIcon agent={agent.id} className="h-4 w-4" />
                <span className="font-medium text-sm">{agent.name}</span>
                {agent.status === "coming-soon" && (
                  <span className="text-xs text-muted-foreground">
                    (Coming Soon)
                  </span>
                )}
                {!isInstalled && agent.status === "available" && (
                  <span className="text-xs text-muted-foreground">
                    (Not Installed)
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {agent.description}
              </p>

              {/* Installation instructions below description */}
              {!isInstalled && agent.status === "available" && (
                <div className="text-xs text-muted-foreground">
                  {instructions.command && (
                    <span>
                      Install:{" "}
                      <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">
                        {instructions.command}
                      </code>
                    </span>
                  )}
                  {instructions.url && (
                    <span>
                      Install:{" "}
                      <a
                        href={instructions.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {instructions.url}
                      </a>
                    </span>
                  )}
                  {instructions.message &&
                    !instructions.command &&
                    !instructions.url && <span>{instructions.message}</span>}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
