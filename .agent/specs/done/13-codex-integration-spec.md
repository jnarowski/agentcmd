# Codex Integration Implementation Specification

## Executive Summary

This specification outlines the integration of OpenAI Codex support into the apps/web application. The codebase already has 90% of the multi-agent infrastructure in place (database schema, SDK integration, UI components). This plan focuses on the remaining 10%: enabling agent selection during session creation and ensuring the WebSocket handler uses the correct CLI tool.

## Current State Analysis

### What Already Works ✅

1. **Database Schema** - `agent` field with enum supporting all 4 agent types (claude, codex, cursor, gemini)
2. **SDK Integration** - `@repo/agent-cli-sdk` fully implements both Claude and Codex with unified API
3. **Type System** - Shared `AgentType` across frontend/backend
4. **UI Components** - All 4 agent icons (Claude, Codex, Gemini, Cursor) with SVG assets
5. **Session Store** - Already tracks `agent: AgentType` per session
6. **Message Loading** - Correctly uses session's agent type when loading history

### Critical Issues ❌

1. **No Agent Selection UI** - Sessions always default to Claude
2. **Missing API Parameter** - `createSession` doesn't accept `agent` parameter
3. **Hardcoded WebSocket Handler** - Always executes Claude CLI regardless of session agent
4. **No Tests** - No route tests, WebSocket tests, or multi-agent tests
5. **Incomplete Session Sync** - Only syncs Claude sessions, ignores Codex

## Architecture Overview

### Data Flow

```
User clicks "New Session"
    ↓
Agent Selection Dialog (NEW)
    ↓
POST /api/projects/:id/sessions { agent: 'codex' } (UPDATED)
    ↓
createSession(projectId, userId, sessionId, agent) (UPDATED)
    ↓
Prisma: AgentSession.create({ agent: 'codex' })
    ↓
WebSocket: session.{id}.send_message
    ↓
execute({ tool: session.agent }) (FIXED - was hardcoded 'claude')
    ↓
@repo/agent-cli-sdk routes to correct CLI
```

### Key Files Affected

**Backend:**
- `apps/web/src/server/schemas/session.ts` - Add agent to request schema
- `apps/web/src/server/services/agentSession.ts` - Accept agent parameter
- `apps/web/src/server/routes/sessions.ts` - Extract agent from request
- `apps/web/src/server/websocket.ts` - Use session.agent (not hardcoded)

**Frontend:**
- `apps/web/src/client/components/AgentSelector.tsx` - NEW component
- `apps/web/src/client/pages/projects/sessions/components/NewSessionDialog.tsx` - NEW
- `apps/web/src/client/pages/projects/sessions/components/NewSessionButton.tsx` - Open dialog
- `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx` - Pass agent to API
- `apps/web/src/client/pages/projects/sessions/components/ChatPromptInput.tsx` - Agent-specific features

**Tests:**
- Multiple new test files for routes, WebSocket, components
- Updates to existing tests for multi-agent support

## Implementation Plan

### Phase 1: Core Backend Changes (2 hours)

#### 1.1 Update API Schema (15 min)

**File:** `apps/web/src/server/schemas/session.ts`

```typescript
// Current (line 20-22)
export const createSessionSchema = z.object({
  sessionId: z.string().min(1),
});

// Updated
export const createSessionSchema = z.object({
  sessionId: z.string().min(1),
  agent: z.enum(['claude', 'codex', 'cursor', 'gemini']).optional().default('claude'),
});
```

**File:** `apps/web/src/shared/types/agent-session.types.ts`

```typescript
// Add to CreateSessionRequest interface
export interface CreateSessionRequest {
  sessionId: string;
  agent?: AgentType; // NEW
}
```

#### 1.2 Update Service Layer (20 min)

**File:** `apps/web/src/server/services/agentSession.ts`

Update `createSession` function (lines 350-382):

```typescript
// Current signature
export async function createSession(
  projectId: string,
  userId: string,
  sessionId: string
): Promise<SessionResponse>

// Updated signature
export async function createSession(
  projectId: string,
  userId: string,
  sessionId: string,
  agent: AgentType = 'claude' // NEW parameter with default
): Promise<SessionResponse>

// Update Prisma call
const session = await prisma.agentSession.create({
  data: {
    id: sessionId,
    projectId,
    userId,
    agent, // NEW - pass agent parameter
    metadata: {},
  },
});
```

#### 1.3 Update API Route (15 min)

**File:** `apps/web/src/server/routes/sessions.ts`

Update POST endpoint (lines 109-143):

