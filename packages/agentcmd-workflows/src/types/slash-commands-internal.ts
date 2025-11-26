/**
 * Internal types used by slash command parsing utilities
 * These are NOT generated - they define the structure of command definitions
 */

export interface CommandArgument {
  name: string;
  required: boolean;
}

export interface ResponseSchema {
  exampleJson: Record<string, unknown>;
  fieldDescriptions: Map<string, string>;
}

export interface CommandDefinition {
  name: string;
  description: string;
  arguments: CommandArgument[];
  responseSchema?: ResponseSchema;
}
