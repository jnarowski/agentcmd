import type { WorkflowArtifact } from '../types';
import { formatFileSize, formatRelativeTime, getFileIcon } from '../utils/workflowFormatting';
import { Download } from 'lucide-react';

export interface WorkflowArtifactCardProps {
  artifact: WorkflowArtifact;
  onDownload?: () => void;
}

export function WorkflowArtifactCard({
  artifact,
  onDownload,
}: WorkflowArtifactCardProps) {
  const fileIcon = getFileIcon(artifact.name, artifact.mime_type);
  const isImage = artifact.mime_type.startsWith('image/');

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Default download behavior
      window.open(`/api/artifacts/${artifact.id}/download`, '_blank');
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card transition-all hover:shadow-md">
      {/* Image preview */}
      {isImage && artifact.file_path && (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img
            src={artifact.file_path}
            alt={artifact.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* File icon for non-images */}
      {!isImage && (
        <div className="flex aspect-video w-full items-center justify-center bg-muted">
          <span className="text-6xl">{fileIcon}</span>
        </div>
      )}

      {/* Details */}
      <div className="p-3">
        <div className="mb-1">
          <h3 className="truncate text-sm font-medium" title={artifact.name}>
            {artifact.name}
          </h3>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatFileSize(artifact.size_bytes)}</span>
          <span>{formatRelativeTime(artifact.created_at)}</span>
        </div>

        {/* Mime type */}
        <div className="mt-1 text-xs text-muted-foreground/80">
          {artifact.mime_type}
        </div>
      </div>

      {/* Download button overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
          aria-label={`Download ${artifact.name}`}
        >
          <Download className="h-4 w-4" />
          <span>Download</span>
        </button>
      </div>
    </div>
  );
}
