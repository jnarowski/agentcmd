import { describe, it, expect } from "vitest";
import { extractWorkflowDefinition } from "./extractWorkflowDefinition";

describe("extractWorkflowDefinition", () => {
  describe("valid exports", () => {
    it("extracts default export workflow definition", () => {
      // Arrange: Valid workflow as default export
      const module = {
        default: {
          __type: "workflow",
          createInngestFunction: () => {},
          config: { id: "test-workflow" },
        },
      };

      // Act
      const result = extractWorkflowDefinition(module);

      // Assert
      expect(result).toBe(module.default);
      expect(result?.config.id).toBe("test-workflow");
    });

    it("extracts named export workflow definition", () => {
      // Arrange: Valid workflow as named export
      const module = {
        workflow: {
          __type: "workflow",
          createInngestFunction: () => {},
          config: { id: "named-workflow" },
        },
      };

      // Act
      const result = extractWorkflowDefinition(module);

      // Assert
      expect(result).toBe(module.workflow);
      expect(result?.config.id).toBe("named-workflow");
    });

    it("prioritizes default export over named exports", () => {
      // Arrange: Both default and named exports present
      const module = {
        default: {
          __type: "workflow",
          createInngestFunction: () => {},
          config: { id: "default-workflow" },
        },
        workflow: {
          __type: "workflow",
          createInngestFunction: () => {},
          config: { id: "named-workflow" },
        },
      };

      // Act
      const result = extractWorkflowDefinition(module);

      // Assert: Default export should take precedence
      expect(result).toBe(module.default);
      expect(result?.config.id).toBe("default-workflow");
    });

    it("finds workflow in any named export", () => {
      // Arrange: Workflow with custom export name
      const module = {
        createWorkflow: {
          __type: "workflow",
          createInngestFunction: () => {},
          config: { id: "custom-export" },
        },
        someOtherExport: "not a workflow",
      };

      // Act
      const result = extractWorkflowDefinition(module);

      // Assert
      expect(result).toBe(module.createWorkflow);
      expect(result?.config.id).toBe("custom-export");
    });
  });

  describe("invalid exports", () => {
    it("returns null when module has no workflow definition", () => {
      // Arrange: Module with regular exports
      const module = {
        default: { id: "test" },
        someFunction: () => {},
      };

      // Act
      const result = extractWorkflowDefinition(module);

      // Assert
      expect(result).toBeNull();
    });

    it("returns null when workflow missing __type field", () => {
      // Arrange: Object missing __type
      const module = {
        default: {
          createInngestFunction: () => {},
          config: { id: "test" },
        },
      };

      // Act
      const result = extractWorkflowDefinition(module);

      // Assert
      expect(result).toBeNull();
    });

    it("returns null when workflow has wrong __type value", () => {
      // Arrange: Object with wrong __type
      const module = {
        default: {
          __type: "phase",
          createInngestFunction: () => {},
          config: { id: "test" },
        },
      };

      // Act
      const result = extractWorkflowDefinition(module);

      // Assert
      expect(result).toBeNull();
    });

    it("returns null when workflow missing createInngestFunction", () => {
      // Arrange: Object missing createInngestFunction
      const module = {
        default: {
          __type: "workflow",
          config: { id: "test" },
        },
      };

      // Act
      const result = extractWorkflowDefinition(module);

      // Assert
      expect(result).toBeNull();
    });

    it("returns null when createInngestFunction is not a function", () => {
      // Arrange: createInngestFunction is not a function
      const module = {
        default: {
          __type: "workflow",
          createInngestFunction: "not a function",
          config: { id: "test" },
        },
      };

      // Act
      const result = extractWorkflowDefinition(module);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("returns null for null module", () => {
      // Arrange
      const module = { default: null };

      // Act
      const result = extractWorkflowDefinition(module);

      // Assert
      expect(result).toBeNull();
    });

    it("returns null for undefined export", () => {
      // Arrange
      const module = { default: undefined };

      // Act
      const result = extractWorkflowDefinition(module);

      // Assert
      expect(result).toBeNull();
    });

    it("returns null for non-object export", () => {
      // Arrange
      const module = {
        default: "string value",
        workflow: 123,
      };

      // Act
      const result = extractWorkflowDefinition(module);

      // Assert
      expect(result).toBeNull();
    });

    it("returns null for array export", () => {
      // Arrange
      const module = {
        default: [1, 2, 3],
      };

      // Act
      const result = extractWorkflowDefinition(module);

      // Assert
      expect(result).toBeNull();
    });

    it("returns null for empty module", () => {
      // Arrange
      const module = {};

      // Act
      const result = extractWorkflowDefinition(module);

      // Assert
      expect(result).toBeNull();
    });
  });
});
