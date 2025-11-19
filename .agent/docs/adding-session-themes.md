# Adding Session Themes

Guide for adding new session themes to the application.

## Overview

Session themes allow users to customize the visual style of session messages independently from the global light/dark mode. Each session theme supports both light and dark variants.

**Current Architecture:**
- Single `index.css` file with scoped CSS variables
- Themes use `[data-session-theme="name"]` attribute selector
- Works alongside `next-themes` for light/dark mode (`.dark` class)
- Settings stored in backend, applied via `data-session-theme` on `.chat-container`

## Adding a New Theme

Follow these 4 steps to add a new session theme:

### 1. Backend: Add Theme to Enum

**File:** `apps/app/src/server/routes/settings.ts`

Add your theme name to the `session_theme` enum:

```typescript
const userPreferencesSchema = z.object({
  // ... other fields ...
  session_theme: z.enum(["default", "nature", "ocean"]), // Add "ocean" here
  // ... other fields ...
});
```

### 2. CSS: Add Theme Variables

**File:** `apps/app/src/client/index.css`

Add your theme CSS at the bottom, after existing session themes:

```css
/* Ocean theme - light mode */
[data-session-theme="ocean"] {
  --background: oklch(0.98 0.02 220);
  --foreground: oklch(0.2 0.05 220);
  --card: oklch(0.98 0.02 220);
  --card-foreground: oklch(0.2 0.05 220);
  --popover: oklch(0.98 0.02 220);
  --popover-foreground: oklch(0.2 0.05 220);
  --primary: oklch(0.6 0.15 200);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.96 0.03 210);
  --secondary-foreground: oklch(0.4 0.12 200);
  --muted: oklch(0.94 0.02 215);
  --muted-foreground: oklch(0.45 0.05 220);
  --accent: oklch(0.88 0.06 205);
  --accent-foreground: oklch(0.4 0.12 200);
  --destructive: oklch(0.54 0.19 27);
  --destructive-foreground: oklch(1 0 0);
  --border: oklch(0.88 0.03 215);
  --input: oklch(0.88 0.03 215);
  --ring: oklch(0.6 0.15 200);
  --chart-1: oklch(0.67 0.16 200);
  --chart-2: oklch(0.58 0.14 205);
  --chart-3: oklch(0.52 0.13 200);
  --chart-4: oklch(0.43 0.12 200);
  --chart-5: oklch(0.22 0.05 210);
  --sidebar: oklch(0.94 0.02 215);
  --sidebar-foreground: oklch(0.2 0.05 220);
  --sidebar-primary: oklch(0.6 0.15 200);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.88 0.06 205);
  --sidebar-accent-foreground: oklch(0.4 0.12 200);
  --sidebar-border: oklch(0.88 0.03 215);
  --sidebar-ring: oklch(0.6 0.15 200);
}

/* Ocean theme - dark mode */
[data-session-theme="ocean"].dark {
  --background: oklch(0.15 0.03 220);
  --foreground: oklch(0.95 0.02 200);
  --card: oklch(0.2 0.03 215);
  --card-foreground: oklch(0.95 0.02 200);
  /* ... copy all variables from light mode and adjust for dark ... */
}
```

**Required CSS Variables:**

All session themes must define these variables (copy from existing themes and adjust colors):

**Core Colors:**
- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`

**UI Elements:**
- `--border`, `--input`, `--ring`

**Charts:**
- `--chart-1` through `--chart-5`

**Sidebar:**
- `--sidebar`, `--sidebar-foreground`
- `--sidebar-primary`, `--sidebar-primary-foreground`
- `--sidebar-accent`, `--sidebar-accent-foreground`
- `--sidebar-border`, `--sidebar-ring`

### 3. Frontend: Update Type

**File:** `apps/app/src/client/hooks/useSettings.ts`

Add your theme to the TypeScript type:

```typescript
interface UserPreferences {
  // ... other fields ...
  session_theme: 'default' | 'nature' | 'ocean'; // Add "ocean" here
  // ... other fields ...
}
```

### 4. Settings UI: Add Option

**File:** `apps/app/src/client/components/SettingsDialog.tsx`

**Step 4a:** Update the mutation type cast:

```typescript
const handleSave = async () => {
  try {
    await updateSettings.mutateAsync({
      // ... other fields ...
      session_theme: sessionTheme as 'default' | 'nature' | 'ocean', // Add "ocean"
      // ... other fields ...
    });
    // ...
  }
};
```

**Step 4b:** Add dropdown option:

```tsx
<SelectContent>
  <SelectItem value="default">Default</SelectItem>
  <SelectItem value="nature">Nature</SelectItem>
  <SelectItem value="ocean">Ocean</SelectItem> {/* Add this line */}
