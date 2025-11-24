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
import { FileText, MoreHorizontal, FolderInput, Eye } from "lucide-react";
import { formatDate } from "@/shared/utils/formatDate";
import type { Spec } from "@/shared/types/spec.types";
import { api } from "@/client/utils/api";
import { SpecFileViewer } from "@/client/pages/projects/workflows/components/SpecFileViewer";

interface SpecItemProps {
  spec: Spec;
}

export function SpecItem({ spec }: SpecItemProps) {
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const queryClient = useQueryClient();
  const [hoveredSpecId, setHoveredSpecId] = useState<string | null>(null);
  const [menuOpenSpecId, setMenuOpenSpecId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Extract current folder from specPath (e.g., "done/2511..." → "done")
  const currentFolder = spec.specPath.split("/")[0] as
    | "backlog"
    | "todo"
    | "done";

  const handleClick = () => {
    // Navigate to workflow creation page with spec and name pre-populated
    if (isMobile) {
      setOpenMobile(false);
    }
    navigate(
      `/projects/${spec.projectId}/workflows/new?specFile=${encodeURIComponent(spec.specPath)}&name=${encodeURIComponent(spec.name)}`
    );
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

  // Folder options excluding current folder
  const folderOptions = [
    { label: "Backlog", value: "backlog" as const },
    { label: "To Do", value: "todo" as const },
    { label: "Done", value: "done" as const },
  ].filter((option) => option.value !== currentFolder);

  return (
    <SidebarMenuItem
      onMouseEnter={() => setHoveredSpecId(spec.id)}
      onMouseLeave={() => setHoveredSpecId(null)}
    >
      <SidebarMenuButton
        onClick={handleClick}
        className="h-auto min-h-[28px] px-2 py-1.5 relative"
      >
        <FileText className="size-4 shrink-0 mr-1.5" />
        <div className="flex flex-1 flex-col gap-0 min-w-0">
          <span className="text-sm min-w-0 truncate">{spec.name}</span>
          <span className="text-xs text-muted-foreground pb-0.5 tabular-nums">
            {formatDate(spec.created_at)}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{spec.status}</span>
            <span>•</span>
            <span className="truncate">{spec.spec_type}</span>
          </div>
        </div>
      </SidebarMenuButton>
      {(hoveredSpecId === spec.id || menuOpenSpecId === spec.id) && (
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
            <DropdownMenuItem onClick={() => setViewerOpen(true)}>
              <Eye className="size-4 mr-2" />
              View Spec
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
      {viewerOpen && (
        <SpecFileViewer
          projectId={spec.projectId}
          specPath={spec.specPath}
          specName={spec.name}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </SidebarMenuItem>
  );
}
