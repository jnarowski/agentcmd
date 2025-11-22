# Session Theme System

**Status**: draft
**Created**: 2025-11-19
**Package**: apps/app
**Total Complexity**: 57 points
**Phases**: 6
**Tasks**: 16
**Overall Avg Complexity**: 3.6/10

## Complexity Breakdown

| Phase                         | Tasks | Total Points | Avg Complexity | Max Task |
| ----------------------------- | ----- | ------------ | -------------- | -------- |
| Phase 1: Settings Backend     | 2     | 6            | 3.0/10         | 4/10     |
| Phase 2: Theme Infrastructure | 3     | 15           | 5.0/10         | 6/10     |
| Phase 3: Core Components      | 5     | 15           | 3.0/10         | 4/10     |
| Phase 4: Terminal Theme       | 2     | 8            | 4.0/10         | 5/10     |
| Phase 5: Compact Theme        | 2     | 7            | 3.5/10         | 4/10     |
| Phase 6: UI Controls          | 2     | 6            | 3.0/10         | 4/10     |
| **Total**                     | **16**| **57**       | **3.6/10**     | **6/10** |

## Overview

Implement a theme system for session components that allows users to switch between visual styles (Default, Terminal, Compact) via settings. Uses multiple CSS files approach where each theme contains complete tweakcn CSS variables + session-specific layout overrides.

## User Story

As a user
I want to customize the visual style of my session interface
So that I can choose between different layouts and typography that match my preferences (spacious default, monospace terminal, or compact density)

## Technical Approach

Use multiple CSS file approach where each theme is a complete, self-contained CSS file with:
1. Full tweakcn `:root` and `.dark` variable definitions
2. Session-specific class overrides (`.session-*`) for layout/spacing/typography
3. Dynamic CSS loading via custom hook that swaps theme files based on user setting

Separate concerns:
- **Backend**: Extend existing settings schema with `theme` field (replace `default_theme`)
- **Frontend**: Add `.session-*` classes to core components (Phase 1: 5 components)
- **Themes**: Create 4 theme CSS files combining tweakcn base + session overrides
- **UI**: Theme selector in settings dialog

## Key Design Decisions

1. **Multiple CSS Files vs CSS Variables**: Choose multiple files to align with tweakcn workflow - copy/paste theme output directly, add session overrides at bottom. Easier to maintain and extend.
2. **Unified Theme Setting**: Combine global colors and session layout into single `theme` setting (not separate). Each theme = complete visual package.
3. **Phase 1 Components Only**: Start with 5 core message components to validate approach before expanding to remaining 49 session components.
4. **Data-Attribute Scoping**: Use `.session-*` class prefix for all themeable elements, avoid data-attributes for simpler CSS selectors.

## Architecture

### File Structure

```
apps/app/src/
├── server/routes/
│   └── settings.ts                    # Update settings schema
├── client/
│   ├── hooks/
│   │   ├── useSettings.ts             # Update UserPreferences type
│   │   └── useThemeLoader.ts          # NEW: Dynamic theme loading
│   ├── styles/themes/
│   │   ├── theme-default-light.css    # NEW: Default light theme
│   │   ├── theme-default-dark.css     # NEW: Default dark theme
│   │   ├── theme-terminal.css         # NEW: Terminal theme
│   │   └── theme-compact.css          # NEW: Compact theme
│   └── pages/projects/sessions/components/session/
│       ├── MessageList.tsx            # Add .session-message-list
│       └── claude/
│           ├── UserMessage.tsx        # Add .session-message-user, .session-bubble
│           ├── AssistantMessage.tsx   # Add .session-message-assistant
│           ├── TextBlock.tsx          # Add .session-text-block, .session-text-content
│           └── ToolCollapsibleWrapper.tsx  # Add .session-tool-wrapper, .session-tool-header
```

### Integration Points

**Settings System**:
- `apps/app/src/server/routes/settings.ts` - Extend schema with theme enum
- `apps/app/src/client/hooks/useSettings.ts` - Update TypeScript types
- `apps/app/src/client/pages/settings/SettingsDialog.tsx` - Add theme selector

**Session Components**:
- `apps/app/src/client/pages/projects/sessions/components/session/MessageList.tsx` - Container
- `apps/app/src/client/pages/projects/sessions/components/session/claude/` - Message components

