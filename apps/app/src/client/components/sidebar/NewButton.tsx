import { Plus, Workflow, MessageSquare } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { NewSessionButton } from "@/client/pages/projects/sessions/components/NewSessionButton";
import { useState } from "react";

export function NewButton() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [showSessionButton, setShowSessionButton] = useState(false);

  // If we need to show the NewSessionButton and we have a projectId, render it
  if (showSessionButton && projectId) {
    return (
      <NewSessionButton
        projectId={projectId}
        variant="default"
        size="sm"
        className="h-6 text-xs"
      />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="sm" className="h-6 text-xs px-2">
          <Plus className="size-3" />
          New
        </Button>
      </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={() => {
              if (projectId) {
                navigate(`/projects/${projectId}/workflows`);
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
              if (projectId) {
                setShowSessionButton(true);
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
