# User Settings Modal

**Status**: draft
**Created**: 2025-01-31
**Package**: apps/web
**Estimated Effort**: 4-6 hours

## Overview

Add a settings modal accessible from the NavUser dropdown that allows users to configure default permission mode, theme, and agent. Settings will be stored in a JSON field on the User table and served via the existing `/api/settings` endpoint.

## User Story

As a user
I want to configure my default preferences (permission mode, theme, agent)
So that new sessions start with my preferred settings and I don't have to change them each time

## Technical Approach

1. Add `settings` JSON column to User table (Prisma migration)
2. Extend existing `/api/settings` GET endpoint to include user preferences
3. Add PATCH endpoint to `/api/settings` for updating preferences
4. Create SettingsDialog component with form controls
5. Add "Settings" menu item to NavUser dropdown (remove inline ThemeToggle)
6. Initialize default values from user settings instead of hard-coded values

## Key Design Decisions

1. **JSON Column**: Use `settings` JSON field on User table instead of separate UserSettings table for simplicity
2. **Extend Existing Endpoint**: Add user preferences to existing `/api/settings` response rather than creating new endpoint
3. **Snake Case Keys**: Use `default_permission_mode`, `default_theme`, `default_agent` in JSON (follows database column naming conventions)
4. **Move Theme Toggle**: Remove inline ThemeToggle from NavUser, only accessible via settings modal
5. **New Sessions Only**: Changing defaults only affects new sessions, not active ones

## Architecture

### File Structure

```
apps/web/
├── prisma/
│   ├── schema.prisma                           # Add settings column
│   └── migrations/
│       └── YYYYMMDDHHMMSS_add_user_settings/   # New migration
├── src/
│   ├── server/
│   │   └── routes/
│   │       └── settings.ts                     # Extend GET, add PATCH
│   └── client/
│       ├── components/
│       │   ├── NavUser.tsx                     # Add Settings menu item, remove ThemeToggle
│       │   └── SettingsDialog.tsx              # NEW: Settings modal
│       ├── hooks/
│       │   └── useSettings.ts                  # Extend types, add mutation
│       └── main.tsx                            # Initialize theme from settings
```

### Integration Points

**Database**:
- `prisma/schema.prisma` - Add `settings Json?` field to User model

**Backend**:
- `server/routes/settings.ts` - Extend GET handler, add PATCH handler

**Frontend**:
- `client/components/NavUser.tsx` - Add Settings button, remove ThemeToggle
- `client/components/SettingsDialog.tsx` - New component
- `client/hooks/useSettings.ts` - Add mutation, extend types
- `client/main.tsx` - Set theme from settings on load

## Implementation Details

### 1. Database Schema

Add nullable JSON column to User table for storing preferences.

**Key Points**:
- Column name: `settings` (JSON/TEXT in SQLite)
- Nullable (existing users start with null, use defaults)
- Default structure: `{ default_permission_mode: "acceptEdits", default_theme: "dark", default_agent: "claude" }`
- Snake case keys (follows database conventions)

### 2. Backend - Settings Endpoint

Extend existing `/api/settings` endpoint to include user preferences and add PATCH handler.

**Key Points**:
- GET: Add `userPreferences` field to response
- GET: Parse `user.settings` JSON, use defaults if null
- PATCH: Validate and update `user.settings` JSON field
- PATCH: Use Zod schema for validation
- Return format matches GET response structure

### 3. Frontend - SettingsDialog Component

Create modal with form controls for all user preferences.

**Key Points**:
- Uses BaseDialog component
- Permission mode selector (dropdown with all 4 modes)
- Theme selector (Light/Dark/System radio group)
- Agent selector (dropdown with installed agents)
- Save/Cancel buttons with loading states
- Fetches current settings on open
- Optimistic updates with TanStack Query
- Shows success/error feedback

### 4. Frontend - NavUser Integration

Update NavUser component to add Settings menu item and remove inline ThemeToggle.

**Key Points**:
- Add "Settings" menu item with Settings icon (from lucide-react)
- Remove `<ThemeToggle />` line (moved to settings modal)
- Settings menu item opens SettingsDialog
- Keep existing menu structure (user info, version, log out)

### 5. Frontend - Theme Initialization

Update ThemeProvider to initialize theme from user settings.

**Key Points**:
- Fetch settings on app load
- Extract `userPreferences.default_theme` from response
- Pass to ThemeProvider as `defaultTheme` prop
- Maintain localStorage sync for persistence

### 6. Frontend - Session Store Initialization

Update sessionStore to initialize defaults from user settings.

**Key Points**:
- Initialize `permissionMode` from `userPreferences.default_permission_mode`
- Initialize `agent` from `userPreferences.default_agent`
- Remove hard-coded defaults ("acceptEdits", "claude")
- Keep model initialization logic (first available model)

