/**
 * Clickable file reference badge
 * Displays file path and optional line number
 */

import { FileText, FileCode } from 'lucide-react';
import { Badge } from "@/client/components/ui/badge";

interface FileReferenceProps {
  filePath: string;
  lineNumber?: number;
  className?: string;
}

export function FileReference({ filePath, lineNumber, className = '' }: FileReferenceProps) {
  // Extract filename from path
  const filename = filePath.split('/').pop() || filePath;
  const extension = filename.split('.').pop()?.toLowerCase() || '';

  // Determine icon based on file type
  const isCodeFile = ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'cpp', 'c', 'rb'].includes(extension);
  const Icon = isCodeFile ? FileCode : FileText;

  // Format display text
  const displayText = lineNumber ? `${filename}:${lineNumber}` : filename;

  return (
    <Badge
      variant="outline"
      className={`font-mono text-xs gap-1.5 hover:bg-accent cursor-pointer ${className}`}
      title={filePath}
    >
      <Icon className="h-3 w-3" />
      <span>{displayText}</span>
    </Badge>
  );
}