```typescript
fastify.post<{
  Params: { id: string };
  Body: z.infer<typeof createSessionSchema>; // Now includes agent
}>(
  '/api/projects/:id/sessions',
  {
    preHandler: fastify.authenticate,
    schema: {
      params: paramsSchema,
      body: createSessionSchema, // Validates agent parameter
      response: {
        201: z.object({ data: sessionResponseSchema }),
      },
    },
  },
  async (request, reply) => {
    const { id: projectId } = request.params;
    const { sessionId, agent } = request.body; // Extract agent

    const session = await createSession(
      projectId,
      request.user.id,
      sessionId,
      agent // Pass to service
    );

    return reply.code(201).send({ data: session });
  }
);
```

#### 1.4 Fix WebSocket Handler (20 min) **CRITICAL**

**File:** `apps/web/src/server/websocket.ts`

Update execute call (lines 154-186):

```typescript
// Current (line 166-176)
const result = await execute({
  tool: "claude", // ❌ HARDCODED
  prompt: messageData.message,
  workingDir: projectPath,
  sessionId,
  resume,
  permissionMode,
  // ...
});

// Updated
const result = await execute({
  tool: session.agent as 'claude' | 'codex', // ✅ Use session's agent
  prompt: messageData.message,
  workingDir: projectPath,
  sessionId,
  resume,
  permissionMode,
  // ...
});

// Add validation before execute
if (session.agent !== 'claude' && session.agent !== 'codex') {
  socket.send(JSON.stringify({
    type: `session.${sessionId}.error`,
    data: {
      error: `Agent type '${session.agent}' is not yet implemented`,
      code: 'UNSUPPORTED_AGENT'
    }
  }));
  return;
}
```

#### 1.5 Backend Tests (50 min) **NEW**

##### Create Route Tests (30 min)

**NEW FILE:** `apps/web/src/server/routes/sessions.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { build } from '../app';
import type { FastifyInstance } from 'fastify';
import { prisma } from '@/shared/prisma';

vi.mock('@/shared/prisma', () => ({
  prisma: {
    agentSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
  },
}));

describe('POST /api/projects/:id/sessions', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await build({ logger: false });

    // Get auth token (mock login)
    authToken = 'mock-jwt-token';
  });

  it('creates Claude session by default when agent not specified', async () => {
    const mockSession = {
      id: 'session-123',
      projectId: 'project-123',
      userId: 'user-123',
      agent: 'claude',
      metadata: {},
      created_at: new Date(),
      updated_at: new Date(),
    };

    vi.mocked(prisma.agentSession.create).mockResolvedValue(mockSession);

    const response = await app.inject({
      method: 'POST',
      url: '/api/projects/project-123/sessions',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { sessionId: 'session-123' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.agent).toBe('claude');
  });

  it('creates Codex session when specified', async () => {
    const mockSession = {
      id: 'session-456',
      projectId: 'project-123',
      userId: 'user-123',
      agent: 'codex',
      metadata: {},
      created_at: new Date(),
      updated_at: new Date(),
    };

    vi.mocked(prisma.agentSession.create).mockResolvedValue(mockSession);

    const response = await app.inject({
      method: 'POST',
      url: '/api/projects/project-123/sessions',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        sessionId: 'session-456',
        agent: 'codex',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.agent).toBe('codex');
  });

  it('validates agent parameter', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects/project-123/sessions',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        sessionId: 'session-789',
        agent: 'invalid-agent', // Invalid
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 401 when unauthorized', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/projects/project-123/sessions',
      payload: { sessionId: 'session-999' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns 404 for invalid project', async () => {
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

    const response = await app.inject({
      method: 'POST',
      url: '/api/projects/invalid-project/sessions',
      headers: { authorization: `Bearer ${authToken}` },
      payload: { sessionId: 'session-999' },
    });

    expect(response.statusCode).toBe(404);
  });
});
```

##### Create WebSocket Tests (20 min)

**NEW FILE:** `apps/web/src/server/websocket.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebSocket } from 'ws';
import { handleWebSocketConnection } from './websocket';
import * as agentCliSdk from '@repo/agent-cli-sdk';

vi.mock('@repo/agent-cli-sdk');

describe('WebSocket Handler', () => {
  let mockSocket: any;
  let mockPrisma: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSocket = {
      send: vi.fn(),
      on: vi.fn(),
      close: vi.fn(),
    };

    mockPrisma = {
      agentSession: {
        findUnique: vi.fn(),
      },
    };
  });

  it('executes Claude CLI for Claude sessions', async () => {
    const mockSession = {
      id: 'session-123',
      agent: 'claude',
      project: { path: '/test/project' },
    };

    mockPrisma.agentSession.findUnique.mockResolvedValue(mockSession);
    vi.mocked(agentCliSdk.execute).mockResolvedValue({
      success: true,
      exitCode: 0,
      sessionId: 'session-123',
      duration: 1000,
      messages: [],
      data: 'Response',
    });

    // Simulate message
    const message = {
      type: 'session.session-123.send_message',
      data: { message: 'Hello' },
    };

    // ... test execution
    expect(agentCliSdk.execute).toHaveBeenCalledWith(
      expect.objectContaining({ tool: 'claude' })
    );
  });

  it('executes Codex CLI for Codex sessions', async () => {
    const mockSession = {
      id: 'session-456',
      agent: 'codex',
      project: { path: '/test/project' },
    };

    mockPrisma.agentSession.findUnique.mockResolvedValue(mockSession);
    vi.mocked(agentCliSdk.execute).mockResolvedValue({
      success: true,
      exitCode: 0,
      sessionId: 'session-456',
      duration: 1000,
      messages: [],
      data: 'Response',
    });

    // ... test execution
    expect(agentCliSdk.execute).toHaveBeenCalledWith(
      expect.objectContaining({ tool: 'codex' })
    );
  });

  it('handles unsupported agents gracefully', async () => {
    const mockSession = {
      id: 'session-789',
      agent: 'gemini', // Not yet implemented
      project: { path: '/test/project' },
    };

    mockPrisma.agentSession.findUnique.mockResolvedValue(mockSession);

    // Should send error message
    expect(mockSocket.send).toHaveBeenCalledWith(
      expect.stringContaining('not yet implemented')
    );
    expect(agentCliSdk.execute).not.toHaveBeenCalled();
  });

  it('streams output correctly', async () => {
    // Test streaming event emission
    // Verify messages are sent to socket
  });
});
```

