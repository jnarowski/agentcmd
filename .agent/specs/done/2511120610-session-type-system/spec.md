# Session Type System

**Status**: completed
**Created**: 2025-11-12
**Package**: apps/app
**Total Complexity**: 46 points
**Phases**: 7
**Tasks**: 18
**Overall Avg Complexity**: 4.1/10

## Complexity Breakdown

| Phase | Tasks | Total Points | Avg Complexity | Max Task |
|-------|-------|--------------|----------------|----------|
| Phase 1: Database Schema | 3 | 14 | 4.7/10 | 6/10 |
| Phase 2: Backend Types & Schemas | 3 | 11 | 3.7/10 | 5/10 |
| Phase 3: Backend Services & Routes | 2 | 8 | 4.0/10 | 5/10 |
| Phase 4: Frontend Types & Store | 2 | 6 | 3.0/10 | 4/10 |
| Phase 5: Permission Mode Logic | 2 | 10 | 5.0/10 | 6/10 |
| Phase 6: Session Type Filtering | 3 | 12 | 4.0/10 | 5/10 |
| Phase 7: Type Indicators | 3 | 10 | 3.3/10 | 4/10 |
| **Total** | **18** | **71** | **3.9/10** | **6/10** |

## Overview

Add session type categorization system to AgentSession model with SessionType enum (chat, planning, workflow). Planning sessions automatically lock permission mode to "plan" and hide the permission mode selector. Include sidebar filtering by type and visual type indicators on session list items.

## User Story

As a user
I want to categorize my agent sessions by type (chat, planning, workflow)
So that I can filter planning sessions, auto-configure their behavior, and eventually convert them to workflows

## Technical Approach

Add a new `type` field to the AgentSession database model with a SessionType enum. Update backend services to accept and filter by type. On the frontend, conditionally hide the permission mode selector for planning sessions and add type-based filtering to the existing filter UI in ProjectHomeSessions. Add visual indicators (badges) to session list items showing their type.

## Key Design Decisions

1. **Use `type` not `mode`**: Semantic clarity - type is inherent category, mode is temporary state. Avoids confusion with existing `permissionMode`.
2. **Database enum field**: Explicit, type-safe, indexable. Better than JSON metadata or inferred relationships.
3. **Default to `chat`**: Existing sessions default to chat type for backward compatibility.
4. **Planning sessions lock permission**: Planning type automatically forces `permissionMode = 'plan'` and hides selector.
5. **Extend existing filters**: Add type filter to existing ProjectHomeSessions filter grid (currently has search, state, agent, archived).

## Architecture

### File Structure

```
apps/app/
├── prisma/
│   ├── schema.prisma              # Add SessionType enum + type field
│   └── migrations/                # New migration file
├── src/
│   ├── server/
│   │   ├── domain/
│   │   │   └── session/
│   │   │       ├── services/
│   │   │       │   ├── createSession.ts         # Accept type param
│   │   │       │   └── getSessionsByProject.ts  # Add type filter
│   │   │       └── types/
│   │   │           ├── CreateSessionOptions.ts  # Add type field
│   │   │           └── GetSessionsByProjectOptions.ts
│   │   └── routes/
│   │       └── session.ts         # Update routes for type
│   ├── shared/
│   │   ├── types/
│   │   │   └── agent-session.types.ts  # Add SessionType export
│   │   └── schemas/
│   │       └── session.schemas.ts      # Add SessionType to schemas
│   └── client/
│       └── pages/
│           └── projects/
│               ├── components/
│               │   └── ProjectHomeSessions.tsx  # Add type filter
│               └── sessions/
│                   ├── stores/
│                   │   └── sessionStore.ts      # Store session type
│                   └── components/
│                       ├── ChatPromptInput.tsx   # Hide selector for planning
│                       └── SessionListItem.tsx   # Add type badge
```

### Integration Points

**Database**:
- `apps/app/prisma/schema.prisma` - Add SessionType enum and type field to AgentSession

**Backend Services**:
- `apps/app/src/server/domain/session/services/createSession.ts` - Accept optional type parameter
- `apps/app/src/server/domain/session/services/getSessionsByProject.ts` - Filter by type

