import { useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/client/components/ui/button";
import {
  Home,
  MessageSquare,
  FolderGit,
  Terminal as TerminalIcon,
  ChevronDown,
  Workflow,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/client/components/ui/dropdown-menu";

interface MobileNavDropdownProps {
  projectId: string;
}

export function MobileNavDropdown({ projectId }: MobileNavDropdownProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = useMemo(
    () => [
      { to: `/projects/${projectId}`, label: "Home", icon: Home, end: true },
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
        <DropdownMenuItem onClick={() => navigate(`/projects/${projectId}/workflows/new`)}>
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
  );
}