---

### Phase 2: Frontend Agent Selection (2 hours)

#### 2.1 Create Agent Selector Component (40 min)

**NEW FILE:** `apps/web/src/client/components/AgentSelector.tsx`

```typescript
import React from 'react';
import { AgentIcon } from '@/client/components/AgentIcon';
import { Label } from '@/client/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/client/components/ui/radio-group';
import type { AgentType } from '@/shared/types/agent.types';

interface AgentSelectorProps {
  value: AgentType;
  onChange: (agent: AgentType) => void;
  disabled?: boolean;
}

const agents: Array<{
  id: AgentType;
  name: string;
  description: string;
  status: 'available' | 'coming-soon';
}> = [
  {
    id: 'claude',
    name: 'Claude Code',
    description: 'Anthropic Claude - Advanced reasoning and coding',
    status: 'available',
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    description: 'OpenAI Codex - Code generation and understanding',
    status: 'available',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google Gemini - Multimodal AI assistant',
    status: 'coming-soon',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    description: 'Cursor IDE integration',
    status: 'coming-soon',
  },
];

export function AgentSelector({ value, onChange, disabled }: AgentSelectorProps) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(val) => onChange(val as AgentType)}
      disabled={disabled}
      className="space-y-3"
    >
      {agents.map((agent) => (
        <div
          key={agent.id}
          className={`flex items-start space-x-3 rounded-lg border p-4 ${
            agent.status === 'coming-soon'
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer hover:bg-accent'
          }`}
        >
          <RadioGroupItem
            value={agent.id}
            id={agent.id}
            disabled={disabled || agent.status === 'coming-soon'}
            className="mt-1"
          />
          <Label
            htmlFor={agent.id}
            className={`flex-1 cursor-pointer ${
              agent.status === 'coming-soon' ? 'cursor-not-allowed' : ''
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <AgentIcon agent={agent.id} className="h-5 w-5" />
              <span className="font-semibold">{agent.name}</span>
              {agent.status === 'coming-soon' && (
                <span className="text-xs text-muted-foreground">
                  (Coming Soon)
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {agent.description}
            </p>
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
```

**Test File:** `apps/web/src/client/components/AgentSelector.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentSelector } from './AgentSelector';

describe('AgentSelector', () => {
  it('renders all agent options', () => {
    const onChange = vi.fn();
    render(<AgentSelector value="claude" onChange={onChange} />);

    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.getByText('OpenAI Codex')).toBeInTheDocument();
    expect(screen.getByText('Google Gemini')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
  });

  it('calls onChange when selection changes', () => {
    const onChange = vi.fn();
    render(<AgentSelector value="claude" onChange={onChange} />);

    const codexRadio = screen.getByLabelText(/OpenAI Codex/i);
    fireEvent.click(codexRadio);

    expect(onChange).toHaveBeenCalledWith('codex');
  });

  it('disables coming soon agents', () => {
    const onChange = vi.fn();
    render(<AgentSelector value="claude" onChange={onChange} />);

    const geminiRadio = screen.getByLabelText(/Google Gemini/i);
    expect(geminiRadio).toBeDisabled();
  });

  it('respects disabled prop', () => {
    const onChange = vi.fn();
    render(<AgentSelector value="claude" onChange={onChange} disabled />);

    const claudeRadio = screen.getByLabelText(/Claude Code/i);
    expect(claudeRadio).toBeDisabled();
  });
});
```

#### 2.2 Create New Session Dialog (40 min)

**NEW FILE:** `apps/web/src/client/pages/projects/sessions/components/NewSessionDialog.tsx`

```typescript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgentSelector } from '@/client/components/AgentSelector';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/client/components/ui/dialog';
import { Button } from '@/client/components/ui/button';
import type { AgentType } from '@/shared/types/agent.types';

interface NewSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function NewSessionDialog({
  open,
  onOpenChange,
  projectId,
}: NewSessionDialogProps) {
  const navigate = useNavigate();
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('claude');

  const handleCreate = () => {
    // Navigate to new session page with agent param
    navigate(`/projects/${projectId}/session/new?agent=${selectedAgent}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
          <DialogDescription>
            Choose an AI agent to start a new coding session. Each agent has
            different capabilities and strengths.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <AgentSelector
            value={selectedAgent}
            onChange={setSelectedAgent}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>
            Create Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Test File:** `apps/web/src/client/pages/projects/sessions/components/NewSessionDialog.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NewSessionDialog } from './NewSessionDialog';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

describe('NewSessionDialog', () => {
  it('renders with Claude selected by default', () => {
    render(
      <BrowserRouter>
        <NewSessionDialog open={true} onOpenChange={vi.fn()} projectId="test-project" />
      </BrowserRouter>
    );

    expect(screen.getByText('Create New Session')).toBeInTheDocument();
  });

  it('navigates with selected agent when Create clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <BrowserRouter>
        <NewSessionDialog open={true} onOpenChange={onOpenChange} projectId="test-project" />
      </BrowserRouter>
    );

    // Select Codex
    const codexRadio = screen.getByLabelText(/OpenAI Codex/i);
    fireEvent.click(codexRadio);

    // Click Create
    const createButton = screen.getByText('Create Session');
    fireEvent.click(createButton);

    expect(mockNavigate).toHaveBeenCalledWith('/projects/test-project/session/new?agent=codex');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes dialog when Cancel clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <BrowserRouter>
        <NewSessionDialog open={true} onOpenChange={onOpenChange} projectId="test-project" />
      </BrowserRouter>
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
```

#### 2.3 Update NewSessionButton (20 min)

**File:** `apps/web/src/client/pages/projects/sessions/components/NewSessionButton.tsx`

```typescript
// Current (lines 20-27)
const handleCreateSession = () => {
  navigate(`/projects/${projectId}/session/new`);
};

// Updated
import { NewSessionDialog } from './NewSessionDialog';

const [dialogOpen, setDialogOpen] = useState(false);

const handleCreateSession = () => {
  setDialogOpen(true); // Open dialog instead of direct navigation
};

return (
  <>
    <Button onClick={handleCreateSession}>
      <Plus className="h-4 w-4 mr-2" />
      New Session
    </Button>

    <NewSessionDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      projectId={projectId}
    />
  </>
);
```

#### 2.4 Update ProjectSession Page (20 min)

**File:** `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx`

Update session creation (lines 238-248):

```typescript
// Current
const { data: newSession } = await api.post(
  `/api/projects/${projectId}/sessions`,
  { sessionId: generateUUID() }
);

// Updated - extract agent from query param
const searchParams = new URLSearchParams(location.search);
const agent = (searchParams.get('agent') as AgentType) || 'claude';

const { data: newSession } = await api.post(
  `/api/projects/${projectId}/sessions`,
  {
    sessionId: generateUUID(),
    agent, // Pass selected agent
  }
);
```

Update manual store initialization (lines 93-104):

```typescript
// Current
useSessionStore.setState({
  sessionId: sessionId,
  session: {
    id: sessionId,
    agent: "claude", // Hardcoded
    messages: [],
    // ...
  },
});

// Updated
const searchParams = new URLSearchParams(location.search);
const agent = (searchParams.get('agent') as AgentType) || 'claude';

useSessionStore.setState({
  sessionId: sessionId,
  session: {
    id: sessionId,
    agent, // Use selected agent
    messages: [],
    // ...
  },
});
```

---

### Phase 3: ChatPromptInput Adaptations (1 hour)

#### 3.1 Update ChatPromptInput (30 min)

**File:** `apps/web/src/client/pages/projects/sessions/components/ChatPromptInput.tsx`

Add agent-aware features:

```typescript
// Read agent from session store
const agent = useSessionStore((s) => s.session?.agent);

// Conditionally render features
return (
  <PromptInput ...>
    <PromptInputBody>
      {/* ... */}
    </PromptInputBody>
    <PromptInputFooter>
      <PromptInputTools>
        <ChatPromptInputFiles ... />
        <ChatPromptInputSlashCommands ... />

        {/* Speech button - Claude only for now */}
        {agent === 'claude' && (
          <PromptInputSpeechButton ... />
        )}

        {/* Permission mode - both agents support same modes */}
        <PromptInputPermissionModeSelect ... />
      </PromptInputTools>
      {/* ... */}
    </PromptInputFooter>
  </PromptInput>
);
```

#### 3.2 Update Tests (30 min)

**ADD TO:** `apps/web/src/client/pages/projects/sessions/components/ChatPromptInput.test.tsx`

```typescript
describe('Multi-Agent Support', () => {
  it('renders for Claude sessions', () => {
    useSessionStore.setState({
      session: { agent: 'claude', /* ... */ }
    });

    render(<ChatPromptInput />);

    expect(screen.getByRole('button', { name: /speech/i })).toBeInTheDocument();
  });

  it('renders for Codex sessions', () => {
    useSessionStore.setState({
      session: { agent: 'codex', /* ... */ }
    });

    render(<ChatPromptInput />);

    // Speech button should not be present for Codex
    expect(screen.queryByRole('button', { name: /speech/i })).not.toBeInTheDocument();
  });

  it('shows correct permission mode options', () => {
    // Both agents support same permission modes
    const agents: AgentType[] = ['claude', 'codex'];

    agents.forEach(agent => {
      useSessionStore.setState({
        session: { agent, /* ... */ }
      });

      render(<ChatPromptInput />);

      // Open permission mode dropdown
      const trigger = screen.getByRole('button', { name: /permission mode/i });
      fireEvent.click(trigger);

      expect(screen.getByText('Default')).toBeInTheDocument();
      expect(screen.getByText('Plan Mode')).toBeInTheDocument();
      expect(screen.getByText('Accept Edits')).toBeInTheDocument();
      expect(screen.getByText('Bypass Permissions')).toBeInTheDocument();
    });
  });
});
```

---

### Phase 4: Session Store Tests (30 min)

**ADD TO:** `apps/web/src/client/pages/projects/sessions/stores/sessionStore.test.ts`

```typescript
describe('Multi-Agent Sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.setState({ sessionId: null, session: null });
  });

  it('loads Claude session with agent type', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'session-123',
              agent: 'claude',
              metadata: {},
              project: { id: 'project-123', path: '/test' },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

    await useSessionStore.getState().loadSession('session-123', 'project-123');

    const session = useSessionStore.getState().session;
    expect(session?.agent).toBe('claude');
  });

  it('loads Codex session with agent type', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'session-456',
              agent: 'codex',
              metadata: {},
              project: { id: 'project-123', path: '/test' },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

    await useSessionStore.getState().loadSession('session-456', 'project-123');

    const session = useSessionStore.getState().session;
    expect(session?.agent).toBe('codex');
  });

  it('preserves agent type through lifecycle', async () => {
    // Load Codex session
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'session-789',
              agent: 'codex',
              metadata: {},
              project: { id: 'project-123', path: '/test' },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

    await useSessionStore.getState().loadSession('session-789', 'project-123');

    // Add message
    useSessionStore.getState().addMessage({
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: Date.now(),
      isStreaming: false,
    });

    // Agent type should still be 'codex'
    expect(useSessionStore.getState().session?.agent).toBe('codex');
  });

  it('handles Codex message streaming format', () => {
    useSessionStore.setState({
      sessionId: 'session-999',
      session: {
        id: 'session-999',
        agent: 'codex',
        messages: [],
        isStreaming: false,
        metadata: null,
        loadingState: 'loaded',
        error: null,
      },
    });

    // Simulate Codex streaming message
    useSessionStore.getState().updateStreamingMessage('msg-codex-1', [
      { type: 'thinking', thinking: 'Let me analyze this...' },
      { type: 'text', text: 'Here is the result' },
    ]);

    const messages = useSessionStore.getState().session?.messages;
    expect(messages).toHaveLength(1);
    expect(messages?.[0].content).toHaveLength(2);
    expect(messages?.[0].isStreaming).toBe(true);
  });
});
```

---

### Phase 5: Session Sync Enhancement (Optional - 45 min)

#### 5.1 Add Codex Session Sync

**File:** `apps/web/src/server/services/agentSession.ts`

Add Codex sync function:

```typescript
/**
 * Sync Codex sessions from ~/.codex/sessions/
 */
