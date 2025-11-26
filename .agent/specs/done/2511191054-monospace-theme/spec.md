# Monospace Theme

**Status**: review
**Created**: 2025-11-19
**Package**: apps/app
**Total Complexity**: 23 points
**Phases**: 3
**Tasks**: 10
**Overall Avg Complexity**: 2.3/10

## Complexity Breakdown

| Phase                     | Tasks | Total Points | Avg Complexity | Max Task |
| ------------------------- | ----- | ------------ | -------------- | -------- |
| Phase 1: Backend Schema   | 1     | 2            | 2.0/10         | 2/10     |
| Phase 2: CSS Theme        | 5     | 14           | 2.8/10         | 4/10     |
| Phase 3: Frontend UI      | 4     | 7            | 1.8/10         | 2/10     |
| **Total**                 | **10**| **23**       | **2.3/10**     | **4/10** |

## Overview

Add "monospace" theme with pure grayscale colors, monospace fonts throughout (including prose content), zero border radius, and flat design (no shadows). Provides terminal-like aesthetic for users who prefer code-focused interface.

## User Story

As a developer
I want a monospace theme option
So that the interface looks more like a terminal/code editor with consistent monospace fonts

## Technical Approach

Use existing theme system architecture (`data-theme` attribute on `:root`). Add "monospace" to backend enum, define grayscale CSS variables in `index.css`, add font-family mappings to `@theme inline`, update frontend types, and add UI selector.

## Key Design Decisions

1. **Grayscale palette**: Pure black/white/gray (chroma = 0) for minimal distraction
2. **Font system via @theme inline**: Leverage Tailwind v4's theme system for automatic font cascade to all utilities including prose
3. **Zero radius/shadows**: Flat design with sharp corners matches terminal aesthetic
4. **Geist Mono with fallbacks**: Primary font with system monospace fallbacks for broader compatibility

## Architecture

### File Structure
```
apps/app/src/
├── server/
│   └── routes/
│       └── settings.ts              # Add "monospace" to enum
├── client/
│   ├── index.css                    # Theme CSS + font mapping
│   ├── hooks/
│   │   └── useSettings.ts           # Update type
│   └── components/
│       └── SettingsDialog.tsx       # UI + theme application
```

### Integration Points

**Backend (Settings)**:
- `settings.ts` - Add "monospace" to `session_theme` enum

**Frontend (CSS)**:
- `index.css` - Add font mappings to `@theme inline`, define monospace theme colors

**Frontend (Types & UI)**:
- `useSettings.ts` - Update TypeScript type
- `SettingsDialog.tsx` - Add dropdown option, theme application logic

## Implementation Details

### 1. Backend Schema

Add "monospace" to the `session_theme` Zod enum to allow backend to accept and store the new theme value.

**Key Points**:
- Line 22 in `settings.ts`
- Simple enum addition
- No database migration needed (JSON field)

### 2. CSS Theme Definition

Add monospace theme CSS variables for both light and dark modes. Use pure grayscale colors (chroma = 0) with Geist Mono font family.

**Key Points**:
- Pure OKLCH grayscale (chroma = 0)
- All 34 required CSS variables
- Zero border radius (--radius: 0rem)
- Font variables for Geist Mono with fallbacks
- Selector: `:root[data-theme="monospace"]` and `:root[data-theme="monospace"].dark`

### 3. Font Mapping System

Add font-family variables to `@theme inline` block so Tailwind utilities and prose plugin automatically use theme-specific fonts.

**Key Points**:
- Maps `--font-sans`, `--font-serif`, `--font-mono` to theme system
- Enables automatic font cascade to all Tailwind utilities
- Typography plugin respects mapped fonts
- No need for direct `.prose` overrides

### 4. Frontend Types

Update TypeScript types to include "monospace" as valid `session_theme` value.

**Key Points**:
- Type safety for settings mutations
- Prevents type errors in components
- Consistent with backend schema

### 5. Settings UI

Add "Monospace" option to theme dropdown and update theme application logic in both save handler and mount effect.

**Key Points**:
- Dropdown `<SelectItem>` for "monospace"
- Type cast in mutation (line 57)
- Theme application in `handleSave` (line 66-70)
- Theme application in `useEffect` (for mount)

## Files to Create/Modify

### New Files (0)

None - all changes to existing files

### Modified Files (4)

1. `apps/app/src/server/routes/settings.ts` - Add "monospace" to enum
2. `apps/app/src/client/index.css` - Add theme CSS + font mapping
3. `apps/app/src/client/hooks/useSettings.ts` - Update type
4. `apps/app/src/client/components/SettingsDialog.tsx` - Add UI option + logic

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Backend Schema