**Backend Routes**:
- `apps/app/src/server/routes/session.ts` - Update POST and GET endpoints

**Frontend Store**:
- `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts` - Store session.type

**Frontend Components**:
- `apps/app/src/client/pages/projects/sessions/components/ChatPromptInput.tsx` - Conditional permission selector
- `apps/app/src/client/pages/projects/components/ProjectHomeSessions.tsx` - Type filter dropdown
- `apps/app/src/client/pages/projects/sessions/components/SessionListItem.tsx` - Type badge indicator

## Implementation Details

### 1. Database Schema Changes

Add SessionType enum with three values: chat, planning, workflow. Add type field to AgentSession model with default value "chat" for backward compatibility.

**Key Points**:
- Enum ensures type safety at database level
- Default value handles existing sessions
- Indexable for efficient filtering
- Migration will not affect existing data

### 2. Backend Type System

Update TypeScript types and Zod schemas to include SessionType. Export from shared types for use across frontend and backend.

**Key Points**:
- SessionType exported from `@/shared/types/agent-session.types.ts`
- Validation schemas updated in `@/shared/schemas/session.schemas.ts`
- CreateSessionOptions accepts optional type
- GetSessionsByProjectOptions accepts optional type filter

### 3. Backend Services

Update session creation to accept type parameter. Update session query service to filter by type when provided.

**Key Points**:
- createSession defaults to 'chat' if not specified
- getSessionsByProject adds WHERE clause when type filter provided
- No breaking changes - type is optional

### 4. Frontend Session Store

Update sessionStore to include type in session data. Load type when fetching session.

**Key Points**:
- SessionData interface includes type field
- Type loaded from API response
- Available to all components via useSessionStore

### 5. Permission Mode Lock for Planning Sessions

Hide PermissionModeSelector when session.type === 'planning'. Force permissionMode to 'plan' for planning sessions.

**Key Points**:
- Check session type in ChatPromptInput
- Render "Planning Mode" badge instead of selector
- Auto-set permissionMode to 'plan' when type is planning
- Visual indicator shows planning mode is active

### 6. Session Type Filtering

Add type filter dropdown to ProjectHomeSessions filter grid (alongside state, agent, archived filters).

**Key Points**:
- New Select dropdown for type filtering
- Options: "All Types", "Chat", "Planning", "Workflow"
- Integrated with existing filter logic
- Shows in active filters bar when selected

### 7. Type Indicators on Session List

Add visual badge to SessionListItem showing session type (only for planning and workflow, not chat).

**Key Points**:
- Small badge next to session name
- Different colors per type (green for planning, blue for workflow)
- Chat type shows no badge (default state)
- Compact design for mobile

## Files to Create/Modify

### New Files (1)

1. `apps/app/prisma/migrations/XXXXXX_add_session_type/migration.sql` - Migration to add SessionType enum and type field

### Modified Files (10)

1. `apps/app/prisma/schema.prisma` - Add SessionType enum and type field
2. `apps/app/src/server/domain/session/services/createSession.ts` - Accept type parameter
3. `apps/app/src/server/domain/session/services/getSessionsByProject.ts` - Add type filtering
4. `apps/app/src/server/domain/session/types/CreateSessionOptions.ts` - Add type field
5. `apps/app/src/server/domain/session/types/GetSessionsByProjectOptions.ts` - Add type filter
6. `apps/app/src/server/routes/session.ts` - Update routes for type
7. `apps/app/src/shared/types/agent-session.types.ts` - Export SessionType
8. `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts` - Store session type
9. `apps/app/src/client/pages/projects/sessions/components/ChatPromptInput.tsx` - Hide selector for planning
10. `apps/app/src/client/pages/projects/components/ProjectHomeSessions.tsx` - Add type filter
11. `apps/app/src/client/pages/projects/sessions/components/SessionListItem.tsx` - Add type badge

## Step by Step Tasks

**IMPORTANT: Execute every step in order, top to bottom**

### Phase 1: Database Schema

**Phase Complexity**: 14 points (avg 4.7/10)

