import { FileText, Download } from "lucide-react";
import type { WorkflowArtifact } from "@/client/pages/projects/workflows/types";
import { formatFileSize } from "@/client/pages/projects/workflows/utils/workflowFormatting";

interface ArtifactRowProps {
  artifact: WorkflowArtifact;
}

export function ArtifactRow({ artifact }: ArtifactRowProps) {
  const handleDownload = () => {
    window.open(`/api/artifacts/${artifact.id}/download`, "_blank");
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-amber-500/10 transition-colors group">
      {/* Icon */}
      <FileText className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />

      {/* Artifact Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate" title={artifact.name}>
            {artifact.name}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            [ARTIFACT: {artifact.id}]
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
          <span>{artifact.file_type}</span>
          <span>{formatFileSize(artifact.size_bytes)}</span>
        </div>

        <div className="text-xs text-muted-foreground mt-1">
          {new Date(artifact.created_at).toLocaleString()}
        </div>
      </div>

      {/* Right side: Download and Badge */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleDownload}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
          aria-label={`Download ${artifact.name}`}
        >
          <Download className="h-3 w-3" />
        </button>
        <span className="px-2 py-1 text-xs font-medium rounded bg-background/50 text-muted-foreground">
          Artifact
        </span>
      </div>
    </div>
  );
}