**Phase Complexity**: 2 points (avg 2.0/10)

- [x] 1.1 [2/10] Add "monospace" to session_theme enum
  - Update Zod enum in `userPreferencesSchema`
  - File: `apps/app/src/server/routes/settings.ts`
  - Line 22: Change `z.enum(["default", "nature"])` to `z.enum(["default", "nature", "monospace"])`

#### Completion Notes

- Added "monospace" to session_theme enum in backend schema
- No database migration needed (stored in JSON field)
- Backend now accepts and validates monospace theme value

### Phase 2: CSS Theme

**Phase Complexity**: 14 points (avg 2.8/10)

- [x] 2.1 [4/10] Add font-family variables to @theme inline
  - Add `--font-sans`, `--font-serif`, `--font-mono` mappings
  - File: `apps/app/src/client/index.css`
  - Add after line 42 (in `@theme inline` block):
    ```css
    --font-sans: var(--font-sans);
    --font-serif: var(--font-serif);
    --font-mono: var(--font-mono);
    ```
  - This enables Tailwind utilities and prose to respect theme fonts

- [x] 2.2 [3/10] Add monospace theme light mode CSS
  - File: `apps/app/src/client/index.css`
  - Add after nature theme (~line 215)
  - Use selector: `:root[data-theme="monospace"]`
  - Include all 34 color variables (grayscale, chroma = 0)
  - Include font overrides: `--font-sans`, `--font-serif`, `--font-mono` set to `Geist Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`
  - Include `--radius: 0rem`

- [x] 2.3 [3/10] Add monospace theme dark mode CSS
  - File: `apps/app/src/client/index.css`
  - Add after light mode definition
  - Use selector: `:root[data-theme="monospace"].dark`
  - Include all 34 color variables (grayscale dark mode)
  - Include same font overrides as light mode
  - Include `--radius: 0rem`

- [x] 2.4 [2/10] Verify CSS variable completeness
  - Check that both light and dark modes have all 34 variables
  - Required vars: background, foreground, card, card-foreground, popover, popover-foreground, primary, primary-foreground, secondary, secondary-foreground, muted, muted-foreground, accent, accent-foreground, destructive, destructive-foreground, border, input, ring, chart-1 through chart-5, sidebar, sidebar-foreground, sidebar-primary, sidebar-primary-foreground, sidebar-accent, sidebar-accent-foreground, sidebar-border, sidebar-ring
  - Verify OKLCH format and chroma = 0 for grayscale

- [x] 2.5 [2/10] Test CSS syntax
  - Run: `pnpm dev:client`
  - Check browser console for CSS errors
  - Verify no syntax errors in theme definitions

#### Completion Notes

- Added font mappings to @theme inline for automatic cascade
- Implemented full monospace theme with all 34 CSS variables for light and dark modes
- All colors use pure grayscale (chroma = 0) in OKLCH format
- Zero border radius and monospace fonts (Geist Mono with fallbacks)
- Font variables enable automatic application to all Tailwind utilities including prose

### Phase 3: Frontend Types & UI

**Phase Complexity**: 7 points (avg 1.8/10)

- [x] 3.1 [2/10] Update useSettings type
  - File: `apps/app/src/client/hooks/useSettings.ts`
  - Line 28: Change `session_theme: 'default' | 'nature'` to `'default' | 'nature' | 'monospace'`

- [x] 3.2 [2/10] Update SettingsDialog type cast
  - File: `apps/app/src/client/components/SettingsDialog.tsx`
  - Line 57: Change type cast to `session_theme: sessionTheme as 'default' | 'nature' | 'monospace'`

- [x] 3.3 [2/10] Add theme application logic
  - File: `apps/app/src/client/components/SettingsDialog.tsx`
  - Update `handleSave` function (around line 66-70)
  - Add conditional: `else if (sessionTheme === 'monospace') { root.setAttribute('data-theme', 'monospace'); }`
  - Update `useEffect` with same logic (for mount)

- [x] 3.4 [1/10] Add dropdown option
  - File: `apps/app/src/client/components/SettingsDialog.tsx`
  - Add `<SelectItem value="monospace">Monospace</SelectItem>` to theme dropdown
  - Should be after "Nature" option

#### Completion Notes

- Updated TypeScript types to include monospace theme
- Added theme application logic in both handleSave and useEffect mount
- Added Monospace option to Settings dialog dropdown
- Theme correctly applies data-theme="monospace" attribute to root element

