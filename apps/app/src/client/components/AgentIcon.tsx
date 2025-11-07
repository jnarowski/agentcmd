import type { AgentType } from "@/shared/types/agent.types";
import { cn } from "@/client/utils/cn";
import { useTheme } from "next-themes";
import claudeSvg from "@/client/assets/icons/agents/claude.svg";
import codexSvg from "@/client/assets/icons/agents/codex.svg";
import codexWhiteSvg from "@/client/assets/icons/agents/codex-white.svg";
import geminiSvg from "@/client/assets/icons/agents/gemini.svg";
import cursorSvg from "@/client/assets/icons/agents/cursor.svg";

interface AgentIconProps {
  agent: AgentType;
  className?: string;
}

const ClaudeIcon = ({ className }: { className?: string }) => (
  <img src={claudeSvg} alt="Claude" className={className} />
);

const CodexIcon = ({ className }: { className?: string }) => {
  const { resolvedTheme, theme } = useTheme();

  // Use resolvedTheme if available, fallback to checking theme or system preference
  const isDark =
    resolvedTheme === "dark" ||
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Using CSS filter to invert colors: brightness(0) makes it black, invert(1) makes it white
  return (
    <img
      src={isDark ? codexWhiteSvg : codexSvg}
      alt="Codex"
      className={className}
    />
  );
};

const GeminiIcon = ({ className }: { className?: string }) => (
  <img src={geminiSvg} alt="Gemini" className={className} />
);

const CursorIcon = ({ className }: { className?: string }) => (
  <img src={cursorSvg} alt="Cursor" className={className} />
);

/**
 * Displays the appropriate icon for each AI agent type
 */
export function AgentIcon({ agent, className }: AgentIconProps) {
  const iconMap: Record<
    AgentType,
    React.ComponentType<{ className?: string }>
  > = {
    claude: ClaudeIcon,
    codex: CodexIcon,
    gemini: GeminiIcon,
    cursor: CursorIcon,
  };

  const Icon = iconMap[agent];

  return <Icon className={cn("shrink-0", className)} />;
}
