import { describe, it, expect } from "vitest";
import {
  CompositionItemEntity,
  CompositionItemSchema,
} from "@/lib/domain/entities/composition-item";
import { createTestUuid, createTestSku } from "../factories/test-utils";

describe("CompositionItemEntity", () => {
  const validData = {
    parentSku: "DINING-SET-001",
    childSku: "CHAIR-001",
    quantity: 4,
  };

  describe("creation", () => {
    it("should create a valid composition item", () => {
      const id = createTestUuid();
      const item = CompositionItemEntity.create(id, validData);

      expect(item.id).toBe(id);
      expect(item.parentSku).toBe("DINING-SET-001");
      expect(item.childSku).toBe("CHAIR-001");
      expect(item.quantity).toBe(4);
      expect(item.createdAt).toBeInstanceOf(Date);
      expect(item.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("validation", () => {
    it("should reject invalid ID", () => {
      expect(() =>
        CompositionItemEntity.create("invalid-uuid", validData)
      ).toThrow();
    });

    it("should reject empty parent SKU", () => {
      expect(() =>
        CompositionItemEntity.create(createTestUuid(), {
          ...validData,
          parentSku: "",
        })
      ).toThrow();
    });

    it("should reject empty child SKU", () => {
      expect(() =>
        CompositionItemEntity.create(createTestUuid(), {
          ...validData,
          childSku: "",
        })
      ).toThrow();
    });

    it("should reject zero quantity", () => {
      expect(() =>
        CompositionItemEntity.create(createTestUuid(), {
          ...validData,
          quantity: 0,
        })
      ).toThrow();
    });

    it("should reject negative quantity", () => {
      expect(() =>
        CompositionItemEntity.create(createTestUuid(), {
          ...validData,
          quantity: -1,
        })
      ).toThrow();
    });

    it("should reject non-integer quantity", () => {
      expect(() =>
        CompositionItemEntity.create(createTestUuid(), {
          ...validData,
          quantity: 1.5,
        })
      ).toThrow();
    });
  });

  describe("updates", () => {
    it("should update composition item fields", async () => {
      const original = CompositionItemEntity.create(
        createTestUuid(),
        validData
      );

      // Wait a small amount to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1));

      const updated = original.update({
        childSku: "CHAIR-002",
        quantity: 6,
      });

      expect(updated.childSku).toBe("CHAIR-002");
      expect(updated.quantity).toBe(6);
      expect(updated.parentSku).toBe(original.parentSku);
      expect(updated.id).toBe(original.id);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        original.updatedAt.getTime()
      );
    });

    it("should preserve unchanged fields", () => {
      const original = CompositionItemEntity.create(
        createTestUuid(),
        validData
      );
      const updated = original.update({ quantity: 8 });

      expect(updated.childSku).toBe(original.childSku);
      expect(updated.parentSku).toBe(original.parentSku);
      expect(updated.createdAt).toEqual(original.createdAt);
    });
  });

  describe("business rules", () => {
    it("should validate business rules for valid item", () => {
      const item = CompositionItemEntity.create(createTestUuid(), validData);
      const errors = item.validateBusinessRules();

      expect(errors).toEqual([]);
    });

    it("should detect self-composition", () => {
      const item = CompositionItemEntity.create(createTestUuid(), {
        parentSku: "PRODUCT-001",
        childSku: "PRODUCT-001",
        quantity: 1,
      });

      const errors = item.validateBusinessRules();
      expect(errors).toContain("A product cannot be composed of itself");
    });

    it("should detect invalid quantity in business rules", () => {
      // Test that the schema validation catches invalid quantities
      expect(() => {
        new CompositionItemEntity(
          createTestUuid(),
          "PARENT-001",
          "CHILD-001",
          0, // Invalid quantity
          new Date(),
          new Date()
        );
      }).toThrow("Quantity must be a positive integer");
    });
  });

  describe("variation detection", () => {
    it("should detect variation SKU with VAR format", () => {
      const item = CompositionItemEntity.create(createTestUuid(), {
        ...validData,
        childSku: "CHAIR-001-VAR-abc123",
      });

      expect(item.isChildVariation()).toBe(true);
      expect(item.getChildBaseSku()).toBe("CHAIR-001");
    });

    it("should detect variation SKU with colon format", () => {
      const item = CompositionItemEntity.create(createTestUuid(), {
        ...validData,
        childSku: "CHAIR-001:red",
      });

      expect(item.isChildVariation()).toBe(true);
      expect(item.getChildBaseSku()).toBe("CHAIR-001");
    });

    it("should handle simple product SKU", () => {
      const item = CompositionItemEntity.create(createTestUuid(), validData);

      expect(item.isChildVariation()).toBe(false);
      expect(item.getChildBaseSku()).toBe("CHAIR-001");
    });
  });

  describe("composition key", () => {
    it("should generate composition key", () => {
      const item = CompositionItemEntity.create(createTestUuid(), validData);
      const expectedKey = "DINING-SET-001:CHAIR-001";

      expect(item.getCompositionKey()).toBe(expectedKey);
    });

    it("should generate unique keys for different compositions", () => {
      const item1 = CompositionItemEntity.create(createTestUuid(), validData);
      const item2 = CompositionItemEntity.create(createTestUuid(), {
        ...validData,
        childSku: "TABLE-001",
      });

      expect(item1.getCompositionKey()).not.toBe(item2.getCompositionKey());
    });
  });

  describe("serialization", () => {
    it("should convert to JSON", () => {
      const item = CompositionItemEntity.create(createTestUuid(), validData);
      const json = item.toJSON();

      expect(json.id).toBe(item.id);
      expect(json.parentSku).toBe(item.parentSku);
      expect(json.childSku).toBe(item.childSku);
      expect(json.quantity).toBe(item.quantity);
      expect(json.createdAt).toEqual(item.createdAt);
      expect(json.updatedAt).toEqual(item.updatedAt);
    });

    it("should create from JSON", () => {
      const original = CompositionItemEntity.create(
        createTestUuid(),
        validData
      );
      const json = original.toJSON();
      const restored = CompositionItemEntity.fromJSON(json);

      expect(restored.id).toBe(original.id);
      expect(restored.parentSku).toBe(original.parentSku);
      expect(restored.childSku).toBe(original.childSku);
      expect(restored.quantity).toBe(original.quantity);
    });
  });
});

describe("CompositionItemSchema", () => {
  it("should validate valid composition item data", () => {
    const result = CompositionItemSchema.safeParse({
      id: createTestUuid(),
      parentSku: "PARENT-001",
      childSku: "CHILD-001",
      quantity: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result.success).toBe(true);
  });

  it("should reject invalid ID", () => {
    const result = CompositionItemSchema.safeParse({
      id: "invalid-uuid",
      parentSku: "PARENT-001",
      childSku: "CHILD-001",
      quantity: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result.success).toBe(false);
  });

  it("should reject negative quantity", () => {
    const result = CompositionItemSchema.safeParse({
      id: createTestUuid(),
      parentSku: "PARENT-001",
      childSku: "CHILD-001",
      quantity: -1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result.success).toBe(false);
  });
});
