import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils/cn";

describe("cn utility", () => {
  it("should merge class names correctly", () => {
    expect(cn("px-2 py-1", "bg-red-500")).toBe("px-2 py-1 bg-red-500");
  });

  it("should handle conflicting classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("should handle conditional classes", () => {
    expect(cn("px-2", false && "py-1", "bg-red-500")).toBe("px-2 bg-red-500");
  });
});