**Theme Loading**:
- `apps/app/src/client/hooks/useThemeLoader.ts` - NEW: Dynamic CSS injection
- `apps/app/public/themes/` - Theme CSS files served statically

## Implementation Details

### 1. Settings Backend Extension

Update existing settings schema to include theme selection:
- Replace `default_theme: "light" | "dark" | "system"` with expanded enum
- New values: `"default-light"`, `"default-dark"`, `"terminal"`, `"compact"`
- Update Zod schema validation
- Update TypeScript types on frontend

**Key Points**:
- Maintain backward compatibility by migrating existing `"light"` → `"default-light"`, `"dark"` → `"default-dark"`
- Keep existing GET/PATCH routes unchanged
- Update DEFAULT_USER_PREFERENCES constant

### 2. Theme CSS Files

Create 4 theme files in `apps/app/src/client/styles/themes/`:

**Structure per file**:
```css
/* 1. Copy entire tweakcn :root block (40+ variables) */
:root { --background: ...; --foreground: ...; }

/* 2. Copy .dark block if dark theme */
.dark { --background: ...; }

/* 3. Copy @theme inline block */
@theme inline { --color-background: var(--background); }

/* 4. Session-specific overrides */
.session-text-content { font-family: var(--font-mono); padding: 0.5rem; }
```

**Terminal theme specifics**:
- Use dark color palette from tweakcn
- Override font-family to monospace
- Reduce padding by 50%
- Remove border-radius (sharp corners)
- Tighter line-height (1.4)

**Compact theme specifics**:
- Use light color palette
- Reduce font-size to 13px
- Reduce padding by 40%
- Tighter spacing between elements

**Key Points**:
- Each file is completely self-contained
- Can copy/paste new themes from tweakcn.com directly
- Session overrides only affect `.session-*` classes

### 3. Dynamic Theme Loading Hook

Create `useThemeLoader()` hook to:
- Read `theme` from user settings
- On mount/change: remove old theme `<link>` tag, inject new one
- Handle loading states and errors
- Apply theme to document head

**Key Points**:
- Use unique ID for theme link tag: `<link id="app-theme" ...>`
- Load from `/themes/theme-{name}.css`
- Ensure CSS loads before rendering to prevent FOUC
- Handle missing theme files gracefully (fallback to default)

### 4. Session Component Classes

Add CSS classes to 5 core components:

**MessageList.tsx**: `.session-message-list` on container
**UserMessage.tsx**: `.session-message-user` on wrapper, `.session-bubble` on bubble
**AssistantMessage.tsx**: `.session-message-assistant` on wrapper
**TextBlock.tsx**: `.session-text-block` on wrapper, `.session-text-content` on prose container, `.session-dot-indicator` on dot
**ToolCollapsibleWrapper.tsx**: `.session-tool-wrapper` on container, `.session-tool-header` on header, `.session-tool-content` on content area

**Key Points**:
- Add classes alongside existing Tailwind classes
- Don't remove existing styles
- Classes provide hook points for theme CSS
- Maintain existing component functionality

### 5. Theme Selector UI

Add dropdown to settings dialog:
- Options: "Default Light", "Default Dark", "Terminal", "Compact"
- Use existing `useUpdateSettings()` mutation
- Show preview thumbnails (optional Phase 2 enhancement)
- Persist selection to database

**Key Points**:
- Use shadcn Select component
- Update immediately on selection (optimistic UI)
- Handle loading/error states
- Show current theme as selected

## Files to Create/Modify

### New Files (5)

1. `apps/app/src/client/hooks/useThemeLoader.ts` - Dynamic theme loading hook
2. `apps/app/src/client/styles/themes/theme-default-light.css` - Default light theme
3. `apps/app/src/client/styles/themes/theme-default-dark.css` - Default dark theme
4. `apps/app/src/client/styles/themes/theme-terminal.css` - Terminal theme (dark + monospace)
5. `apps/app/src/client/styles/themes/theme-compact.css` - Compact theme (light + dense)

### Modified Files (9)