## Files to Create/Modify

### New Files (2)

1. `prisma/migrations/YYYYMMDDHHMMSS_add_user_settings/migration.sql` - Database migration
2. `apps/web/src/client/components/SettingsDialog.tsx` - Settings modal component

### Modified Files (5)

1. `prisma/schema.prisma` - Add settings field to User model
2. `apps/web/src/server/routes/settings.ts` - Extend GET, add PATCH
3. `apps/web/src/client/components/NavUser.tsx` - Add Settings button, remove ThemeToggle
4. `apps/web/src/client/hooks/useSettings.ts` - Add mutation and types
5. `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts` - Use settings for defaults

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Task Group 1: Database Layer

<!-- prettier-ignore -->
- [x] db-schema Add `settings Json?` field to User model in Prisma schema
  - Add after `is_active` field
  - Type: `Json?` (nullable, SQLite stores as TEXT)
  - File: `prisma/schema.prisma`
- [x] db-migrate Create and apply Prisma migration
  - Run: `cd apps/web && pnpm prisma:migrate`
  - Migration name: "add_user_settings"
  - Verify: `pnpm prisma:studio` shows settings column
- [x] db-generate Regenerate Prisma client
  - Run: `cd apps/web && pnpm prisma:generate`
  - Verify: TypeScript recognizes `user.settings` field

#### Completion Notes

- Added `settings Json?` field to User model in Prisma schema
- Created migration `20251031084315_add_user_settings` with SQL to alter users table
- Applied migration successfully using `prisma migrate deploy`
- Regenerated Prisma client - TypeScript now recognizes `user.settings` field

### Task Group 2: Backend - Zod Schemas

<!-- prettier-ignore -->
- [x] be-schema-types Define UserPreferences Zod schema
  - Create `userPreferencesSchema` with snake_case keys
  - Fields: `default_permission_mode`, `default_theme`, `default_agent`
  - File: `apps/web/src/server/routes/settings.ts`
- [x] be-schema-update Define UpdateUserPreferences Zod schema
  - All fields optional (partial update support)
  - Validate permission mode enum, theme enum, agent enum
  - File: `apps/web/src/server/routes/settings.ts`

#### Completion Notes

- Created `userPreferencesSchema` with enum validation for permission modes, themes, and agents
- Created `updateUserPreferencesSchema` using `.partial()` for optional updates
- Defined `DEFAULT_USER_PREFERENCES` with acceptEdits, dark theme, and claude agent as defaults

### Task Group 3: Backend - GET Endpoint

<!-- prettier-ignore -->
- [x] be-get-parse Parse user.settings JSON in GET handler
  - Parse `request.user.settings` field
  - Use defaults if null: `{ default_permission_mode: "acceptEdits", default_theme: "dark", default_agent: "claude" }`
  - File: `apps/web/src/server/routes/settings.ts`
- [x] be-get-response Add userPreferences to GET response
  - Add `userPreferences` field to response object
  - Keep existing `features`, `agents`, `version` fields
  - File: `apps/web/src/server/routes/settings.ts`

#### Completion Notes

- Fetched user from database in GET handler to access settings field
- Parsed user.settings JSON and merged with defaults using spread operator
- Added `userPreferences` field to settings response while keeping existing fields

### Task Group 4: Backend - PATCH Endpoint

<!-- prettier-ignore -->
- [x] be-patch-handler Create PATCH /api/settings endpoint
  - Use `fastify.patch()` with `/api/settings` route
  - Require authentication: `preHandler: fastify.authenticate`
  - Validate body with `updateUserPreferencesSchema`
  - File: `apps/web/src/server/routes/settings.ts`
- [x] be-patch-update Update user.settings JSON field
  - Merge new preferences with existing settings
  - Use Prisma `update()` to save to database
  - File: `apps/web/src/server/routes/settings.ts`
- [x] be-patch-response Return updated settings in response
  - Return same format as GET endpoint
  - Include updated `userPreferences` field
  - File: `apps/web/src/server/routes/settings.ts`

#### Completion Notes

- Created PATCH /api/settings endpoint with authentication and Zod validation
- Fetched current settings, merged with updates, and persisted to database
- Returned full settings response (matching GET format) including updated userPreferences

### Task Group 5: Frontend - Types & Hook

<!-- prettier-ignore -->
- [x] fe-types-extend Extend Settings interface
  - Add `userPreferences` field to Settings interface
  - Type: `{ default_permission_mode, default_theme, default_agent }`
  - File: `apps/web/src/client/hooks/useSettings.ts`
