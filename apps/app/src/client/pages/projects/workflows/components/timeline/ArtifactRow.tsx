import { FileText, Download } from "lucide-react";
import type { WorkflowArtifact } from "@/client/pages/projects/workflows/types";
import { formatFileSize } from "@/client/pages/projects/workflows/utils/workflowFormatting";
import { TimelineRow } from "./TimelineRow";
import { TimelineItemHeader } from "./TimelineItemHeader";
import { formatDate } from "@/shared/utils/formatDate";

interface ArtifactRowProps {
  artifact: WorkflowArtifact;
}

export function ArtifactRow({ artifact }: ArtifactRowProps) {
  const handleDownload = () => {
    window.open(`/api/artifacts/${artifact.id}/download`, "_blank");
  };

  return (
    <TimelineRow
      icon={<FileText className="h-5 w-5 text-amber-500" />}
      tooltipLabel="Artifact"
      rightContent={
        <button
          onClick={handleDownload}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
          aria-label={`Download ${artifact.name}`}
        >
          <Download className="h-3 w-3" />
        </button>
      }
    >
      <TimelineItemHeader
        title={`Artifact: ${artifact.name}`}
        date={formatDate(artifact.created_at)}
        id={artifact.id}
      />

      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
        <span>{artifact.file_type}</span>
        <span>{formatFileSize(artifact.size_bytes)}</span>
      </div>
    </TimelineRow>
  );
}
