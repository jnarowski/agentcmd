# Slash Command JSON Output Format

## Overview

Commands that return JSON for machine parsing must output **raw JSON only** - no explanatory text, markdown fences, or commentary.

## Why This Matters

Automated tooling parses command output directly. Extra text breaks parsing and requires fragile regex/string manipulation workarounds.

## Rules

**DO:**
- Output valid JSON object as entire response
- Use double quotes for strings
- Ensure proper escaping of special characters
- Minify or pretty-print (both valid)

**DON'T:**
- Add explanatory text before/after JSON
- Wrap in markdown code fences (`` ```json ```)
- Include XML-style tags like `<json_output>`
- Add comments or trailing messages

## Examples

### ❌ BAD

```
Great! I've completed the spec. Here's the result:

```json
{ "success": true, "spec_id": "251114081340" }
```

The spec is ready to implement!
```

**Problem:** Text before/after JSON + markdown fence

---

```
<json_output>
{ "success": true, "spec_id": "251114081340" }
</json_output>
```

**Problem:** XML-style tags (instruction artifact, not actual output)

---

```
{ "success": true, "spec_id": "251114081340" }

Ready to implement when you are!
```

**Problem:** Trailing text after JSON

### ✅ GOOD

```
{ "success": true, "spec_id": "251114081340" }
```

**Why:** Pure JSON, nothing else

---

```
{
  "success": true,
  "spec_id": "251114081340",
  "files_to_create": [
    "apps/app/src/client/components/NewComponent.tsx"
  ]
}
```

**Why:** Pretty-printed JSON is fine - still parseable

## Common Pitfalls

1. **Instruction tags leak into output**
   - `<json_output>` tags in slash commands are instructions, not output format
   - Never include these in actual response

2. **Habit of explaining**
   - Natural to add context, but breaks parsing
   - Resist urge to summarize or celebrate

3. **Markdown formatting**
   - Code fences (`` ``` ``) are for documentation, not machine output
   - Parser expects raw JSON, not markdown

4. **Empty success responses**
   - Even if nothing to report, return valid JSON: `{ "success": true }`
   - Never return empty string or "Done"

## Testing Output

**Quick validation:**

```bash
# Pipe output directly to jq (JSON processor)
echo '{ "success": true }' | jq .

# Valid JSON: jq prints formatted output
# Invalid: jq shows error with line/column
```

**Common jq errors:**

```
parse error: Invalid numeric literal at line 1, column 5
→ Check for trailing commas, unquoted keys

parse error: Expected separator between values at line 2, column 1
→ Extra text before/after JSON
```

## Edge Cases

**Null values:** Use `null`, not `"null"` or omit

```json
{ "error": null }  // ✅
{ "error": "null" }  // ❌ (string, not null)
{ }  // ❌ (missing expected field)
```

**Special characters:** Escape properly

```json
{ "path": "C:\\Users\\file.txt" }  // ✅ (escaped backslash)
{ "message": "Line 1\nLine 2" }  // ✅ (escaped newline)
```

**Large payloads:** Valid JSON, watch line limits

```json
{
  "files_to_modify": [
    "apps/app/src/client/components/Component1.tsx",
    "apps/app/src/client/components/Component2.tsx",
    ...  // ❌ (not valid JSON)
    // Full array required
  ]
}
```

## When Format Matters

Commands with `$format` parameter:
- `$format = "json"` → Follow this doc (raw JSON only)
- `$format = "text"` → Human-readable with explanations OK
- No `$format` → Check command default (usually text)

Commands always returning JSON:
- All `generate-*-spec` commands
- Always follow raw JSON rules regardless of parameters
