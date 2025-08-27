import { describe, it, expect } from "vitest";
import { DimensionsValue, DimensionsSchema } from "@/lib/domain/value-objects/dimensions";

describe("DimensionsValue", () => {
  describe("creation", () => {
    it("should create valid dimensions", () => {
      const dimensions = new DimensionsValue(10, 20, 30);
      
      expect(dimensions.height).toBe(10);
      expect(dimensions.width).toBe(20);
      expect(dimensions.depth).toBe(30);
    });

    it("should create from object", () => {
      const dimensions = DimensionsValue.create({ height: 10, width: 20, depth: 30 });
      
      expect(dimensions.height).toBe(10);
      expect(dimensions.width).toBe(20);
      expect(dimensions.depth).toBe(30);
    });

    it("should throw error for negative values", () => {
      expect(() => new DimensionsValue(-1, 20, 30)).toThrow();
      expect(() => new DimensionsValue(10, -1, 30)).toThrow();
      expect(() => new DimensionsValue(10, 20, -1)).toThrow();
    });

    it("should throw error for zero values", () => {
      expect(() => new DimensionsValue(0, 20, 30)).toThrow();
      expect(() => new DimensionsValue(10, 0, 30)).toThrow();
      expect(() => new DimensionsValue(10, 20, 0)).toThrow();
    });
  });

  describe("methods", () => {
    const dimensions = new DimensionsValue(10, 20, 30);

    it("should calculate volume correctly", () => {
      expect(dimensions.getVolume()).toBe(6000);
    });

    it("should format toString correctly", () => {
      expect(dimensions.toString()).toBe("10×20×30cm");
    });

    it("should convert to JSON", () => {
      expect(dimensions.toJSON()).toEqual({
        height: 10,
        width: 20,
        depth: 30,
      });
    });

    it("should check equality correctly", () => {
      const same = new DimensionsValue(10, 20, 30);
      const different = new DimensionsValue(10, 20, 31);

      expect(dimensions.equals(same)).toBe(true);
      expect(dimensions.equals(different)).toBe(false);
    });
  });
});

describe("DimensionsSchema", () => {
  it("should validate valid dimensions", () => {
    const result = DimensionsSchema.safeParse({
      height: 10,
      width: 20,
      depth: 30,
    });

    expect(result.success).toBe(true);
  });

  it("should reject negative values", () => {
    const result = DimensionsSchema.safeParse({
      height: -1,
      width: 20,
      depth: 30,
    });

    expect(result.success).toBe(false);
  });

  it("should reject zero values", () => {
    const result = DimensionsSchema.safeParse({
      height: 0,
      width: 20,
      depth: 30,
    });

    expect(result.success).toBe(false);
  });

  it("should reject missing fields", () => {
    const result = DimensionsSchema.safeParse({
      height: 10,
      width: 20,
    });

    expect(result.success).toBe(false);
  });
});