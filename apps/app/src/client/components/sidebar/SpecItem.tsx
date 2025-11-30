import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/client/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { FileText, MoreHorizontal, FolderInput, MessageSquarePlus, Play } from "lucide-react";
import { formatDate } from "@/shared/utils/formatDate";
import type { Spec } from "@/shared/types/spec.types";
import { api } from "@/client/utils/api";
import { useNavigationStore } from "@/client/stores";
import { useTouchDevice } from "@/client/hooks/useTouchDevice";

interface SpecItemProps {
  spec: Spec;
  projectName: string;
}

export function SpecItem({ spec, projectName }: SpecItemProps) {
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const isTouchDevice = useTouchDevice();
  const queryClient = useQueryClient();
  const activeProjectId = useNavigationStore((s) => s.activeProjectId);
  const [hoveredSpecId, setHoveredSpecId] = useState<string | null>(null);
  const [menuOpenSpecId, setMenuOpenSpecId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  // Extract current folder from specPath (e.g., "done/2511..." → "done")
  const currentFolder = spec.specPath.split("/")[0] as
    | "backlog"
    | "todo"
    | "done";

  const handleClick = () => {
    // Navigate to spec preview page
    if (isMobile) {
      setOpenMobile(false);
    }
    navigate(`/projects/${spec.projectId}/specs/${spec.id}`);
  };

  const handleMoveSpec = async (
    targetFolder: "backlog" | "todo" | "done",
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    if (isMoving) return;

    setIsMoving(true);

    try {
      await api.post(
        `/api/projects/${spec.projectId}/specs/${spec.id}/move`,
        { targetFolder }
      );

      // Invalidate specs query to refetch
      queryClient.invalidateQueries({ queryKey: ["specs"] });

      toast.success(`Spec moved to ${targetFolder}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to move spec";
      toast.error(message);
    } finally {
      setIsMoving(false);
      setMenuOpenSpecId(null);
    }
  };

  const handleNewFollowupSession = (e: React.MouseEvent) => {
    e.stopPropagation();
    const message = `Read @${spec.specPath} and related context.`;
    const encoded = encodeURIComponent(message);
    navigate(`/projects/${spec.projectId}/sessions/new?initialMessage=${encoded}`);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleImplement = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/projects/${spec.projectId}/workflows/new?specFile=${encodeURIComponent(spec.specPath)}`);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Folder options excluding current folder
  const folderOptions = [
    { label: "Backlog", value: "backlog" as const },
    { label: "To Do", value: "todo" as const },
    { label: "Done", value: "done" as const },
  ].filter((option) => option.value !== currentFolder);

  return (
    <SidebarMenuItem
      onMouseEnter={() => !isTouchDevice && setHoveredSpecId(spec.id)}
      onMouseLeave={() => !isTouchDevice && setHoveredSpecId(null)}
    >
      <SidebarMenuButton
        onClick={handleClick}
        className="h-auto min-h-[28px] px-2 py-1.5 relative"
      >
        <FileText className="size-4 shrink-0 mr-1.5" />
        <div className="flex flex-1 flex-col gap-0 min-w-0">
          <span className="text-sm min-w-0 truncate">{spec.name}</span>
          {!activeProjectId && (
            <div className="mb-1 text-xs text-muted-foreground/70 truncate">
              {projectName}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground pb-0.5 tabular-nums">
              {formatDate(spec.created_at)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{spec.status}</span>
            <span>•</span>
            <span className="truncate">{spec.spec_type}</span>
          </div>
          {spec.totalComplexity !== undefined && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
              <span>{spec.totalComplexity} pts</span>
              <span>•</span>
              <span>{spec.phaseCount} phases</span>
              <span>•</span>
              <span>{spec.taskCount} tasks</span>
            </div>
          )}
        </div>
      </SidebarMenuButton>
      {!isTouchDevice && (hoveredSpecId === spec.id || menuOpenSpecId === spec.id) && (
        <DropdownMenu
          onOpenChange={(open) => setMenuOpenSpecId(open ? spec.id : null)}
        >
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-accent rounded-sm flex items-center justify-center data-[state=open]:bg-accent"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleImplement}>
              <Play className="size-4 mr-2" />
              Implement
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleNewFollowupSession}>
              <MessageSquarePlus className="size-4 mr-2" />
              New Followup Session
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderInput className="size-4 mr-2" />
                Move to...
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {folderOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={(e) => handleMoveSpec(option.value, e)}
                    disabled={isMoving}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </SidebarMenuItem>
  );
}