async function syncCodexSessions(
  projectPath: string,
  projectId: string,
  userId: string,
  logger?: FastifyBaseLogger
): Promise<void> {
  try {
    const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
    const sessionsDir = path.join(codexHome, 'sessions');

    if (!fs.existsSync(sessionsDir)) {
      logger?.debug('Codex sessions directory not found');
      return;
    }

    // Scan date-based directory structure (YYYY/MM/DD)
    const years = fs.readdirSync(sessionsDir);

    for (const year of years) {
      const yearPath = path.join(sessionsDir, year);
      if (!fs.statSync(yearPath).isDirectory()) continue;

      const months = fs.readdirSync(yearPath);

      for (const month of months) {
        const monthPath = path.join(yearPath, month);
        if (!fs.statSync(monthPath).isDirectory()) continue;

        const days = fs.readdirSync(monthPath);

        for (const day of days) {
          const dayPath = path.join(monthPath, day);
          if (!fs.statSync(dayPath).isDirectory()) continue;

          // Find rollout-*.jsonl files
          const sessionFiles = fs.readdirSync(dayPath)
            .filter(f => f.startsWith('rollout-') && f.endsWith('.jsonl'));

          for (const sessionFile of sessionFiles) {
            const sessionPath = path.join(dayPath, sessionFile);

            // Extract session ID from filename
            // Format: rollout-2025-09-24T19-22-20-{uuid}.jsonl
            const match = sessionFile.match(/rollout-.*?-([a-f0-9-]{36})\.jsonl$/);
            if (!match) continue;

            const sessionId = match[1];

            // Check if session already exists
            const existing = await prisma.agentSession.findUnique({
              where: { id: sessionId },
            });

            if (existing) continue;

            // Parse session file
            const content = fs.readFileSync(sessionPath, 'utf-8');
            const events = content
              .split('\n')
              .filter(line => line.trim())
              .map(line => JSON.parse(line));

            // Extract metadata from events
            const metadata = extractCodexMetadata(events);

            // Create session record
            await prisma.agentSession.create({
              data: {
                id: sessionId,
                projectId,
                userId,
                agent: 'codex',
                metadata,
              },
            });

            logger?.info({ sessionId }, 'Synced Codex session');
          }
        }
      }
    }
  } catch (error) {
    logger?.error({ err: error }, 'Failed to sync Codex sessions');
  }
}

