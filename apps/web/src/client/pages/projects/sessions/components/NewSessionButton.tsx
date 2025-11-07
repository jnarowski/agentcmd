import { useNavigate } from "react-router-dom";
import { Button } from "@/client/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "@/client/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import { Plus, ChevronDown } from "lucide-react";
import { useSidebar } from "@/client/components/ui/sidebar";
import { AgentIcon } from "@/client/components/AgentIcon";
import type { AgentType } from "@/shared/types/agent.types";
import { useSessionStore } from "@/client/pages/projects/sessions/stores/sessionStore";
import { useSettings } from "@/client/hooks/useSettings";
import { useMemo } from "react";

interface NewSessionButtonProps {
  projectId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

const allAgents: Array<{
  id: AgentType;
  name: string;
}> = [
  { id: 'claude', name: 'Claude Code' },
  { id: 'codex', name: 'OpenAI Codex' },
];

export function NewSessionButton({
  projectId,
  variant = "default",
  size = "default",
  className,
}: NewSessionButtonProps) {
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const setAgent = useSessionStore((s) => s.setAgent);
  const { data: settings } = useSettings();

  // Filter to only installed agents
  const installedAgents = useMemo(() => {
    if (!settings) return allAgents; // Default to showing all if settings not loaded
    return allAgents.filter((agent) => {
      const capabilities = settings.agents[agent.id];
      return capabilities?.installed ?? false;
    });
  }, [settings]);

  const handleCreateSession = (agent: AgentType) => {
    // Set agent in store, then navigate
    setAgent(agent);

    // Preserve current query parameters when navigating
    const currentParams = new URLSearchParams(window.location.search);
    const queryString = currentParams.toString();
    const path = `/projects/${projectId}/session/new${queryString ? `?${queryString}` : ''}`;

    navigate(path);
    // Close mobile menu when creating a new session
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // No agents installed - show disabled button with tooltip
  if (installedAgents.length === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              disabled
              variant={variant}
              size={isMobile ? "lg" : size}
              className={className || "w-full"}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Session
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>No agents installed</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Single agent installed - show simple button (no split button)
  if (installedAgents.length === 1) {
    const agent = installedAgents[0];
    return (
      <Button
        onClick={() => handleCreateSession(agent.id)}
        variant={variant}
        size={isMobile ? "lg" : size}
        className={className || "w-full"}
      >
        <Plus className="h-4 w-4 mr-2" />
        New Session
      </Button>
    );
  }

  // Multiple agents installed - show split button with dropdown
  const defaultAgent = installedAgents[0];

  return (
    <ButtonGroup className={className || "w-full"}>
      <Button
        onClick={() => handleCreateSession(defaultAgent.id)}
        variant={variant}
        size={isMobile ? "lg" : size}
        className="flex-1 rounded-r-none"
      >
        <Plus className="h-4 w-4 mr-2" />
        New Session
      </Button>

      <ButtonGroupSeparator />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={isMobile ? "lg" : size}
            className="px-2 rounded-l-none"
          >
            <ChevronDown className="h-4 w-4" />
            <span className="sr-only">More agents</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {installedAgents.map((agent) => (
            <DropdownMenuItem
              key={agent.id}
              onClick={() => handleCreateSession(agent.id)}
            >
              <AgentIcon agent={agent.id} className="h-4 w-4" />
              <span>{agent.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
}
