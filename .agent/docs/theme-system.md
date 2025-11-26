# Theme System

Complete guide to the theme system architecture, adding new themes, and customizing session components.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Adding a New Global Theme](#adding-a-new-global-theme)
4. [Session Component Classes](#session-component-classes)
5. [Color Guidelines](#color-guidelines)
6. [Troubleshooting](#troubleshooting)

---

## Overview

The app uses a **two-tier theme system**:

1. **Light/Dark Mode** - Managed by `next-themes` (system/light/dark)
2. **Color Themes** - Custom color palettes (default, nature, etc.)

**Key Features:**
- Global color themes apply to entire app
- Each color theme supports both light and dark modes
- Session components have semantic CSS classes for future customization
- Single `index.css` file - no dynamic loading
- Uses OKLCH color format for perceptual uniformity

**Current Themes:**
- **Default** - Original purple/gray palette
- **Nature** - Green/forest color palette

---

## Architecture

### CSS Structure

**File:** `apps/app/src/client/index.css`

```
├── @theme inline (Tailwind v4 integration)
├── :root (default theme - light mode)
├── .dark (default theme - dark mode)
├── @layer base (global styles)
├── Custom overrides (chat, syntax highlighting)
└── Global app themes (nature, future themes)
```

**How Themes Work:**

1. **Default Theme** (lines 45-112):
   ```css
   :root {
     --background: oklch(...);
     --foreground: oklch(...);
     /* ... 34 CSS variables */
   }

   .dark {
     --background: oklch(...);
     --foreground: oklch(...);
     /* ... 34 CSS variables */
   }
   ```

2. **Custom Themes** (lines 140+):
   ```css
   /* Nature theme - overrides :root when data-theme="nature" is set */
   :root[data-theme="nature"] {
     --background: oklch(...);
     --foreground: oklch(...);
     /* ... 34 CSS variables */
   }

   /* Nature dark mode - combines data-theme with .dark class */
   :root[data-theme="nature"].dark {
     --background: oklch(...);
     --foreground: oklch(...);
     /* ... 34 CSS variables */
   }
   ```

3. **Tailwind Integration** (@theme inline):
   - Maps CSS variables to Tailwind utilities
   - `--background` → `bg-background`, `text-background`
   - `--primary` → `bg-primary`, `text-primary`, etc.

### Theme Application

**File:** `apps/app/src/client/components/SettingsDialog.tsx`

```typescript
// On settings load (useEffect)
const root = document.documentElement;
if (settings.userPreferences.session_theme === 'nature') {
  root.setAttribute('data-theme', 'nature');
} else {
  root.removeAttribute('data-theme');
}

// On save button click
const root = document.documentElement;
if (sessionTheme === 'nature') {
  root.setAttribute('data-theme', 'nature');
} else {
  root.removeAttribute('data-theme');
}
```

**Result:**
- Default theme: `<html class="dark">` (no data-theme attribute)
- Nature theme: `<html class="dark" data-theme="nature">`

### Backend Storage

**File:** `apps/app/src/server/routes/settings.ts`

```typescript
const userPreferencesSchema = z.object({
  // ... other fields
  session_theme: z.enum(["default", "nature"]), // Add new themes here
  // ... other fields
});
```

Stored in `User.settings` JSON field as `session_theme`.

---

## Adding a New Global Theme

Follow these 4 steps to add a new color theme:

### Step 1: Backend - Add to Enum

**File:** `apps/app/src/server/routes/settings.ts`

Add your theme name to the enum:

```typescript
session_theme: z.enum(["default", "nature", "ocean"]), // Add "ocean"
```

### Step 2: CSS - Add Theme Variables

**File:** `apps/app/src/client/index.css`

Add your theme at the bottom (after existing themes):

```css
/* Ocean theme - light mode */
:root[data-theme="ocean"] {
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
:root[data-theme="ocean"].dark {
  --background: oklch(0.15 0.03 220);
  --foreground: oklch(0.95 0.02 200);
  /* ... copy all 34 variables and adjust for dark mode */
}
```

**Required CSS Variables (34 total):**

**Core Colors (10):**
- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--popover`, `--popover-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`

**UI States (6):**
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`

**UI Elements (3):**
- `--border`, `--input`, `--ring`

**Charts (5):**
- `--chart-1`, `--chart-2`, `--chart-3`, `--chart-4`, `--chart-5`

**Sidebar (10):**
- `--sidebar`, `--sidebar-foreground`
- `--sidebar-primary`, `--sidebar-primary-foreground`
- `--sidebar-accent`, `--sidebar-accent-foreground`
- `--sidebar-border`, `--sidebar-ring`

### Step 3: Frontend - Update Type

**File:** `apps/app/src/client/hooks/useSettings.ts`

Add your theme to the TypeScript type:

```typescript
interface UserPreferences {
  // ... other fields
  session_theme: 'default' | 'nature' | 'ocean'; // Add "ocean"
  // ... other fields
}
```

### Step 4: Settings UI - Add Option

**File:** `apps/app/src/client/components/SettingsDialog.tsx`

**4a.** Update the mutation type cast:

```typescript
const handleSave = async () => {
  try {
    await updateSettings.mutateAsync({
      // ... other fields
      session_theme: sessionTheme as 'default' | 'nature' | 'ocean', // Add "ocean"
      // ... other fields
    });

    // Apply theme logic already handles any value
    const root = document.documentElement;
    if (sessionTheme === 'nature') {
      root.setAttribute('data-theme', 'nature');
    } else if (sessionTheme === 'ocean') {
      root.setAttribute('data-theme', 'ocean');
    } else {
      root.removeAttribute('data-theme');
    }
    // ...
  }
};
```

**4b.** Update the useEffect as well:

```typescript
useEffect(() => {
  if (settings?.userPreferences) {
    // ... other settings

    // Apply color theme on mount
    const root = document.documentElement;
    const theme = settings.userPreferences.session_theme;
    if (theme === 'nature') {
      root.setAttribute('data-theme', 'nature');
    } else if (theme === 'ocean') {
      root.setAttribute('data-theme', 'ocean');
    } else {
      root.removeAttribute('data-theme');
    }
  }
}, [settings]);
```

**4c.** Add dropdown option:

```tsx
<SelectContent>
  <SelectItem value="default">Default</SelectItem>
  <SelectItem value="nature">Nature</SelectItem>
  <SelectItem value="ocean">Ocean</SelectItem> {/* Add this */}
</SelectContent>
```

### Done!

Refresh the browser, open Settings, select your new theme, and save. The entire app will use your new color palette.

---

## Session Component Classes

Session message components have semantic CSS classes for future customization. These are currently styled via global CSS variables, but can be targeted for theme-specific styling if needed.

### Available Classes

**Message Container:**
- `.session-message-list` - Container for all messages
- `.session-message-wrapper` - Individual message wrapper (has debug controls)
- `.session-message` - Base class for all messages
- `.session-message-user` - User messages (right-aligned)
- `.session-message-assistant` - Assistant messages (left-aligned)
- `.session-message-error` - Error messages
- `.session-message-debug` - Debug/empty message box

**Message Content:**
- `.session-message-bubble` - Message bubble/container
- `.session-message-user-bubble` - User message bubble
- `.session-message-text` - Plain text content

**Error Messages:**
- `.session-message-error-wrapper`
- `.session-message-error-box`
- `.session-message-error-title`
- `.session-message-error-text`

**Text Blocks:**
- `.session-text-block` - Text block container
- `.session-text-content` - Markdown/prose content (has typography styles)
- `.session-inline-code` - Inline code elements
- `.session-block-dot-wrapper` - Dot indicator wrapper
- `.session-block-dot` - Base dot class
- `.session-block-dot-text` - Text block dot

**Thinking Blocks:**
- `.session-thinking-block` - Container
- `.session-thinking-header` - Clickable header
- `.session-thinking-header-content` - Header inner content
- `.session-thinking-title` - "Thinking" title
- `.session-thinking-description` - First sentence preview
- `.session-thinking-content` - Expanded content wrapper
- `.session-thinking-text` - Actual thinking text (pre tag)

**Tool Blocks:**
- `.session-tool-block` - Container
- `.session-tool-header` - Clickable header
- `.session-tool-name` - Tool name (e.g., "Read", "Edit")
- `.session-tool-context` - Context info (e.g., file path)
- `.session-tool-description` - Tool description
- `.session-tool-content` - Expanded content

**Code Blocks:**
- `.session-code-block` - Container
- `.session-code-block-header` - Header with language and copy button
- `.session-code-block-header-left` - Left side of header
- `.session-code-block-language` - Language badge
- `.session-code-block-line-count` - Line count display
- `.session-code-block-copy` - Copy button
- `.session-code-block-content` - Code content wrapper
- `.session-code-block-syntax` - SyntaxHighlighter component

**Bash Tool:**
- `.session-bash-tool` - Container
- `.session-bash-input` - Command input section
- `.session-bash-output` - Output section
- `.session-bash-label` - IN/OUT labels
- `.session-bash-command` - Command text
- `.session-bash-divider` - Separator line
- `.session-bash-output-text` - Output text
- `.session-bash-expand` - Expand/collapse button

**Other Components:**
- Image blocks: `.session-image-block`, `.session-image-loading`, `.session-image-error`, `.session-image`
- Permission blocks: `.session-permission-*` (many classes, see component)
- Default tool blocks: `.session-default-tool`, `.session-tool-input-section`, `.session-tool-output-section`

### Example: Theme-Specific Session Styling

If you want to customize session messages for a specific theme:

```css
/* Terminal theme - monospace everything in sessions */
:root[data-theme="terminal"] .session-message-text,
:root[data-theme="terminal"] .session-text-content {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
}

/* Terminal theme - green user messages */
:root[data-theme="terminal"] .session-message-user-bubble {
  background: oklch(0.2 0.1 140);
  border-color: oklch(0.4 0.15 140);
  color: oklch(0.9 0.1 140);
}

/* Terminal theme - compact spacing */
:root[data-theme="terminal"] .session-message-list {
  gap: 0.5rem; /* Tighter than default 0.5rem (space-y-2) */
}
```

---

## Color Guidelines

### OKLCH Format

All colors use OKLCH format for perceptual uniformity:

```css
oklch(lightness chroma hue)
```

**Parameters:**
- **Lightness:** 0-1 (0 = black, 1 = white)
- **Chroma:** 0-0.4 (0 = gray, higher = more saturated)
- **Hue:** 0-360 (color wheel degrees)

**Hue Values:**
- Red: 0-30°
- Orange: 30-60°
- Yellow: 60-90°
- Green: 90-150°
- Cyan: 150-210°
- Blue: 210-270°
- Purple: 270-330°
- Magenta: 330-360°

**Examples:**
- Green: `oklch(0.6 0.15 140)`
- Blue: `oklch(0.6 0.15 220)`
- Red: `oklch(0.6 0.15 20)`
- Gray: `oklch(0.5 0 0)` (zero chroma)

### Theme Design Tips

**1. Start with a Base Hue**

Pick 1-2 primary hues for your theme:
- **Nature:** 140° (green)
- **Ocean:** 200-220° (blue/cyan)
- **Sunset:** 30° (orange) + 340° (pink)

**2. Light Mode Guidelines**

- Background: 0.95-1.0 lightness (very light, almost white)
- Foreground: 0.2-0.3 lightness (dark text for readability)
- Primary: 0.5-0.6 lightness (medium brightness)
- Secondary/Muted: 0.92-0.97 lightness (subtle backgrounds)
- Border: 0.85-0.92 lightness (light gray)

**3. Dark Mode Guidelines**

- Background: 0.15-0.3 lightness (dark but not pure black)
- Foreground: 0.9-0.95 lightness (light text)
- Primary: 0.6-0.7 lightness (brighter for dark background)
- Secondary/Muted: 0.25-0.35 lightness (subtle backgrounds)
- Border: 0.35-0.45 lightness (visible but subtle)

**4. Contrast Requirements**

- Normal text: 4.5:1 minimum (WCAG AA)
- Large text: 3:1 minimum
- UI elements: 3:1 minimum

Test with browser DevTools contrast checker.

**5. Sidebar Consistency**

Sidebar colors should match or complement main UI:
- `--sidebar` usually matches `--background` or `--muted`
- `--sidebar-primary` matches `--primary`
- `--sidebar-accent` matches `--secondary` or `--accent`

**6. Chart Colors**

Use 5 shades of your primary hue with varying lightness:
```css
--chart-1: oklch(0.77 0.12 140); /* Lightest */
--chart-2: oklch(0.72 0.14 140);
--chart-3: oklch(0.67 0.16 140); /* Primary */
--chart-4: oklch(0.63 0.15 140);
--chart-5: oklch(0.58 0.14 140); /* Darkest */
```

### Using TweakCN

You can generate themes using [tweakcn.com](https://tweakcn.com):

1. Create your color palette
2. Export CSS variables
3. Copy the `:root` and `.dark` values
4. Replace selector with `:root[data-theme="yourtheme"]` and `:root[data-theme="yourtheme"].dark`
5. Paste into `index.css`

**Note:** TweakCN may include extra variables (fonts, shadows, radius) - you only need the color variables listed above.

---

## Troubleshooting

### Theme Not Applying

**Check browser DevTools:**

1. Open Console (F12)
2. Inspect the `<html>` element
3. Verify `data-theme` attribute is present:
   - Default: no attribute (or empty)
   - Nature: `data-theme="nature"`
   - Your theme: `data-theme="yourtheme"`

4. Check Computed styles:
   - Select any element
   - Look for `--background` variable
   - Value should match your theme's OKLCH value

**If attribute is missing:**
- Settings not saved properly
- Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
- Check backend - `session_theme` value in database

**If attribute exists but colors wrong:**
- CSS syntax error - check browser console for CSS errors
- Selector mismatch - ensure `:root[data-theme="name"]` matches attribute value
- Missing variables - ensure all 34 variables defined

### Colors Look Wrong

**1. OKLCH values out of range:**
- Lightness must be 0-1 (not 0-100)
- Chroma typically 0-0.4 (higher values may be out of gamut)
- Hue is 0-360

**2. Missing CSS variables:**
- Ensure all 34 required variables are defined
- Copy from existing theme as template
- Check for typos in variable names

**3. Dark mode not working:**
- Selector must be `:root[data-theme="name"].dark` (not `.dark [data-theme]`)
- Verify `.dark` class is on `<html>` element
- Test by toggling Theme in Settings (Light/Dark/System)

### Type Errors

**Backend enum mismatch:**
```
Error: Invalid enum value. Expected 'default' | 'nature' | ...
```
→ Add your theme to `z.enum()` in `settings.ts`

**Frontend type mismatch:**
```
Type '"ocean"' is not assignable to type '"default" | "nature"'
```
→ Add your theme to union type in `useSettings.ts` and `SettingsDialog.tsx`

### Theme Changes Don't Persist

**Settings not saving:**
- Check browser console for API errors
- Verify backend is running
- Check `PATCH /api/settings` request in Network tab

**Theme resets on refresh:**
- `useEffect` in `SettingsDialog` should apply theme on mount
- Check if settings query is loading successfully
- Verify `session_theme` value in settings response

---

## Theme Ideas

**Terminal:**
- Green monochrome (CRT terminal aesthetic)
- Black/dark gray background
- Bright green text and accents
- Monospace fonts everywhere

**Sunset:**
- Warm oranges, pinks, purples
- Golden hour color palette
- Light: sandy beige, coral
- Dark: deep purple, burnt orange

**Ocean:**
- Blues and teals
- Light: beach/sky colors
- Dark: deep sea colors
- Cyan and aqua highlights

**Forest:**
- Deep greens and browns
- Earthy, natural tones
- Light: moss, sage, fern
- Dark: pine, bark, shadow

**Cyberpunk:**
- Neon pink/cyan on dark
- High contrast, vibrant
- Light: white with neon accents
- Dark: near-black with electric colors

**Minimal:**
- Pure black and white
- Zero chroma (grayscale)
- Highest contrast possible
- Clean, stark aesthetic

---

## Related Files

**Backend:**
- `apps/app/src/server/routes/settings.ts` - Settings schema with theme enum

**Frontend:**
- `apps/app/src/client/index.css` - Theme CSS definitions
- `apps/app/src/client/hooks/useSettings.ts` - Settings types
- `apps/app/src/client/components/SettingsDialog.tsx` - Theme selector UI
- `apps/app/src/client/components/ThemeToggle.tsx` - Light/Dark mode toggle

**Session Components (with CSS classes):**
- `apps/app/src/client/pages/projects/sessions/components/session/MessageList.tsx`
- `apps/app/src/client/pages/projects/sessions/components/session/claude/UserMessage.tsx`
- `apps/app/src/client/pages/projects/sessions/components/session/claude/AssistantMessage.tsx`
- `apps/app/src/client/pages/projects/sessions/components/session/claude/TextBlock.tsx`
- `apps/app/src/client/pages/projects/sessions/components/session/claude/ThinkingBlock.tsx`
- `apps/app/src/client/pages/projects/sessions/components/session/claude/ToolCollapsibleWrapper.tsx`
- `apps/app/src/client/pages/projects/sessions/components/CodeBlock.tsx`

---

## Examples

### Complete Ocean Theme

```css
/* Ocean theme - light mode */
:root[data-theme="ocean"] {
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
  --chart-1: oklch(0.77 0.12 200);
  --chart-2: oklch(0.72 0.14 205);
  --chart-3: oklch(0.67 0.16 200);
  --chart-4: oklch(0.63 0.15 200);
  --chart-5: oklch(0.58 0.14 205);
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
:root[data-theme="ocean"].dark {
  --background: oklch(0.15 0.03 220);
  --foreground: oklch(0.95 0.02 200);
  --card: oklch(0.2 0.03 215);
  --card-foreground: oklch(0.95 0.02 200);
  --popover: oklch(0.2 0.03 215);
  --popover-foreground: oklch(0.95 0.02 200);
  --primary: oklch(0.67 0.16 200);
  --primary-foreground: oklch(0.15 0.03 220);
  --secondary: oklch(0.25 0.03 210);
  --secondary-foreground: oklch(0.9 0.02 200);
  --muted: oklch(0.22 0.02 215);
  --muted-foreground: oklch(0.7 0.03 215);
  --accent: oklch(0.58 0.14 205);
  --accent-foreground: oklch(0.95 0.02 200);
  --destructive: oklch(0.54 0.19 27);
  --destructive-foreground: oklch(0.95 0.02 200);
  --border: oklch(0.3 0.03 215);
  --input: oklch(0.3 0.03 215);
  --ring: oklch(0.67 0.16 200);
  --chart-1: oklch(0.77 0.12 200);
  --chart-2: oklch(0.72 0.14 205);
  --chart-3: oklch(0.67 0.16 200);
  --chart-4: oklch(0.63 0.15 200);
  --chart-5: oklch(0.58 0.14 205);
  --sidebar: oklch(0.15 0.03 220);
  --sidebar-foreground: oklch(0.95 0.02 200);
  --sidebar-primary: oklch(0.67 0.16 200);
  --sidebar-primary-foreground: oklch(0.15 0.03 220);
  --sidebar-accent: oklch(0.58 0.14 205);
  --sidebar-accent-foreground: oklch(0.95 0.02 200);
  --sidebar-border: oklch(0.3 0.03 215);
  --sidebar-ring: oklch(0.67 0.16 200);
}
```

This ocean theme uses blue/cyan hues (200-220°) with appropriate lightness adjustments for light and dark modes.
