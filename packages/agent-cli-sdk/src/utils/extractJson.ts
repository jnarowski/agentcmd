/**
 * Extracts JSON from text using multiple strategies:
 * 1. Direct JSON.parse()
 * 2. Extract from markdown code blocks (```json or ```)
 * 3. Find JSON object/array in text using regex
 *
 * @param text - Text containing JSON
 * @returns Parsed JSON data or null if not found
 */
export function extractJSON(text: string): unknown {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const trimmed = text.trim();

  // Strategy 1: Direct parse
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue
  }

  // Strategy 2: Extract from markdown code blocks
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (codeBlockMatch?.[1]) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continue
    }
  }

  // Strategy 3: Find JSON object or array in text
  const jsonMatch = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch?.[0]) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Continue
    }
  }

  return null;
}
