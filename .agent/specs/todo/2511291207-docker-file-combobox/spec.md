# Docker File Combobox Selector

**Status**: draft
**Type**: issue
**Created**: 2025-11-29
**Package**: apps/app
**Total Complexity**: 58 points
**Tasks**: 11
**Avg Complexity**: 5.3/10

## Complexity Summary

| Metric          | Value    |
| --------------- | -------- |
| Total Tasks     | 11       |
| Total Points    | 58       |
| Avg Complexity  | 5.3/10   |
| Max Task        | 7/10     |

## Overview

Add searchable file selector combobox to ProjectEditForm's Docker file path field, replacing current text input. Extract shared file search logic from ChatPromptInputFiles into reusable `useFileSearch` hook. Shows all files with intelligent search/scoring, stores relative paths.

## User Story

As a project manager
I want to select Docker configuration files from a searchable dropdown
So that I can avoid typos and easily find docker-compose.yml, Dockerfile, or custom config files

## Technical Approach

Extract debounced file search logic from ChatPromptInputFiles into `useFileSearch` hook (DRY principle). Create `FileSelectCombobox` component integrating hook with Combobox UI. Refactor ChatPromptInputFiles to use shared hook (zero behavior change). Replace ProjectEditForm text input with Controller + FileSelectCombobox.

**Key Points**:
- Hook returns `FileItem[]` for max reusability (components handle presentation)
- Hook handles 150ms debouncing internally (consistent UX)
- No extension filtering in ProjectEditForm (show all files - Dockerfile, *.yml, etc.)
- Path conversion (absolute → relative) happens in components (context-specific)
- Combobox uses absolute paths as values, displays relative paths

## Files to Create/Modify

### New Files (2)

1. `/Users/devbot/Dev/sourceborn/agentcmd/apps/app/src/client/hooks/useFileSearch.ts` - Shared debounced file search hook with optional extension filtering
2. `/Users/devbot/Dev/sourceborn/agentcmd/apps/app/src/client/components/FileSelectCombobox.tsx` - Reusable file selector combobox combining useFileSearch + useProjectFiles + Combobox UI

### Modified Files (2)

1. `/Users/devbot/Dev/sourceborn/agentcmd/apps/app/src/client/pages/projects/sessions/components/ChatPromptInputFiles.tsx` - Refactor to use useFileSearch hook (DRY, ~15 lines removed)
2. `/Users/devbot/Dev/sourceborn/agentcmd/apps/app/src/client/pages/projects/components/ProjectEditForm.tsx` - Replace dockerFilePath Input with Controller + FileSelectCombobox

## Tasks

**IMPORTANT: Execute every task in order, top to bottom**

- [ ] **task-1** [6/10] Create useFileSearch hook with debouncing and extension filtering
  - Implement useState for debouncedQuery with 150ms useEffect debouncing
  - Add optional extensionFilter logic with useMemo
  - Call searchFiles() utility with maxResults (default 50)
  - Return interface: `{ results: FileItem[], totalCount: number, isSearching: boolean, debouncedQuery: string }`
  - Add comprehensive JSDoc with examples
  - File: `/Users/devbot/Dev/sourceborn/agentcmd/apps/app/src/client/hooks/useFileSearch.ts`

- [ ] **task-2** [7/10] Create FileSelectCombobox component with file fetching and search
  - Integrate useProjectFiles(projectId) for file tree fetching
  - Flatten tree with flattenFileTree(data)
  - Call useFileSearch(searchQuery, flattenedFiles, options)
  - Transform FileItem[] → ComboboxOption[] with useMemo (absolute paths as values)
  - Add path conversion helpers: toRelativePath(), getRelativeDirectory()
  - Handle loading/error/empty states
  - File: `/Users/devbot/Dev/sourceborn/agentcmd/apps/app/src/client/components/FileSelectCombobox.tsx`

- [ ] **task-3** [5/10] Add custom rendering to FileSelectCombobox with FileItem component
  - Implement renderOption prop using FileItem component (icon + name + directory)
  - Implement renderTrigger prop showing selected file with FileItem
  - Add ChevronsUpDownIcon to trigger
  - Display relative paths in UI (convert from absolute values)
  - File: `/Users/devbot/Dev/sourceborn/agentcmd/apps/app/src/client/components/FileSelectCombobox.tsx`

- [ ] **task-4** [3/10] Add TypeScript interfaces and exports to FileSelectCombobox
  - Define FileSelectComboboxProps interface with all props
  - Export component and interface
  - Add JSDoc documentation with usage examples
  - Type ComboboxOption with custom _fileItem property
  - File: `/Users/devbot/Dev/sourceborn/agentcmd/apps/app/src/client/components/FileSelectCombobox.tsx`

- [ ] **task-5** [4/10] Refactor ChatPromptInputFiles to use useFileSearch hook
  - Import useFileSearch hook
  - Replace lines 90-128 (debouncedQuery state, useEffect, filteredFiles useMemo)
  - Call: `const { results: filteredFiles } = useFileSearch(searchQuery, flattenedFiles, { maxResults: 50 })`
  - Verify all other logic remains identical (addedFiles filtering, display)
  - Test: Search functionality works identically
  - File: `/Users/devbot/Dev/sourceborn/agentcmd/apps/app/src/client/pages/projects/sessions/components/ChatPromptInputFiles.tsx`

