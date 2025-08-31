import { describe, it, expect } from "vitest";
import { ProductEntity, ProductSchema } from "@/lib/domain/entities/product";

describe("ProductEntity", () => {
  const validProductData = {
    sku: "TEST-001",
    name: "Test Product",
    dimensions: { height: 10, width: 20, depth: 30 },
    weight: 5.5,
    isComposite: false,
    hasVariation: false,
  };

  describe("creation", () => {
    it("should create a valid product", () => {
      const product = ProductEntity.create(validProductData);

      expect(product.sku).toBe("TEST-001");
      expect(product.name).toBe("Test Product");
      expect(product.dimensions).toEqual({ height: 10, width: 20, depth: 30 });
      expect(product.weight).toBe(5.5);
      expect(product.isComposite).toBe(false);
      expect(product.hasVariation).toBe(false);
      expect(product.createdAt).toBeInstanceOf(Date);
      expect(product.updatedAt).toBeInstanceOf(Date);
    });

    it("should create product without optional fields", () => {
      const product = ProductEntity.create({
        sku: "TEST-002",
        name: "Simple Product",
        isComposite: false,
        hasVariation: false,
      });

      expect(product.dimensions).toBeUndefined();
      expect(product.weight).toBeUndefined();
    });

    it("should create composite product", () => {
      const product = ProductEntity.create({
        ...validProductData,
        isComposite: true,
      });

      expect(product.isComposite).toBe(true);
      expect(product.shouldIgnoreWeight()).toBe(true);
    });

    it("should create product with variations", () => {
      const product = ProductEntity.create({
        ...validProductData,
        hasVariation: true,
      });

      expect(product.hasVariation).toBe(true);
      expect(product.canBeUsedInComposition()).toBe(false);
    });
  });

  describe("validation", () => {
    it("should reject invalid SKU format", () => {
      expect(() =>
        ProductEntity.create({
          ...validProductData,
          sku: "test-001", // lowercase not allowed
        })
      ).toThrow();
    });

    it("should reject empty name", () => {
      expect(() =>
        ProductEntity.create({
          ...validProductData,
          name: "",
        })
      ).toThrow();
    });

    it("should reject negative weight", () => {
      expect(() =>
        ProductEntity.create({
          ...validProductData,
          weight: -1,
        })
      ).toThrow();
    });

    it("should reject zero weight", () => {
      expect(() =>
        ProductEntity.create({
          ...validProductData,
          weight: 0,
        })
      ).toThrow();
    });
  });

  describe("updates", () => {
    it("should update product fields", async () => {
      const original = ProductEntity.create(validProductData);

      // Wait a small amount to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1));

      const updated = original.update({
        name: "Updated Product",
        weight: 10,
      });

      expect(updated.name).toBe("Updated Product");
      expect(updated.weight).toBe(10);
      expect(updated.sku).toBe(original.sku); // unchanged
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        original.updatedAt.getTime()
      );
    });

    it("should preserve unchanged fields", () => {
      const original = ProductEntity.create(validProductData);
      const updated = original.update({ name: "New Name" });

      expect(updated.dimensions).toEqual(original.dimensions);
      expect(updated.weight).toBe(original.weight);
      expect(updated.isComposite).toBe(original.isComposite);
      expect(updated.hasVariation).toBe(original.hasVariation);
    });
  });

  describe("business rules", () => {
    it("should validate composite products ignore weight", () => {
      const composite = ProductEntity.create({
        ...validProductData,
        isComposite: true,
      });

      expect(composite.shouldIgnoreWeight()).toBe(true);
    });

    it("should validate variable products cannot be used in composition", () => {
      const variable = ProductEntity.create({
        ...validProductData,
        hasVariation: true,
      });

      expect(variable.canBeUsedInComposition()).toBe(false);
    });

    it("should allow simple products in composition", () => {
      const simple = ProductEntity.create(validProductData);

      expect(simple.canBeUsedInComposition()).toBe(true);
    });

    it("should validate business rules", () => {
      const product = ProductEntity.create(validProductData);
      const errors = product.validateBusinessRules();

      expect(errors).toEqual([]);
    });
  });

  describe("serialization", () => {
    it("should convert to JSON", () => {
      const product = ProductEntity.create(validProductData);
      const json = product.toJSON();

      expect(json.sku).toBe(product.sku);
      expect(json.name).toBe(product.name);
      expect(json.dimensions).toEqual(product.dimensions);
      expect(json.weight).toBe(product.weight);
      expect(json.isComposite).toBe(product.isComposite);
      expect(json.hasVariation).toBe(product.hasVariation);
    });

    it("should create from JSON", () => {
      const original = ProductEntity.create(validProductData);
      const json = original.toJSON();
      const restored = ProductEntity.fromJSON(json);

      expect(restored.sku).toBe(original.sku);
      expect(restored.name).toBe(original.name);
      expect(restored.dimensions).toEqual(original.dimensions);
      expect(restored.weight).toBe(original.weight);
    });
  });
});

describe("ProductSchema", () => {
  it("should validate valid product data", () => {
    const result = ProductSchema.safeParse({
      sku: "TEST-001",
      name: "Test Product",
      dimensions: { height: 10, width: 20, depth: 30 },
      weight: 5.5,
      isComposite: false,
      hasVariation: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result.success).toBe(true);
  });

  it("should reject invalid SKU", () => {
    const result = ProductSchema.safeParse({
      sku: "test-001", // lowercase
      name: "Test Product",
      isComposite: false,
      hasVariation: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(result.success).toBe(false);
  });
});