1. `apps/app/src/server/routes/settings.ts` - Update schema with theme enum
2. `apps/app/src/client/hooks/useSettings.ts` - Update UserPreferences type
3. `apps/app/src/client/pages/projects/sessions/components/session/MessageList.tsx` - Add .session-message-list
4. `apps/app/src/client/pages/projects/sessions/components/session/claude/UserMessage.tsx` - Add .session-message-user, .session-bubble
5. `apps/app/src/client/pages/projects/sessions/components/session/claude/AssistantMessage.tsx` - Add .session-message-assistant
6. `apps/app/src/client/pages/projects/sessions/components/session/claude/TextBlock.tsx` - Add .session-text-block, .session-text-content, .session-dot-indicator
7. `apps/app/src/client/pages/projects/sessions/components/session/claude/ToolCollapsibleWrapper.tsx` - Add .session-tool-wrapper, .session-tool-header, .session-tool-content
8. `apps/app/src/client/pages/settings/SettingsDialog.tsx` - Add theme selector dropdown
9. `apps/app/src/client/main.tsx` - Integrate useThemeLoader hook

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Settings Backend

**Phase Complexity**: 6 points (avg 3.0/10)

- [ ] 1.1 [4/10] Update settings schema to support theme enum
  - Modify `settingsPatchSchema` in `apps/app/src/server/routes/settings.ts`
  - Change `default_theme` to `theme` with expanded enum: `z.enum(["default-light", "default-dark", "terminal", "compact"])`
  - Update `DEFAULT_USER_PREFERENCES` constant with `theme: "default-light"`
  - Add migration logic to convert old values: `"light"` → `"default-light"`, `"dark"` → `"default-dark"`

- [ ] 1.2 [2/10] Update frontend settings types
  - Modify `UserPreferences` interface in `apps/app/src/client/hooks/useSettings.ts`
  - Change `default_theme: "light" | "dark" | "system"` to `theme: "default-light" | "default-dark" | "terminal" | "compact"`
  - Update DEFAULT_USER_PREFERENCES to match backend

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 2: Theme Infrastructure

**Phase Complexity**: 15 points (avg 5.0/10)

- [ ] 2.1 [5/10] Create default-light theme CSS file
  - Create `apps/app/src/client/styles/themes/theme-default-light.css`
  - Copy entire tweakcn light theme CSS (`:root` + `@theme inline` blocks)
  - Get CSS from: https://tweakcn.com/editor/theme?tab=ai
  - Add session class definitions at bottom (empty for now, will populate in Phase 4/5):
    ```css
    /* Session overrides */
    .session-text-content {}
    .session-tool-header {}
    ```
  - Verify file is ~150 lines

- [ ] 2.2 [5/10] Create default-dark theme CSS file
  - Create `apps/app/src/client/styles/themes/theme-default-dark.css`
  - Copy entire tweakcn dark theme CSS (`:root` + `.dark` + `@theme inline` blocks)
  - Add empty session class definitions at bottom
  - Verify file is ~200 lines

- [ ] 2.3 [6/10] Create useThemeLoader hook
  - Create `apps/app/src/client/hooks/useThemeLoader.ts`
  - Hook reads `theme` from `useSettings()`
  - On mount/change: remove existing `<link id="app-theme">`, inject new link pointing to `/themes/theme-{name}.css`
  - Handle loading states and missing files (fallback to default-light)
  - Return `{ isLoading, error }` for UI feedback
  - Integrate into `apps/app/src/client/main.tsx` (call at app root level)

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 3: Core Components

**Phase Complexity**: 15 points (avg 3.0/10)

- [ ] 3.1 [3/10] Add session-message-list class to MessageList
  - File: `apps/app/src/client/pages/projects/sessions/components/session/MessageList.tsx`
  - Add `session-message-list` class to main container div
  - Keep all existing Tailwind classes

- [ ] 3.2 [4/10] Add session classes to UserMessage
  - File: `apps/app/src/client/pages/projects/sessions/components/session/claude/UserMessage.tsx`
  - Add `session-message-user` class to wrapper
  - Add `session-bubble` class to message bubble div
  - Keep existing classes

- [ ] 3.3 [3/10] Add session-message-assistant class to AssistantMessage
  - File: `apps/app/src/client/pages/projects/sessions/components/session/claude/AssistantMessage.tsx`
  - Add `session-message-assistant` class to wrapper
  - Keep existing classes

