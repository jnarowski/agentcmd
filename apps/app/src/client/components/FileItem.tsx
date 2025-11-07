import { FileBadge } from "@/client/components/ui/file-badge";

interface FileItemProps {
  filename: string;
  extension: string;
  directory?: string;
  onClick?: () => void;
  className?: string;
}

export function FileItem({
  filename,
  extension,
  directory,
  onClick,
  className = "",
}: FileItemProps) {
  return (
    <div
      className={`flex items-center gap-2 flex-1 min-w-0 ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
    >
      <FileBadge extension={extension} />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="font-medium text-sm truncate">{filename}</span>
        {directory && (
          <span className="text-muted-foreground text-xs truncate">
            {directory}
          </span>
        )}
      </div>
    </div>
  );
}