- [x] fe-mutation-add Add useUpdateSettings mutation hook
  - Use `useMutation` from TanStack Query
  - PATCH request to `/api/settings`
  - Invalidate settings query on success
  - File: `apps/web/src/client/hooks/useSettings.ts`

#### Completion Notes

- Extended Settings interface with UserPreferences type containing all three fields
- Created useUpdateSettings mutation hook using useMutation
- Configured mutation to update query cache with setQueryData on success

### Task Group 6: Frontend - SettingsDialog Component

<!-- prettier-ignore -->
- [x] fe-dialog-scaffold Create SettingsDialog component scaffold
  - Use BaseDialog component
  - Props: `open`, `onOpenChange`
  - File: `apps/web/src/client/components/SettingsDialog.tsx`
- [x] fe-dialog-state Add form state management
  - Use React state for form values
  - Initialize from `useSettings()` hook
  - Handle loading and error states
  - File: `apps/web/src/client/components/SettingsDialog.tsx`
- [x] fe-dialog-permission Add permission mode selector
  - Use Select component from shadcn/ui
  - Options from `PERMISSION_MODES` constant
  - Show mode name and color badge
  - File: `apps/web/src/client/components/SettingsDialog.tsx`
- [x] fe-dialog-theme Add theme selector
  - Use RadioGroup component from shadcn/ui
  - Options: Light, Dark, System (with icons)
  - File: `apps/web/src/client/components/SettingsDialog.tsx`
- [x] fe-dialog-agent Add agent selector
  - Use Select component from shadcn/ui
  - Get agents from `useSettings()` hook
  - Show only installed agents
  - File: `apps/web/src/client/components/SettingsDialog.tsx`
- [x] fe-dialog-actions Add Save/Cancel buttons
  - Save: Call `useUpdateSettings` mutation
  - Cancel: Close dialog without saving
  - Show loading spinner during save
  - File: `apps/web/src/client/components/SettingsDialog.tsx`

#### Completion Notes

- Created complete SettingsDialog component using BaseDialog, Select, RadioGroup
- Implemented form state with useState and useEffect to sync with server data
- Permission mode selector shows all 4 modes with color badges
- Theme selector uses RadioGroup with Sun/Moon/Monitor icons
- Agent selector filters to show only installed agents
- Save button calls useUpdateSettings mutation and applies theme immediately
- Cancel button resets form values and closes dialog
- Loading states handled throughout with Loader2 spinner

### Task Group 7: Frontend - NavUser Integration

<!-- prettier-ignore -->
- [x] fe-navuser-state Add settings dialog state
  - Add `isSettingsOpen` state (useState)
  - Handle open/close logic
  - File: `apps/web/src/client/components/NavUser.tsx`
- [x] fe-navuser-remove Remove inline ThemeToggle
  - Delete `<ThemeToggle />` line (around line 101)
  - File: `apps/web/src/client/components/NavUser.tsx`
- [x] fe-navuser-settings Add Settings menu item
  - Add after user info header, before version separator
  - Icon: Settings from lucide-react
  - onClick: Open settings dialog
  - File: `apps/web/src/client/components/NavUser.tsx`
- [x] fe-navuser-dialog Render SettingsDialog component
  - Add `<SettingsDialog />` at end of component
  - Pass `open` and `onOpenChange` props
  - File: `apps/web/src/client/components/NavUser.tsx`

#### Completion Notes

- Added isSettingsOpen state with useState
- Removed ThemeToggle component import and usage
- Added Settings menu item with Settings icon from lucide-react
- Rendered SettingsDialog component at end with proper props
- Wrapped return in fragment to support multiple root elements

### Task Group 8: Frontend - Default Values Integration

<!-- prettier-ignore -->
- [x] fe-session-defaults Update sessionStore defaults
  - Replace hard-coded permissionMode with value from settings
  - Replace hard-coded agent with value from settings
  - Fetch settings in store initialization
  - File: `apps/web/src/client/pages/projects/sessions/stores/sessionStore.ts`
- [x] fe-theme-init Initialize theme from settings
  - Fetch settings on app mount
  - Extract `userPreferences.default_theme`
  - Update ThemeProvider or call setTheme
  - File: `apps/web/src/client/main.tsx` or create new hook

#### Completion Notes

- Added `initializeFromSettings()` function to sessionStore for setting defaults dynamically
- Updated ProtectedLayout to call initializeFromSettings with user preferences on mount
- Integrated theme initialization in same useEffect hook using setTheme from ThemeProvider
- Settings are fetched once and cached, initialization only runs when preferences change

## Testing Strategy

### Unit Tests

No new unit tests required (manual testing sufficient for this feature).

### Integration Tests

**Backend Tests** (manual via curl):