- [ ] 3.4 [2/10] Add session classes to TextBlock
  - File: `apps/app/src/client/pages/projects/sessions/components/session/claude/TextBlock.tsx`
  - Add `session-text-block` to wrapper
  - Add `session-text-content` to prose container
  - Add `session-dot-indicator` to colored dot element
  - Keep existing classes

- [ ] 3.5 [3/10] Add session classes to ToolCollapsibleWrapper
  - File: `apps/app/src/client/pages/projects/sessions/components/session/claude/ToolCollapsibleWrapper.tsx`
  - Add `session-tool-wrapper` to main container
  - Add `session-tool-header` to header div
  - Add `session-tool-content` to content area
  - Keep existing classes

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 4: Terminal Theme

**Phase Complexity**: 8 points (avg 4.0/10)

- [ ] 4.1 [5/10] Create terminal theme CSS file
  - Create `apps/app/src/client/styles/themes/theme-terminal.css`
  - Copy tweakcn dark theme CSS as base
  - Add session overrides at bottom:
    ```css
    /* Terminal-specific overrides */
    .session-text-content {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      line-height: 1.4;
      padding: 0.5rem;
    }
    .session-tool-header {
      padding: 0.375rem 0.75rem;
      border-radius: 0;
    }
    .session-tool-content {
      padding: 0.5rem 0.75rem;
    }
    .session-message-list {
      gap: 0.25rem;
    }
    ```
  - Test: Switch to terminal theme, verify monospace font and tight spacing

- [ ] 4.2 [3/10] Verify terminal theme in session UI
  - Manual test: Load session page with terminal theme
  - Verify: Monospace font applied to text content
  - Verify: Reduced padding on tool headers/content
  - Verify: Sharp corners (no border radius)
  - Verify: Tighter spacing between messages

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 5: Compact Theme

**Phase Complexity**: 7 points (avg 3.5/10)

- [ ] 5.1 [4/10] Create compact theme CSS file
  - Create `apps/app/src/client/styles/themes/theme-compact.css`
  - Copy tweakcn light theme CSS as base
  - Add session overrides:
    ```css
    /* Compact-specific overrides */
    .session-text-content {
      font-size: 0.8125rem;
      line-height: 1.35;
      padding: 0.625rem;
    }
    .session-tool-header {
      padding: 0.5rem 0.875rem;
    }
    .session-tool-content {
      padding: 0.625rem 0.875rem;
    }
    .session-message-list {
      gap: 0.375rem;
    }
    ```
  - Test: Switch to compact theme, verify smaller text and reduced spacing

- [ ] 5.2 [3/10] Verify compact theme in session UI
  - Manual test: Load session page with compact theme
  - Verify: Smaller font size (13px)
  - Verify: Reduced but readable spacing
  - Verify: Sans-serif font maintained
  - Verify: Light color palette

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

### Phase 6: UI Controls

**Phase Complexity**: 6 points (avg 3.0/10)

- [ ] 6.1 [4/10] Add theme selector to settings dialog
  - File: `apps/app/src/client/pages/settings/SettingsDialog.tsx`
  - Add Select component with options: "Default Light", "Default Dark", "Terminal", "Compact"
  - Use `useUpdateSettings()` mutation on selection
  - Show current theme as selected
  - Add loading state during mutation

- [ ] 6.2 [2/10] Test theme switching end-to-end
  - Manual test: Open settings, select each theme
  - Verify: CSS file loads correctly for each theme
  - Verify: Session UI updates immediately
  - Verify: Selection persists after page reload
  - Verify: No console errors during theme switch

#### Completion Notes

- What was implemented:
- Deviations from plan (if any):
- Important context or decisions:
- Known issues or follow-ups (if any):

## Testing Strategy

### Unit Tests

**`useThemeLoader.test.ts`** - Hook behavior:
```typescript
describe('useThemeLoader', () => {
  it('should load default-light theme by default', () => {
    // Test default theme loads
  });

  it('should switch themes when setting changes', () => {
    // Test dynamic theme switching
  });

  it('should handle missing theme files gracefully', () => {
    // Test fallback to default
  });
});
```

### Integration Tests

**Settings API Integration**:
- Test PATCH /api/settings with new theme values
- Verify theme persists to database
- Verify GET /api/settings returns correct theme

### E2E Tests

