import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProductRepository } from "@/lib/storage/repositories/product-repository";
import { CompositionItemRepository } from "@/lib/storage/repositories/composition-item-repository";
import { CompositeVariationMigrationService } from "@/lib/services/migration/composite-variation-migration";

// Performance test focusing on migration service with large datasets

describe("Migration Performance", () => {
  let productRepository: ProductRepository;
  let compositionRepository: CompositionItemRepository;
  let migrationService: CompositeVariationMigrationService;

  beforeEach(() => {
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
    migrationService = new CompositeVariationMigrationService();
  });

  it("should migrate large compositions within time limits", async () => {
    const childProducts = [];
    // generate 200 child products
    for (let i = 0; i < 200; i++) {
      const child = await productRepository.create({
        sku: `PERF-CHILD-${i}`,
        name: `Perf Child ${i}`,
        weight: 1,
        isComposite: false,
        hasVariation: false,
      });
      childProducts.push(child);
    }

    const parent = await productRepository.create({
      sku: "PERF-PARENT",
      name: "Perf Parent",
      weight: 1,
      isComposite: true,
      hasVariation: false,
    });

    for (const child of childProducts) {
      await compositionRepository.create({
        parentSku: parent.sku,
        childSku: child.sku,
        quantity: 1,
      });
    }

    const start = performance.now();
    const result = await migrationService.migrateCompositeToVariations(
      parent.sku
    );
    const duration = performance.now() - start;

    expect(result.success).toBe(true);
    expect(result.migratedItemsCount).toBe(childProducts.length);
    expect(duration).toBeLessThan(5000); // should complete in under 5s
  });
});
