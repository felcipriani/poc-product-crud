import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProductRepository } from "@/lib/storage/repositories/product-repository";
import { CompositionItemRepository } from "@/lib/storage/repositories/composition-item-repository";
import { ProductVariationItemRepository } from "@/lib/storage/repositories/product-variation-item-repository";
import { CompositeVariationMigrationService } from "@/lib/services/migration/composite-variation-migration";

// Integration tests for complex migration flows between composite and variation states

describe("Product Migration Integration Tests", () => {
  let productRepository: ProductRepository;
  let compositionRepository: CompositionItemRepository;
  let variationRepository: ProductVariationItemRepository;
  let migrationService: CompositeVariationMigrationService;

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
        Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
      }),
    });

    productRepository = new ProductRepository();
    compositionRepository = new CompositionItemRepository();
    variationRepository = new ProductVariationItemRepository();
    migrationService = new CompositeVariationMigrationService();
  });

  it("should migrate composite product to variations", async () => {
    // create child products
    const childA = await productRepository.create({
      sku: "MIG-CHILD-A",
      name: "Child A",
      weight: 1,
      isComposite: false,
      hasVariation: false,
    });
    const childB = await productRepository.create({
      sku: "MIG-CHILD-B",
      name: "Child B",
      weight: 2,
      isComposite: false,
      hasVariation: false,
    });

    // create parent composite product
    const parent = await productRepository.create({
      sku: "MIG-PARENT",
      name: "Parent",
      weight: 1,
      isComposite: true,
      hasVariation: false,
    });

    // attach composition items
    await compositionRepository.create({
      parentSku: parent.sku,
      childSku: childA.sku,
      quantity: 1,
    });
    await compositionRepository.create({
      parentSku: parent.sku,
      childSku: childB.sku,
      quantity: 2,
    });

    const result = await migrationService.migrateCompositeToVariations(
      parent.sku
    );

    expect(result.success).toBe(true);
    expect(result.migratedItemsCount).toBe(2);

    // verify original composition cleared
    const originalItems = await compositionRepository.findByParent(parent.sku);
    expect(originalItems).toHaveLength(0);

    // verify new variation and migrated items
    const variations = await variationRepository.findByProductSku(parent.sku);
    expect(variations).toHaveLength(1);
    const variationId = variations[0].id;
    const migratedItems = await compositionRepository.findByParent(
      `${parent.sku}#${variationId}`
    );
    expect(migratedItems).toHaveLength(2);
  });

  it("should migrate variations back to composite using first variation strategy", async () => {
    // setup by first migrating to variations
    const child = await productRepository.create({
      sku: "ROUND-CHILD",
      name: "Round Child",
      weight: 1,
      isComposite: false,
      hasVariation: false,
    });

    const parent = await productRepository.create({
      sku: "ROUND-PARENT",
      name: "Round Parent",
      weight: 1,
      isComposite: true,
      hasVariation: false,
    });

    await compositionRepository.create({
      parentSku: parent.sku,
      childSku: child.sku,
      quantity: 3,
    });

    await migrationService.migrateCompositeToVariations(parent.sku);

    // now migrate back to composite
    const backResult = await migrationService.migrateVariationsToComposite(
      parent.sku,
      "first-variation"
    );

    expect(backResult.success).toBe(true);
    const variationsAfter = await variationRepository.findByProductSku(
      parent.sku
    );
    expect(variationsAfter).toHaveLength(0);
    const finalItems = await compositionRepository.findByParent(parent.sku);
    expect(finalItems).toHaveLength(1);
    expect(finalItems[0].quantity).toBe(3);
  });
});
