# E2E Test Project

Fixture project for end-to-end testing of the workflow engine.

## Purpose

This project serves as a template that gets copied to `/tmp/.agentcmd-e2e-test-*` during E2E test execution. It contains a minimal but complete workflow definition for testing core workflow functionality.

## Contents

- `.agent/workflows/definitions/e2e-test-workflow.ts` - Test workflow with 2 phases, 1 AI step, 3 annotations, 1 artifact
- `.agent/specs/todo/` - Empty directory for spec file creation during tests
- `package.json` - Dependencies (agentcmd-workflows)

## Workflow Design

The `e2e-test-workflow` is designed for:
- Fast execution (~20-30 seconds)
- Deterministic, verifiable outputs
- Simple JSON-based AI prompts
- No git initialization required (uses "stay" mode)

## Usage

This fixture is automatically copied and seeded by `global-setup.ts` before E2E tests run. Tests reference the seeded project via `process.env.E2E_WORKFLOW_PROJECT_ID`.

Do not modify this fixture manually - changes should be made through the test implementation process.
