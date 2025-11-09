import { useNavigate } from "react-router-dom";
import {
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/client/components/ui/sidebar";
import { Badge } from "@/client/components/ui/badge";

interface WorkflowItemProps {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  status: string;
}

export function WorkflowItem({
  id,
  name,
  projectId,
  projectName,
  status,
}: WorkflowItemProps) {
  const navigate = useNavigate();

  const handleActivityClick = () => {
    navigate(`/projects/${projectId}/workflows/${id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20";
      case "completed":
        return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      case "failed":
        return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
    }
  };

  return (
    <SidebarMenuItem key={id}>
      <SidebarMenuButton
        onClick={handleActivityClick}
        className="h-auto min-h-[28px] px-2 py-1"
      >
        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
          <span className="text-sm min-w-0">{name}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge
              variant="secondary"
              className={`h-4 px-1.5 text-[10px] w-12 shrink-0 justify-center ${getStatusColor(status)}`}
            >
              {status}
            </Badge>
            <Badge
              variant="secondary"
              className="h-4 px-1.5 text-[10px] bg-muted/50 text-muted-foreground hover:bg-muted/50 truncate"
            >
              {projectName}
            </Badge>
          </div>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
