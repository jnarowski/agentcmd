# E2E Test Project

This is a fixture project used for end-to-end testing of the workflow engine.

## Purpose

- Provides a minimal but complete project structure for E2E tests
- Contains a simple workflow definition (`e2e-test-workflow`) for testing
- Used by the test suite to validate workflow execution, status updates, and database operations

## Structure

- `.agent/workflows/definitions/` - Workflow definitions
- `.agent/specs/todo/` - Spec files directory (for workflow execution)

## Usage

This project is automatically seeded by the E2E test global setup and should not be modified manually.
