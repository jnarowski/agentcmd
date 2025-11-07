import { useState } from 'react';
import type { UnifiedImageBlock } from 'agent-cli-sdk';

export interface ImageBlockProps {
  /** Image block data with base64 source */
  image: UnifiedImageBlock;
  /** Optional alt text for accessibility */
  alt?: string;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Renders a base64-encoded image from a UnifiedImageBlock
 *
 * Features:
 * - Displays base64 images inline
 * - Shows loading state while image loads
 * - Shows error state if image fails to load
 * - Applies responsive styling with max-width
 */
export function ImageBlock({ image, alt = 'Tool result image', className = '' }: ImageBlockProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Construct data URL from base64 image
  const dataUrl = `data:${image.source.media_type};base64,${image.source.data}`;

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Loading state */}
      {isLoading && !hasError && (
        <div className="flex items-center justify-center h-32 bg-muted rounded animate-pulse">
          <span className="text-muted-foreground text-sm">Loading image...</span>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="flex items-center justify-center h-32 bg-destructive/10 rounded border border-destructive/20">
          <span className="text-destructive text-sm">Failed to load image</span>
        </div>
      )}

      {/* Image */}
      <img
        src={dataUrl}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={`
          max-w-full h-auto rounded-md border border-border
          ${isLoading || hasError ? 'hidden' : 'block'}
        `}
        style={{
          maxHeight: '500px',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}