**`session-theme-switching.e2e.test.ts`** - Full user flow:
```typescript
test('user can switch session themes', async ({ page }) => {
  await page.goto('/projects/123/sessions/456');
  await page.click('[data-testid="settings-button"]');
  await page.selectOption('[data-testid="theme-select"]', 'terminal');

  // Verify terminal theme applied
  const textContent = page.locator('.session-text-content');
  await expect(textContent).toHaveCSS('font-family', /Monaco|Courier/);
});
```

## Success Criteria

- [ ] User can select from 4 themes in settings dialog
- [ ] Theme selection persists to database and across sessions
- [ ] Default Light theme matches current light mode styling
- [ ] Default Dark theme matches current dark mode styling
- [ ] Terminal theme shows monospace font, tight spacing, sharp corners
- [ ] Compact theme shows smaller text, reduced spacing, light palette
- [ ] CSS files load without errors in browser console
- [ ] Theme switching updates UI immediately without page reload
- [ ] 5 core session components render correctly in all themes
- [ ] No regression in existing session functionality
- [ ] TypeScript compilation succeeds with no errors
- [ ] All existing tests pass

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Build verification
pnpm build
# Expected: Successful build with no errors

# Type checking
pnpm check-types
# Expected: No type errors

# Linting
pnpm --filter app lint
# Expected: No lint errors

# Unit tests
pnpm --filter app test
# Expected: All tests pass including new useThemeLoader tests
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: `http://localhost:5173/projects/{id}/sessions/{id}`
3. Open settings dialog
4. Verify: Theme dropdown shows 4 options
5. Test each theme:
   - Select "Terminal" → Verify monospace font, tight spacing
   - Select "Compact" → Verify smaller text, reduced padding
   - Select "Default Light" → Verify light palette, normal spacing
   - Select "Default Dark" → Verify dark palette, normal spacing
6. Reload page: Verify theme persists
7. Check console: No errors or warnings
8. Check Network tab: Verify CSS file loads (e.g., `/themes/theme-terminal.css`)

**Feature-Specific Checks:**

- Verify `.session-*` classes are present in DOM (inspect element)
- Verify theme CSS variables are applied to `:root` (inspect computed styles)
- Test theme switching multiple times (no memory leaks)
- Verify tool blocks, text blocks, user messages all styled consistently
- Check that existing functionality (collapsing tools, copying text) still works

## Implementation Notes

### 1. CSS File Serving

Theme CSS files must be publicly accessible. Options:
- **Option A**: Place in `apps/app/public/themes/` (simpler, Vite serves automatically)
- **Option B**: Import in component and use Vite's URL import (more complex)

Recommend Option A for simplicity.

### 2. Migration Strategy

Existing users have `default_theme: "light" | "dark" | "system"`. Migration:
- Add migration in settings route to map old values
- `"light"` → `"default-light"`
- `"dark"` → `"default-dark"`
- `"system"` → `"default-light"` (default)

### 3. FOUC Prevention

Flash of unstyled content can occur during theme load. Mitigate:
- Load theme CSS in `<head>` before React renders
- Show loading state while theme loads
- Use SSR or preload link tags (future enhancement)

### 4. Future Enhancements

After Phase 1 validation:
- Add remaining 44 session components (tool blocks, renderers)
- Add more themes from tweakcn.com (Rose, Blue, Green, etc.)
- Add theme preview thumbnails in settings
- Support custom user themes (upload CSS)

## Dependencies

- No new npm dependencies required
- Uses existing shadcn Select component
- Uses existing settings API and hooks
- Uses Tailwind v4 CSS variables (already configured)

## References

- tweakcn.com: https://tweakcn.com/editor/theme?tab=ai
- shadcn/ui themes: https://ui.shadcn.com/themes
- Tailwind CSS Variables: https://tailwindcss.com/docs/customizing-colors#using-css-variables
- Current settings system: `apps/app/src/server/routes/settings.ts`
- Session components directory: `apps/app/src/client/pages/projects/sessions/components/session/`

## Next Steps

1. Review and approve this spec
2. Run `/cmd:implement-spec 2511190555` to begin implementation
3. Complete Phase 1-2 (settings + infrastructure) first
4. Test with Phase 3 (core components)
5. Validate approach before expanding to remaining components
6. Add Phase 4-6 (themes + UI) once core works