/**
 * Extract metadata from Codex events
 */
function extractCodexMetadata(events: any[]): AgentSessionMetadata {
  const messageCount = events.filter(e =>
    e.type === 'item.completed' && e.item?.type === 'agent_message'
  ).length;

  const lastEvent = events[events.length - 1];
  const lastMessageAt = lastEvent?.timestamp
    ? new Date(lastEvent.timestamp).toISOString()
    : new Date().toISOString();

  // Get first user message for preview
  const firstUserMessage = events.find(e =>
    e.type === 'item.completed' && e.item?.type === 'user_message'
  );
  const firstMessagePreview = firstUserMessage?.item?.text?.substring(0, 100) || '';

  return {
    totalTokens: 0, // Codex doesn't expose token counts
    messageCount,
    lastMessageAt,
    firstMessagePreview,
  };
}
```

Update `syncProjectSessions`:

```typescript
export async function syncProjectSessions(
  projectId: string,
  projectPath: string,
  userId: string,
  logger?: FastifyBaseLogger
): Promise<void> {
  // Sync Claude sessions
  await syncClaudeSessions(projectPath, projectId, userId, logger);

  // Sync Codex sessions
  await syncCodexSessions(projectPath, projectId, userId, logger);
}

// Extract existing Claude sync logic into separate function
async function syncClaudeSessions(
  projectPath: string,
  projectId: string,
  userId: string,
  logger?: FastifyBaseLogger
): Promise<void> {
  // Current syncProjectSessions logic here
}
```

#### 5.2 Update Sync Tests

**ADD TO:** `apps/web/src/server/services/agentSession.test.ts`

```typescript
describe('syncCodexSessions', () => {
  let tempCodexHome: string;

  beforeEach(async () => {
    tempCodexHome = path.join(os.tmpdir(), `codex-test-${Date.now()}`);
    process.env.CODEX_HOME = tempCodexHome;

    // Create date-based structure
    const sessionDir = path.join(tempCodexHome, 'sessions', '2025', '01', '15');
    await fs.promises.mkdir(sessionDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.promises.rm(tempCodexHome, { recursive: true, force: true });
    delete process.env.CODEX_HOME;
  });

  it('finds Codex sessions by date structure', async () => {
    const sessionId = '01997e76-d124-7592-9cac-2ec05abbca08';
    const sessionPath = path.join(
      tempCodexHome,
      'sessions/2025/01/15',
      `rollout-2025-01-15T10-30-00-${sessionId}.jsonl`
    );

    // Create mock Codex session file
    const codexEvents = [
      { type: 'thread.started', thread_id: sessionId, timestamp: '2025-01-15T10:30:00Z' },
      {
        type: 'item.completed',
        item: {
          type: 'agent_message',
          text: 'Hello from Codex',
        },
      },
    ];

    await fs.promises.writeFile(
      sessionPath,
      codexEvents.map(e => JSON.stringify(e)).join('\n')
    );

    // Sync sessions
    await syncProjectSessions(
      'project-123',
      '/test/project',
      'user-123'
    );

    // Verify session was created
    expect(mockPrisma.agentSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: sessionId,
        agent: 'codex',
        projectId: 'project-123',
      }),
    });
  });

  it('parses Codex JSONL format', async () => {
    // Test metadata extraction
    const events = [
      {
        type: 'item.completed',
        item: { type: 'agent_message', text: 'Response 1' },
      },
      {
        type: 'item.completed',
        item: { type: 'agent_message', text: 'Response 2' },
      },
    ];

    const metadata = extractCodexMetadata(events);

    expect(metadata.messageCount).toBe(2);
    expect(metadata.totalTokens).toBe(0); // Codex doesn't expose
  });

  it('creates AgentSession records with agent=codex', async () => {
    // Similar to above but verify agent field specifically
    // ...
  });
});
```

---

### Phase 6: Integration Testing (Optional - 1 hour)

#### 6.1 E2E Test Setup

**NEW FILE:** `apps/web/e2e/multi-agent-session.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Multi-Agent Session Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/projects');
  });

  test('Create and use Claude session', async ({ page }) => {
    // Navigate to project
    await page.click('text=Test Project');

    // Click New Session
    await page.click('button:has-text("New Session")');

    // Dialog should open
    await expect(page.locator('dialog')).toBeVisible();

    // Claude should be selected by default
    await expect(page.locator('input[value="claude"]')).toBeChecked();

    // Click Create Session
    await page.click('button:has-text("Create Session")');

    // Should navigate to new session
    await page.waitForURL('**/session/new?agent=claude');

    // Type a message
    await page.fill('textarea[placeholder*="message"]', 'Hello Claude');
    await page.press('textarea', 'Enter');

    // Should see streaming response
    await expect(page.locator('text=Claude Code is thinking')).toBeVisible({ timeout: 10000 });
  });

  test('Create and use Codex session', async ({ page }) => {
    // Navigate to project
    await page.click('text=Test Project');

    // Click New Session
    await page.click('button:has-text("New Session")');

    // Select Codex
    await page.click('label:has-text("OpenAI Codex")');
    await expect(page.locator('input[value="codex"]')).toBeChecked();

    // Click Create Session
    await page.click('button:has-text("Create Session")');

    // Should navigate with codex param
    await page.waitForURL('**/session/new?agent=codex');

    // Type a message
    await page.fill('textarea[placeholder*="message"]', 'Hello Codex');
    await page.press('textarea', 'Enter');

    // Should see streaming response
    await expect(page.locator('[data-agent="codex"]')).toBeVisible({ timeout: 10000 });
  });

  test('Switch between Claude and Codex sessions', async ({ page }) => {
    // Create Claude session
    await page.click('text=Test Project');
    await page.click('button:has-text("New Session")');
    await page.click('button:has-text("Create Session")');
    await page.waitForURL('**/session/**');
    const claudeSessionUrl = page.url();

    // Create Codex session
    await page.click('button:has-text("New Session")');
    await page.click('label:has-text("OpenAI Codex")');
    await page.click('button:has-text("Create Session")');
    await page.waitForURL('**/session/**');
    const codexSessionUrl = page.url();

    // Navigate back to Claude session
    await page.goto(claudeSessionUrl);
    await expect(page.locator('[data-agent="claude"]')).toBeVisible();

    // Navigate to Codex session
    await page.goto(codexSessionUrl);
    await expect(page.locator('[data-agent="codex"]')).toBeVisible();
  });

  test('Coming soon agents are disabled', async ({ page }) => {
    await page.click('text=Test Project');
    await page.click('button:has-text("New Session")');

    // Gemini should be disabled
    const geminiRadio = page.locator('input[value="gemini"]');
    await expect(geminiRadio).toBeDisabled();

    // Cursor should be disabled
    const cursorRadio = page.locator('input[value="cursor"]');
    await expect(cursorRadio).toBeDisabled();
  });
});
```

---

## Test Summary

### New Test Files (4)
1. `apps/web/src/server/routes/sessions.test.ts` - **5 tests**
2. `apps/web/src/server/websocket.test.ts` - **4 tests**
3. `apps/web/src/client/components/AgentSelector.test.tsx` - **4 tests**
4. `apps/web/src/client/pages/projects/sessions/components/NewSessionDialog.test.tsx` - **3 tests**

### Updated Test Files (3)
1. `apps/web/src/server/services/agentSession.test.ts` - **+3 tests** (Codex sync)
2. `apps/web/src/client/pages/projects/sessions/components/ChatPromptInput.test.tsx` - **+3 tests**
3. `apps/web/src/client/pages/projects/sessions/stores/sessionStore.test.ts` - **+4 tests**

### E2E Tests (Optional)
1. `apps/web/e2e/multi-agent-session.spec.ts` - **5 tests**

**Total New Tests: 31**

---

## Test Execution

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test sessions.test.ts

# Run server tests only
pnpm test --project server

# Run client tests only
pnpm test --project client

# Watch mode during development
pnpm test:watch

# Run with coverage
pnpm test --coverage

# Run E2E tests (requires server running)
pnpm test:e2e
```

