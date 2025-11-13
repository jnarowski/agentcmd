# Complexity Assessment Guide

How to assess initial complexity during the planning phase.

## Core Principle

**Complexity = Context Requirements**

Higher complexity means the agent needs to load more context from the codebase to implement successfully.

Complexity is NOT about:
- ❌ Time estimates (hours/days)
- ❌ Lines of code written
- ❌ Difficulty or skill level

Complexity IS about:
- ✅ How much codebase context needed
- ✅ Number of integration points
- ✅ Cross-cutting concerns
- ✅ Mental model requirements

## Complexity Scale

### 1-2/10: Trivial
**Definition**: Single file, minimal context needed

**Indicators**:
- Touch 1 file
- <50 lines of changes
- No integration with other systems
- Self-contained logic
- Copy-paste from existing pattern

**Examples**:
- Add constant to config file
- Add utility function with no dependencies
- Simple UI component with no state
- Add field to existing form

### 3-4/10: Simple
**Definition**: Few files, straightforward logic, low context

**Indicators**:
- Touch 2-4 files
- 50-200 lines of changes
- Follow existing patterns exactly
- Minimal integration (1-2 touch points)
- Clear, single responsibility

**Examples**:
- Add new API endpoint using existing service pattern
- Create simple domain service (one function, clear purpose)
- Add database field with migration
- Create basic UI component with props

### 5-6/10: Moderate
**Definition**: Multiple files, moderate context needs

**Indicators**:
- Touch 5-10 files
- 200-500 lines of changes
- Integration with 2-3 systems
- Need to understand domain logic
- Some architectural decisions
- Frontend + backend coordination

**Examples**:
- Add feature that spans frontend, API, service, and database
- Extend existing system with new capability
- Integration between two domains
- WebSocket handler with event streaming

### 7-8/10: Complex
**Definition**: Cross-cutting, high context requirements

**Indicators**:
- Touch 10-20 files
- 500-1000 lines of changes
- Integration with 3+ systems
- Deep domain knowledge needed
- Affects multiple domains
- Non-trivial state management
- Requires understanding existing architecture

**Examples**:
- Workflow execution engine changes
- Authentication/authorization system changes
- New cross-cutting feature (logging, monitoring, etc.)
- Major refactor of existing system
- Real-time collaboration features

### 9-10/10: Very Complex
**Definition**: Architectural, requires deep codebase knowledge

**Indicators**:
- Touch 20+ files
- 1000+ lines of changes
- Architectural changes
- Affects core abstractions
- Requires understanding full system
- Breaking changes or major migration
- New paradigm or pattern

**Examples**:
- Database migration (e.g., SQLite to Postgres)
- Add new domain with full stack
- Change core workflow engine architecture
- Implement new auth system from scratch
- Monorepo restructuring

## Assessment Checklist

### File Count Estimate
```
1 file       → 1-2/10
2-4 files    → 3-4/10
5-10 files   → 5-6/10
10-20 files  → 7-8/10
20+ files    → 9-10/10
```

### Cross-Cutting Concerns
**Does this feature:**
- Touch only one domain? → +0 complexity
- Touch 2 domains? → +1-2 complexity
- Touch 3+ domains? → +2-3 complexity
- Change core abstractions? → +3-4 complexity

### Pattern Matching
**Implementation approach:**
- Exact copy of existing pattern? → Lower complexity
- Adaptation of existing pattern? → Moderate complexity
- New pattern needed? → Higher complexity
- New paradigm? → Very high complexity

### Context Requirements
**How much codebase understanding needed:**
- Single file context? → 1-2/10
- Single domain context? → 3-4/10
- Multiple domains context? → 5-6/10
- Cross-system architecture? → 7-8/10
- Full system mental model? → 9-10/10

### Integration Points
**Count touch points:**
- 0-1 integration points → +0-1 complexity
- 2-3 integration points → +1-2 complexity
- 4-5 integration points → +2-3 complexity
- 6+ integration points → +3-4 complexity

## Red Flags for High Complexity

### 🚩 Architecture Changes
- Changing core abstractions
- New patterns not in codebase
- Breaking API changes
- Migration of existing data/code

### 🚩 Deep Knowledge Required
- Need to understand full workflow engine
- Need to understand auth flow
- Need to understand real-time event system
- Need to understand build/deployment

### 🚩 Cross-Cutting
- Affects all domains
- Changes shared types/schemas
- Logging, monitoring, error handling changes
- Configuration system changes

### 🚩 State Management Complexity
- Complex state synchronization
- Real-time multi-user coordination
- Optimistic updates with rollback
- Distributed state

### 🚩 Testing Challenges
- Hard to test in isolation
- Requires complex setup/fixtures
- Integration tests needed
- E2E tests needed

## When to Break Down

**If initial assessment is 8+ complexity**, consider breaking into smaller features:

### Example: "Add collaborative editing" (9/10)
Break into:
1. **Phase 1**: Basic file locking (5/10)
2. **Phase 2**: Real-time cursor sharing (6/10)
3. **Phase 3**: Operational transforms (7/10)

### Example: "Notification system" (7/10)
Break into:
1. **Phase 1**: In-app notifications only (4/10)
2. **Phase 2**: Add email notifications (5/10)
3. **Phase 3**: Add push notifications (6/10)

## Complexity Assessment Template

After research, provide this assessment:

```md
## Initial Complexity Assessment

**Estimated Complexity**: [X]/10

**Rationale**:
- File count: ~[N] files to touch
- Integration points: [list key integrations]
- Pattern matching: [new/existing/adaptation]
- Context requirements: [domain knowledge needed]
- Cross-cutting: [yes/no - explain]

**Breakdown**:
- Backend: [N] files ([specific areas])
- Frontend: [N] files ([specific areas])
- Database: [new models/changes]
- Tests: [scope of test changes]

**Red flags**: [if any high-complexity indicators found]

**Recommendation**: [proceed as-is / break into phases / suggest alternative approach]
```

## Adjustment After Clarification

Initial assessment may change after clarification:
- User narrows scope → Complexity decreases
- User expands scope → Complexity increases
- Architecture decision → May significantly change

Update assessment and note:
```md
**Complexity Update**: Originally estimated [X]/10, now [Y]/10 based on clarification about [decision].
```

## Tips

- **Start with file count** as baseline
- **Adjust for cross-cutting** concerns
- **Consider context needs** most heavily
- **Flag if >7/10** and discuss breakdown
- **Document rationale** for transparency
- **Update after clarification** if scope changes