<!-- prettier-ignore -->
- [x] 1.1 [4/10] Add SessionType enum to Prisma schema
  - Add enum above AgentSession model: `enum SessionType { chat planning workflow }`
  - File: `apps/app/prisma/schema.prisma`
- [x] 1.2 [4/10] Add type field to AgentSession model
  - Add field: `type SessionType @default(chat)`
  - Add after agent field, before cli_session_id
  - File: `apps/app/prisma/schema.prisma`
- [x] 1.3 [6/10] Create and apply database migration
  - Run: `pnpm --filter app prisma:migrate dev --name add_session_type`
  - Run: `pnpm --filter app prisma:generate`
  - Verify migration created in `prisma/migrations/`
  - Verify Prisma client regenerated

#### Completion Notes

- SessionType enum added to schema with values: chat, planning, workflow
- Type field added to AgentSession with @default(chat) for backward compatibility
- Migration created: 20251112131924_add_session_type
- Prisma client regenerated successfully
- All existing sessions will default to 'chat' type

### Phase 2: Backend Types & Schemas

**Phase Complexity**: 11 points (avg 3.7/10)

<!-- prettier-ignore -->
- [x] 2.1 [3/10] Export SessionType from shared types
  - Add export: `export type SessionType = 'chat' | 'planning' | 'workflow';`
  - Add above SessionState definition
  - File: `apps/app/src/shared/types/agent-session.types.ts`
- [x] 2.2 [3/10] Add type to SessionResponse interface
  - Add field: `type: SessionType;`
  - Add after agent field
  - File: `apps/app/src/shared/types/agent-session.types.ts`
- [x] 2.3 [5/10] Update CreateSessionOptions and GetSessionsByProjectOptions
  - Add `type?: SessionType` to CreateSessionOptions data object
  - Add `type?: SessionType` to GetSessionsByProjectOptions filters object
  - Files: `apps/app/src/server/domain/session/types/CreateSessionOptions.ts`, `apps/app/src/server/domain/session/types/GetSessionsByProjectOptions.ts`

#### Completion Notes

- SessionType exported from shared types as union type
- SessionResponse interface updated to include type field
- CreateSessionOptions schema updated with optional type field
- GetSessionsByProjectOptions schema updated with optional type filter
- All Zod schemas properly typed for validation

### Phase 3: Backend Services & Routes

**Phase Complexity**: 8 points (avg 4.0/10)

<!-- prettier-ignore -->
- [x] 3.1 [3/10] Update createSession service
  - Destructure type from data with default: `const { ..., type = 'chat' as SessionType } = data;`
  - Add type to prisma.agentSession.create data object
  - Add type to returned SessionResponse object
  - File: `apps/app/src/server/domain/session/services/createSession.ts`
- [x] 3.2 [5/10] Update getSessionsByProject service
  - Destructure type from filters: `const { ..., type } = filters;`
  - Add to where clause: `...(type && { type }),`
  - Add type to mapped SessionResponse objects
  - File: `apps/app/src/server/domain/session/services/getSessionsByProject.ts`

#### Completion Notes

- createSession service updated with type parameter defaulting to 'chat'
- Type field added to Prisma create data and returned SessionResponse
- getSessionsByProject service updated with optional type filter
- Type filter added to WHERE clause conditionally
- Type field added to mapped SessionResponse objects
- Both services properly import SessionType from shared types

### Phase 4: Frontend Types & Store

**Phase Complexity**: 6 points (avg 3.0/10)

