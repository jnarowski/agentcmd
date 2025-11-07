import type { ComponentProps } from 'react';
import { Loader2 } from 'lucide-react';
import { Button, buttonVariants } from '@/client/components/ui/button';
import type { VariantProps } from 'class-variance-authority';

export interface LoadingButtonProps
  extends ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  loadingText?: string;
  asChild?: boolean;
}

/**
 * Button component with integrated loading state
 * Shows a spinner and optional loading text when isLoading is true
 */
export function LoadingButton({
  children,
  isLoading = false,
  loadingText,
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={isLoading || disabled} {...props}>
      {isLoading && <Loader2 className="animate-spin" />}
      {isLoading && loadingText ? loadingText : children}
    </Button>
  );
}
