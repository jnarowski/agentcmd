export interface SpecTypeMetadata {
  /** Extracted from filename: generate-{id}-spec.md */
  id: string;
  /** Slash command to execute: /cmd:generate-{id}-spec */
  command: string;
  /** Display name parsed from # header in markdown */
  name: string;
  /** Description parsed from first paragraph after header */
  description: string;
  /** Absolute path to the command file */
  filePath: string;
}
