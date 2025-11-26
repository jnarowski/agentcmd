import fs from 'fs/promises';
import path from 'path';
import { activeSessions } from '@/server/websocket/infrastructure/active-sessions';
import type { ProcessImageUploadsOptions } from '@/server/domain/session/types/ProcessImageUploadsOptions';

export interface ImageProcessingResult {
  imagePaths: string[];
  tempImageDir?: string;
}

/**
 * Process image uploads for a session
 *
 * Handles both base64-encoded images and file path references.
 * Creates a temporary directory in the project and saves all images there.
 */
export async function processImageUploads({ images, projectPath, sessionId }: ProcessImageUploadsOptions): Promise<ImageProcessingResult> {
  const imagePaths: string[] = [];

  if (!images || images.length === 0) {
    return { imagePaths };
  }

  // Create temp directory for images
  const timestamp = Date.now();
  const tempImageDir = path.join(
    projectPath,
    ".tmp",
    "images",
    String(timestamp)
  );
  await fs.mkdir(tempImageDir, { recursive: true });

  // Update active session with temp dir
  activeSessions.update(sessionId, { tempImageDir });

  // Save each image
  for (let i = 0; i < images.length; i++) {
    const image = images[i];

    // Determine file extension from MIME type or default to .png
    let ext = ".png";
    if (image.startsWith("data:image/")) {
      const mimeType = image.split(";")[0].split("/")[1];
      ext = "." + mimeType;
    }

    const imagePath = path.join(tempImageDir, `image-${i}${ext}`);

    // Handle base64 data URLs
    if (image.startsWith("data:")) {
      const base64Data = image.split(",")[1];
      await fs.writeFile(imagePath, Buffer.from(base64Data, "base64"));
    } else {
      // Assume it's a file path - copy it
      await fs.copyFile(image, imagePath);
    }

    imagePaths.push(imagePath);
  }

  return { imagePaths, tempImageDir };
}
