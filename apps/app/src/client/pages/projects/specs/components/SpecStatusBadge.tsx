import { Badge } from "@/client/components/ui/badge";

export type SpecStatus =
  | "draft"
  | "in-progress"
  | "review"
  | "completed"
  | "backlog";

interface StatusConfig {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
}

const statusConfig: Record<SpecStatus, StatusConfig> = {
  draft: { label: "Draft", variant: "secondary" },
  "in-progress": { label: "In Progress", variant: "default" },
  review: { label: "Review", variant: "outline" },
  completed: { label: "Completed", variant: "outline" },
  backlog: { label: "Backlog", variant: "secondary" },
};

interface SpecStatusBadgeProps {
  status: SpecStatus;
  size?: "sm" | "md";
}

export function SpecStatusBadge({ status, size = "md" }: SpecStatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge
      variant={config.variant}
      className={size === "sm" ? "text-xs" : undefined}
    >
      {config.label}
    </Badge>
  );
}
