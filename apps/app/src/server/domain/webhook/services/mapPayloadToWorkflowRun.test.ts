import { describe, it, expect } from "vitest";
import { mapPayloadToWorkflowRun } from "./mapPayloadToWorkflowRun";
import type { WebhookConfig } from "../types/webhook.types";

describe("mapPayloadToWorkflowRun", () => {
  describe("Simple Mode (empty conditions)", () => {
    it("should match mapping with empty conditions", () => {
      // Arrange
      const config: WebhookConfig = {
        mappings: [
          {
            spec_type_id: "spec_feature",
            workflow_definition_id: "wf_123",
            conditions: [], // Empty = always match
          },
        ],
      };

      const payload = {
        action: "opened",
        pull_request: { title: "Test PR" },
      };

      // Act
      const result = mapPayloadToWorkflowRun(payload, config);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.mapping.spec_type_id).toBe("spec_feature");
      expect(result?.mapping.workflow_definition_id).toBe("wf_123");
      expect(result?.debugInfo.mapping_mode).toBe("simple");
      expect(result?.debugInfo.used_default).toBe(false);
    });

    it("should return first mapping when multiple have empty conditions", () => {
      // Arrange
      const config: WebhookConfig = {
        mappings: [
          {
            spec_type_id: "spec_first",
            workflow_definition_id: "wf_first",
            conditions: [],
          },
          {
            spec_type_id: "spec_second",
            workflow_definition_id: "wf_second",
            conditions: [],
          },
        ],
        default_action: "skip", // Required for multiple mappings
      };

      const payload = { test: "data" };

      // Act
      const result = mapPayloadToWorkflowRun(payload, config);

      // Assert
      expect(result?.mapping.spec_type_id).toBe("spec_first");
    });
  });

  describe("Conditional Mode (with conditions)", () => {
    it("should return first matching conditional group", () => {
      // Arrange
      const config: WebhookConfig = {
        mappings: [
          {
            spec_type_id: "spec_bug",
            workflow_definition_id: "wf_bugfix",
            conditions: [
              {
                path: "labels",
                operator: "contains",
                value: "bug",
              },
            ],
          },
          {
            spec_type_id: "spec_feature",
            workflow_definition_id: "wf_feature",
            conditions: [
              {
                path: "labels",
                operator: "contains",
                value: "feature",
              },
            ],
          },
        ],
        default_action: "skip",
      };

      const payload = {
        labels: ["bug", "critical"],
      };

      // Act
      const result = mapPayloadToWorkflowRun(payload, config);

      // Assert
      expect(result?.mapping.spec_type_id).toBe("spec_bug");
      expect(result?.debugInfo.mapping_mode).toBe("conditional");
      expect(result?.debugInfo.mapping_conditions_matched).toHaveLength(1);
      expect(result?.debugInfo.mapping_conditions_matched?.[0]).toMatchObject({
        path: "labels",
        operator: "contains",
        value: "bug",
        payload_value: ["bug", "critical"],
      });
    });

    it("should include payload_value in matched conditions", () => {
      // Arrange
      const config: WebhookConfig = {
        mappings: [
          {
            spec_type_id: "spec_open",
            workflow_definition_id: "wf_open",
            conditions: [
              {
                path: "status",
                operator: "equals",
                value: "open",
              },
            ],
          },
        ],
        default_action: "skip",
      };

      const payload = { status: "open" };

      // Act
      const result = mapPayloadToWorkflowRun(payload, config);

      // Assert
      expect(result?.debugInfo.mapping_conditions_matched?.[0]).toMatchObject({
        path: "status",
        operator: "equals",
        value: "open",
        payload_value: "open",
      });
    });

    it("should skip non-matching groups and find matching one", () => {
      // Arrange
      const config: WebhookConfig = {
        mappings: [
          {
            spec_type_id: "spec_bug",
            workflow_definition_id: "wf_bugfix",
            conditions: [
              {
                path: "labels",
                operator: "contains",
                value: "bug",
              },
            ],
          },
          {
            spec_type_id: "spec_feature",
            workflow_definition_id: "wf_feature",
            conditions: [
              {
                path: "labels",
                operator: "contains",
                value: "feature",
              },
            ],
          },
        ],
        default_action: "skip",
      };

      const payload = {
        labels: ["feature", "enhancement"],
      };

      // Act
      const result = mapPayloadToWorkflowRun(payload, config);

      // Assert
      expect(result?.mapping.spec_type_id).toBe("spec_feature");
    });

    it("should require all conditions in group to match (AND logic)", () => {
      // Arrange
      const config: WebhookConfig = {
        mappings: [
          {
            spec_type_id: "spec_urgent",
            workflow_definition_id: "wf_urgent",
            conditions: [
              {
                path: "labels",
                operator: "contains",
                value: "bug",
              },
              {
                path: "priority",
                operator: "equals",
                value: "high",
              },
            ],
          },
        ],
        default_action: "skip",
      };

      // Act - only first condition matches
      const result1 = mapPayloadToWorkflowRun(
        {
          labels: ["bug"],
          priority: "low",
        },
        config
      );

      // Act - both conditions match
      const result2 = mapPayloadToWorkflowRun(
        {
          labels: ["bug", "critical"],
          priority: "high",
        },
        config
      );

      // Assert
      expect(result1).toBeNull(); // First condition matches but not second
      expect(result2).not.toBeNull(); // Both match
      expect(result2?.debugInfo.mapping_conditions_matched).toHaveLength(2);
    });
  });

  describe("Default Action", () => {
    it("should use default_mapping when no conditions match and default_action is 'set_fields'", () => {
      // Arrange
      const config: WebhookConfig = {
        mappings: [
          {
            spec_type_id: "spec_bug",
            workflow_definition_id: "wf_bugfix",
            conditions: [
              {
                path: "labels",
                operator: "contains",
                value: "bug",
              },
            ],
          },
        ],
        default_action: "set_fields",
        default_mapping: {
          spec_type_id: "spec_default",
          workflow_definition_id: "wf_default",
        },
      };

      const payload = {
        labels: ["documentation"], // Doesn't match "bug"
      };

      // Act
      const result = mapPayloadToWorkflowRun(payload, config);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.mapping.spec_type_id).toBe("spec_default");
      expect(result?.mapping.workflow_definition_id).toBe("wf_default");
      expect(result?.debugInfo.used_default).toBe(true);
      expect(result?.debugInfo.mapping_conditions_matched).toBeNull();
    });

    it("should return null when no conditions match and default_action is 'skip'", () => {
      // Arrange
      const config: WebhookConfig = {
        mappings: [
          {
            spec_type_id: "spec_bug",
            workflow_definition_id: "wf_bugfix",
            conditions: [
              {
                path: "labels",
                operator: "contains",
                value: "bug",
              },
            ],
          },
        ],
        default_action: "skip",
      };

      const payload = {
        labels: ["documentation"],
      };

      // Act
      const result = mapPayloadToWorkflowRun(payload, config);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("Operator Tests", () => {
    it("should support 'equals' operator", () => {
      // Arrange
      const config: WebhookConfig = {
        mappings: [
          {
            spec_type_id: "spec_test",
            workflow_definition_id: "wf_test",
            conditions: [
              {
                path: "action",
                operator: "equals",
                value: "opened",
              },
            ],
          },
        ],
        default_action: "skip",
      };

      // Act
      const match = mapPayloadToWorkflowRun({ action: "opened" }, config);
      const noMatch = mapPayloadToWorkflowRun({ action: "closed" }, config);

      // Assert
      expect(match).not.toBeNull();
      expect(noMatch).toBeNull();
    });

    it("should support 'not_equals' operator", () => {
      // Arrange
      const config: WebhookConfig = {
        mappings: [
          {
            spec_type_id: "spec_test",
            workflow_definition_id: "wf_test",
            conditions: [
              {
                path: "action",
                operator: "not_equals",
                value: "deleted",
              },
            ],
          },
        ],
        default_action: "skip",
      };

      // Act
      const match = mapPayloadToWorkflowRun({ action: "opened" }, config);
      const noMatch = mapPayloadToWorkflowRun({ action: "deleted" }, config);

      // Assert
      expect(match).not.toBeNull();
      expect(noMatch).toBeNull();
    });

    it("should support 'contains' operator on arrays", () => {
      // Arrange
      const config: WebhookConfig = {
        mappings: [
          {
            spec_type_id: "spec_test",
            workflow_definition_id: "wf_test",
            conditions: [
              {
                path: "tags",
                operator: "contains",
                value: "important",
              },
            ],
          },
        ],
        default_action: "skip",
      };

      // Act
      const match = mapPayloadToWorkflowRun(
        {
          tags: ["important", "urgent"],
        },
        config
      );
      const noMatch = mapPayloadToWorkflowRun({ tags: ["normal"] }, config);

      // Assert
      expect(match).not.toBeNull();
      expect(noMatch).toBeNull();
    });

    it("should support 'contains' operator on strings", () => {
      // Arrange
      const config: WebhookConfig = {
        mappings: [
          {
            spec_type_id: "spec_test",
            workflow_definition_id: "wf_test",
            conditions: [
              {
                path: "title",
                operator: "contains",
                value: "bug",
              },
            ],
          },
        ],
        default_action: "skip",
      };

      // Act
      const match = mapPayloadToWorkflowRun(
        {
          title: "Fix bug in authentication",
        },
        config
      );
      const noMatch = mapPayloadToWorkflowRun({ title: "Add new feature" }, config);

      // Assert
      expect(match).not.toBeNull();
      expect(noMatch).toBeNull();
    });

    it("should support 'exists' operator", () => {
      // Arrange
      const config: WebhookConfig = {
        mappings: [
          {
            spec_type_id: "spec_test",
            workflow_definition_id: "wf_test",
            conditions: [
              {
                path: "pull_request",
                operator: "exists",
                value: null,
              },
            ],
          },
        ],
        default_action: "skip",
      };

      // Act
      const match = mapPayloadToWorkflowRun({ pull_request: { id: 123 } }, config);
      const noMatch = mapPayloadToWorkflowRun({ issue: { id: 123 } }, config);

      // Assert
      expect(match).not.toBeNull();
      expect(noMatch).toBeNull();
    });

    it("should support 'greater_than' operator", () => {
      // Arrange
      const config: WebhookConfig = {
        mappings: [
          {
            spec_type_id: "spec_test",
            workflow_definition_id: "wf_test",
            conditions: [
              {
                path: "priority",
                operator: "greater_than",
                value: 5,
              },
            ],
          },
        ],
        default_action: "skip",
      };

      // Act
      const match = mapPayloadToWorkflowRun({ priority: 8 }, config);
      const noMatch = mapPayloadToWorkflowRun({ priority: 3 }, config);

      // Assert
      expect(match).not.toBeNull();
      expect(noMatch).toBeNull();
    });
  });

  describe("Nested Path Access", () => {
    it("should support nested paths", () => {
      // Arrange
      const config: WebhookConfig = {
        mappings: [
          {
            spec_type_id: "spec_test",
            workflow_definition_id: "wf_test",
            conditions: [
              {
                path: "pull_request.user.login",
                operator: "equals",
                value: "dependabot",
              },
            ],
          },
        ],
        default_action: "skip",
      };

      const payload = {
        pull_request: {
          user: {
            login: "dependabot",
          },
        },
      };

      // Act
      const result = mapPayloadToWorkflowRun(payload, config);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.debugInfo.mapping_conditions_matched?.[0].payload_value).toBe(
        "dependabot"
      );
    });

    it("should handle missing nested paths", () => {
      // Arrange
      const config: WebhookConfig = {
        mappings: [
          {
            spec_type_id: "spec_test",
            workflow_definition_id: "wf_test",
            conditions: [
              {
                path: "pull_request.user.login",
                operator: "equals",
                value: "dependabot",
              },
            ],
          },
        ],
        default_action: "skip",
      };

      const payload = {
        pull_request: {
          // user is missing
        },
      };

      // Act
      const result = mapPayloadToWorkflowRun(payload, config);

      // Assert
      expect(result).toBeNull();
    });
  });
});
