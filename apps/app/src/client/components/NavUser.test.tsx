import { describe, it, expect } from "vitest";

/**
 * Get the first two initials from a user's name or username
 * @param name - The user's full name or username
 * @returns Two uppercase initials (e.g., "JD" for "John Doe", "JN" for "jnarowski")
 */
function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "??";

  const parts = trimmed.split(/\s+/);

  if (parts.length === 1) {
    // Single name - take first two characters
    return parts[0].slice(0, 2).toUpperCase();
  }

  // Multiple names - take first character of first two parts
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

describe("getInitials", () => {
  it("should return first two initials for a full name", () => {
    expect(getInitials("John Doe")).toBe("JD");
    expect(getInitials("Jane Smith")).toBe("JS");
  });

  it("should return first two characters for a single name or username", () => {
    expect(getInitials("John")).toBe("JO");
    expect(getInitials("Jane")).toBe("JA");
    expect(getInitials("jnarowski")).toBe("JN");
  });

  it("should handle names with multiple spaces", () => {
    expect(getInitials("John Michael Doe")).toBe("JM");
  });

  it("should handle lowercase names", () => {
    expect(getInitials("john doe")).toBe("JD");
  });

  it("should handle extra whitespace", () => {
    expect(getInitials("  John   Doe  ")).toBe("JD");
  });

  it("should return ?? for empty string", () => {
    expect(getInitials("")).toBe("??");
    expect(getInitials("   ")).toBe("??");
  });

  it("should handle single character names", () => {
    expect(getInitials("J")).toBe("J");
  });
});
