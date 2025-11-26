import { useState } from "react";
import { MoreHorizontal, Pencil, FileJson, Archive, ArchiveRestore, Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { Kbd } from "@/client/components/ui/kbd";
import { SessionDialog } from "./SessionDialog";
import { SessionFileViewer } from "./SessionFileViewer";
import { useSessionStore, type SessionSummary, selectActiveSession } from "@/client/pages/projects/sessions/stores/sessionStore";
import { cn } from "@/client/utils/cn";
import { toast } from "sonner";
import { copySessionToClipboard } from "@/client/pages/projects/sessions/utils/copySessionToClipboard";
import { useDropdownMenuHotkeys, type HotkeyAction } from "@/client/hooks/useDropdownMenuHotkeys";

interface SessionDropdownMenuProps {
  session: SessionSummary;
  onEditSuccess?: () => void;
  onMenuOpenChange?: (open: boolean) => void;
  triggerClassName?: string;
}

/**
 * Reusable dropdown menu for session actions (rename, etc.)
 * Manages its own state for dialog and menu open/close
 */
export function SessionDropdownMenu({
  session,
  onEditSuccess,
  onMenuOpenChange,
  triggerClassName,
}: SessionDropdownMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [fileViewerOpen, setFileViewerOpen] = useState(false);
  const updateSession = useSessionStore((s) => s.updateSession);
  const archiveSession = useSessionStore((s) => s.archiveSession);
  const unarchiveSession = useSessionStore((s) => s.unarchiveSession);
  const currentSession = useSessionStore(selectActiveSession);
  const sessionData = currentSession?.id === session.id ? currentSession : null;

  const handleMenuOpenChange = (open: boolean) => {
    setIsMenuOpen(open);
    onMenuOpenChange?.(open);
  };

  const handleEdit = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    handleMenuOpenChange(false);
    setEditDialogOpen(true);
  };

  const handleViewFile = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    handleMenuOpenChange(false);
    setFileViewerOpen(true);
  };

  const handleArchive = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    handleMenuOpenChange(false);
    try {
      await archiveSession(session.id);
      toast.success("Session archived");
    } catch (error) {
      toast.error("Failed to archive session");
      console.error("[SessionDropdownMenu] Archive error:", error);
    }
  };

  const handleUnarchive = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    handleMenuOpenChange(false);
    try {
      await unarchiveSession(session.id);
      toast.success("Session unarchived");
    } catch (error) {
      toast.error("Failed to unarchive session");
      console.error("[SessionDropdownMenu] Unarchive error:", error);
    }
  };

  const handleUpdateSession = async (sessionId: string, name: string) => {
    try {
      await updateSession(sessionId, { name });
      toast.success("Session updated");
      onEditSuccess?.();
    } catch (error) {
      toast.error("Failed to update session");
      console.error("[SessionDropdownMenu] Update error:", error);
    }
  };

  const handleCopySession = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    handleMenuOpenChange(false);
    try {
      const sessionState = {
        session: sessionData || null,
        sessionId: session.id,
      };
      await copySessionToClipboard(sessionState);
      toast.success("Session JSON copied to clipboard", {
        description: "Full session data including messages and metadata",
      });
    } catch (error) {
      console.error("[SessionDropdownMenu] Failed to copy session:", error);
      toast.error("Failed to copy session", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Define hotkey actions
  const hotkeyActions: HotkeyAction[] = [
    { key: "e", handler: handleEdit },
    { key: "v", handler: handleViewFile, enabled: !!session.session_path },
    { key: "c", handler: handleCopySession },
    { key: "a", handler: session.is_archived ? handleUnarchive : handleArchive },
  ];

  // Enable hotkeys when menu is open
  useDropdownMenuHotkeys(isMenuOpen, hotkeyActions);

  return (
    <>
      <DropdownMenu open={isMenuOpen} onOpenChange={handleMenuOpenChange}>
        <DropdownMenuTrigger
          className={cn(
            "h-6 w-6 flex items-center justify-center rounded-md transition-colors",
            "bg-background/95 backdrop-blur-sm hover:bg-accent",
            "border border-border/50",
            "focus:outline-none focus:ring-2 focus:ring-primary",
            triggerClassName
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-50">
          <DropdownMenuItem onClick={handleEdit}>
            <Pencil className="h-4 w-4" />
            <span>Edit</span>
            <Kbd className="ml-auto">E</Kbd>
          </DropdownMenuItem>
          {session.session_path && (
            <DropdownMenuItem onClick={handleViewFile}>
              <FileJson className="h-4 w-4" />
              <span>View Session File</span>
              <Kbd className="ml-auto">V</Kbd>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={handleCopySession}>
            <Copy className="h-4 w-4" />
            <span>Copy Session JSON</span>
            <Kbd className="ml-auto">C</Kbd>
          </DropdownMenuItem>
          {session.is_archived ? (
            <DropdownMenuItem onClick={handleUnarchive}>
              <ArchiveRestore className="h-4 w-4" />
              <span>Unarchive</span>
              <Kbd className="ml-auto">A</Kbd>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={handleArchive}>
              <Archive className="h-4 w-4" />
              <span>Archive</span>
              <Kbd className="ml-auto">A</Kbd>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <SessionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        session={session}
        onUpdateSession={handleUpdateSession}
      />

      <SessionFileViewer
        open={fileViewerOpen}
        onOpenChange={setFileViewerOpen}
        sessionId={session.id}
      />
    </>
  );
}