- [ ] **task-6** [6/10] Update ProjectEditForm imports and add path conversion helper
  - Import Controller from react-hook-form
  - Import FileSelectCombobox component
  - Add toRelativePath helper function (absolute → relative path conversion)
  - Handle paths with/without trailing slashes in normalization
  - File: `/Users/devbot/Dev/sourceborn/agentcmd/apps/app/src/client/pages/projects/components/ProjectEditForm.tsx`

- [ ] **task-7** [6/10] Replace dockerFilePath Input with Controller + FileSelectCombobox
  - Replace lines 254-266 with Controller wrapper
  - Pass field.value and field.onChange to FileSelectCombobox
  - Convert absolute paths to relative in onValueChange handler
  - Pass projectId={project.id} and projectPath={project.path}
  - NO extensionFilter prop (show all files)
  - Add error display: `{errors.dockerFilePath && <p>{errors.dockerFilePath.message}</p>}`
  - Update field description text
  - File: `/Users/devbot/Dev/sourceborn/agentcmd/apps/app/src/client/pages/projects/components/ProjectEditForm.tsx`

- [ ] **task-8** [5/10] Test useFileSearch hook behavior
  - Test: Empty query returns all files
  - Test: Debouncing works at 150ms (rapid changes → single search)
  - Test: extensionFilter correctly filters files
  - Test: maxResults respected
  - Test: isSearching flag true during debounce, false after

- [ ] **task-9** [5/10] Test FileSelectCombobox integration
  - Test: Component renders and loads files
  - Test: Search filters results (all file types)
  - Test: Can select Dockerfile (no extension), .yml, .yaml files
  - Test: Selection closes dropdown and shows in trigger
  - Test: Loading/error states display correctly
  - Test: Mobile drawer works on small screens

- [ ] **task-10** [6/10] Test ProjectEditForm Docker file selection
  - Test: Combobox opens and shows all files
  - Test: Selecting file populates form with relative path
  - Test: Form submission saves preview_config.dockerFilePath correctly
  - Test: Handles project paths with/without trailing slashes
  - Test: Works with empty initial value
  - Test: Works with populated initial value

- [ ] **task-11** [5/10] Regression test ChatPromptInputFiles after refactor
  - Test: File search works identically to before refactor
  - Test: 150ms debouncing behavior unchanged
  - Test: Added files section displays correctly
  - Test: Can add files (inserts @ prefix)
  - Test: Can remove files (removes from textarea)
  - Test: Performance identical (no regressions)

## Testing Strategy

### Unit Tests

**`useFileSearch.test.ts`** (if time permits):
- Returns all files when query empty
- Debounces at 150ms
- Filters by extension when provided
- Respects maxResults option
- Sets isSearching flag correctly

### Integration Tests

**Manual testing checklist in tasks 8-11 above**

## Success Criteria

- [ ] FileSelectCombobox shows all files with search (no extension filtering)
- [ ] Can select any file type (Dockerfile, docker-compose.yml, custom.yaml)
- [ ] Selected file path saved as relative path in preview_config
- [ ] ChatPromptInputFiles behavior unchanged after refactor
- [ ] useFileSearch hook reusable across components
- [ ] 150ms debouncing consistent across all uses
- [ ] Mobile drawer works for file selection
- [ ] Form submission works correctly
- [ ] No type errors, build succeeds

## Validation

**Automated:**

```bash
# Type check
cd apps/app && pnpm check-types
# Expected: no errors

# Build
cd apps/app && pnpm build
# Expected: successful build
```

**Manual:**

1. Start app: `cd apps/app && pnpm dev`
2. Navigate to: Project Edit page
3. Click Docker File Path field
4. Verify: Dropdown opens with all files from project
5. Search: Type "docker" - verify intelligent search results
6. Select: Click docker-compose.yml or Dockerfile
7. Verify: Relative path shown in field
8. Submit: Save form
9. Verify: preview_config.dockerFilePath saved as relative path
10. Test: ChatPromptInputFiles file search still works identically

## Implementation Notes

### Path Handling Strategy

ProjectEditForm stores relative paths in database but FileSelectCombobox uses absolute paths internally (unique identifiers). Conversion happens in Controller's onValueChange handler.

### Extension Filtering

useFileSearch hook supports optional extensionFilter, but ProjectEditForm does NOT use it (shows all files). Future components can filter to specific types if needed.

### Separation of Concerns

- Hook: Search logic only (returns FileItem[])
- Component: Presentation (transforms to ComboboxOption[], handles paths)
- Form: Business logic (stores relative paths)

## Dependencies

- Existing: `searchFiles` utility (intelligent scoring)
- Existing: `flattenFileTree` utility (tree → flat array)
- Existing: `useProjectFiles` hook (TanStack Query)
- Existing: `Combobox` component (mobile-responsive)
- Existing: `FileItem` component (file display with icon)
- No new dependencies

## References

- Plan: `/Users/devbot/.claude/plans/soft-watching-reef.md`
- ChatPromptInputFiles: `/Users/devbot/Dev/sourceborn/agentcmd/apps/app/src/client/pages/projects/sessions/components/ChatPromptInputFiles.tsx`
- searchFiles utility: `/Users/devbot/Dev/sourceborn/agentcmd/apps/app/src/client/utils/searchFiles.ts`
