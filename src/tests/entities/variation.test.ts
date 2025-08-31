import { describe, it, expect } from "vitest";
import {
  VariationEntity,
  VariationSchema,
} from "@/lib/domain/entities/variation";
import { createTestUuid } from "../factories/test-utils";

describe("VariationEntity", () => {
  const typeId = createTestUuid();
  const validData = {
    variationTypeId: typeId,
    name: "Red",
  };

  describe("creation", () => {
    it("should create a valid variation", () => {
      const id = createTestUuid();
      const variation = VariationEntity.create(id, validData);

      expect(variation.id).toBe(id);
      expect(variation.variationTypeId).toBe(typeId);
      expect(variation.name).toBe("Red");
      expect(variation.createdAt).toBeInstanceOf(Date);
      expect(variation.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("validation", () => {
    it("should reject invalid variation ID", () => {
      expect(() => VariationEntity.create("invalid-uuid", validData)).toThrow();
    });

    it("should reject invalid variation type ID", () => {
      expect(() =>
        VariationEntity.create(createTestUuid(), {
          ...validData,
          variationTypeId: "invalid-uuid",
        })
      ).toThrow();
    });

    it("should reject empty name", () => {
      expect(() =>
        VariationEntity.create(createTestUuid(), {
          ...validData,
          name: "",
        })
      ).toThrow();
    });

    it("should reject name too long", () => {
      expect(() =>
        VariationEntity.create(createTestUuid(), {
          ...validData,
          name: "a".repeat(51),
        })
      ).toThrow();
    });
  });

  describe("updates", () => {
    it("should update variation fields", async () => {
      const original = VariationEntity.create(createTestUuid(), validData);

      // Wait a small amount to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1));

      const newTypeId = createTestUuid();
      const updated = original.update({
        name: "Blue",
        variationTypeId: newTypeId,
      });

      expect(updated.name).toBe("Blue");
      expect(updated.variationTypeId).toBe(newTypeId);
      expect(updated.id).toBe(original.id);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        original.updatedAt.getTime()
      );
    });

    it("should preserve unchanged fields", () => {
      const original = VariationEntity.create(createTestUuid(), validData);
      const updated = original.update({ name: "Blue" });

      expect(updated.variationTypeId).toBe(original.variationTypeId);
      expect(updated.createdAt).toEqual(original.createdAt);
    });
  });

  describe("business logic", () => {
    it("should normalize name for case-insensitive comparison", () => {
      const variation = VariationEntity.create(createTestUuid(), {
        ...validData,
        name: "  RED  ",
      });

      expect(variation.getNormalizedName()).toBe("red");
    });

    it("should create type unique key", () => {
      const variation = VariationEntity.create(createTestUuid(), validData);
      const expectedKey = `${typeId}:red`;

      expect(variation.getTypeUniqueKey()).toBe(expectedKey);
    });

    it("should create consistent type unique key regardless of name casing", () => {
      const variation1 = VariationEntity.create(createTestUuid(), {
        ...validData,
        name: "Red",
      });

      const variation2 = VariationEntity.create(createTestUuid(), {
        ...validData,
        name: "RED",
      });

      expect(variation1.getTypeUniqueKey()).toBe(variation2.getTypeUniqueKey());
    });
  });

  describe("serialization", () => {
    it("should convert to JSON", () => {
      const variation = VariationEntity.create(createTestUuid(), validData);
      const json = variation.toJSON();

      expect(json.id).toBe(variation.id);
      expect(json.variationTypeId).toBe(variation.variationTypeId);
      expect(json.name).toBe(variation.name);
      expect(json.createdAt).toEqual(variation.createdAt);
      expect(json.updatedAt).toEqual(variation.updatedAt);
    });

    it("should create from JSON", () => {
      const original = VariationEntity.create(createTestUuid(), validData);
      const json = original.toJSON();
      const restored = VariationEntity.fromJSON(json);

      expect(restored.id).toBe(original.id);
      expect(restored.variationTypeId).toBe(original.variationTypeId);
      expect(restored.name).toBe(original.name);
    });
  });
});

describe("VariationSchema", () => {
  it("should validate valid variation data", () => {
    const result = VariationSchema.safeParse({
      id: createTestUuid(),
      variationTypeId: createTestUuid(),
      name: "Red",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result.success).toBe(true);
  });

  it("should reject invalid variation ID", () => {
    const result = VariationSchema.safeParse({
      id: "invalid-uuid",
      variationTypeId: createTestUuid(),
      name: "Red",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result.success).toBe(false);
  });

  it("should reject invalid variation type ID", () => {
    const result = VariationSchema.safeParse({
      id: createTestUuid(),
      variationTypeId: "invalid-uuid",
      name: "Red",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result.success).toBe(false);
  });
});