---

## Effort Breakdown

### Critical Path (Must Have)
- **Phase 1**: Backend Changes + Tests: **2 hours**
- **Phase 2**: Frontend Agent Selection: **2 hours**
- **Phase 3**: ChatPromptInput: **1 hour**
- **Phase 4**: Store Tests: **30 min**

**Critical Total: 5.5 hours**

### Optional (Nice to Have)
- **Phase 5**: Codex Sync: **45 min**
- **Phase 6**: E2E Tests: **1 hour**

**Optional Total: 1.75 hours**

**Grand Total: 7.25 hours**

---

## Success Criteria

### Functional Requirements
- ✅ Users can select agent (Claude/Codex) when creating sessions
- ✅ Sessions execute with correct CLI tool based on agent type
- ✅ Session list shows correct agent icon per session
- ✅ Agent type persists across page reloads
- ✅ WebSocket correctly routes to Claude/Codex CLI
- ✅ Permission modes work for both agents
- ✅ Backward compatibility maintained (defaults to Claude)

### Test Coverage
- ✅ 31+ new tests covering all critical paths
- ✅ Route handler tests for session creation
- ✅ WebSocket handler tests for both agents
- ✅ Component tests for agent selection UI
- ✅ Store tests for multi-agent state management
- ✅ All tests pass with `pnpm test`

