import { useState, useEffect } from "react";
import { Button } from "@/client/components/ui/button";
import { X } from "lucide-react";
import { api } from "@/client/utils/api-client";

interface ImageViewerProps {
  projectId: string;
  filePath: string;
  fileName: string;
  onClose: () => void;
}

export function ImageViewer({
  projectId,
  filePath,
  fileName,
  onClose,
}: ImageViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load image with auth header
  useEffect(() => {
    const loadImage = async () => {
      try {
        setLoading(true);
        const blob = await api.getBlob(
          `/api/projects/${projectId}/files/content?path=${encodeURIComponent(filePath)}`
        );
        const url = URL.createObjectURL(blob);
        setImageUrl(url);
      } catch (err) {
        console.error("Error loading image:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    // Cleanup blob URL
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, filePath]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{fileName}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 flex justify-center items-center bg-secondary/20 min-h-[400px]">
          {loading ? (
            <div className="text-center text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p>Loading image...</p>
            </div>
          ) : error ? (
            <div className="text-center text-muted-foreground">
              <p>Unable to load image</p>
              <p className="text-sm mt-2">{error}</p>
            </div>
          ) : (
            <img
              src={imageUrl!}
              alt={fileName}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-md"
            />
          )}
        </div>

        <div className="p-4 border-t bg-secondary/20">
          <p className="text-sm text-muted-foreground">{filePath}</p>
        </div>
      </div>
    </div>
  );
}
