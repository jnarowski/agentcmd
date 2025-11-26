/**
 * Map spec type to its slash command using naming convention
 * Convention: specType "feature" → "/cmd:generate-feature-spec"
 */
export function getSpecCommand(specType: string): string {
  return `/cmd:generate-${specType}-spec`;
}
