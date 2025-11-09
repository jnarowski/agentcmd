"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Folder,
  MessageSquare,
  Terminal,
  FileText,
  Search,
  Plus,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/client/components/ui/command";
import { useProjects } from "@/client/pages/projects/hooks/useProjects";
import { useSessions } from "@/client/pages/projects/sessions/hooks/useAgentSessions";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { ProjectDialog } from "@/client/pages/projects/components/ProjectDialog";
import { useSidebar } from "@/client/components/ui/sidebar";
import { getSessionDisplayName } from "@/client/utils/getSessionDisplayName";

interface CommandMenuProps {
  onSearchChange?: (query: string) => void;
}

export function CommandMenu({ onSearchChange }: CommandMenuProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: sessions = [] } = useSessions({ limit: 10, orderBy: 'updated_at', order: 'desc' });
  const { isMobile } = useSidebar();

  const handleProjectCreated = (projectId: string) => {
    setProjectDialogOpen(false);
    navigate(`/projects/${projectId}`);
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onSearchChange?.(value);
  };

  // Filter out hidden projects, separate starred and non-starred, sort alphabetically
  const { starredProjects, regularProjects } = [...projects]
    .filter((project) => !project.is_hidden)
    .reduce<{
      starredProjects: typeof projects;
      regularProjects: typeof projects;
    }>(
      (acc, project) => {
        if (project.is_starred) {
          acc.starredProjects.push(project);
        } else {
          acc.regularProjects.push(project);
        }
        return acc;
      },
      { starredProjects: [], regularProjects: [] }
    );

  // Sort each group alphabetically
  starredProjects.sort((a, b) => a.name.localeCompare(b.name));
  regularProjects.sort((a, b) => a.name.localeCompare(b.name));

  // Combine: starred first, then regular
  const sortedProjects = [...starredProjects, ...regularProjects];

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search projects..."
            className="pl-9 pr-16"
            autoFocus={!isMobile}
          />
          <button
            onClick={() => setOpen(true)}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>J
            </kbd>
          </button>
        </div>
        <Button
          variant="default"
          size="sm"
          className="h-9 w-9 p-0 shrink-0"
          onClick={() => setProjectDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search projects and sessions..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {projectsLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : (
            sortedProjects.map((project, index) => (
              <>
                <ProjectGroup
                  key={project.id}
                  project={project}
                  sessions={sessions.filter(s => s.projectId === project.id)}
                  onNavigate={handleNavigate}
                />
                {index < sortedProjects.length - 1 && <CommandSeparator />}
              </>
            ))
          )}
        </CommandList>
      </CommandDialog>
      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onProjectCreated={handleProjectCreated}
      />
    </>
  );
}

interface ProjectGroupProps {
  project: {
    id: string;
    name: string;
    path: string;
  };
  sessions: Array<{
    id: string;
    metadata: {
      lastMessageAt: string;
      firstMessagePreview: string;
    };
  }>;
  onNavigate: (path: string) => void;
}

function ProjectGroup({ project, sessions, onNavigate }: ProjectGroupProps) {
  // Get the 3 most recent sessions, sorted by lastMessageAt
  const recentSessions = [...sessions]
    .sort((a, b) => {
      const dateA = new Date(a.metadata.lastMessageAt).getTime();
      const dateB = new Date(b.metadata.lastMessageAt).getTime();
      return dateB - dateA; // Most recent first
    })
    .slice(0, 3);

  return (
    <CommandGroup heading={project.name}>
      <CommandItem
        onSelect={() => onNavigate(`/projects/${project.id}`)}
        className="font-medium"
      >
        <Folder className="mr-2 h-4 w-4" />
        <span>{project.name}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(`/projects/${project.id}/sessions/new`);
            }}
          >
            <MessageSquare className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(`/projects/${project.id}/shell`);
            }}
          >
            <Terminal className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(`/projects/${project.id}/files`);
            }}
          >
            <FileText className="h-3 w-3" />
          </Button>
        </div>
      </CommandItem>
      {recentSessions.map((session) => (
        <CommandItem
          key={session.id}
          onSelect={() =>
            onNavigate(`/projects/${project.id}/sessions/${session.id}`)
          }
          className="pl-6"
          keywords={[session.metadata.firstMessagePreview || ""]}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          <span className="truncate">
            {getSessionDisplayName(session)}
          </span>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
