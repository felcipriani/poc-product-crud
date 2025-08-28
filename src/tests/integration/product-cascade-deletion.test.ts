import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProductRepository } from "@/lib/storage/repositories/product-repository";
import { CompositionItemRepository } from "@/lib/storage/repositories/composition-item-repository";
import { ProductVariationItemRepository } from "@/lib/storage/repositories/product-variation-item-repository";
import { VariationTypeRepository } from "@/lib/storage/repositories/variation-type-repository";
import { VariationRepository } from "@/lib/storage/repositories/variation-repository";

describe("Product Cascade Deletion", () => {
  let productRepository: ProductRepository;
  let compositionRepository: CompositionItemRepository;
  let variationRepository: ProductVariationItemRepository;
  let variationTypeRepository: VariationTypeRepository;
  let variationValueRepository: VariationRepository;

  beforeEach(() => {
    // Mock localStorage
    const mockStorage: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
      }),
    });

    productRepository = new ProductRepository();
    compositionRepository = new CompositionItemRepository();
    variationRepository = new ProductVariationItemRepository();
    variationTypeRepository = new VariationTypeRepository();
    variationValueRepository = new VariationRepository();
  });

  describe("Composite Product Deletion", () => {
    it("should delete all composition items when deleting a composite product", async () => {
      // Create parent and child products
      const parent = await productRepository.create({
        sku: "PARENT-001",
        name: "Parent Product",
        weight: 1.0,
        dimensions: { height: 10, width: 10, depth: 10 },
        isComposite: true,
        hasVariation: false,
      });

      const child1 = await productRepository.create({
        sku: "CHILD-001",
        name: "Child Product 1",
        weight: 0.5,
        dimensions: { height: 5, width: 5, depth: 5 },
        isComposite: false,
        hasVariation: false,
      });

      const child2 = await productRepository.create({
        sku: "CHILD-002",
        name: "Child Product 2",
        weight: 0.3,
        dimensions: { height: 3, width: 3, depth: 3 },
        isComposite: false,
        hasVariation: false,
      });

      // Create composition items
      await compositionRepository.create({
        parentSku: parent.sku,
        childSku: child1.sku,
        quantity: 2,
      });

      await compositionRepository.create({
        parentSku: parent.sku,
        childSku: child2.sku,
        quantity: 3,
      });

      // Verify composition items exist
      const compositionsBefore = await compositionRepository.findByParent(
        parent.sku
      );
      expect(compositionsBefore).toHaveLength(2);

      // Delete the parent product
      await productRepository.delete(parent.sku);

      // Verify parent product is deleted
      const deletedParent = await productRepository.findBySku(parent.sku);
      expect(deletedParent).toBeNull();

      // Verify composition items are deleted (cascade)
      const compositionsAfter = await compositionRepository.findByParent(
        parent.sku
      );
      expect(compositionsAfter).toHaveLength(0);

      // Verify child products still exist
      const existingChild1 = await productRepository.findBySku(child1.sku);
      const existingChild2 = await productRepository.findBySku(child2.sku);
      expect(existingChild1).not.toBeNull();
      expect(existingChild2).not.toBeNull();
    });
  });

  describe("Product with Variations Deletion", () => {
    it("should delete all variation items when deleting a product with variations", async () => {
      // Create variation types and values
      const colorType = await variationTypeRepository.create({
        name: "Color",
        modifiesWeight: true,
        modifiesDimensions: false,
      });

      const sizeType = await variationTypeRepository.create({
        name: "Size",
        modifiesWeight: false,
        modifiesDimensions: true,
      });

      const redVariation = await variationValueRepository.create({
        name: "Red",
        variationTypeId: colorType.id,
      });

      const smallVariation = await variationValueRepository.create({
        name: "Small",
        variationTypeId: sizeType.id,
      });

      const blueVariation = await variationValueRepository.create({
        name: "Blue",
        variationTypeId: colorType.id,
      });

      const largeVariation = await variationValueRepository.create({
        name: "Large",
        variationTypeId: sizeType.id,
      });

      // Create product with variations
      const product = await productRepository.create({
        sku: "VAR-PRODUCT-001",
        name: "Variable Product",
        weight: 1.0,
        dimensions: { height: 10, width: 10, depth: 10 },
        isComposite: false,
        hasVariation: true,
      });

      // Create variation items with proper UUIDs
      await variationRepository.create({
        productSku: product.sku,
        selections: {
          [colorType.id]: redVariation.id,
          [sizeType.id]: smallVariation.id,
        },
        weightOverride: 0.8,
      });

      await variationRepository.create({
        productSku: product.sku,
        selections: {
          [colorType.id]: blueVariation.id,
          [sizeType.id]: largeVariation.id,
        },
        weightOverride: 1.2,
      });

      // Verify variation items exist
      const variationsBefore = await variationRepository.findByProduct(
        product.sku
      );
      expect(variationsBefore).toHaveLength(2);

      // Delete the product
      await productRepository.delete(product.sku);

      // Verify product is deleted
      const deletedProduct = await productRepository.findBySku(product.sku);
      expect(deletedProduct).toBeNull();

      // Verify variation items are deleted (cascade)
      const variationsAfter = await variationRepository.findByProduct(
        product.sku
      );
      expect(variationsAfter).toHaveLength(0);
    });
  });

  describe("Composite Product with Variations Deletion", () => {
    it("should delete both composition and variation items when deleting a composite product with variations", async () => {
      // Create variation types and values
      const colorType = await variationTypeRepository.create({
        name: "Color",
        modifiesWeight: true,
        modifiesDimensions: false,
      });

      const materialType = await variationTypeRepository.create({
        name: "Material",
        modifiesWeight: false,
        modifiesDimensions: false,
      });

      const greenVariation = await variationValueRepository.create({
        name: "Green",
        variationTypeId: colorType.id,
      });

      const woodVariation = await variationValueRepository.create({
        name: "Wood",
        variationTypeId: materialType.id,
      });

      // Create composite product with variations
      const product = await productRepository.create({
        sku: "COMP-VAR-001",
        name: "Composite Variable Product",
        weight: 2.0,
        dimensions: { height: 20, width: 20, depth: 20 },
        isComposite: true,
        hasVariation: true,
      });

      const child = await productRepository.create({
        sku: "CHILD-COMP-001",
        name: "Child for Composite",
        weight: 0.5,
        dimensions: { height: 5, width: 5, depth: 5 },
        isComposite: false,
        hasVariation: false,
      });

      // Create composition items
      await compositionRepository.create({
        parentSku: product.sku,
        childSku: child.sku,
        quantity: 4,
      });

      // Create variation items with proper UUIDs
      await variationRepository.create({
        productSku: product.sku,
        selections: {
          [colorType.id]: greenVariation.id,
          [materialType.id]: woodVariation.id,
        },
        weightOverride: 1.8,
      });

      // Verify both exist
      const compositionsBefore = await compositionRepository.findByParent(
        product.sku
      );
      const variationsBefore = await variationRepository.findByProduct(
        product.sku
      );
      expect(compositionsBefore).toHaveLength(1);
      expect(variationsBefore).toHaveLength(1);

      // Delete the product
      await productRepository.delete(product.sku);

      // Verify product is deleted
      const deletedProduct = await productRepository.findBySku(product.sku);
      expect(deletedProduct).toBeNull();

      // Verify both composition and variation items are deleted (cascade)
      const compositionsAfter = await compositionRepository.findByParent(
        product.sku
      );
      const variationsAfter = await variationRepository.findByProduct(
        product.sku
      );
      expect(compositionsAfter).toHaveLength(0);
      expect(variationsAfter).toHaveLength(0);

      // Verify child product still exists
      const existingChild = await productRepository.findBySku(child.sku);
      expect(existingChild).not.toBeNull();
    });
  });

  describe("Simple Product Deletion", () => {
    it("should delete simple product without affecting other data", async () => {
      // Create simple product
      const product = await productRepository.create({
        sku: "SIMPLE-001",
        name: "Simple Product",
        weight: 1.0,
        dimensions: { height: 10, width: 10, depth: 10 },
        isComposite: false,
        hasVariation: false,
      });

      // Delete the product
      await productRepository.delete(product.sku);

      // Verify product is deleted
      const deletedProduct = await productRepository.findBySku(product.sku);
      expect(deletedProduct).toBeNull();
    });
  });
});