### Quality Standards
- ✅ TypeScript types properly defined
- ✅ Following existing patterns (Zod, Vitest, mocks)
- ✅ Error handling for unsupported agents
- ✅ Loading/disabled states in UI
- ✅ Proper cleanup in beforeEach/afterEach

---

## Rollout Plan

### Stage 1: Backend Foundation (Day 1 AM)
1. Update schemas, services, routes
2. Fix WebSocket handler
3. Add backend tests
4. Deploy and verify API changes

### Stage 2: Frontend UI (Day 1 PM)
1. Create AgentSelector component
2. Create NewSessionDialog
3. Update NewSessionButton
4. Add component tests

### Stage 3: Integration (Day 2 AM)
1. Update ProjectSession page
2. Update ChatPromptInput
3. Add store tests
4. End-to-end manual testing

### Stage 4: Polish (Day 2 PM - Optional)
1. Add Codex sync
2. Add E2E tests
3. Documentation updates
4. User acceptance testing

---

## Risks & Mitigations

### Risk 1: Codex CLI Not Installed
**Mitigation**: Graceful error handling in WebSocket, show clear error message to user

### Risk 2: Breaking Existing Claude Sessions
**Mitigation**: Default to 'claude', extensive backward compatibility tests

### Risk 3: WebSocket Handler Complexity
**Mitigation**: Comprehensive WebSocket tests, separate function for agent routing

