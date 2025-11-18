import { useNavigate } from "react-router-dom";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/client/components/ui/sidebar";
import { FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Spec } from "@/shared/types/spec.types";

interface SpecItemProps {
  spec: Spec;
}

export function SpecItem({ spec }: SpecItemProps) {
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleClick = () => {
    // Navigate to workflow creation page with spec and name pre-populated
    if (isMobile) {
      setOpenMobile(false);
    }
    navigate(
      `/projects/${spec.projectId}/workflows/new?specFile=${encodeURIComponent(spec.specPath)}&name=${encodeURIComponent(spec.name)}`
    );
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={handleClick}
        className="h-auto min-h-[28px] px-2 py-1.5"
      >
        <FileText className="size-4 shrink-0 mr-1.5" />
        <div className="flex flex-1 flex-col gap-0 min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-sm min-w-0 truncate">{spec.name}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(spec.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{spec.status}</span>
            <span>•</span>
            <span className="truncate">{spec.spec_type}</span>
          </div>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