## Testing Strategy

### Manual Testing

**Theme Selection:**
- Open Settings dialog
- Select "Monospace" from Session Theme dropdown
- Click Save
- Verify entire UI switches to grayscale with monospace fonts

**Light/Dark Mode:**
- Toggle between Light/Dark/System in Theme dropdown
- Verify monospace theme works in both modes
- Check that colors are properly grayscale

**Session Content:**
- Navigate to a session
- Verify prose content uses monospace font
- Check thinking blocks, tool blocks, code blocks all use monospace
- Verify no italic styling in thinking blocks (overridden)

**Persistence:**
- Select monospace theme, save, refresh browser
- Verify theme persists after refresh
- Check that `data-theme="monospace"` is on `<html>` element

### Browser DevTools Checks

**Inspect HTML:**
```bash
# Check data-theme attribute
document.documentElement.getAttribute('data-theme')
# Should return: "monospace"
```

**Inspect Computed Styles:**
```bash
# Check background color
getComputedStyle(document.documentElement).getPropertyValue('--background')
# Should return grayscale OKLCH value

# Check font family
getComputedStyle(document.querySelector('.prose')).fontFamily
# Should include "Geist Mono" or monospace fallback
```

## Success Criteria

- [ ] Backend accepts "monospace" in session_theme enum
- [ ] Monospace theme CSS defined for light and dark modes
- [ ] Font mapping in @theme inline enables cascade to prose
- [ ] All 34 CSS variables defined with grayscale colors
- [ ] Frontend types updated (no TypeScript errors)
- [ ] Dropdown shows "Monospace" option
- [ ] Selecting monospace applies `data-theme="monospace"` to `:root`
- [ ] Theme persists after browser refresh
- [ ] Prose content uses monospace fonts
- [ ] UI has zero border radius and no shadows
- [ ] Build succeeds with no errors
- [ ] Type checking passes

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm --filter app check-types
# Expected: No type errors

# Build verification
pnpm --filter app build
# Expected: Successful build, no CSS errors

# Linting
pnpm --filter app lint
# Expected: No lint errors
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: Settings dialog (gear icon in sidebar)
3. Verify: "Monospace" appears in Session Theme dropdown
4. Select "Monospace" and click Save
5. Verify: Entire UI switches to grayscale with monospace fonts
6. Check browser DevTools: `document.documentElement.getAttribute('data-theme')` returns `"monospace"`
7. Toggle Light/Dark mode: Verify theme works in both modes
8. Navigate to a session: Verify prose, thinking blocks, code all use monospace
9. Refresh browser: Verify theme persists

**Feature-Specific Checks:**

- Inspect `<html>` element: Should have `data-theme="monospace"` attribute
- Check computed `--background` value: Should be OKLCH with chroma = 0 (grayscale)
- Check font-family on `.prose`: Should include Geist Mono or monospace fallback
- Verify `--radius` value: Should be `0rem`
- Check button/card corners: Should be sharp (no rounding)
- Verify no box shadows on UI elements

## Implementation Notes

### 1. Why @theme inline for Fonts?

Tailwind v4's `@theme inline` system maps CSS variables to utilities. By adding `--font-sans`, `--font-serif`, `--font-mono` to `@theme inline`, the typography plugin and all font utilities automatically respect theme-specific font families. This eliminates need for direct `.prose` overrides.

### 2. Grayscale OKLCH Format

All monospace theme colors use `oklch(lightness 0 0)` format where chroma = 0 creates pure grayscale. This ensures minimal visual distraction and clean aesthetic.

### 3. Font Fallback Chain

`Geist Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` provides progressive fallback from Geist Mono (preferred) to system monospace fonts, ensuring consistent monospace rendering across platforms.

### 4. Theme Persistence

Theme value stored in `User.settings.session_theme` (database JSON field). SettingsDialog's `useEffect` applies theme on mount by reading settings and setting `data-theme` attribute.

## Dependencies

- Geist Mono font (optional, has fallbacks to system fonts)
- No new npm dependencies required

## References

- `.agent/docs/theme-system.md` - Complete theme system documentation
- `.agent/docs/adding-session-themes.md` - Session theme customization guide
- User-provided CSS from conversation (grayscale monospace theme definition)

## Next Steps

1. Implement Phase 1: Backend schema update
2. Implement Phase 2: CSS theme definition with font mapping
3. Implement Phase 3: Frontend types and UI
4. Manual verification with browser refresh test
5. Document in theme-system.md (optional)
