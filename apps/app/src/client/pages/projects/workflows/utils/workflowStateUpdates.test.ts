import { describe, it, expect } from 'vitest';
import {
  updateExecutionInMap,
  updateStepInExecution,
  applyStepStarted,
  applyStepCompleted,
  applyStepFailed,
  applyPhaseCompleted,
  applyWorkflowStarted,
  applyWorkflowCompleted,
  applyWorkflowFailed,
  applyWorkflowPaused,
  applyWorkflowResumed,
  applyWorkflowCancelled,
  applyEventCreated,
} from './workflowStateUpdates';
import type { WorkflowRun, WorkflowEvent } from '../types';
import { WorkflowStatusValues, StepStatusValues } from '@/shared/schemas/workflow.schemas';

// ============================================================================
// Mock Data
// ============================================================================

const mockRun: WorkflowRun = {
  id: 'exec-1',
  workflow_definition_id: 'def-1',
  project_id: 'proj-1',
  name: 'Test Execution',
  status: WorkflowStatusValues.RUNNING,
  args: null,
  current_step: null,
  current_phase: null,
  error_message: null,
  started_at: new Date('2025-01-01'),
  completed_at: null,
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-01'),
  created_by: 'user-1',
};

const mockRunWithSteps: WorkflowRun = {
  ...mockRun,
  steps: [
    {
      id: 'step-1',
      workflow_run_id: 'exec-1',
      name: 'Step 1',
      phase: 'Phase 1',
      status: StepStatusValues.PENDING,
      logs: null,
      error_message: null,
      agent_session_id: null,
      started_at: null,
      completed_at: null,
      created_at: new Date('2025-01-01'),
      updated_at: new Date('2025-01-01'),
    },
    {
      id: 'step-2',
      workflow_run_id: 'exec-1',
      name: 'Step 2',
      phase: 'Phase 1',
      status: StepStatusValues.PENDING,
      logs: null,
      error_message: null,
      agent_session_id: null,
      started_at: null,
      completed_at: null,
      created_at: new Date('2025-01-01'),
      updated_at: new Date('2025-01-01'),
    },
  ],
};

const mockEvent: WorkflowEvent = {
  id: 'event-1',
  workflow_run_id: 'exec-1',
  event_type: 'annotation_added',
  event_data: { title: 'Test', body: 'Test annotation' },
  phase: null,
  inngest_step_id: null,
  created_by_user_id: 'user-1',
  created_at: new Date('2025-01-01'),
};

// ============================================================================
// Helper Functions Tests
// ============================================================================

describe('updateExecutionInMap', () => {
  it('updates run immutably', () => {
    const runs = new Map([['exec-1', mockRun]]);
    const result = updateExecutionInMap(runs, 'exec-1', (exec) => ({
      ...exec,
      status: WorkflowStatusValues.COMPLETED,
    }));

    // New map created
    expect(result).not.toBe(runs);

    // Original unchanged
    expect(runs.get('exec-1')!.status).toBe(WorkflowStatusValues.RUNNING);

    // Updated in new map
    expect(result.get('exec-1')!.status).toBe(WorkflowStatusValues.COMPLETED);
  });

  it('returns original map if run not found', () => {
    const runs = new Map([['exec-1', mockRun]]);
    const result = updateExecutionInMap(runs, 'non-existent', (exec) => ({
      ...exec,
      status: WorkflowStatusValues.COMPLETED,
    }));

    expect(result).toBe(runs);
  });
});

describe('updateStepInExecution', () => {
  it('updates step immutably', () => {
    const run = mockRunWithSteps;
    const result = updateStepInExecution(run, 'step-1', {
      status: StepStatusValues.COMPLETED,
    });

    // New object created
    expect(result).not.toBe(run);
    expect(result.steps).not.toBe(run.steps);

    // Original unchanged
    expect(run.steps![0].status).toBe(StepStatusValues.PENDING);

    // Updated in new object
    expect(result.steps![0].status).toBe(StepStatusValues.COMPLETED);
    expect(result.steps![0].updated_at).toBeInstanceOf(Date);
  });

  it('returns unchanged run if no steps', () => {
    const run = mockRun;
    const result = updateStepInExecution(run, 'step-1', {
      status: StepStatusValues.COMPLETED,
    });

    expect(result).toBe(run);
  });

  it('only updates matching step', () => {
    const run = mockRunWithSteps;
    const result = updateStepInExecution(run, 'step-1', {
      status: StepStatusValues.COMPLETED,
    });

    expect(result.steps![0].status).toBe(StepStatusValues.COMPLETED);
    expect(result.steps![1].status).toBe(StepStatusValues.PENDING);
  });
});

// ============================================================================
// Step Update Functions Tests
// ============================================================================

