import { useState } from "react";
import { MoreVertical, Eye, Edit, Trash } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { Button } from "@/client/components/ui/button";
import { DeleteWebhookDialog } from "./DeleteWebhookDialog";
import { cn } from "@/client/utils/cn";
import type { Webhook } from "../types/webhook.types";

interface WebhookDropdownMenuProps {
  webhook: Webhook;
  projectId: string;
  onDeleteSuccess?: () => void;
  onMenuOpenChange?: (open: boolean) => void;
  triggerClassName?: string;
}

/**
 * Reusable dropdown menu for webhook actions (view, edit, delete)
 * Manages its own state for dialog and menu open/close
 */
export function WebhookDropdownMenu({
  webhook,
  projectId,
  onDeleteSuccess,
  onMenuOpenChange,
  triggerClassName,
}: WebhookDropdownMenuProps) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleMenuOpenChange = (open: boolean) => {
    setIsMenuOpen(open);
    onMenuOpenChange?.(open);
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleMenuOpenChange(false);
    navigate(`/projects/${projectId}/workflows/triggers/${webhook.id}`);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleMenuOpenChange(false);
    navigate(`/projects/${projectId}/workflows/triggers/${webhook.id}/edit`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleMenuOpenChange(false);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    onDeleteSuccess?.();
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu open={isMenuOpen} onOpenChange={handleMenuOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8", triggerClassName)}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleViewDetails}>
            <Eye className="h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} className="text-destructive">
            <Trash className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteWebhookDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        webhook={webhook}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}
