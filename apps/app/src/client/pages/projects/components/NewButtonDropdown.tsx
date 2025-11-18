import { Plus, Workflow, MessageSquare } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/client/components/ui/dropdown-menu";
import { useWorkflowDefinitions } from "@/client/pages/projects/workflows/hooks/useWorkflowDefinitions";

export function NewButtonDropdown() {
  const navigate = useNavigate();
  const { projectId, id } = useParams();
  const activeProjectId = projectId || id;

  // Fetch workflow definitions for the active project
  const { data: workflows } = useWorkflowDefinitions(
    activeProjectId || "",
    "active"
  );

  // Sort workflows alphabetically by name
  const sortedWorkflows = workflows
    ? [...workflows].sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="sm">
          <Plus className="size-4" />
          New
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {/* Sessions Section */}
        <DropdownMenuItem
          onClick={() => {
            if (activeProjectId) {
              navigate(`/projects/${activeProjectId}/sessions/new`);
            } else {
              navigate(`/projects`);
            }
          }}
        >
          <MessageSquare className="size-4" />
          New Session
        </DropdownMenuItem>

        {/* Divider */}
        <DropdownMenuSeparator />

        {/* Workflows Section */}
        <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground font-semibold">
          Workflows
        </DropdownMenuLabel>

        {/* List all workflow definitions */}
        {sortedWorkflows.length > 0 ? (
          sortedWorkflows.map((workflow) => (
            <DropdownMenuItem
              key={workflow.id}
              onClick={() => {
                if (activeProjectId) {
                  navigate(
                    `/projects/${activeProjectId}/workflows/${workflow.id}/new`
                  );
                }
              }}
            >
              <Workflow className="size-4 shrink-0" />
              <span className="truncate">New {workflow.name}</span>
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled className="text-muted-foreground">
            No workflows defined
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