<!-- prettier-ignore -->
- [x] 4.1 [2/10] Import SessionType in sessionStore
  - Add import: `import type { SessionType } from '@/shared/types/agent-session.types';`
  - SessionData interface automatically includes type via SessionResponse
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`
- [x] 4.2 [4/10] Verify type loaded from API
  - Check that loadSession maps session.type from API response
  - Type automatically included in SessionResponse mapping
  - No code changes needed if SessionData extends SessionResponse
  - File: `apps/app/src/client/pages/projects/sessions/stores/sessionStore.ts`

#### Completion Notes

- SessionType imported in sessionStore
- Type field added to SessionData interface
- Type will be automatically loaded from API responses since SessionData includes it
- Store now properly typed to handle session type

### Phase 5: Permission Mode Logic

**Phase Complexity**: 10 points (avg 5.0/10)

<!-- prettier-ignore -->
- [x] 5.1 [4/10] Get session type in ChatPromptInput
  - Add selector: `const sessionType = useSessionStore((s) => s.session?.type);`
  - Add after existing session selectors around line 85-90
  - File: `apps/app/src/client/pages/projects/sessions/components/ChatPromptInput.tsx`
- [x] 5.2 [6/10] Conditionally render permission selector
  - Check if planning: `const isPlanning = sessionType === 'planning';`
  - Force plan mode if planning: Update permissionMode logic to use 'plan' when isPlanning
  - Hide PermissionModeSelector: Wrap in `{!isPlanning && <PermissionModeSelector ... />}`
  - Show "Planning Mode" badge when isPlanning (green badge similar to other mode indicators)
  - File: `apps/app/src/client/pages/projects/sessions/components/ChatPromptInput.tsx`

#### Completion Notes

- Session type selector added to ChatPromptInput
- isPlanning check added based on session type
- Permission mode forced to 'plan' when session type is planning
- PermissionModeSelector conditionally hidden for planning sessions
- "Planning Mode" badge shown instead with green styling
- Badge styled consistently with other mode indicators

### Phase 6: Session Type Filtering

**Phase Complexity**: 12 points (avg 4.0/10)

<!-- prettier-ignore -->
- [x] 6.1 [3/10] Add type filter state to ProjectHomeSessions
  - Add state: `const [selectedType, setSelectedType] = useState<string>('all');`
  - Add after other filter states (line ~34)
  - File: `apps/app/src/client/pages/projects/components/ProjectHomeSessions.tsx`
- [x] 6.2 [5/10] Add type filter logic and options
  - Add typeOptions: `const typeOptions = [{ value: 'all', label: 'All Types' }, { value: 'chat', label: 'Chat' }, { value: 'planning', label: 'Planning' }, { value: 'workflow', label: 'Workflow' }];`
  - Update filteredSessions useMemo to include type filter
  - Add to activeFilterCount calculation
  - Add to clearAllFilters function
  - File: `apps/app/src/client/pages/projects/components/ProjectHomeSessions.tsx`
- [x] 6.3 [4/10] Add type filter Select component
  - Add after Agent Filter div (around line 172)
  - Copy pattern from Agent Filter dropdown
  - Map over typeOptions
  - Add to active filters bar with badge
  - File: `apps/app/src/client/pages/projects/components/ProjectHomeSessions.tsx`

#### Completion Notes

- Type filter state added to ProjectHomeSessions
- typeOptions array with all session types created
- Type filter logic integrated into filteredSessions useMemo
- activeFilterCount updated to include type filter
- clearAllFilters updated to reset type filter
- Type filter Select component added to filter grid
- Grid layout changed from 4 to 5 columns to accommodate type filter
- Type filter badge added to active filters bar with remove button

### Phase 7: Type Indicators

**Phase Complexity**: 10 points (avg 3.3/10)

<!-- prettier-ignore -->
- [x] 7.1 [3/10] Import Badge component in SessionListItem
  - Add import: `import { Badge } from "@/client/components/ui/badge";`
  - File: `apps/app/src/client/pages/projects/sessions/components/SessionListItem.tsx`
- [x] 7.2 [4/10] Add type badge to session display
  - Add after session name div (line ~72)
  - Only show for planning and workflow types
  - Use green badge for planning, blue for workflow
  - Small size: `className="text-xs"`
  - File: `apps/app/src/client/pages/projects/sessions/components/SessionListItem.tsx`
- [x] 7.3 [3/10] Extract session type from session object
  - Get type: `const { type } = session;`
  - Add to destructuring at top (line 24)
  - File: `apps/app/src/client/pages/projects/sessions/components/SessionListItem.tsx`

#### Completion Notes

- Badge component imported in SessionListItem
- Type field extracted from session object in destructuring
- Session name layout changed to flex container to accommodate badges
- Planning badge added with green styling (bg-green-500/10, text-green-500)
- Workflow badge added with blue styling (bg-blue-500/10, text-blue-500)
- Chat type shows no badge (default case)
- Badges use shrink-0 to prevent compression on small screens
- Name spans maintain truncate for proper text overflow handling

## Testing Strategy

### Unit Tests

Not required for this feature - straightforward CRUD and conditional rendering.

### Integration Tests

Manual testing covers the integration points adequately.

### Manual Testing

Test session creation with different types, filtering, and permission mode behavior.

## Success Criteria

- [ ] SessionType enum exists in database with values: chat, planning, workflow
- [ ] AgentSession has type field with default 'chat'
- [ ] Existing sessions default to type 'chat'
- [ ] New sessions can be created with specified type
- [ ] Sessions can be filtered by type in ProjectHomeSessions
- [ ] Planning sessions hide permission mode selector
- [ ] Planning sessions automatically use 'plan' permission mode
- [ ] Planning sessions show "Planning Mode" badge instead of selector
- [ ] Session list items show type badge for planning and workflow (not chat)
- [ ] Type filter integrated with existing filters (search, state, agent, archived)
- [ ] No TypeScript errors
- [ ] Migration applied successfully

## Validation

Execute these commands to verify the feature works correctly:

**Automated Verification:**

```bash
# Type checking
pnpm --filter app check-types
# Expected: No type errors