```bash
# Get settings with user preferences
curl -H "Authorization: Bearer $TOKEN" http://localhost:3456/api/settings | jq .

# Update settings
curl -X PATCH http://localhost:3456/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"default_permission_mode":"plan","default_theme":"light","default_agent":"codex"}' | jq .
```

### E2E Tests (Manual)

1. Open settings modal from NavUser dropdown
2. Change all three settings
3. Click Save
4. Verify settings persist across page refresh
5. Create new session, verify defaults apply
6. Check theme changes immediately
7. Verify validation errors for invalid inputs

## Success Criteria

- [ ] User can open settings modal from NavUser dropdown
- [ ] Settings modal shows current preferences correctly
- [ ] User can change permission mode and see it saved
- [ ] User can change theme and see it apply immediately
- [ ] User can change default agent and see it saved
- [ ] New sessions use the configured defaults
- [ ] Settings persist across browser sessions
- [ ] ThemeToggle removed from NavUser dropdown
- [ ] Settings endpoint returns user preferences in GET response
- [ ] PATCH endpoint validates and saves preferences correctly
- [ ] No TypeScript errors
- [ ] No console errors or warnings
- [ ] Database migration applies successfully

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
cd apps/web && pnpm check-types
# Expected: No type errors

# Linting
cd apps/web && pnpm lint
# Expected: No lint errors

# Database verification
cd apps/web && pnpm prisma:studio
# Expected: User table has settings column
```

**Manual Verification:**

1. Start application: `cd apps/web && pnpm dev`
2. Login to application: http://localhost:5173
3. Click NavUser dropdown in sidebar footer
4. Verify ThemeToggle is removed (no Light/Dark/System items)
5. Click "Settings" menu item
6. Verify settings modal opens with current values
7. Change permission mode to "Plan Mode"
8. Change theme to "Light"
9. Change agent to different agent
10. Click "Save"
11. Verify modal closes
12. Verify theme changes immediately to Light
13. Refresh page
14. Open settings modal again
15. Verify all settings persisted correctly
16. Create new session
17. Verify permission mode is "Plan Mode" by default
18. Verify agent selector shows the chosen agent
19. Open browser DevTools > Network
20. Verify GET /api/settings includes `userPreferences` field
21. Check console: No errors or warnings

**Feature-Specific Checks:**

- Settings modal has proper validation (can't save invalid values)
- Theme changes apply immediately (no page refresh needed)
- Permission mode and agent only affect new sessions, not active ones
- Null settings in database use proper defaults
- Settings survive page refresh and logout/login

## Implementation Notes

### 1. SQLite JSON Support

SQLite stores JSON as TEXT. Prisma handles serialization/deserialization automatically via the `Json` type.

### 2. Default Values Strategy

Use this pattern for defaults:

```typescript
const DEFAULT_USER_PREFERENCES = {
  default_permission_mode: "acceptEdits",
  default_theme: "dark",
  default_agent: "claude",
};

const userPreferences = user.settings
  ? { ...DEFAULT_USER_PREFERENCES, ...(user.settings as object) }
  : DEFAULT_USER_PREFERENCES;
```

### 3. Theme Application Timing

Theme changes should apply immediately via `setTheme()` from `next-themes`. The `ThemeProvider` handles localStorage sync automatically.

### 4. Agent Availability

Only show installed agents in the agent selector. Use the `agents` object from settings endpoint to filter available options.

### 5. Migration Safety

The migration adds a nullable column, so existing users are unaffected. First settings save will populate the field.

## Dependencies

- No new dependencies required
- Uses existing shadcn/ui components (Select, RadioGroup, Dialog)
- Uses existing lucide-react icons
- Uses existing next-themes library

## Timeline

| Task                    | Estimated Time |
| ----------------------- | -------------- |
| Database Layer          | 0.5 hours      |
| Backend - Zod Schemas   | 0.5 hours      |
| Backend - GET Endpoint  | 0.5 hours      |
| Backend - PATCH Endpoint| 0.5 hours      |
| Frontend - Types & Hook | 0.5 hours      |
| SettingsDialog Component| 2 hours        |
| NavUser Integration     | 0.5 hours      |
| Default Values Integration | 0.5 hours   |
| Testing & Validation    | 1 hour         |
| **Total**               | **4-6 hours**  |

## References

- Permission modes: `apps/web/src/client/lib/permissionModes.ts`
- BaseDialog pattern: `apps/web/src/client/components/BaseDialog.tsx`
- Theme implementation: `apps/web/src/client/components/ThemeToggle.tsx`
- Settings endpoint: `apps/web/src/server/routes/settings.ts`
- Prisma schema: `apps/web/prisma/schema.prisma`

## Next Steps

1. Review and approve this spec
2. Run `/implement-spec 27` to begin implementation
3. Test thoroughly with manual verification steps
4. Create PR when complete
