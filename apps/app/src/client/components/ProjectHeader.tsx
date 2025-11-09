import { useMemo, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/client/components/ui/button";
import {
  Home,
  MessageSquare,
  Terminal as TerminalIcon,
  FolderGit,
  ChevronDown,
  GitBranch,
  ChevronRight,
  Workflow,
} from "lucide-react";
import { Separator } from "@/client/components/ui/separator";
import { SidebarTrigger } from "@/client/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/client/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import type { SessionResponse } from "@/shared/types";
import type { GitCapabilities } from "@/shared/types/project.types";
import { SessionHeader } from "@/client/components/SessionHeader";
import { GitOperationsModal } from "@/client/components/GitOperationsModal";
import { NewButton } from "@/client/components/sidebar/NewButton";
import { truncate } from "@/client/utils/truncate";

interface ProjectHeaderProps {
  projectId: string;
  projectName: string;
  projectPath: string;
  gitCapabilities: GitCapabilities;
  currentSession?: SessionResponse | null;
  showSidebarTrigger?: boolean;
  sidebarTriggerAlwaysVisible?: boolean; // When true, shows on all screen sizes
}

export function ProjectHeader({ projectId, projectName, projectPath, gitCapabilities, currentSession, showSidebarTrigger = true, sidebarTriggerAlwaysVisible = false }: ProjectHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [gitModalOpen, setGitModalOpen] = useState(false);

  // Define navigation items
  const navItems = useMemo(
    () => [
      { to: `/projects/${projectId}`, label: "Home", icon: Home, end: true },
      {
        to: `/projects/${projectId}/sessions/new`,
        label: "Session",
        icon: MessageSquare,
      },
      {
        to: `/projects/${projectId}/workflows`,
        label: "Workflows",
        icon: Workflow,
      },
      {
        to: `/projects/${projectId}/source/files`,
        label: "Source",
        icon: FolderGit,
      },
      {
        to: `/projects/${projectId}/shell`,
        label: "Shell",
        icon: TerminalIcon,
      },
    ],
    [projectId]
  );

  // Get current active nav item
  const activeNavItem = useMemo(() => {
    return (
      navItems.find((item) => {
        if (item.end) {
          return location.pathname === item.to;
        }
        return location.pathname.startsWith(item.to);
      }) || navItems[0]
    );
  }, [location.pathname, navItems]);

  return (
    <>
      <div className="flex items-center justify-between border-b px-4 md:px-6 py-3">
        <div className="flex items-center gap-2 min-w-0">
          {showSidebarTrigger && (
            <>
              <SidebarTrigger className={sidebarTriggerAlwaysVisible ? "shrink-0" : "md:hidden shrink-0"} />
              <Separator orientation="vertical" className={sidebarTriggerAlwaysVisible ? "h-4 shrink-0" : "md:hidden h-4 shrink-0"} />
            </>
          )}
          <div className="flex flex-col gap-1 min-w-0">
            <button
              onClick={() => navigate(`/projects/${projectId}`)}
              className="text-base font-medium truncate hover:text-primary transition-colors text-left"
            >
              {projectName}
            </button>
            {gitCapabilities.initialized ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setGitModalOpen(true)}
                      disabled={!gitCapabilities.initialized}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      title={gitCapabilities.error || "Git operations"}
                    >
                      <GitBranch className="h-3 w-3" />
                      <span>{truncate(gitCapabilities.branch || 'No branch', 30)}</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-mono text-xs">{gitCapabilities.branch || 'No branch'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground opacity-50">
                <GitBranch className="h-3 w-3" />
                <span className="truncate">Not a git repo</span>
              </div>
            )}
          </div>
        </div>

        {/* Desktop navigation - tabs */}
        <div className="hidden lg:flex items-center gap-2">
          <nav className="flex gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/50"
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <NewButton />
        </div>

        {/* Mobile navigation - dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="lg:hidden">
            <Button variant="outline" size="sm" className="gap-1">
              <activeNavItem.icon className="h-4 w-4" />
              <span className="hidden md:inline">{activeNavItem.label}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}/sessions/new`)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              New Session
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}/workflows`)}>
              <Workflow className="h-4 w-4 mr-2" />
              New Workflow
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item === activeNavItem;
              return (
                <DropdownMenuItem
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className={isActive ? "bg-secondary" : ""}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Session header - separate component below main header */}
      {currentSession && <SessionHeader session={currentSession} />}

      {/* Git Operations Modal */}
      <GitOperationsModal
        open={gitModalOpen}
        onOpenChange={setGitModalOpen}
        projectPath={projectPath}
        currentBranch={gitCapabilities.branch || undefined}
      />
    </>
  );
}