### Risk 4: UI State Synchronization
**Mitigation**: Zustand store already handles agent type, minimal changes needed

---

## Dependencies

### Required
- `@repo/agent-cli-sdk` - Already implements both Claude and Codex
- Vitest + React Testing Library - Already configured
- Prisma - Schema already supports agent enum

### Optional
- Playwright - For E2E tests (already in monorepo)
- Codex CLI installation - For real E2E testing with Codex

---

## Future Enhancements

1. **Gemini Integration** - When SDK adds support
2. **Cursor Integration** - When SDK adds support
3. **Agent-Specific Features**:
   - Different permission mode labels per agent
   - Agent-specific slash commands
   - Agent capabilities matrix in UI
4. **Session Migration** - Convert Claude sessions to Codex (or vice versa)
5. **Agent Performance Metrics** - Compare response times, quality
6. **Agent Switching** - Allow switching agent mid-session (advanced)

---

## Appendix: File Checklist

### Files to Create (6)
- [x] `apps/web/src/client/components/AgentSelector.tsx`
- [ ] `apps/web/src/client/components/AgentSelector.test.tsx`
- [x] `apps/web/src/client/pages/projects/sessions/components/NewSessionDialog.tsx`
- [ ] `apps/web/src/client/pages/projects/sessions/components/NewSessionDialog.test.tsx`
- [ ] `apps/web/src/server/routes/sessions.test.ts`
- [ ] `apps/web/src/server/websocket.test.ts`

### Files to Modify (9)
- [x] `apps/web/src/server/schemas/session.ts`
- [x] `apps/web/src/shared/types/agent-session.types.ts`
- [x] `apps/web/src/server/services/agentSession.ts`
- [x] `apps/web/src/server/routes/sessions.ts`
- [x] `apps/web/src/server/websocket.ts`
- [x] `apps/web/src/client/pages/projects/sessions/components/NewSessionButton.tsx`
- [x] `apps/web/src/client/pages/projects/sessions/ProjectSession.tsx`
- [x] `apps/web/src/client/pages/projects/sessions/components/ChatPromptInput.tsx`
- [ ] `apps/web/src/client/pages/projects/sessions/components/ChatPromptInput.test.tsx`

### Files to Extend (2)
- [ ] `apps/web/src/server/services/agentSession.test.ts`
- [ ] `apps/web/src/client/pages/projects/sessions/stores/sessionStore.test.ts`

**Total Files: 17**
