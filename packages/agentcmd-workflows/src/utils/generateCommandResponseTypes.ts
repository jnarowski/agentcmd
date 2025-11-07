import type { ResponseSchema } from "../types/slash-commands-internal";

/**
 * Convert a command name to a PascalCase type name with "Result" suffix.
 *
 * @param commandName - Command name like "/review-spec-implementation"
 * @returns PascalCase type name like "ReviewSpecImplementationResult"
 *
 * @example
 * commandNameToTypeName("/review-spec-implementation")
 * // Returns: "ReviewSpecImplementationResult"
 */
export function commandNameToTypeName(commandName: string): string {
  // Remove leading slash
  const withoutSlash = commandName.startsWith("/")
    ? commandName.slice(1)
    : commandName;

  // Split by hyphens and convert to PascalCase
  const pascalCase = withoutSlash
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  return `${pascalCase}Result`;
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
 * @param commandName - Command name (e.g., "/review-spec-implementation")
 * @param schema - Response schema with example JSON and field descriptions
 * @returns Generated TypeScript interface as a string
 *
 * @example
 * const code = generateResponseTypeCode("/review-spec", schema);
 * // Returns:
 * // export interface ReviewSpecResult {
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
