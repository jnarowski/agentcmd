import { useMemo, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/client/components/ui/button";
import {
  Home,
  MessageSquare,
  Terminal as TerminalIcon,
  FileText,
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
} from "@/client/components/ui/dropdown-menu";
import { Badge } from "@/client/components/ui/badge";
import type { SessionResponse } from "@/shared/types";
import { SessionHeader } from "@/client/components/SessionHeader";
import { GitOperationsModal } from "@/client/components/GitOperationsModal";
import { useWorkflowRuns } from "@/client/pages/projects/workflows/hooks/useWorkflowRuns";

interface ProjectHeaderProps {
  projectId: string;
  projectName: string;
  projectPath: string;
  currentBranch?: string;
  currentSession?: SessionResponse | null;
  showSidebarTrigger?: boolean;
  sidebarTriggerAlwaysVisible?: boolean; // When true, shows on all screen sizes
}

export function ProjectHeader({ projectId, projectName, projectPath, currentBranch, currentSession, showSidebarTrigger = true, sidebarTriggerAlwaysVisible = false }: ProjectHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [gitModalOpen, setGitModalOpen] = useState(false);

  // Fetch running workflow count for badge
  const { data: runs } = useWorkflowRuns(projectId, { status: 'running' });
  const runningCount = runs?.length || 0;

  // Define navigation items
  const navItems = useMemo(
    () => [
      { to: `/projects/${projectId}`, label: "Home", icon: Home, end: true },
      {
        to: `/projects/${projectId}/session/new`,
        label: "Session",
        icon: MessageSquare,
      },
      {
        to: `/projects/${projectId}/shell`,
        label: "Shell",
        icon: TerminalIcon,
      },
      { to: `/projects/${projectId}/files`, label: "Files", icon: FileText },
      {
        to: `/projects/${projectId}/source-control`,
        label: "Git",
        icon: GitBranch,
      },
      {
        to: `/projects/${projectId}/workflows`,
        label: "Workflows",
        icon: Workflow,
        badge: runningCount,
      },
    ],
    [projectId, runningCount]
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
            <div className="text-base font-medium truncate">{projectName}</div>
            {currentBranch && (
              <button
                onClick={() => setGitModalOpen(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Git operations"
              >
                <GitBranch className="h-3 w-3" />
                <span className="truncate">{currentBranch}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Desktop navigation - tabs */}
        <nav className="hidden md:flex gap-2">
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
              {item.badge && item.badge > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {item.badge}
                </Badge>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Mobile navigation - dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="md:hidden">
            <Button variant="outline" size="sm" className="gap-1">
              <activeNavItem.icon className="h-4 w-4" />
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
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
                  {item.badge && item.badge > 0 && (
                    <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-xs">
                      {item.badge}
                    </Badge>
                  )}
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
        currentBranch={currentBranch}
      />
    </>
  );
}
