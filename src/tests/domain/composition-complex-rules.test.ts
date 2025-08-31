import { describe, it, expect, beforeEach, vi } from "vitest";
import { CompositionService } from "@/lib/domain/services/composition-service";
import { CompositionItemRepository } from "@/lib/storage/repositories/composition-item-repository";
import { ProductRepository } from "@/lib/storage/repositories/product-repository";
import { ProductVariationItemRepository } from "@/lib/storage/repositories/product-variation-item-repository";
import { Product } from "@/lib/domain/entities/product";
import { ProductVariationItem } from "@/lib/domain/entities/product-variation-item";

// Mock repositories
const mockCompositionItemRepository = {
  findByParent: vi.fn(),
  findByChild: vi.fn(),
  findAll: vi.fn(),
  create: vi.fn(),
  deleteByParent: vi.fn(),
  deleteByChild: vi.fn(),
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

describe("CompositionService - Complex Rules and Validation", () => {
  let compositionService: CompositionService;

  beforeEach(() => {
    vi.clearAllMocks();
    compositionService = new CompositionService(
      mockCompositionItemRepository,
      mockProductRepository,
      mockVariationItemRepository
    );
  });

  describe("Requirement 6.1: Variable parent products cannot be used in compositions", () => {
    it("should reject variable products as direct children", async () => {
      // Setup: Variable product (has variations)
      const variableProduct: Product = {
        sku: "CHAIR-001",
        name: "Office Chair",
        hasVariation: true,
        isComposite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockResolvedValue(variableProduct);

      // Test: Try to add variable product directly to composition
      await expect(
        compositionService.validateChildProductEligibility("CHAIR-001")
      ).rejects.toThrow(
        "Variable products cannot be used directly in compositions. Product 'CHAIR-001' has variations - use specific variation combinations instead."
      );
    });

    it("should allow simple products as children", async () => {
      // Setup: Simple product (no variations)
      const simpleProduct: Product = {
        sku: "CUSHION-001",
        name: "Simple Cushion",
        hasVariation: false,
        isComposite: false,
        weight: 0.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockResolvedValue(simpleProduct);

      // Test: Should not throw
      await expect(
        compositionService.validateChildProductEligibility("CUSHION-001")
      ).resolves.not.toThrow();
    });

    it("should allow composite products as children (nested compositions)", async () => {
      // Setup: Composite product
      const compositeProduct: Product = {
        sku: "DESK-SET-001",
        name: "Desk Set",
        hasVariation: false,
        isComposite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockResolvedValue(compositeProduct);

      // Test: Should not throw (nested compositions allowed)
      await expect(
        compositionService.validateChildProductEligibility("DESK-SET-001")
      ).resolves.not.toThrow();
    });
  });

  describe("Requirement 6.2: Individual variation combinations can be used in compositions", () => {
    it("should allow specific variation SKUs as children", async () => {
      // Setup: Variable product and its variation
      const variableProduct: Product = {
        sku: "CHAIR-001",
        name: "Office Chair",
        hasVariation: true,
        isComposite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const variation: ProductVariationItem = {
        id: "var-123",
        productSku: "CHAIR-001",
        selections: { "color-type": "red-var" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockResolvedValue(variableProduct);
      mockVariationItemRepository.findById.mockResolvedValue(variation);

      // Test: Should allow variation SKU
      await expect(
        compositionService.validateChildProductEligibility("CHAIR-001#var-123")
      ).resolves.not.toThrow();
    });

    it("should reject invalid variation SKUs", async () => {
      mockVariationItemRepository.findById.mockResolvedValue(null);

      // Test: Should reject non-existent variation
      await expect(
        compositionService.validateChildProductEligibility(
          "CHAIR-001#invalid-var"
        )
      ).rejects.toThrow("Variation 'invalid-var' not found");
    });

    it("should reject variation SKU with mismatched product", async () => {
      // Setup: Variation that doesn't belong to the specified product
      const variation: ProductVariationItem = {
        id: "var-123",
        productSku: "OTHER-PRODUCT",
        selections: { "color-type": "red-var" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const product: Product = {
        sku: "CHAIR-001",
        name: "Office Chair",
        hasVariation: true,
        isComposite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockResolvedValue(product);
      mockVariationItemRepository.findById.mockResolvedValue(variation);

      // Test: Should reject mismatched variation
      await expect(
        compositionService.validateChildProductEligibility("CHAIR-001#var-123")
      ).rejects.toThrow(
        "Variation 'var-123' does not belong to product 'CHAIR-001'"
      );
    });
  });

  describe("Requirement 6.6: Show only valid products for composition", () => {
    it("should return appropriate items for composition selection", async () => {
      // Setup: Mix of product types
      const simpleProduct: Product = {
        sku: "CUSHION-001",
        name: "Simple Cushion",
        hasVariation: false,
        isComposite: false,
        weight: 0.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const compositeProduct: Product = {
        sku: "DESK-SET-001",
        name: "Desk Set",
        hasVariation: false,
        isComposite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const variableProduct: Product = {
        sku: "CHAIR-001",
        name: "Office Chair",
        hasVariation: true,
        isComposite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const variation: ProductVariationItem = {
        id: "var-123",
        productSku: "CHAIR-001",
        selections: { "color-type": "red-var" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findAll.mockResolvedValue([
        simpleProduct,
        compositeProduct,
        variableProduct,
      ]);

      mockVariationItemRepository.findByProduct.mockResolvedValue([variation]);
      mockVariationItemRepository.getEffectiveWeight.mockReturnValue(5);

      // Test: Get available items
      const items = await compositionService.getCompositionAvailableItems();

      // Should include simple and composite products directly
      expect(items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sku: "CUSHION-001",
            type: "simple",
          }),
          expect.objectContaining({
            sku: "DESK-SET-001",
            type: "composite",
          }),
          expect.objectContaining({
            sku: "CHAIR-001#var-123",
            type: "variation",
            parentSku: "CHAIR-001",
          }),
        ])
      );

      // Should NOT include the variable product directly
      expect(items).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            sku: "CHAIR-001",
            type: expect.any(String),
          }),
        ])
      );
    });
  });

  describe("Requirement 10.4: Referential integrity validation", () => {
    it("should detect circular dependencies", async () => {
      // Setup: Circular dependency scenario
      // DESK-SET contains DRAWER-UNIT, DRAWER-UNIT contains DESK-SET
      const deskSet: Product = {
        sku: "DESK-SET-001",
        name: "Desk Set",
        hasVariation: false,
        isComposite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const drawerUnit: Product = {
        sku: "DRAWER-UNIT-001",
        name: "Drawer Unit",
        hasVariation: false,
        isComposite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku
        .mockResolvedValueOnce(deskSet) // For parent validation
        .mockResolvedValueOnce(drawerUnit) // For child validation
        .mockResolvedValueOnce(drawerUnit) // For circular check
        .mockResolvedValueOnce(deskSet); // For circular check tree building

      // Mock composition items to create circular dependency
      mockCompositionItemRepository.findByParent.mockImplementation(
        (parentSku: string) => {
          if (parentSku === "DESK-SET-001") {
            return Promise.resolve([]); // No existing items for duplicate check
          }
          if (parentSku === "DRAWER-UNIT-001") {
            return Promise.resolve([
              {
                id: "1",
                parentSku: "DRAWER-UNIT-001",
                childSku: "DESK-SET-001",
                quantity: 1,
              },
            ]); // Circular dependency
          }
          return Promise.resolve([]);
        }
      );

      // Test: Should detect circular dependency
      await expect(
        compositionService.validateReferentialIntegrity(
          "DESK-SET-001",
          "DRAWER-UNIT-001"
        )
      ).rejects.toThrow("circular dependency");
    });

    it("should prevent duplicate children in same composition", async () => {
      // Setup: Parent product and existing composition
      const parentProduct: Product = {
        sku: "DESK-SET-001",
        name: "Desk Set",
        hasVariation: false,
        isComposite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const childProduct: Product = {
        sku: "CUSHION-001",
        name: "Simple Cushion",
        hasVariation: false,
        isComposite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku
        .mockResolvedValueOnce(parentProduct)
        .mockResolvedValueOnce(childProduct);

      // Mock existing composition item
      mockCompositionItemRepository.findByParent.mockResolvedValue([
        {
          id: "1",
          parentSku: "DESK-SET-001",
          childSku: "CUSHION-001",
          quantity: 2,
        },
      ]);

      // Test: Should prevent duplicate
      await expect(
        compositionService.validateReferentialIntegrity(
          "DESK-SET-001",
          "CUSHION-001"
        )
      ).rejects.toThrow("already part of the composition");
    });

    it("should validate parent product is composite", async () => {
      // Setup: Non-composite parent
      const nonCompositeProduct: Product = {
        sku: "SIMPLE-001",
        name: "Simple Product",
        hasVariation: false,
        isComposite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockResolvedValue(nonCompositeProduct);

      // Test: Should reject non-composite parent
      await expect(
        compositionService.validateReferentialIntegrity(
          "SIMPLE-001",
          "CHILD-001"
        )
      ).rejects.toThrow("not marked as composite");
    });
  });

  describe("Nested composition support", () => {
    it("should build composition tree with nested composites", async () => {
      // Setup: Multi-level composition
      const officeSet: Product = {
        sku: "OFFICE-SET-001",
        name: "Complete Office Set",
        hasVariation: false,
        isComposite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const deskSet: Product = {
        sku: "DESK-SET-001",
        name: "Desk Set",
        hasVariation: false,
        isComposite: true,
        weight: 25,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const chair: Product = {
        sku: "CHAIR-001",
        name: "Office Chair",
        hasVariation: false,
        isComposite: false,
        weight: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const desk: Product = {
        sku: "DESK-001",
        name: "Desk",
        hasVariation: false,
        isComposite: false,
        weight: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockImplementation((sku: string) => {
        switch (sku) {
          case "OFFICE-SET-001":
            return Promise.resolve(officeSet);
          case "DESK-SET-001":
            return Promise.resolve(deskSet);
          case "CHAIR-001":
            return Promise.resolve(chair);
          case "DESK-001":
            return Promise.resolve(desk);
          default:
            return Promise.resolve(null);
        }
      });

      // Mock composition structure
      mockCompositionItemRepository.findByParent.mockImplementation(
        (parentSku: string) => {
          switch (parentSku) {
            case "OFFICE-SET-001":
              return Promise.resolve([
                {
                  id: "1",
                  parentSku: "OFFICE-SET-001",
                  childSku: "DESK-SET-001",
                  quantity: 1,
                },
                {
                  id: "2",
                  parentSku: "OFFICE-SET-001",
                  childSku: "CHAIR-001",
                  quantity: 2,
                },
              ]);
            case "DESK-SET-001":
              return Promise.resolve([
                {
                  id: "3",
                  parentSku: "DESK-SET-001",
                  childSku: "DESK-001",
                  quantity: 1,
                },
              ]);
            default:
              return Promise.resolve([]);
          }
        }
      );

      // Test: Build composition tree
      const tree =
        await compositionService.getCompositionTree("OFFICE-SET-001");

      // Verify structure
      expect(tree.sku).toBe("OFFICE-SET-001");
      expect(tree.isComposite).toBe(true);
      expect(tree.children).toHaveLength(2);

      // Find desk set child
      const deskSetChild = tree.children.find(
        (child) => child.sku === "DESK-SET-001"
      );
      expect(deskSetChild).toBeDefined();
      expect(deskSetChild?.isComposite).toBe(true);
      expect(deskSetChild?.children).toHaveLength(1);

      // Verify nested desk
      const deskChild = deskSetChild?.children[0];
      expect(deskChild?.sku).toBe("DESK-001");
      expect(deskChild?.isComposite).toBe(false);

      // Verify weight calculation
      // Expected: desk (30 * 1) + chairs (15 * 2) = 60
      expect(tree.calculatedWeight).toBe(60);
    });

    it("should prevent excessive nesting depth", async () => {
      // Setup: Deep nesting scenario
      const products: Product[] = [];
      for (let i = 1; i <= 15; i++) {
        products.push({
          sku: `LEVEL-${i}`,
          name: `Level ${i}`,
          hasVariation: false,
          isComposite: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      mockProductRepository.findBySku.mockImplementation((sku: string) => {
        const product = products.find((p) => p.sku === sku);
        return Promise.resolve(product || null);
      });

      // Mock deep nesting
      mockCompositionItemRepository.findByParent.mockImplementation(
        (parentSku: string) => {
          const level = parseInt(parentSku.split("-")[1]);
          if (level < 15) {
            return Promise.resolve([
              {
                id: `${level}`,
                parentSku,
                childSku: `LEVEL-${level + 1}`,
                quantity: 1,
              },
            ]);
          }
          return Promise.resolve([]);
        }
      );

      // Test: Should throw error for excessive depth
      await expect(
        compositionService.getCompositionTree("LEVEL-1")
      ).rejects.toThrow("Maximum composition depth exceeded");
    });
  });

  describe("Product deletion impact validation", () => {
    it("should identify products that cannot be deleted due to composition usage", async () => {
      // Setup: Product used in compositions
      mockCompositionItemRepository.findByChild.mockResolvedValue([
        {
          id: "1",
          parentSku: "OFFICE-SET-001",
          childSku: "CHAIR-001",
          quantity: 2,
        },
        {
          id: "2",
          parentSku: "DESK-SET-001",
          childSku: "CHAIR-001",
          quantity: 1,
        },
      ]);

      const chair: Product = {
        sku: "CHAIR-001",
        name: "Office Chair",
        hasVariation: false,
        isComposite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockResolvedValue(chair);
      mockVariationItemRepository.findByProduct.mockResolvedValue([]);

      // Mock getDependentProducts method
      vi.spyOn(compositionService, "getDependentProducts").mockResolvedValue([
        "OFFICE-SET-001",
        "DESK-SET-001",
      ]);

      // Test: Check deletion impact
      const impact =
        await compositionService.validateProductDeletionImpact("CHAIR-001");

      expect(impact.canDelete).toBe(false);
      expect(impact.blockers).toHaveLength(1);
      expect(impact.blockers[0]).toContain("used in 2 composition(s)");
      expect(impact.affectedCompositions).toEqual([
        "OFFICE-SET-001",
        "DESK-SET-001",
      ]);
    });

    it("should allow deletion of products not used in compositions", async () => {
      // Setup: Product not used anywhere
      const unusedProduct: Product = {
        sku: "UNUSED-001",
        name: "Unused Product",
        hasVariation: false,
        isComposite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockResolvedValue(unusedProduct);
      mockVariationItemRepository.findByProduct.mockResolvedValue([]);

      // Mock getDependentProducts method
      vi.spyOn(compositionService, "getDependentProducts").mockResolvedValue(
        []
      );

      // Test: Should allow deletion
      const impact =
        await compositionService.validateProductDeletionImpact("UNUSED-001");

      expect(impact.canDelete).toBe(true);
      expect(impact.blockers).toHaveLength(0);
      expect(impact.affectedCompositions).toHaveLength(0);
    });
  });

  describe("Variation SKU parsing", () => {
    it("should parse variation SKU with hash format", async () => {
      const variation: ProductVariationItem = {
        id: "var-123",
        productSku: "CHAIR-001",
        selections: { "color-type": "red-var" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const product: Product = {
        sku: "CHAIR-001",
        name: "Office Chair",
        hasVariation: true,
        isComposite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockResolvedValue(product);
      mockVariationItemRepository.findById.mockResolvedValue(variation);

      // Test: Should parse and validate correctly
      await expect(
        compositionService.validateChildProductEligibility("CHAIR-001#var-123")
      ).resolves.not.toThrow();
    });

    it("should reject legacy colon format", async () => {
      // Test: Should reject legacy format
      await expect(
        compositionService.validateChildProductEligibility("CHAIR-001:red")
      ).rejects.toThrow("Legacy variation SKU format not supported");
    });

    it("should parse variation SKU with VAR format", async () => {
      const variation: ProductVariationItem = {
        id: "abc123",
        productSku: "CHAIR-001",
        selections: { "color-type": "red-var" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const product: Product = {
        sku: "CHAIR-001",
        name: "Office Chair",
        hasVariation: true,
        isComposite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockResolvedValue(product);
      mockVariationItemRepository.findById.mockResolvedValue(variation);

      // Test: Should parse VAR format correctly
      await expect(
        compositionService.validateChildProductEligibility(
          "CHAIR-001-VAR-abc123"
        )
      ).resolves.not.toThrow();
    });
  });
});
