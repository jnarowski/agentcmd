import { useNavigate } from 'react-router-dom';
import { AgentSelector } from '@/client/components/AgentSelector';
import { BaseDialog } from '@/client/components/BaseDialog';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/client/components/ui/dialog';
import { Button } from '@/client/components/ui/button';
import { useSessionStore } from '@/client/pages/projects/sessions/stores/sessionStore';

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function NewSessionDialog({
  open,
  onOpenChange,
  projectId,
}: NewSessionDialogProps) {
  const navigate = useNavigate();
  const agent = useSessionStore((s) => s.form.agent);
  const setAgent = useSessionStore((s) => s.setAgent);

  const handleCreate = () => {
    // Navigate to new session page (agent already in store)
    // Preserve current query parameters when navigating
    const currentParams = new URLSearchParams(window.location.search);
    const queryString = currentParams.toString();
    const path = `/projects/${projectId}/sessions/new${queryString ? `?${queryString}` : ''}`;

    navigate(path);
    onOpenChange(false);
  };

  return (
    <BaseDialog
      open={open}
      onOpenChange={onOpenChange}
      contentProps={{ className: "sm:max-w-[525px]" }}
    >
      <DialogHeader>
        <DialogTitle>Create New Session</DialogTitle>
        <DialogDescription>
          Choose an AI agent to start a new coding session. Each agent has
          different capabilities and strengths.
        </DialogDescription>
      </DialogHeader>

      <div className="py-4">
        <AgentSelector
          value={agent}
          onChange={setAgent}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleCreate}>
          Create Session
        </Button>
      </DialogFooter>
    </BaseDialog>
  );
}
