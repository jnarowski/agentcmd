import { Plus, Workflow, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { useProjectId } from "@/client/hooks/useProjectId";

export function NewButtonDropdown() {
  const navigate = useNavigate();
  const projectId = useProjectId();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="sm">
          <Plus className="size-4" />
          New
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => navigate(`/projects/${projectId}/sessions/new`)}
        >
          <MessageSquare className="size-4" />
          New Session
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate(`/projects/${projectId}/workflows/new`)}
        >
          <Workflow className="size-4" />
          New Workflow
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
