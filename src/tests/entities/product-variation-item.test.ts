import { describe, it, expect } from "vitest";
import { ProductVariationItemEntity } from "@/lib/domain/entities/product-variation-item";
import { createTestUuid } from "../factories/test-utils";

describe("ProductVariationItemEntity", () => {
  const type1Id = createTestUuid();
  const type2Id = createTestUuid();
  const variation1Id = createTestUuid();
  const variation2Id = createTestUuid();

  const validData = {
    productSku: "TEST-001",
    selections: {
      [type1Id]: variation1Id,
      [type2Id]: variation2Id,
    },
    weightOverride: 10,
    dimensionsOverride: { height: 15, width: 25, depth: 35 },
  };

  describe("creation", () => {
    it("should create valid product variation item", () => {
      const itemId = createTestUuid();
      const item = ProductVariationItemEntity.create(itemId, validData);

      expect(item.id).toBe(itemId);
      expect(item.productSku).toBe("TEST-001");
      expect(item.selections).toEqual(validData.selections);
      expect(item.weightOverride).toBe(10);
      expect(item.dimensionsOverride).toEqual(validData.dimensionsOverride);
    });

    it("should create without optional overrides", () => {
      const itemId = createTestUuid();
      const item = ProductVariationItemEntity.create(itemId, {
        productSku: "TEST-001",
        selections: { [type1Id]: variation1Id },
      });

      expect(item.weightOverride).toBeUndefined();
      expect(item.dimensionsOverride).toBeUndefined();
    });
  });

  describe("selection hash", () => {
    it("should generate consistent hash for same selections", () => {
      const item1 = ProductVariationItemEntity.create(createTestUuid(), {
        productSku: "TEST-001",
        selections: {
          [type1Id]: variation1Id,
          [type2Id]: variation2Id,
        },
      });

      const item2 = ProductVariationItemEntity.create(createTestUuid(), {
        productSku: "TEST-001",
        selections: {
          [type2Id]: variation2Id, // different order
          [type1Id]: variation1Id,
        },
      });

      expect(item1.getSelectionHash()).toBe(item2.getSelectionHash());
    });

    it("should generate different hash for different selections", () => {
      const item1 = ProductVariationItemEntity.create(createTestUuid(), {
        productSku: "TEST-001",
        selections: { [type1Id]: variation1Id },
      });

      const item2 = ProductVariationItemEntity.create(createTestUuid(), {
        productSku: "TEST-001",
        selections: { [type1Id]: variation2Id },
      });

      expect(item1.getSelectionHash()).not.toBe(item2.getSelectionHash());
    });
  });

  describe("selection comparison", () => {
    it("should detect same selections", () => {
      const item1 = ProductVariationItemEntity.create(
        createTestUuid(),
        validData
      );
      const item2 = ProductVariationItemEntity.create(createTestUuid(), {
        ...validData,
        weightOverride: 20, // different override, same selections
      });

      expect(item1.hasSameSelections(item2)).toBe(true);
    });

    it("should detect different selections", () => {
      const item1 = ProductVariationItemEntity.create(
        createTestUuid(),
        validData
      );
      const item2 = ProductVariationItemEntity.create(createTestUuid(), {
        ...validData,
        selections: { [type1Id]: createTestUuid() },
      });

      expect(item1.hasSameSelections(item2)).toBe(false);
    });
  });

  describe("variation type queries", () => {
    const item = ProductVariationItemEntity.create(createTestUuid(), validData);

    it("should get variation type IDs", () => {
      const typeIds = item.getVariationTypeIds();
      expect(typeIds).toContain(type1Id);
      expect(typeIds).toContain(type2Id);
      expect(typeIds).toHaveLength(2);
    });

    it("should get variation ID for type", () => {
      expect(item.getVariationId(type1Id)).toBe(variation1Id);
      expect(item.getVariationId(type2Id)).toBe(variation2Id);
      expect(item.getVariationId(createTestUuid())).toBeUndefined();
    });

    it("should check if has selection for type", () => {
      expect(item.hasSelectionForType(type1Id)).toBe(true);
      expect(item.hasSelectionForType(createTestUuid())).toBe(false);
    });
  });

  describe("variation SKU generation", () => {
    it("should generate variation SKU", () => {
      const item = ProductVariationItemEntity.create(
        createTestUuid(),
        validData
      );
      const variationSku = item.getVariationSku();

      expect(variationSku).toMatch(/^TEST-001-VAR-[a-f0-9]{8}$/);
    });

    it("should generate consistent SKU for same selections", () => {
      const item1 = ProductVariationItemEntity.create(
        createTestUuid(),
        validData
      );
      const item2 = ProductVariationItemEntity.create(
        createTestUuid(),
        validData
      );

      expect(item1.getVariationSku()).toBe(item2.getVariationSku());
    });
  });

  describe("updates", () => {
    it("should update selections", async () => {
      const original = ProductVariationItemEntity.create(
        createTestUuid(),
        validData
      );

      // Wait a small amount to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1));

      const newSelections = { [createTestUuid()]: createTestUuid() };
      const updated = original.update({ selections: newSelections });

      expect(updated.selections).toEqual(newSelections);
      expect(updated.weightOverride).toBe(original.weightOverride);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        original.updatedAt.getTime()
      );
    });

    it("should update overrides", () => {
      const original = ProductVariationItemEntity.create(
        createTestUuid(),
        validData
      );
      const updated = original.update({
        weightOverride: 15,
        dimensionsOverride: { height: 20, width: 30, depth: 40 },
      });

      expect(updated.weightOverride).toBe(15);
      expect(updated.dimensionsOverride).toEqual({
        height: 20,
        width: 30,
        depth: 40,
      });
      expect(updated.selections).toEqual(original.selections);
    });
  });

  describe("serialization", () => {
    it("should convert to JSON", () => {
      const item = ProductVariationItemEntity.create(
        createTestUuid(),
        validData
      );
      const json = item.toJSON();

      expect(json.id).toBe(item.id);
      expect(json.productSku).toBe(item.productSku);
      expect(json.selections).toEqual(item.selections);
      expect(json.weightOverride).toBe(item.weightOverride);
      expect(json.dimensionsOverride).toEqual(item.dimensionsOverride);
    });

    it("should create from JSON", () => {
      const original = ProductVariationItemEntity.create(
        createTestUuid(),
        validData
      );
      const json = original.toJSON();
      const restored = ProductVariationItemEntity.fromJSON(json);

      expect(restored.id).toBe(original.id);
      expect(restored.productSku).toBe(original.productSku);
      expect(restored.selections).toEqual(original.selections);
      expect(restored.weightOverride).toBe(original.weightOverride);
    });
  });
});
