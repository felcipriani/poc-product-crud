import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompositionService } from '@/lib/domain/services/composition-service';
import { CompositionItemRepository } from '@/lib/storage/repositories/composition-item-repository';
import { ProductRepository } from '@/lib/storage/repositories/product-repository';
import { ProductVariationItemRepository } from '@/lib/storage/repositories/product-variation-item-repository';
import { Product } from '@/lib/domain/entities/product';
import { ProductVariationItem } from '@/lib/domain/entities/product-variation-item';
import { CompositionItem } from '@/lib/domain/entities/composition-item';

// Mock repositories with more complete implementations
const mockCompositionItemRepository = {
  findByParent: vi.fn(),
  findByChild: vi.fn(),
  findAll: vi.fn(),
  create: vi.fn(),
  deleteByParent: vi.fn(),
  deleteByChild: vi.fn(),
  findById: vi.fn(),
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

describe('CompositionService - Integration Tests', () => {
  let compositionService: CompositionService;

  beforeEach(() => {
    vi.clearAllMocks();
    compositionService = new CompositionService(
      mockCompositionItemRepository,
      mockProductRepository,
      mockVariationItemRepository
    );
  });

  describe('Complex composition scenarios', () => {
    it('should handle mixed composition with simple, composite, and variation products', async () => {
      // Setup: Complex office setup with mixed product types
      const officeSet: Product = {
        sku: 'OFFICE-COMPLETE-001',
        name: 'Complete Office Setup',
        hasVariation: false,
        isComposite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const deskSet: Product = {
        sku: 'DESK-SET-001',
        name: 'Desk Set',
        hasVariation: false,
        isComposite: true,
        weight: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const variableChair: Product = {
        sku: 'CHAIR-VAR-001',
        name: 'Variable Chair',
        hasVariation: true,
        isComposite: false,
        weight: 15,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const simpleLamp: Product = {
        sku: 'LAMP-001',
        name: 'Simple Desk Lamp',
        hasVariation: false,
        isComposite: false,
        weight: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const desk: Product = {
        sku: 'DESK-001',
        name: 'Office Desk',
        hasVariation: false,
        isComposite: false,
        weight: 40,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const chairVariation: ProductVariationItem = {
        id: 'chair-var-red',
        productSku: 'CHAIR-VAR-001',
        selections: { 'color-type': 'red-color' },
        weightOverride: 16, // Slightly heavier red version
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock product lookups
      mockProductRepository.findBySku.mockImplementation((sku: string) => {
        switch (sku) {
          case 'OFFICE-COMPLETE-001': return Promise.resolve(officeSet);
          case 'DESK-SET-001': return Promise.resolve(deskSet);
          case 'CHAIR-VAR-001': return Promise.resolve(variableChair);
          case 'LAMP-001': return Promise.resolve(simpleLamp);
          case 'DESK-001': return Promise.resolve(desk);
          default: return Promise.resolve(null);
        }
      });

      // Mock variation lookups
      mockVariationItemRepository.findById.mockImplementation((id: string) => {
        if (id === 'chair-var-red') return Promise.resolve(chairVariation);
        return Promise.resolve(null);
      });

      mockVariationItemRepository.getEffectiveWeight.mockReturnValue(16);

      // Mock composition structure
      mockCompositionItemRepository.findByParent.mockImplementation((parentSku: string) => {
        switch (parentSku) {
          case 'OFFICE-COMPLETE-001':
            return Promise.resolve([
              { id: '1', parentSku: 'OFFICE-COMPLETE-001', childSku: 'DESK-SET-001', quantity: 1 },
              { id: '2', parentSku: 'OFFICE-COMPLETE-001', childSku: 'CHAIR-VAR-001#chair-var-red', quantity: 2 },
              { id: '3', parentSku: 'OFFICE-COMPLETE-001', childSku: 'LAMP-001', quantity: 1 },
            ]);
          case 'DESK-SET-001':
            return Promise.resolve([
              { id: '4', parentSku: 'DESK-SET-001', childSku: 'DESK-001', quantity: 1 },
            ]);
          default:
            return Promise.resolve([]);
        }
      });

      // Test: Build composition tree
      const tree = await compositionService.getCompositionTree('OFFICE-COMPLETE-001');

      // Verify structure
      expect(tree.sku).toBe('OFFICE-COMPLETE-001');
      expect(tree.children).toHaveLength(3);

      // Verify nested composite (desk set)
      const deskSetChild = tree.children.find(child => child.sku === 'DESK-SET-001');
      expect(deskSetChild).toBeDefined();
      expect(deskSetChild?.children).toHaveLength(1);
      expect(deskSetChild?.children[0].sku).toBe('DESK-001');

      // Verify variation child
      const chairChild = tree.children.find(child => child.sku === 'CHAIR-VAR-001#chair-var-red');
      expect(chairChild).toBeDefined();
      expect(chairChild?.isVariation).toBe(true);
      expect(chairChild?.parentProductSku).toBe('CHAIR-VAR-001');

      // Verify simple product child
      const lampChild = tree.children.find(child => child.sku === 'LAMP-001');
      expect(lampChild).toBeDefined();
      expect(lampChild?.isComposite).toBe(false);

      // Verify weight calculation includes all components
      // Expected: (40 * 1) + (16 * 2) + (2 * 1) = 74
      expect(tree.calculatedWeight).toBe(74);
    });

    it('should validate complex referential integrity scenarios', async () => {
      // Setup: Complex scenario with potential issues
      const parentProduct: Product = {
        sku: 'COMPLEX-PARENT-001',
        name: 'Complex Parent',
        hasVariation: false,
        isComposite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const childProduct: Product = {
        sku: 'COMPLEX-CHILD-001',
        name: 'Complex Child',
        hasVariation: false,
        isComposite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockImplementation((sku: string) => {
        if (sku === 'COMPLEX-PARENT-001') return Promise.resolve(parentProduct);
        if (sku === 'COMPLEX-CHILD-001') return Promise.resolve(childProduct);
        return Promise.resolve(null);
      });

      // Mock no existing compositions (clean state)
      mockCompositionItemRepository.findByParent.mockResolvedValue([]);

      // Test: Should pass all validations
      await expect(
        compositionService.validateReferentialIntegrity('COMPLEX-PARENT-001', 'COMPLEX-CHILD-001')
      ).resolves.not.toThrow();

      // Verify all validation steps were called
      expect(mockProductRepository.findBySku).toHaveBeenCalledWith('COMPLEX-PARENT-001');
      expect(mockProductRepository.findBySku).toHaveBeenCalledWith('COMPLEX-CHILD-001');
      expect(mockCompositionItemRepository.findByParent).toHaveBeenCalledWith('COMPLEX-PARENT-001');
    });

    it('should handle self-reference prevention with variations', async () => {
      // Setup: Try to add product's own variation to itself
      const parentProduct: Product = {
        sku: 'SELF-REF-001',
        name: 'Self Reference Product',
        hasVariation: true,
        isComposite: true, // Both composite and has variations
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockResolvedValue(parentProduct);
      
      // Mock the variation to exist
      mockVariationItemRepository.findById.mockResolvedValue({
        id: 'var-123',
        productSku: 'SELF-REF-001',
        selections: { 'color': 'red' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Test: Should prevent self-reference even with variations
      await expect(
        compositionService.createCompositionItem({
          parentSku: 'SELF-REF-001',
          childSku: 'SELF-REF-001#var-123',
          quantity: 1,
        })
      ).rejects.toThrow('cannot be composed of its own variations');
    });
  });

  describe('Composition complexity validation', () => {
    it('should analyze composition complexity and provide warnings', async () => {
      // Setup: Moderately complex composition
      const complexProduct: Product = {
        sku: 'COMPLEX-001',
        name: 'Complex Product',
        hasVariation: false,
        isComposite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create a structure with moderate depth and item count
      const childProducts: Product[] = [];
      for (let i = 1; i <= 3; i++) {
        childProducts.push({
          sku: `LEVEL-${i}`,
          name: `Level ${i}`,
          hasVariation: false,
          isComposite: i < 3, // Only first two levels are composite
          weight: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      mockProductRepository.findBySku.mockImplementation((sku: string) => {
        if (sku === 'COMPLEX-001') return Promise.resolve(complexProduct);
        const product = childProducts.find(p => p.sku === sku);
        return Promise.resolve(product || null);
      });

      // Mock composition structure (3 levels deep)
      mockCompositionItemRepository.findByParent.mockImplementation((parentSku: string) => {
        switch (parentSku) {
          case 'COMPLEX-001':
            return Promise.resolve([
              { id: '1', parentSku: 'COMPLEX-001', childSku: 'LEVEL-1', quantity: 2 },
              { id: '2', parentSku: 'COMPLEX-001', childSku: 'LEVEL-2', quantity: 1 },
            ]);
          case 'LEVEL-1':
            return Promise.resolve([
              { id: '3', parentSku: 'LEVEL-1', childSku: 'LEVEL-3', quantity: 3 },
            ]);
          case 'LEVEL-2':
            return Promise.resolve([
              { id: '4', parentSku: 'LEVEL-2', childSku: 'LEVEL-3', quantity: 1 },
            ]);
          default:
            return Promise.resolve([]);
        }
      });

      // Test: Analyze complexity
      const analysis = await compositionService.validateCompositionComplexity('COMPLEX-001');

      expect(analysis.isValid).toBe(true);
      expect(analysis.maxDepth).toBe(3);
      expect(analysis.totalItems).toBeGreaterThan(1);
      expect(analysis.warnings).toHaveLength(0); // Should be within acceptable limits
    });

    it('should warn about excessive complexity', async () => {
      // Setup: Very deep composition
      const deepProduct: Product = {
        sku: 'DEEP-001',
        name: 'Deep Product',
        hasVariation: false,
        isComposite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create deep nesting (7 levels)
      const deepProducts: Product[] = [];
      for (let i = 1; i <= 7; i++) {
        deepProducts.push({
          sku: `DEEP-LEVEL-${i}`,
          name: `Deep Level ${i}`,
          hasVariation: false,
          isComposite: i < 7,
          weight: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      mockProductRepository.findBySku.mockImplementation((sku: string) => {
        if (sku === 'DEEP-001') return Promise.resolve(deepProduct);
        const product = deepProducts.find(p => p.sku === sku);
        return Promise.resolve(product || null);
      });

      // Mock deep composition structure
      mockCompositionItemRepository.findByParent.mockImplementation((parentSku: string) => {
        if (parentSku === 'DEEP-001') {
          return Promise.resolve([
            { id: '1', parentSku: 'DEEP-001', childSku: 'DEEP-LEVEL-1', quantity: 1 },
          ]);
        }
        
        const level = parseInt(parentSku.split('-')[2]);
        if (level < 7) {
          return Promise.resolve([
            { id: `${level}`, parentSku, childSku: `DEEP-LEVEL-${level + 1}`, quantity: 1 }
          ]);
        }
        
        return Promise.resolve([]);
      });

      // Test: Should warn about depth
      const analysis = await compositionService.validateCompositionComplexity('DEEP-001');

      expect(analysis.isValid).toBe(true); // Still valid but with warnings
      expect(analysis.maxDepth).toBe(8); // 7 levels + root
      expect(analysis.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Composition depth of 8 may impact performance')
        ])
      );
    });
  });

  describe('Referential integrity reporting', () => {
    it('should generate comprehensive referential integrity report', async () => {
      // Setup: Product with complex relationships
      const complexProduct: Product = {
        sku: 'REPORT-TEST-001',
        name: 'Report Test Product',
        hasVariation: true,
        isComposite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const variation1: ProductVariationItem = {
        id: 'var-1',
        productSku: 'REPORT-TEST-001',
        selections: { 'color': 'red' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const variation2: ProductVariationItem = {
        id: 'var-2',
        productSku: 'REPORT-TEST-001',
        selections: { 'color': 'blue' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProductRepository.findBySku.mockResolvedValue(complexProduct);
      mockVariationItemRepository.findByProduct.mockResolvedValue([variation1, variation2]);

      // Mock composition items (as parent)
      mockCompositionItemRepository.findByParent.mockResolvedValue([
        { id: '1', parentSku: 'REPORT-TEST-001', childSku: 'CHILD-001', quantity: 2 },
        { id: '2', parentSku: 'REPORT-TEST-001', childSku: 'CHILD-002', quantity: 1 },
      ]);

      // Mock usage in other compositions
      vi.spyOn(compositionService, 'getDependentProducts')
        .mockResolvedValueOnce(['PARENT-001', 'PARENT-002']) // For base product
        .mockResolvedValueOnce(['PARENT-003']) // For variation 1
        .mockResolvedValueOnce([]); // For variation 2

      // Test: Generate report
      const report = await compositionService.getReferentialIntegrityReport('REPORT-TEST-001');

      expect(report.productExists).toBe(true);
      expect(report.isComposite).toBe(true);
      expect(report.hasVariations).toBe(true);
      expect(report.compositionItemsCount).toBe(2);
      expect(report.usedInCompositionsCount).toBe(2);
      expect(report.variationsUsedInCompositions).toHaveLength(1); // Only var-1 is used
      expect(report.variationsUsedInCompositions[0]).toEqual({
        variationId: 'var-1',
        usedInCompositions: ['PARENT-003'],
      });
    });

    it('should handle non-existent product in report', async () => {
      mockProductRepository.findBySku.mockResolvedValue(null);

      const report = await compositionService.getReferentialIntegrityReport('NON-EXISTENT');

      expect(report.productExists).toBe(false);
      expect(report.isComposite).toBe(false);
      expect(report.hasVariations).toBe(false);
      expect(report.compositionItemsCount).toBe(0);
      expect(report.usedInCompositionsCount).toBe(0);
      expect(report.variationsUsedInCompositions).toHaveLength(0);
      expect(report.dependencyChain).toHaveLength(0);
    });
  });

  describe('Cascade deletion scenarios', () => {
    it('should safely cascade delete composition items', async () => {
      // Setup: Product with variations used in compositions
      const productToDelete: Product = {
        sku: 'DELETE-ME-001',
        name: 'Product to Delete',
        hasVariation: true,
        isComposite: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const variations: ProductVariationItem[] = [
        {
          id: 'var-1',
          productSku: 'DELETE-ME-001',
          selections: { 'color': 'red' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'var-2',
          productSku: 'DELETE-ME-001',
          selections: { 'color': 'blue' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockProductRepository.findBySku.mockResolvedValue(productToDelete);
      mockVariationItemRepository.findByProduct.mockResolvedValue(variations);

      // Mock repository delete methods
      mockCompositionItemRepository.deleteByParent.mockResolvedValue(undefined);
      mockCompositionItemRepository.deleteByChild.mockResolvedValue(undefined);

      // Test: Cascade delete
      await compositionService.cascadeDeleteCompositionItems('DELETE-ME-001');

      // Verify all deletion methods were called
      expect(mockCompositionItemRepository.deleteByParent).toHaveBeenCalledWith('DELETE-ME-001');
      expect(mockCompositionItemRepository.deleteByChild).toHaveBeenCalledWith('DELETE-ME-001');
      expect(mockCompositionItemRepository.deleteByChild).toHaveBeenCalledWith('DELETE-ME-001#var-1');
      expect(mockCompositionItemRepository.deleteByChild).toHaveBeenCalledWith('DELETE-ME-001#var-2');
    });
  });
});