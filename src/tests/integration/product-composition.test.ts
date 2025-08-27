import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductRepository } from '@/lib/storage/repositories/product-repository';
import { CompositionItemRepository } from '@/lib/storage/repositories/composition-item-repository';
import { ProductVariationItemRepository } from '@/lib/storage/repositories/product-variation-item-repository';
import { CompositionService } from '@/lib/domain/services/composition-service';
import { ProductService } from '@/lib/domain/services/product-service';
import { Product } from '@/lib/domain/entities/product';
import { CompositionItem } from '@/lib/domain/entities/composition-item';

describe('Product Composition Integration Tests', () => {
  let productRepository: ProductRepository;
  let compositionRepository: CompositionItemRepository;
  let variationRepository: ProductVariationItemRepository;

  beforeEach(() => {
    // Mock localStorage
    const mockStorage: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
      }),
    });

    productRepository = new ProductRepository();
    compositionRepository = new CompositionItemRepository();
    variationRepository = new ProductVariationItemRepository();
  });

  describe('Basic Composition Flow', () => {
    it('should create a composite product with child products', async () => {
      // Create child products
      const childProduct1 = await productRepository.create({
        sku: 'CHILD-001',
        name: 'Child Product 1',
        weight: 1.5,
        dimensions: { height: 10, width: 10, depth: 10 },
        isComposite: false,
        hasVariation: false
      });

      const childProduct2 = await productRepository.create({
        sku: 'CHILD-002',
        name: 'Child Product 2',
        weight: 2.0,
        dimensions: { height: 15, width: 15, depth: 15 },
        isComposite: false,
        hasVariation: false
      });

      // Create parent composite product
      const parentProduct = await productRepository.create({
        sku: 'PARENT-001',
        name: 'Composite Product',
        weight: 1.0, // Changed from 0 to valid weight
        dimensions: { height: 30, width: 30, depth: 30 },
        isComposite: true,
        hasVariation: false
      });

      // Create composition items
      const composition1 = await compositionRepository.create({
        parentSku: parentProduct.sku,
        childSku: childProduct1.sku,
        quantity: 2
      });

      const composition2 = await compositionRepository.create({
        parentSku: parentProduct.sku,
        childSku: childProduct2.sku,
        quantity: 1
      });

      // Verify composition was created correctly
      expect(composition1.parentSku).toBe('PARENT-001');
      expect(composition1.childSku).toBe('CHILD-001');
      expect(composition1.quantity).toBe(2);

      expect(composition2.parentSku).toBe('PARENT-001');
      expect(composition2.childSku).toBe('CHILD-002');
      expect(composition2.quantity).toBe(1);

      // Verify composition items can be retrieved
      const compositionItems = await compositionRepository.findByParent('PARENT-001');
      expect(compositionItems).toHaveLength(2);
      expect(compositionItems.map(item => item.childSku)).toContain('CHILD-001');
      expect(compositionItems.map(item => item.childSku)).toContain('CHILD-002');
    });

    it('should calculate composite weight correctly', async () => {
      // Create child products with known weights
      const child1 = await productRepository.create({
        sku: 'WEIGHT-CHILD-1',
        name: 'Weight Child 1',
        weight: 1.0,
        isComposite: false,
        hasVariation: false
      });

      const child2 = await productRepository.create({
        sku: 'WEIGHT-CHILD-2',
        name: 'Weight Child 2',
        weight: 2.5,
        isComposite: false,
        hasVariation: false
      });

      // Create parent
      const parent = await productRepository.create({
        sku: 'WEIGHT-PARENT',
        name: 'Weight Parent',
        weight: 1.0, // Changed from 0 to valid weight
        isComposite: true,
        hasVariation: false
      });

      // Create composition: 3x child1 + 2x child2 = 3*1.0 + 2*2.5 = 8.0
      await compositionRepository.create({
        parentSku: parent.sku,
        childSku: child1.sku,
        quantity: 3
      });

      await compositionRepository.create({
        parentSku: parent.sku,
        childSku: child2.sku,
        quantity: 2
      });

      // Calculate weight using service
      const childWeights = {
        [child1.sku]: child1.weight!,
        [child2.sku]: child2.weight!
      };

      const totalWeight = await compositionRepository.calculateCompositeWeight(
        parent.sku,
        childWeights
      );

      expect(totalWeight).toBe(8.0);
    });
  });

  describe('Variation-Based Composition', () => {
    it('should handle composite products with variations', async () => {
      // Create child products
      const child1 = await productRepository.create({
        sku: 'VAR-CHILD-1',
        name: 'Variation Child 1',
        weight: 1.0,
        isComposite: false,
        hasVariation: false
      });

      const child2 = await productRepository.create({
        sku: 'VAR-CHILD-2',
        name: 'Variation Child 2',
        weight: 1.5,
        isComposite: false,
        hasVariation: false
      });

      // Create composite product with variations
      const parent = await productRepository.create({
        sku: 'VAR-PARENT',
        name: 'Variable Composite',
        weight: 1.0, // Changed from 0 to valid weight
        isComposite: true,
        hasVariation: true
      });

      // Create variations
      const variation1 = await variationRepository.create({
        productSku: parent.sku,
        selections: { [crypto.randomUUID()]: crypto.randomUUID() },
        weightOverride: undefined
      });

      const variation2 = await variationRepository.create({
        productSku: parent.sku,
        selections: { [crypto.randomUUID()]: crypto.randomUUID() },
        weightOverride: undefined
      });

      // Create different compositions for each variation
      // Variation 1: Basic kit (1x child1)
      await compositionRepository.create({
        parentSku: `${parent.sku}#${variation1.id}`,
        childSku: child1.sku,
        quantity: 1
      });

      // Variation 2: Premium kit (2x child1 + 1x child2)
      await compositionRepository.create({
        parentSku: `${parent.sku}#${variation2.id}`,
        childSku: child1.sku,
        quantity: 2
      });

      await compositionRepository.create({
        parentSku: `${parent.sku}#${variation2.id}`,
        childSku: child2.sku,
        quantity: 1
      });

      // Verify variation compositions
      const variation1Items = await compositionRepository.findByParent(`${parent.sku}#${variation1.id}`);
      const variation2Items = await compositionRepository.findByParent(`${parent.sku}#${variation2.id}`);

      expect(variation1Items).toHaveLength(1);
      expect(variation1Items[0].childSku).toBe(child1.sku);
      expect(variation1Items[0].quantity).toBe(1);

      expect(variation2Items).toHaveLength(2);
      expect(variation2Items.map(item => item.childSku)).toContain(child1.sku);
      expect(variation2Items.map(item => item.childSku)).toContain(child2.sku);
    });
  });

  describe('Business Rules Validation', () => {
    it('should prevent circular dependencies', async () => {
      // Create products
      const productA = await productRepository.create({
        sku: 'CIRCULAR-A',
        name: 'Product A',
        isComposite: true,
        hasVariation: false
      });

      const productB = await productRepository.create({
        sku: 'CIRCULAR-B',
        name: 'Product B',
        isComposite: true,
        hasVariation: false
      });

      // Create A -> B composition
      await compositionRepository.create({
        parentSku: productA.sku,
        childSku: productB.sku,
        quantity: 1
      });

      // Try to create B -> A composition (should be prevented)
      const existingItems = await compositionRepository.findAll();
      const validation = CompositionService.validateCompositionItem(
        {
          parentSku: productB.sku,
          childSku: productA.sku,
          quantity: 1
        },
        existingItems,
        [productA, productB]
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('This would create a circular dependency');
    });

    it('should validate product state transitions', async () => {
      // Create a simple product
      const product = await productRepository.create({
        sku: 'TRANSITION-TEST',
        name: 'Transition Test Product',
        isComposite: false,
        hasVariation: false
      });

      // Test enabling composite flag
      const validation1 = ProductService.validateStateTransition(
        product,
        { isComposite: true },
        [],
        []
      );

      expect(validation1.valid).toBe(true);
      expect(validation1.errors).toHaveLength(0);

      // Create composition data
      const updatedProduct = { ...product, isComposite: true };
      await compositionRepository.create({
        parentSku: product.sku,
        childSku: 'SOME-CHILD',
        quantity: 1
      });

      // Test disabling composite flag when data exists
      const compositionItems = await compositionRepository.findByParent(product.sku);
      const validation2 = ProductService.validateStateTransition(
        updatedProduct,
        { isComposite: false },
        compositionItems,
        []
      );

      expect(validation2.valid).toBe(true);
      expect(validation2.warnings).toContain('Disabling composite will permanently delete all composition data');
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity', async () => {
      // Create products
      const parent = await productRepository.create({
        sku: 'INTEGRITY-PARENT',
        name: 'Integrity Parent',
        isComposite: true,
        hasVariation: false
      });

      const child = await productRepository.create({
        sku: 'INTEGRITY-CHILD',
        name: 'Integrity Child',
        isComposite: false,
        hasVariation: false
      });

      // Create composition
      await compositionRepository.create({
        parentSku: parent.sku,
        childSku: child.sku,
        quantity: 1
      });

      // Validate integrity
      const allProducts = await productRepository.findAll();
      const productSkus = allProducts.map(p => p.sku);
      
      const integrityCheck = await compositionRepository.validateIntegrity(productSkus);

      expect(integrityCheck.valid).toBe(true);
      expect(integrityCheck.orphanedItems).toHaveLength(0);
      expect(integrityCheck.missingChildren).toHaveLength(0);
    });

    it('should detect orphaned composition items', async () => {
      // Create composition item with non-existent parent
      await compositionRepository.create({
        parentSku: 'NON-EXISTENT-PARENT',
        childSku: 'SOME-CHILD',
        quantity: 1
      });

      // Validate integrity
      const allProducts = await productRepository.findAll();
      const productSkus = allProducts.map(p => p.sku);
      
      const integrityCheck = await compositionRepository.validateIntegrity(productSkus);

      expect(integrityCheck.valid).toBe(false);
      expect(integrityCheck.orphanedItems).toHaveLength(1);
      expect(integrityCheck.orphanedItems[0].parentSku).toBe('NON-EXISTENT-PARENT');
    });
  });

  describe('Performance and Batch Operations', () => {
    it('should handle batch creation of composition items', async () => {
      // Create parent and children
      const parent = await productRepository.create({
        sku: 'BATCH-PARENT',
        name: 'Batch Parent',
        isComposite: true,
        hasVariation: false
      });

      const children = await Promise.all([
        productRepository.create({
          sku: 'BATCH-CHILD-1',
          name: 'Batch Child 1',
          isComposite: false,
          hasVariation: false
        }),
        productRepository.create({
          sku: 'BATCH-CHILD-2',
          name: 'Batch Child 2',
          isComposite: false,
          hasVariation: false
        }),
        productRepository.create({
          sku: 'BATCH-CHILD-3',
          name: 'Batch Child 3',
          isComposite: false,
          hasVariation: false
        })
      ]);

      // Batch create composition items
      const compositionData = children.map((child, index) => ({
        parentSku: parent.sku,
        childSku: child.sku,
        quantity: index + 1
      }));

      const createdItems = await compositionRepository.createBatch(compositionData);

      expect(createdItems).toHaveLength(3);
      expect(createdItems[0].quantity).toBe(1);
      expect(createdItems[1].quantity).toBe(2);
      expect(createdItems[2].quantity).toBe(3);

      // Verify items were actually created
      const allItems = await compositionRepository.findByParent(parent.sku);
      expect(allItems).toHaveLength(3);
    });

    it('should provide composition statistics', async () => {
      // Create test data
      const parent1 = await productRepository.create({
        sku: 'STATS-PARENT-1',
        name: 'Stats Parent 1',
        isComposite: true,
        hasVariation: false
      });

      const parent2 = await productRepository.create({
        sku: 'STATS-PARENT-2',
        name: 'Stats Parent 2',
        isComposite: true,
        hasVariation: false
      });

      const child = await productRepository.create({
        sku: 'STATS-CHILD',
        name: 'Stats Child',
        isComposite: false,
        hasVariation: false
      });

      // Create compositions
      await compositionRepository.create({
        parentSku: parent1.sku,
        childSku: child.sku,
        quantity: 1
      });

      await compositionRepository.create({
        parentSku: parent2.sku,
        childSku: child.sku,
        quantity: 2
      });

      // Get statistics
      const stats = await compositionRepository.getCompositionStats();

      expect(stats.totalItems).toBe(2);
      expect(stats.uniqueParents).toBe(2);
      expect(stats.uniqueChildren).toBe(1);
      expect(stats.averageItemsPerParent).toBe(1);
    });
  });
});
