import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/client/components/ui/alert';
import { cn } from '@/client/utils/cn';

export interface ErrorAlertProps {
  error?: string | null;
  className?: string;
}

/**
 * Reusable error alert component
 * Only renders when error is provided
 */
export function ErrorAlert({ error, className }: ErrorAlertProps) {
  if (!error) {
    return null;
  }

  return (
    <Alert variant="destructive" className={cn(className)}>
      <AlertCircle />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}
