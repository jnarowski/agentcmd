// Artifact file types
export type ArtifactType = 'image' | 'video' | 'document' | 'code' | 'other';

// Upload artifact input
export interface UploadArtifactInput {
  workflow_run_id: string;
  phase: string;
  name: string;
  file_path: string; // Relative to project root
  file_type: ArtifactType;
  mime_type: string;
  size_bytes: number;
}