</SelectContent>
```

## Testing Your Theme

1. **Start the dev server:**
   ```bash
   pnpm dev
   ```

2. **Open Settings:** Click Settings icon in the app

3. **Select your theme:** Choose your new theme from "Session Theme" dropdown

4. **Test both modes:** Toggle between Light/Dark mode to verify both variants

5. **Check all components:** Navigate through sessions to see theme applied to:
   - User messages (right-aligned bubbles)
   - Assistant messages (left-aligned)
   - Code blocks
   - Tool use blocks
   - Thinking blocks
   - Error messages

## Color Guidelines

### Using OKLCH Format

All colors use OKLCH format for better perceptual uniformity:

```css
oklch(lightness chroma hue)
```

- **Lightness:** 0-1 (0 = black, 1 = white)
- **Chroma:** 0-0.4 (0 = gray, higher = more saturated)
- **Hue:** 0-360 (color wheel degrees)

**Examples:**
- Green: `oklch(0.6 0.15 140)`
- Blue: `oklch(0.6 0.15 220)`
- Red: `oklch(0.6 0.15 20)`

### Theme Design Tips

1. **Start with a base color palette:**
   - Pick 1-2 primary hues (e.g., 140° for green, 220° for blue)
   - Vary lightness for different shades
   - Keep chroma consistent for cohesion

2. **Light mode guidelines:**
   - Background: 0.95-1.0 lightness (very light)
   - Foreground: 0.2-0.3 lightness (dark text)
   - Primary: 0.5-0.6 lightness (medium brightness)

3. **Dark mode guidelines:**
   - Background: 0.15-0.3 lightness (dark but not black)
   - Foreground: 0.9-0.95 lightness (light text)
   - Primary: 0.6-0.7 lightness (brighter for dark bg)

4. **Ensure sufficient contrast:**
   - WCAG AA requires 4.5:1 for normal text
   - Test with browser DevTools contrast checker

## Theme Ideas

**Terminal:**
- Green monochrome (like old CRT terminals)
- Black background, bright green text
- Courier/Monaco monospace fonts

**Sunset:**
- Warm orange/pink gradient
- Sandy beige backgrounds
- Coral and peach accents

**Ocean:**
- Blues and teals
- Deep sea dark mode, beach light mode
- Cyan and aqua highlights

**Forest:**
- Deep greens and browns
- Earthy, natural tones
- Moss and bark colors

**Cyberpunk:**
- Neon pink/cyan on dark backgrounds
- High contrast, vibrant
- Futuristic, electric feel

## Troubleshooting

### Theme not applying

1. Check browser DevTools:
   - Inspect `.chat-container` element
   - Verify `data-session-theme="your-theme"` attribute is present
   - Check if CSS variables are defined in Styles panel

2. Clear cache and hard reload (Cmd+Shift+R / Ctrl+Shift+R)

3. Verify settings are saved:
   - Open Settings dialog
   - Check if your theme is selected
   - Click Save again

### Colors look wrong

1. **OKLCH values out of range:**
   - Lightness must be 0-1
   - Chroma typically 0-0.4
   - Hue is 0-360

2. **Missing variables:**
   - Ensure all 34 required variables are defined
   - Copy from existing theme as template

3. **Dark mode not working:**
   - Ensure `.dark` combinator is used: `[data-session-theme="name"].dark`
   - Test by toggling Theme in Settings

### Type errors

1. **Backend enum mismatch:**
   - Verify theme added to `z.enum()` in `settings.ts`

2. **Frontend type mismatch:**
   - Verify theme added to union type in `useSettings.ts`
   - Verify type cast in `SettingsDialog.tsx` includes your theme

## Related Files

- **Backend Schema:** `apps/app/src/server/routes/settings.ts`
- **CSS Themes:** `apps/app/src/client/index.css` (lines 140+)
- **Frontend Types:** `apps/app/src/client/hooks/useSettings.ts`
- **Settings UI:** `apps/app/src/client/components/SettingsDialog.tsx`
- **Theme Application:** `apps/app/src/client/pages/projects/sessions/components/ChatInterface.tsx`

## Example: Complete "Ocean" Theme

See the examples above for a complete implementation of an ocean-themed session theme with both light and dark variants.
