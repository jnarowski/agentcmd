import { buildSlashCommand } from "./packages/agentcmd-workflows/src/generated/slash-command-types";

// Test 1: With context
console.log("Test 1 - with context:");
const result1 = buildSlashCommand("/cmd:generate-spec", { context: "some context here" });
console.log(result1);

// Test 2: Without context (undefined)
console.log("\nTest 2 - without context (undefined):");
const result2 = buildSlashCommand("/cmd:generate-spec", { context: undefined });
console.log(result2);

// Test 3: No args object
console.log("\nTest 3 - no args:");
const result3 = buildSlashCommand("/cmd:generate-spec");
console.log(result3);

// Test 4: Empty string context
console.log("\nTest 4 - empty string context:");
const result4 = buildSlashCommand("/cmd:generate-spec", { context: "" });
console.log(result4);
