import { describe, it, expect } from "vitest";
import { VariationTypeEntity, VariationTypeSchema } from "@/lib/domain/entities/variation-type";
import { createTestUuid } from "../factories/test-utils";

describe("VariationTypeEntity", () => {
  const validData = {
    name: "Color",
    modifiesWeight: false,
    modifiesDimensions: false,
  };

  describe("creation", () => {
    it("should create a valid variation type", () => {
      const id = createTestUuid();
      const variationType = VariationTypeEntity.create(id, validData);

      expect(variationType.id).toBe(id);
      expect(variationType.name).toBe("Color");
      expect(variationType.modifiesWeight).toBe(false);
      expect(variationType.modifiesDimensions).toBe(false);
      expect(variationType.createdAt).toBeInstanceOf(Date);
      expect(variationType.updatedAt).toBeInstanceOf(Date);
    });

    it("should create variation type that modifies weight", () => {
      const id = createTestUuid();
      const variationType = VariationTypeEntity.create(id, {
        ...validData,
        name: "Material",
        modifiesWeight: true,
      });

      expect(variationType.modifiesWeight).toBe(true);
      expect(variationType.affectsCalculations()).toBe(true);
    });

    it("should create variation type that modifies dimensions", () => {
      const id = createTestUuid();
      const variationType = VariationTypeEntity.create(id, {
        ...validData,
        name: "Size",
        modifiesDimensions: true,
      });

      expect(variationType.modifiesDimensions).toBe(true);
      expect(variationType.affectsCalculations()).toBe(true);
    });
  });

  describe("validation", () => {
    it("should reject invalid UUID", () => {
      expect(() =>
        VariationTypeEntity.create("invalid-uuid", validData)
      ).toThrow();
    });

    it("should reject empty name", () => {
      expect(() =>
        VariationTypeEntity.create(createTestUuid(), {
          ...validData,
          name: "",
        })
      ).toThrow();
    });

    it("should reject name too long", () => {
      expect(() =>
        VariationTypeEntity.create(createTestUuid(), {
          ...validData,
          name: "a".repeat(51),
        })
      ).toThrow();
    });
  });

  describe("updates", () => {
    it("should update variation type fields", async () => {
      const original = VariationTypeEntity.create(createTestUuid(), validData);
      
      // Wait a small amount to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const updated = original.update({
        name: "Updated Color",
        modifiesWeight: true,
      });

      expect(updated.name).toBe("Updated Color");
      expect(updated.modifiesWeight).toBe(true);
      expect(updated.modifiesDimensions).toBe(original.modifiesDimensions);
      expect(updated.id).toBe(original.id);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(original.updatedAt.getTime());
    });

    it("should preserve unchanged fields", () => {
      const original = VariationTypeEntity.create(createTestUuid(), validData);
      const updated = original.update({ name: "New Name" });

      expect(updated.modifiesWeight).toBe(original.modifiesWeight);
      expect(updated.modifiesDimensions).toBe(original.modifiesDimensions);
      expect(updated.createdAt).toEqual(original.createdAt);
    });
  });

  describe("business logic", () => {
    it("should normalize name for case-insensitive comparison", () => {
      const variationType = VariationTypeEntity.create(createTestUuid(), {
        ...validData,
        name: "  Color  ",
      });

      expect(variationType.getNormalizedName()).toBe("color");
    });

    it("should detect if affects calculations", () => {
      const colorType = VariationTypeEntity.create(createTestUuid(), {
        name: "Color",
        modifiesWeight: false,
        modifiesDimensions: false,
      });

      const materialType = VariationTypeEntity.create(createTestUuid(), {
        name: "Material",
        modifiesWeight: true,
        modifiesDimensions: false,
      });

      const sizeType = VariationTypeEntity.create(createTestUuid(), {
        name: "Size",
        modifiesWeight: true,
        modifiesDimensions: true,
      });

      expect(colorType.affectsCalculations()).toBe(false);
      expect(materialType.affectsCalculations()).toBe(true);
      expect(sizeType.affectsCalculations()).toBe(true);
    });
  });

  describe("serialization", () => {
    it("should convert to JSON", () => {
      const variationType = VariationTypeEntity.create(createTestUuid(), validData);
      const json = variationType.toJSON();

      expect(json.id).toBe(variationType.id);
      expect(json.name).toBe(variationType.name);
      expect(json.modifiesWeight).toBe(variationType.modifiesWeight);
      expect(json.modifiesDimensions).toBe(variationType.modifiesDimensions);
      expect(json.createdAt).toEqual(variationType.createdAt);
      expect(json.updatedAt).toEqual(variationType.updatedAt);
    });

    it("should create from JSON", () => {
      const original = VariationTypeEntity.create(createTestUuid(), validData);
      const json = original.toJSON();
      const restored = VariationTypeEntity.fromJSON(json);

      expect(restored.id).toBe(original.id);
      expect(restored.name).toBe(original.name);
      expect(restored.modifiesWeight).toBe(original.modifiesWeight);
      expect(restored.modifiesDimensions).toBe(original.modifiesDimensions);
    });
  });
});

describe("VariationTypeSchema", () => {
  it("should validate valid variation type data", () => {
    const result = VariationTypeSchema.safeParse({
      id: createTestUuid(),
      name: "Color",
      modifiesWeight: false,
      modifiesDimensions: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result.success).toBe(true);
  });

  it("should reject invalid UUID", () => {
    const result = VariationTypeSchema.safeParse({
      id: "invalid-uuid",
      name: "Color",
      modifiesWeight: false,
      modifiesDimensions: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result.success).toBe(false);
  });

  it("should reject empty name", () => {
    const result = VariationTypeSchema.safeParse({
      id: createTestUuid(),
      name: "",
      modifiesWeight: false,
      modifiesDimensions: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result.success).toBe(false);
  });
});