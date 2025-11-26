import type { ResponseSchema } from "../types/slash-commands-internal";

/**
 * Convert a command name to PascalCase base name
 *
 * @param commandName - Command name like "/cmd:generate-spec" or "/cmd:spec:estimate"
 * @returns PascalCase base name like "CmdGenerateSpec" or "CmdSpecEstimate"
 *
 * @example
 * commandNameToPascalCase("/cmd:generate-spec")
 * // Returns: "CmdGenerateSpec"
 *
 * commandNameToPascalCase("/cmd:spec:estimate")
 * // Returns: "CmdSpecEstimate"
 */
function commandNameToPascalCase(commandName: string): string {
  // Remove leading slash
  const withoutSlash = commandName.startsWith("/")
    ? commandName.slice(1)
    : commandName;

  // Split by colons (namespace separator) AND hyphens (word separator)
  // Example: "cmd:generate-spec" → ["cmd", "generate", "spec"]
  // Example: "cmd:spec:estimate" → ["cmd", "spec", "estimate"]
  const parts = withoutSlash.split(/[:]/); // Split by colons first
  const allWords = parts.flatMap((part) => part.split("-")); // Then split each part by hyphens

  // Convert to PascalCase
  return allWords
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/**
 * Convert a command name to a PascalCase type name with "Args" suffix.
 *
 * @param commandName - Command name like "/cmd:generate-spec"
 * @returns PascalCase type name like "CmdGenerateSpecArgs"
 *
 * @example
 * commandNameToArgsTypeName("/cmd:generate-spec")
 * // Returns: "CmdGenerateSpecArgs"
 *
 * commandNameToArgsTypeName("/cmd:spec:estimate")
 * // Returns: "CmdSpecEstimateArgs"
 */
export function commandNameToArgsTypeName(commandName: string): string {
  return `${commandNameToPascalCase(commandName)}Args`;
}

/**
 * Convert a command name to a PascalCase type name with "Response" suffix.
 *
 * @param commandName - Command name like "/cmd:generate-spec"
 * @returns PascalCase type name like "CmdGenerateSpecResponse"
 *
 * @example
 * commandNameToTypeName("/cmd:generate-spec")
 * // Returns: "CmdGenerateSpecResponse"
 *
 * commandNameToTypeName("/cmd:spec:estimate")
 * // Returns: "CmdSpecEstimateResponse"
 */
export function commandNameToTypeName(commandName: string): string {
  return `${commandNameToPascalCase(commandName)}Response`;
}

/**
 * Infer TypeScript type from a JSON value.
 *
 * @param value - JSON value to infer type from
 * @returns TypeScript type string
 */
function inferTypeFromValue(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "unknown[]";
    }
    // Infer type from first element
    const elementType = inferTypeFromValue(value[0]);
    return `${elementType}[]`;
  }

  const valueType = typeof value;

  if (valueType === "object") {
    // It's a nested object
    return "object";
  }

  return valueType;
}

/**
 * Generate TypeScript interface property from a JSON field.
 *
 * @param fieldName - Name of the field
 * @param value - Value of the field (used for type inference)
 * @param description - Optional description for JSDoc
 * @param indent - Indentation level (number of spaces)
 * @returns Generated property string with optional JSDoc
 */
function generateProperty(
  fieldName: string,
  value: unknown,
  description: string | undefined,
  indent: number
): string {
  const indentStr = " ".repeat(indent);
  let result = "";

  // Add JSDoc comment if description exists
  if (description) {
    result += `${indentStr}/** ${description} */\n`;
  }

  // Handle nested objects
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    result += `${indentStr}${fieldName}: {\n`;
    const nestedObj = value as Record<string, unknown>;
    for (const [nestedKey, nestedValue] of Object.entries(nestedObj)) {
      result += generateProperty(nestedKey, nestedValue, undefined, indent + 2);
    }
    result += `${indentStr}};\n`;
  } else {
    // Primitive or array
    const typeStr = inferTypeFromValue(value);
    result += `${indentStr}${fieldName}: ${typeStr};\n`;
  }

  return result;
}

/**
 * Generate TypeScript interface code from a JSON response schema.
 *
 * @param commandName - Command name (e.g., "/cmd:generate-spec")
 * @param schema - Response schema with example JSON and field descriptions
 * @returns Generated TypeScript interface as a string
 *
 * @example
 * const code = generateResponseTypeCode("/cmd:generate-spec", schema);
 * // Returns:
 * // export interface CmdGenerateSpecResponse {
 * //   /** Operation status *\/
 * //   success: boolean;
 * //   count: number;
 * // }
 */
export function generateResponseTypeCode(
  commandName: string,
  schema: ResponseSchema
): string {
  const typeName = commandNameToTypeName(commandName);
  let result = `/**\n * Response type for ${commandName} command\n */\n`;
  result += `export interface ${typeName} {\n`;

  // Generate properties from example JSON
  for (const [fieldName, value] of Object.entries(schema.exampleJson)) {
    const description = schema.fieldDescriptions.get(fieldName);
    result += generateProperty(fieldName, value, description, 2);
  }

  result += "}\n";

  return result;
}
