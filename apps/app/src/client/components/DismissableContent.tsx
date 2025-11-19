/**
 * DismissableContent Component
 * Reusable component for dismissable help content with persistent state
 */

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Alert } from '@/client/components/ui/alert';
import { Button } from '@/client/components/ui/button';
import { useSettings, useUpdateSettings } from '@/client/hooks/useSettings';
import { cn } from '@/client/utils/cn';

interface DismissableContentProps {
  dismissKey: string;
  children: ReactNode;
  variant?: 'default' | 'destructive';
  className?: string;
}

export function DismissableContent({
  dismissKey,
  children,
  variant = 'default',
  className,
}: DismissableContentProps) {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  // Don't render if dismissed or still loading
  if (!settings || settings.userPreferences.dismissed_content?.[dismissKey]) {
    return null;
  }

  const handleDismiss = () => {
    const currentDismissed = settings.userPreferences.dismissed_content || {};
    updateSettings.mutate({
      dismissed_content: {
        ...currentDismissed,
        [dismissKey]: true,
      },
    });
  };

  return (
    <Alert variant={variant} className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1 h-6 w-6"
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </Button>

      {children}
    </Alert>
  );
}
