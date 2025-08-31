import { describe, it, expect, beforeEach, vi } from "vitest";
import { CompositionService } from "@/lib/domain/services/composition-service";
import { CompositionItemRepository } from "@/lib/storage/repositories/composition-item-repository";
import { ProductRepository } from "@/lib/storage/repositories/product-repository";
import { ProductVariationItemRepository } from "@/lib/storage/repositories/product-variation-item-repository";
import { Product } from "@/lib/domain/entities/product";
import { ProductVariationItem } from "@/lib/domain/entities/product-variation-item";
import { CompositionItem } from "@/lib/domain/entities/composition-item";

// Mock repositories
const mockCompositionItemRepository = {
  findByParent: vi.fn(),
  findByChild: vi.fn(),
  findAll: vi.fn(),
  create: vi.fn(),
  deleteByParent: vi.fn(),
  deleteByChild: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
} as any;

const mockProductRepository = {
  findBySku: vi.fn(),
  findAll: vi.fn(),
  findCompositionEligible: vi.fn(),
} as any;

const mockVariationItemRepository = {
  findByProduct: vi.fn(),
  findById: vi.fn(),
  getEffectiveWeight: vi.fn(),
} as any;

describe("CompositionService - Composite Variations (Requirement 7)", () => {
  let compositionService: CompositionService;

  beforeEach(() => {
    vi.clearAllMocks();
    compositionService = new CompositionService(
      mockCompositionItemRepository,
      mockProductRepository,
      mockVariationItemRepository
    );
  });

  describe("Requirement 7.1: Composition-based variation interface", () => {
    it("should identify products that need composition-based variation interface", async () => {
      const compositeVariationProduct: Product = {
        sku: "DINING-SET-001",
        name: "Custom Dining Set",
        hasVariation: true,
        isComposite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockResolvedValue(
        compositeVariationProduct
      );
      mockVariationItemRepository.findByProduct.mockResolvedValue([]);

      const result =
        await compositionService.getCompositeVariationsWithComposition(
          "DINING-SET-001"
        );

      expect(result).toEqual([]);
      expect(mockProductRepository.findBySku).toHaveBeenCalledWith(
        "DINING-SET-001"
      );
    });

    it("should return empty array for non-composite or non-variation products", async () => {
      const simpleProduct: Product = {
        sku: "SIMPLE-001",
        name: "Simple Product",
        hasVariation: false,
        isComposite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockResolvedValue(simpleProduct);

      const result =
        await compositionService.getCompositeVariationsWithComposition(
          "SIMPLE-001"
        );

      expect(result).toEqual([]);
    });
  });

  describe("Requirement 7.2: Selection of specific child variations per combination", () => {
    it("should create composition items for specific variation combinations", async () => {
      const compositeVariationProduct: Product = {
        sku: "DINING-SET-001",
        name: "Custom Dining Set",
        hasVariation: true,
        isComposite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const variation: ProductVariationItem = {
        id: "var-modern",
        productSku: "DINING-SET-001",
        selections: { "style-type": "modern-style" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockResolvedValue(
        compositeVariationProduct
      );
      mockVariationItemRepository.findById.mockResolvedValue(variation);
      mockCompositionItemRepository.create.mockResolvedValue({
        id: "comp-1",
        parentSku: "DINING-SET-001#var-modern",
        childSku: "CHAIR-001#chair-black",
        quantity: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Mock child product validation
      vi.spyOn(
        compositionService,
        "validateChildProductEligibility"
      ).mockResolvedValue();

      // Mock findByParent to return empty array (no existing items)
      mockCompositionItemRepository.findByParent.mockResolvedValue([]);

      // Mock getCompositionTree to not throw depth error
      vi.spyOn(compositionService, "getCompositionTree").mockResolvedValue({
        sku: "DINING-SET-001#var-modern",
        name: "Test",
        isComposite: true,
        children: [],
        calculatedWeight: 0,
      });

      // Mock hasCircularDependency to return false
      vi.spyOn(compositionService, "hasCircularDependency").mockResolvedValue(
        false
      );

      await compositionService.createCompositeVariationComposition(
        "DINING-SET-001",
        "var-modern",
        [
          { childSku: "CHAIR-001#chair-black", quantity: 4 },
          { childSku: "TABLE-001#table-glossy", quantity: 1 },
        ]
      );

      expect(mockCompositionItemRepository.create).toHaveBeenCalledTimes(2);
      expect(mockCompositionItemRepository.create).toHaveBeenCalledWith({
        parentSku: "DINING-SET-001#var-modern",
        childSku: "CHAIR-001#chair-black",
        quantity: 4,
      });
    });

    it("should validate child product eligibility for each composition item", async () => {
      const compositeVariationProduct: Product = {
        sku: "DINING-SET-001",
        name: "Custom Dining Set",
        hasVariation: true,
        isComposite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const variation: ProductVariationItem = {
        id: "var-modern",
        productSku: "DINING-SET-001",
        selections: { "style-type": "modern-style" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockResolvedValue(
        compositeVariationProduct
      );
      mockVariationItemRepository.findById.mockResolvedValue(variation);

      // Mock validation to throw error for invalid child
      vi.spyOn(compositionService, "validateChildProductEligibility")
        .mockResolvedValueOnce() // First child is valid
        .mockRejectedValueOnce(new Error("Invalid child product")); // Second child is invalid

      await expect(
        compositionService.createCompositeVariationComposition(
          "DINING-SET-001",
          "var-modern",
          [
            { childSku: "CHAIR-001#chair-black", quantity: 4 },
            { childSku: "INVALID-PRODUCT", quantity: 1 },
          ]
        )
      ).rejects.toThrow("Invalid child product");
    });

    it("should reject creation for non-composite-variation products", async () => {
      const simpleProduct: Product = {
        sku: "SIMPLE-001",
        name: "Simple Product",
        hasVariation: false,
        isComposite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockResolvedValue(simpleProduct);

      await expect(
        compositionService.createCompositeVariationComposition(
          "SIMPLE-001",
          "var-1",
          [{ childSku: "CHILD-001", quantity: 1 }]
        )
      ).rejects.toThrow("not a composite product with variations");
    });
  });

  describe("Requirement 7.3: Weight calculation from selected child variations", () => {
    it("should calculate weight from composition items when no weight override", async () => {
      const compositeVariationProduct: Product = {
        sku: "DINING-SET-001",
        name: "Custom Dining Set",
        hasVariation: true,
        isComposite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const variation: ProductVariationItem = {
        id: "var-modern",
        productSku: "DINING-SET-001",
        selections: { "style-type": "modern-style" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const compositionItems: CompositionItem[] = [
        {
          id: "comp-1",
          parentSku: "DINING-SET-001#var-modern",
          childSku: "CHAIR-001#chair-black",
          quantity: 4,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "comp-2",
          parentSku: "DINING-SET-001#var-modern",
          childSku: "TABLE-001#table-glossy",
          quantity: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockProductRepository.findBySku.mockResolvedValue(
        compositeVariationProduct
      );
      mockVariationItemRepository.findById.mockResolvedValue(variation);
      mockCompositionItemRepository.findByParent.mockResolvedValue(
        compositionItems
      );

      // Mock weight calculation for composite
      vi.spyOn(
        compositionService,
        "calculateCompositeWeight"
      ).mockResolvedValue(36); // 4*5 + 1*16

      const weight = await compositionService.calculateCompositeVariationWeight(
        "DINING-SET-001",
        "var-modern"
      );

      expect(weight).toBe(36);
      expect(compositionService.calculateCompositeWeight).toHaveBeenCalledWith(
        "DINING-SET-001#var-modern"
      );
    });

    it("should use weight override when parent variation type modifies weight", async () => {
      const compositeVariationProduct: Product = {
        sku: "DINING-SET-001",
        name: "Custom Dining Set",
        hasVariation: true,
        isComposite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const variationWithWeightOverride: ProductVariationItem = {
        id: "var-bulk",
        productSku: "DINING-SET-001",
        selections: {
          "style-type": "modern-style",
          "packaging-type": "bulk-packaging",
        },
        weightOverride: 50, // Override due to packaging type
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockResolvedValue(
        compositeVariationProduct
      );
      mockVariationItemRepository.findById.mockResolvedValue(
        variationWithWeightOverride
      );

      // Mock variation types to include weight-modifying type
      vi.spyOn(
        compositionService as any,
        "getVariationTypesForProduct"
      ).mockResolvedValue([{ id: "packaging-type", modifiesWeight: true }]);

      const weight = await compositionService.calculateCompositeVariationWeight(
        "DINING-SET-001",
        "var-bulk"
      );

      expect(weight).toBe(50); // Should use override, not calculated weight
    });
  });

  describe("Requirement 7.4: Combination uniqueness validation", () => {
    it("should prevent duplicate variation combinations", async () => {
      const existingVariation: ProductVariationItem = {
        id: "var-existing",
        productSku: "DINING-SET-001",
        selections: { "style-type": "modern-style" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const duplicateVariation: ProductVariationItem = {
        id: "var-duplicate",
        productSku: "DINING-SET-001",
        selections: { "style-type": "modern-style" }, // Same selections
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockVariationItemRepository.findById.mockResolvedValue(
        duplicateVariation
      );
      mockVariationItemRepository.findByProduct.mockResolvedValue([
        existingVariation,
      ]);

      await expect(
        compositionService.validateCompositeVariationUniqueness(
          "DINING-SET-001",
          "var-duplicate"
        )
      ).rejects.toThrow(
        "variation combination with the same selections already exists"
      );
    });

    it("should allow unique variation combinations", async () => {
      const existingVariation: ProductVariationItem = {
        id: "var-existing",
        productSku: "DINING-SET-001",
        selections: { "style-type": "modern-style" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const uniqueVariation: ProductVariationItem = {
        id: "var-unique",
        productSku: "DINING-SET-001",
        selections: { "style-type": "classic-style" }, // Different selections
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockVariationItemRepository.findById.mockResolvedValue(uniqueVariation);
      mockVariationItemRepository.findByProduct.mockResolvedValue([
        existingVariation,
      ]);

      await expect(
        compositionService.validateCompositeVariationUniqueness(
          "DINING-SET-001",
          "var-unique"
        )
      ).resolves.not.toThrow();
    });

    it("should exclude specified variation from uniqueness check", async () => {
      const variation: ProductVariationItem = {
        id: "var-1",
        productSku: "DINING-SET-001",
        selections: { "style-type": "modern-style" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockVariationItemRepository.findById.mockResolvedValue(variation);
      mockVariationItemRepository.findByProduct.mockResolvedValue([variation]);

      // Should not throw when excluding the same variation
      await expect(
        compositionService.validateCompositeVariationUniqueness(
          "DINING-SET-001",
          "var-1",
          "var-1"
        )
      ).resolves.not.toThrow();
    });
  });

  describe("Requirement 7.5: Variation selection for child products with variations", () => {
    it("should validate completeness of composite variation composition", async () => {
      const compositionItems: CompositionItem[] = [
        {
          id: "comp-1",
          parentSku: "DINING-SET-001#var-modern",
          childSku: "CHAIR-001#chair-black", // Specific variation
          quantity: 4,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "comp-2",
          parentSku: "DINING-SET-001#var-modern",
          childSku: "TABLE-001#table-glossy", // Specific variation
          quantity: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockCompositionItemRepository.findByParent.mockResolvedValue(
        compositionItems
      );
      vi.spyOn(compositionService, "validateChildProductEligibility")
        .mockResolvedValueOnce() // Chair variation is valid
        .mockResolvedValueOnce(); // Table variation is valid

      const result =
        await compositionService.validateCompositeVariationCompleteness(
          "DINING-SET-001",
          "var-modern"
        );

      expect(result.isComplete).toBe(true);
      expect(result.missingItems).toHaveLength(0);
      expect(result.invalidItems).toHaveLength(0);
    });

    it("should identify missing composition items", async () => {
      mockCompositionItemRepository.findByParent.mockResolvedValue([]); // No composition items

      const result =
        await compositionService.validateCompositeVariationCompleteness(
          "DINING-SET-001",
          "var-modern"
        );

      expect(result.isComplete).toBe(false);
      expect(result.missingItems).toContain(
        "At least one composition item is required"
      );
    });

    it("should identify invalid child products", async () => {
      const compositionItems: CompositionItem[] = [
        {
          id: "comp-1",
          parentSku: "DINING-SET-001#var-modern",
          childSku: "INVALID-PRODUCT",
          quantity: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockCompositionItemRepository.findByParent.mockResolvedValue(
        compositionItems
      );
      vi.spyOn(
        compositionService,
        "validateChildProductEligibility"
      ).mockRejectedValue(new Error("Invalid child product"));

      const result =
        await compositionService.validateCompositeVariationCompleteness(
          "DINING-SET-001",
          "var-modern"
        );

      expect(result.isComplete).toBe(false);
      expect(result.invalidItems).toContain("INVALID-PRODUCT");
    });
  });

  describe("Requirement 7.6: Simple products used directly", () => {
    it("should allow simple products in composite variation compositions", async () => {
      const compositeVariationProduct: Product = {
        sku: "DINING-SET-001",
        name: "Custom Dining Set",
        hasVariation: true,
        isComposite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const variation: ProductVariationItem = {
        id: "var-modern",
        productSku: "DINING-SET-001",
        selections: { "style-type": "modern-style" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockResolvedValue(
        compositeVariationProduct
      );
      mockVariationItemRepository.findById.mockResolvedValue(variation);
      mockCompositionItemRepository.create.mockResolvedValue({
        id: "comp-1",
        parentSku: "DINING-SET-001#var-modern",
        childSku: "CUSHION-001", // Simple product, no variation suffix
        quantity: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(
        compositionService,
        "validateChildProductEligibility"
      ).mockResolvedValue();

      // Mock findByParent to return empty array (no existing items)
      mockCompositionItemRepository.findByParent.mockResolvedValue([]);

      // Mock getCompositionTree to not throw depth error
      vi.spyOn(compositionService, "getCompositionTree").mockResolvedValue({
        sku: "DINING-SET-001#var-modern",
        name: "Test",
        isComposite: true,
        children: [],
        calculatedWeight: 0,
      });

      // Mock hasCircularDependency to return false
      vi.spyOn(compositionService, "hasCircularDependency").mockResolvedValue(
        false
      );

      await compositionService.createCompositeVariationComposition(
        "DINING-SET-001",
        "var-modern",
        [
          { childSku: "CUSHION-001", quantity: 4 }, // Simple product
        ]
      );

      expect(mockCompositionItemRepository.create).toHaveBeenCalledWith({
        parentSku: "DINING-SET-001#var-modern",
        childSku: "CUSHION-001", // Direct SKU, no variation processing needed
        quantity: 4,
      });
    });
  });

  describe("Composition management operations", () => {
    it("should get composition items for specific variation", async () => {
      const compositionItems: CompositionItem[] = [
        {
          id: "comp-1",
          parentSku: "DINING-SET-001#var-modern",
          childSku: "CHAIR-001#chair-black",
          quantity: 4,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockCompositionItemRepository.findByParent.mockResolvedValue(
        compositionItems
      );

      const result = await compositionService.getCompositeVariationComposition(
        "DINING-SET-001",
        "var-modern"
      );

      expect(result).toEqual(compositionItems);
      expect(mockCompositionItemRepository.findByParent).toHaveBeenCalledWith(
        "DINING-SET-001#var-modern"
      );
    });

    it("should update composition for variation by replacing all items", async () => {
      const variationSku = "DINING-SET-001#var-modern";

      mockCompositionItemRepository.deleteByParent.mockResolvedValue();
      vi.spyOn(
        compositionService,
        "createCompositeVariationComposition"
      ).mockResolvedValue();

      await compositionService.updateCompositeVariationComposition(
        "DINING-SET-001",
        "var-modern",
        [
          { childSku: "CHAIR-001#chair-red", quantity: 2 },
          { childSku: "TABLE-001#table-matte", quantity: 1 },
        ]
      );

      expect(mockCompositionItemRepository.deleteByParent).toHaveBeenCalledWith(
        variationSku
      );
      expect(
        compositionService.createCompositeVariationComposition
      ).toHaveBeenCalledWith("DINING-SET-001", "var-modern", [
        { childSku: "CHAIR-001#chair-red", quantity: 2 },
        { childSku: "TABLE-001#table-matte", quantity: 1 },
      ]);
    });

    it("should get all composite variations with their details", async () => {
      const compositeVariationProduct: Product = {
        sku: "DINING-SET-001",
        name: "Custom Dining Set",
        hasVariation: true,
        isComposite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const variations: ProductVariationItem[] = [
        {
          id: "var-modern",
          productSku: "DINING-SET-001",
          selections: { "style-type": "modern-style" },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "var-classic",
          productSku: "DINING-SET-001",
          selections: { "style-type": "classic-style" },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockProductRepository.findBySku.mockResolvedValue(
        compositeVariationProduct
      );
      mockVariationItemRepository.findByProduct.mockResolvedValue(variations);

      // Mock methods for each variation
      vi.spyOn(compositionService, "getCompositeVariationComposition")
        .mockResolvedValueOnce([]) // Modern has no items
        .mockResolvedValueOnce([]); // Classic has no items

      vi.spyOn(compositionService, "calculateCompositeVariationWeight")
        .mockResolvedValueOnce(36) // Modern weight
        .mockResolvedValueOnce(45); // Classic weight

      vi.spyOn(compositionService, "validateCompositeVariationCompleteness")
        .mockResolvedValueOnce({
          isComplete: false,
          missingItems: ["No items"],
          invalidItems: [],
        })
        .mockResolvedValueOnce({
          isComplete: false,
          missingItems: ["No items"],
          invalidItems: [],
        });

      const result =
        await compositionService.getCompositeVariationsWithComposition(
          "DINING-SET-001"
        );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        variation: variations[0],
        compositionItems: [],
        totalWeight: 36,
        isComplete: false,
      });
      expect(result[1]).toEqual({
        variation: variations[1],
        compositionItems: [],
        totalWeight: 45,
        isComplete: false,
      });
    });
  });

  describe("Error handling", () => {
    it("should handle non-existent variation in weight calculation", async () => {
      mockProductRepository.findBySku.mockResolvedValue({
        sku: "DINING-SET-001",
        hasVariation: true,
        isComposite: true,
      });
      mockVariationItemRepository.findById.mockResolvedValue(null);

      await expect(
        compositionService.calculateCompositeVariationWeight(
          "DINING-SET-001",
          "non-existent"
        )
      ).rejects.toThrow("Variation 'non-existent' not found");
    });

    it("should handle variation belonging to different product", async () => {
      const product: Product = {
        sku: "DINING-SET-001",
        name: "Custom Dining Set",
        hasVariation: true,
        isComposite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const variation: ProductVariationItem = {
        id: "var-1",
        productSku: "OTHER-PRODUCT", // Different product
        selections: { "style-type": "modern-style" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockResolvedValue(product);
      mockVariationItemRepository.findById.mockResolvedValue(variation);

      await expect(
        compositionService.calculateCompositeVariationWeight(
          "DINING-SET-001",
          "var-1"
        )
      ).rejects.toThrow(
        "Variation 'var-1' not found for product 'DINING-SET-001'"
      );
    });
  });
});