# Build verification
pnpm --filter app build
# Expected: Successful build

# Prisma client generation
pnpm --filter app prisma:generate
# Expected: Client generated successfully
```

**Manual Verification:**

1. Start application: `pnpm dev`
2. Navigate to: `http://localhost:5173/projects/:projectId`
3. Verify: Session list shows all existing sessions (type defaults to 'chat')
4. Navigate to: Project home page with sessions
5. Verify: Type filter dropdown appears in filter row
6. Test: Select "Planning" from type filter
7. Verify: Only planning sessions shown (if any exist)
8. Navigate to: A planning session (if exists) or create one via API
9. Verify: Permission mode selector is hidden
10. Verify: "Planning Mode" badge shown instead
11. Verify: Session works normally with plan permission mode
12. Navigate to: Session list
13. Verify: Planning sessions show green "Planning" badge
14. Verify: Workflow sessions show blue "Workflow" badge (if any exist)
15. Verify: Chat sessions show no badge
16. Check console: No errors or warnings

**Feature-Specific Checks:**

- Planning type sessions automatically use plan permission mode
- Permission mode selector hidden for planning sessions
- Type filter works with other filters (state, agent, archived, search)
- Active filters bar shows type filter when selected
- Type badge displays correctly on different screen sizes
- Default chat type applied to existing sessions

## Implementation Notes

### 1. Backward Compatibility

All existing sessions will default to type 'chat' via the database default value. No data migration script needed.

### 2. Permission Mode Locking

Planning sessions force `permissionMode = 'plan'` at the UI level. The backend still respects whatever permission mode is sent via WebSocket. This is intentional - the lock is a UX convenience, not a security constraint.

### 3. Filter UI Consistency

The type filter follows the exact same pattern as existing filters in ProjectHomeSessions. Grid column layout accommodates 5 filters (was 4, now 5 with type).

### 4. Type Badge Design

Chat sessions show no badge to reduce visual noise (chat is the default/common case). Only planning and workflow sessions show badges since they're special cases.

## Dependencies

- No new dependencies required
- Uses existing UI components (Badge, Select)
- Uses existing filter pattern from ProjectHomeSessions

## References

- Prisma enum documentation: https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#defining-enums
- Session type discussion: Chat conversation context
- Existing filter implementation: `apps/app/src/client/pages/projects/components/ProjectHomeSessions.tsx`

## Next Steps

1. Apply database migration
2. Update backend services and routes
3. Update frontend components for conditional rendering
4. Add filtering UI
5. Add type indicators
6. Test manually with different session types
7. Future: Add "New Planning Session" button (out of scope for bones)
8. Future: Implement "Convert to Workflow" feature (out of scope)
