import { FileItem } from "@/client/components/FileItem";

interface ArtifactCardProps {
  name: string;
  fileType: string;
  sizeBytes: number;
  onDownload?: () => void;
}

export function ArtifactCard({
  name,
  fileType,
  sizeBytes,
  onDownload,
}: ArtifactCardProps) {
  // Extract file extension from name
  const nameParts = name.split(".");
  const extension = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

  // Format size and type as directory/subtitle
  const metadata = `${fileType} • ${(sizeBytes / 1024).toFixed(1)} KB`;

  return (
    <div className="border rounded p-3">
      <div className="flex items-center justify-between">
        <FileItem
          filename={name}
          extension={extension}
          directory={metadata}
        />
        {onDownload && (
          <button
            onClick={onDownload}
            className="text-xs px-3 py-1 rounded border hover:bg-muted flex-shrink-0 ml-2"
          >
            Download
          </button>
        )}
      </div>
    </div>
  );
}
