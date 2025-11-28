import { Link } from "react-router-dom";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/client/components/ui/sidebar";
import { getWorkflowStatusConfig } from "@/client/pages/projects/workflows/utils/workflowStatus";
import type { WorkflowStatus } from "@/shared/schemas/workflow.schemas";
import { formatDate } from "@/shared/utils/formatDate";
import { useNavigationStore } from "@/client/stores";

interface WorkflowItemProps {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  status: WorkflowStatus;
  workflowDefinitionId: string;
  createdAt: Date;
  isActive?: boolean;
}

export function WorkflowItem({
  id,
  name,
  projectId,
  projectName,
  status,
  workflowDefinitionId,
  createdAt,
  isActive = false,
}: WorkflowItemProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const activeProjectId = useNavigationStore((s) => s.activeProjectId);

  const statusConfig = getWorkflowStatusConfig(status);
  const StatusIcon = statusConfig.icon;
  const timeAgo = formatDate(createdAt);

  return (
    <SidebarMenuItem key={id}>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className="h-auto min-h-[28px] px-2 py-1.5"
      >
        <Link
          to={`/projects/${projectId}/workflows/${workflowDefinitionId}/runs/${id}`}
          onClick={() => {
            if (isMobile) {
              setOpenMobile(false);
            }
          }}
        >
          <StatusIcon
            className={`size-4 shrink-0 mr-1.5 ${statusConfig.textColor} ${status === "running" ? "animate-spin" : ""}`}
          />
          <div className="flex flex-1 flex-col gap-0 min-w-0">
            <span className="text-sm min-w-0 truncate">{name}</span>
            {!activeProjectId && (
              <div className="mb-1 text-xs text-muted-foreground/70 truncate">
                {projectName}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground pb-0.5 tabular-nums">
                {timeAgo}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{status}</span>
            </div>
          </div>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
