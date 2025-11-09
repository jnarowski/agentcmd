import { Plus, Workflow, MessageSquare } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";

export function NewButton() {
  const navigate = useNavigate();
  const { projectId, id } = useParams();
  const activeProjectId = projectId || id;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="sm">
          <Plus className="size-4" />
          New
        </Button>
      </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={() => {
              if (activeProjectId) {
                navigate(`/projects/${activeProjectId}/workflows`);
              } else {
                // If no active project, navigate to projects page
                navigate(`/projects`);
              }
            }}
          >
            <Workflow className="size-4" />
            New Workflow
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              if (activeProjectId) {
                navigate(`/projects/${activeProjectId}/sessions/new`);
              } else {
                // If no active project, navigate to projects page
                navigate(`/projects`);
              }
            }}
          >
            <MessageSquare className="size-4" />
            New Session
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
  );
}
