import { getFileTypeInfo } from '@/client/pages/projects/files/utils/fileUtils';

interface FileBadgeProps {
  extension: string;
}

// Convert hex color to rgba with opacity
function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function FileBadge({ extension }: FileBadgeProps) {
  const { label, color } = getFileTypeInfo(extension);

  return (
    <span
      className="inline-flex items-center justify-center w-12 h-6 rounded text-xs font-medium px-2"
      style={{
        backgroundColor: hexToRgba(color, 0.15),
        color: color,
        border: `1px solid ${hexToRgba(color, 0.3)}`,
      }}
    >
      {label}
    </span>
  );
}
