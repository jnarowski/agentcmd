---
description: Audit and refine CLAUDE.md files to ensure accuracy with codebase
argument-hint: [target-path (optional)]
---

# Audit CLAUDE.md Files

Perform comprehensive but non-destructive audit of CLAUDE.md documentation to ensure alignment with current codebase patterns and best practices. Run weekly or after major refactors.

## Variables

- $target-path: $1 (optional) - Specific CLAUDE.md file or directory to audit (defaults to all)

## Instructions

- This is MAINTENANCE, not reorganization
- Focus on accuracy, not structure
- Highlight issues but don't auto-fix (ask first)
- Verify links to code examples exist
- Check for outdated patterns or deprecated code
- Suggest improvements based on actual codebase

## Workflow

1. **Discover CLAUDE.md files**
   - Find all CLAUDE.md in scope ($target-path or entire repo)
   - List files with locations

2. **Audit each file**
   - Link validation
   - Pattern verification
   - Best practice extraction
   - Duplication check
   - Completeness check

3. **Generate audit report**
   - Status per file (✅/⚠️/❌)
   - Issues found
   - Suggested improvements

4. **Propose refinements**
   - Show specific proposed changes
   - Ask user which to apply

5. **Apply approved changes**
   - Update files
   - Report what changed

## Audit Checks Per File

### Link Validation
- Extract all file paths from CLAUDE.md
- Use Glob to verify files exist
- Check .agent/docs/ references valid
- Report broken links

### Pattern Verification
- Search codebase for patterns mentioned in docs
- Verify conventions still followed (imports, naming, architecture)
- Identify deprecated patterns still documented
- Find new patterns not yet documented

**Detection:**
- Search for old patterns (e.g., "services/project.service")
- Count occurrences - if 0, pattern is deprecated
- Check if CLAUDE.md still references it

### Best Practice Extraction
- Analyze recent code for emerging patterns
- Identify commonly used files as better examples
- Find frequent issues needing documentation

**Detection:**
- Use Grep for common imports/patterns
- Identify frequently used files
- Compare against what's documented

### Duplication Check
- Compare content sections across CLAUDE.md files
- Flag identical or near-identical blocks
- Suggest consolidation

### Completeness Check
- New domains/features without docs?
- New dependencies documented?
- Frequent Claude errors needing docs?

## Report Format

```markdown
# CLAUDE.md Audit Report

**Date:** [current date]
**Scope:** [all files or specific target]

## Summary

- Total CLAUDE.md files: X
- ✅ Accurate: X files
- ⚠️ Needs Update: X files
- ❌ Has Issues: X files

## File-by-File Results

### Root CLAUDE.md [✅/⚠️/❌]

**Broken Links:**
- Line 45: `src/old/path.ts` → MISSING
- Line 102: `.agent/docs/missing.md` → MISSING

**Outdated Patterns:**
- Line 67: References "services/" (deprecated, use "domain/*/services/")
- Line 130: Import shows .js extension (no longer used)

**Missing Patterns:**
- Centralized config: import { config } from '@/server/config'
- Error classes in src/server/errors.ts

**Recommended Examples:**
- Add link to domain/project/services/getProjectById.ts
- Update route example to routes/projects.ts

**Suggested Improvements:**
1. Update line 45: Change link to new location
2. Remove deprecated pattern at line 67
3. Add config pattern to "Backend Architecture"
4. Link to getProjectById.ts as example

---

[Repeat for each file]

---

## Proposed Changes

Would you like to apply these updates?
```

## Examples

```bash
# Audit all CLAUDE.md files
/audit-claude-md

# Audit specific file
/audit-claude-md CLAUDE.md

# Audit specific directory
/audit-claude-md apps/app/
```

## Notes

- Run weekly or after major refactors
- Non-destructive (asks before changes)
- Prevents documentation drift
- Complements one-time reorganization
- Focus on links, patterns, examples (not structure)