describe('applyStepStarted', () => {
  it('updates run and step status', () => {
    const run = mockRunWithSteps;
    const result = applyStepStarted(run, {
      stepId: 'step-1',
      stepName: 'Step 1',
      phaseId: 'phase-1',
    });

    expect(result.current_step).toBe('Step 1');
    expect(result.current_phase).toBe('phase-1');
    expect(result.steps![0].status).toBe(StepStatusValues.RUNNING);
    expect(result.steps![0].started_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('updates run without steps', () => {
    const run = mockRun;
    const result = applyStepStarted(run, {
      stepId: 'step-1',
      stepName: 'Step 1',
      phaseId: 'phase-1',
    });

    expect(result.current_step).toBe('Step 1');
    expect(result.current_phase).toBe('phase-1');
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});

describe('applyStepCompleted', () => {
  it('updates step to completed', () => {
    const run = mockRunWithSteps;
    const result = applyStepCompleted(run, {
      stepId: 'step-1',
      logs: 'Step completed successfully',
    });

    expect(result.steps![0].status).toBe(StepStatusValues.COMPLETED);
    expect(result.steps![0].logs).toBe('Step completed successfully');
    expect(result.steps![0].completed_at).toBeInstanceOf(Date);
  });

  it('returns unchanged if no steps', () => {
    const run = mockRun;
    const result = applyStepCompleted(run, {
      stepId: 'step-1',
      logs: 'logs',
    });

    expect(result).toBe(run);
  });
});

describe('applyStepFailed', () => {
  it('updates step to failed with error', () => {
    const run = mockRunWithSteps;
    const result = applyStepFailed(run, {
      stepId: 'step-1',
      error: 'Step failed with error',
    });

    expect(result.steps![0].status).toBe(StepStatusValues.FAILED);
    expect(result.steps![0].error_message).toBe('Step failed with error');
    expect(result.steps![0].completed_at).toBeInstanceOf(Date);
  });

  it('returns unchanged if no steps', () => {
    const run = mockRun;
    const result = applyStepFailed(run, {
      stepId: 'step-1',
      error: 'error',
    });

    expect(result).toBe(run);
  });
});

describe('applyPhaseCompleted', () => {
  it('updates current phase', () => {
    const run = mockRun;
    const result = applyPhaseCompleted(run, 'Phase 2');

    expect(result.current_phase).toBe('Phase 2');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('handles null next phase', () => {
    const run = mockRun;
    const result = applyPhaseCompleted(run, null);

    expect(result.current_phase).toBeNull();
  });
});

// ============================================================================
// Workflow Status Update Functions Tests
// ============================================================================

describe('applyWorkflowStarted', () => {
  it('updates status to running and sets started_at', () => {
    const run = { ...mockRun, status: WorkflowStatusValues.PENDING };
    const result = applyWorkflowStarted(run);

    expect(result.status).toBe(WorkflowStatusValues.RUNNING);
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});

describe('applyWorkflowCompleted', () => {
  it('updates status to completed and sets completed_at', () => {
    const run = mockRun;
    const result = applyWorkflowCompleted(run);

    expect(result.status).toBe(WorkflowStatusValues.COMPLETED);
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});

describe('applyWorkflowFailed', () => {
  it('updates status to failed with error message', () => {
    const run = mockRun;
    const result = applyWorkflowFailed(run, 'Workflow failed');

    expect(result.status).toBe(WorkflowStatusValues.FAILED);
    expect(result.error_message).toBe('Workflow failed');
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});

describe('applyWorkflowPaused', () => {
  it('updates status to paused', () => {
    const run = mockRun;
    const result = applyWorkflowPaused(run);

    expect(result.status).toBe(WorkflowStatusValues.PAUSED);
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});

describe('applyWorkflowResumed', () => {
  it('updates status to running', () => {
    const run = { ...mockRun, status: WorkflowStatusValues.PAUSED };
    const result = applyWorkflowResumed(run);

    expect(result.status).toBe(WorkflowStatusValues.RUNNING);
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});

describe('applyWorkflowCancelled', () => {
  it('updates status to cancelled and sets completed_at', () => {
    const run = mockRun;
    const result = applyWorkflowCancelled(run);

    expect(result.status).toBe(WorkflowStatusValues.CANCELLED);
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});

// ============================================================================
// Other Update Functions Tests
// ============================================================================

describe('applyEventCreated', () => {
  it('adds event to run', () => {
    const run = mockRun;
    const result = applyEventCreated(run, mockEvent);

    expect(result.events).toHaveLength(1);
    expect(result.events![0]).toBe(mockEvent);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('appends to existing events', () => {
    const run = {
      ...mockRun,
      events: [mockEvent],
    };
    const newEvent = { ...mockEvent, id: 'event-2' };
    const result = applyEventCreated(run, newEvent);

    expect(result.events).toHaveLength(2);
    expect(result.events![0]).toBe(mockEvent);
    expect(result.events![1]).toBe(newEvent);
  });

  it('preserves immutability of original events array', () => {
    const run = {
      ...mockRun,
      events: [mockEvent],
    };
    const newEvent = { ...mockEvent, id: 'event-2' };
    const result = applyEventCreated(run, newEvent);

    // Original array unchanged
    expect(run.events).toHaveLength(1);
    // New array created
    expect(result.events).not.toBe(run.events);
  });
});
