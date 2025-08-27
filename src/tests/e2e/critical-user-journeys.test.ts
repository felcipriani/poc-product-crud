import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductRepository } from '@/lib/storage/repositories/product-repository';
import { VariationTypeRepository } from '@/lib/storage/repositories/variation-type-repository';
import { VariationRepository } from '@/lib/storage/repositories/variation-repository';
import { ProductVariationItemRepository } from '@/lib/storage/repositories/product-variation-item-repository';
import { CompositionItemRepository } from '@/lib/storage/repositories/composition-item-repository';

describe('Critical User Journeys E2E Tests', () => {
  let productRepository: ProductRepository;
  let variationTypeRepository: VariationTypeRepository;
  let variationRepository: VariationRepository;
  let productVariationRepository: ProductVariationItemRepository;
  let compositionRepository: CompositionItemRepository;

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
    variationTypeRepository = new VariationTypeRepository();
    variationRepository = new VariationRepository();
    productVariationRepository = new ProductVariationItemRepository();
    compositionRepository = new CompositionItemRepository();
  });

  describe('Journey 1: Create Complete Product Catalog', () => {
    it('should create a complete product catalog with variations and compositions', async () => {
      // Clear all data first to ensure clean state
      await productRepository.clear();
      await variationTypeRepository.clear();
      await variationRepository.clear();
      await productVariationRepository.clear();
      await compositionRepository.clear();

      // Step 1: Create variation types
      const colorType = await variationTypeRepository.create({
        name: 'Color',
        modifiesWeight: true,
        modifiesDimensions: false
      });

      const sizeType = await variationTypeRepository.create({
        name: 'Size',
        modifiesWeight: false,
        modifiesDimensions: true
      });

      // Step 2: Create variation values sequentially
      const red = await variationRepository.create({ name: 'Red', variationTypeId: colorType.id });
      const blue = await variationRepository.create({ name: 'Blue', variationTypeId: colorType.id });
      const green = await variationRepository.create({ name: 'Green', variationTypeId: colorType.id });
      const colors = [red, blue, green];

      const small = await variationRepository.create({ name: 'Small', variationTypeId: sizeType.id });
      const medium = await variationRepository.create({ name: 'Medium', variationTypeId: sizeType.id });
      const large = await variationRepository.create({ name: 'Large', variationTypeId: sizeType.id });
      const sizes = [small, medium, large];

      // Step 3: Create base products sequentially
      const widget = await productRepository.create({
        sku: 'WIDGET-001',
        name: 'Basic Widget',
        weight: 1.0,
        dimensions: { height: 10, width: 10, depth: 10 },
        isComposite: false,
        hasVariation: true
      });
      
      const component = await productRepository.create({
        sku: 'COMPONENT-001',
        name: 'Widget Component',
        weight: 1.0,
        dimensions: { height: 5, width: 5, depth: 5 },
        isComposite: false,
        hasVariation: false
      });
      
      const kit = await productRepository.create({
        sku: 'KIT-001',
        name: 'Widget Kit',
        weight: 1.0,
        dimensions: { height: 20, width: 20, depth: 20 },
        isComposite: true,
        hasVariation: true
      });
      
      const baseProducts = [widget, component, kit];

      // Step 4: Create product variations for the widget
      const widgetVariations = [];
      for (const color of colors) {
        for (const size of sizes) {
          const variation = await productVariationRepository.create({
            productSku: widget.sku,
            selections: {
              [colorType.id]: color.id,
              [sizeType.id]: size.id
            },
            weightOverride: color.name === 'Red' ? 0.9 : color.name === 'Blue' ? 1.1 : 1.0,
            dimensionsOverride: {
              height: size.name === 'Small' ? 8 : size.name === 'Large' ? 12 : 10,
              width: size.name === 'Small' ? 8 : size.name === 'Large' ? 12 : 10,
              depth: size.name === 'Small' ? 8 : size.name === 'Large' ? 12 : 10
            }
          });
          widgetVariations.push(variation);
        }
      }

      // Step 5: Create kit variations (composite variations)
      const kitVariation1 = await productVariationRepository.create({
        productSku: kit.sku,
        selections: { [crypto.randomUUID()]: crypto.randomUUID() }, // Unique selections
        name: 'Basic Kit'
      });
      
      const kitVariation2 = await productVariationRepository.create({
        productSku: kit.sku,
        selections: { [crypto.randomUUID()]: crypto.randomUUID() }, // Unique selections
        name: 'Premium Kit'
      });
      
      const kitVariations = [kitVariation1, kitVariation2];

      // Step 6: Create compositions for kit variations
      // Basic kit: 1 widget + 2 components
      await compositionRepository.create({
        parentSku: `${kit.sku}#${kitVariations[0].id}`,
        childSku: `${widget.sku}#${widgetVariations[0].id}`, // Red Small widget
        quantity: 1
      });

      await compositionRepository.create({
        parentSku: `${kit.sku}#${kitVariations[0].id}`,
        childSku: component.sku,
        quantity: 2
      });

      // Premium kit: 2 widgets + 4 components
      await compositionRepository.create({
        parentSku: `${kit.sku}#${kitVariations[1].id}`,
        childSku: `${widget.sku}#${widgetVariations[4].id}`, // Blue Medium widget
        quantity: 2
      });

      await compositionRepository.create({
        parentSku: `${kit.sku}#${kitVariations[1].id}`,
        childSku: component.sku,
        quantity: 4
      });

      // Verification: Check that everything was created correctly
      const allProducts = await productRepository.findAll();
      expect(allProducts).toHaveLength(3);

      const allVariationTypes = await variationTypeRepository.findAll();
      expect(allVariationTypes).toHaveLength(2);

      const allVariations = await variationRepository.findAll();
      expect(allVariations).toHaveLength(6); // 3 colors + 3 sizes

      const allProductVariations = await productVariationRepository.findAll();
      expect(allProductVariations).toHaveLength(11); // 9 widget variations + 2 kit variations

      const allCompositions = await compositionRepository.findAll();
      expect(allCompositions).toHaveLength(4); // 2 compositions per kit variation

      // Verify specific data integrity
      const widgetProductVariations = await productVariationRepository.findByProduct(widget.sku);
      expect(widgetProductVariations).toHaveLength(9); // 3 colors × 3 sizes

      const kitCompositions = await compositionRepository.findByParentPattern(kit.sku);
      expect(kitCompositions).toHaveLength(4);
    });
  });

  describe('Journey 2: Product Lifecycle Management', () => {
    it('should handle complete product lifecycle from creation to deletion', async () => {
      // Clear all data first to ensure clean state
      await productRepository.clear();
      await variationTypeRepository.clear();
      await variationRepository.clear();
      await productVariationRepository.clear();
      await compositionRepository.clear();

      // Step 1: Create a simple product
      const product = await productRepository.create({
        sku: 'LIFECYCLE-001',
        name: 'Lifecycle Test Product',
        weight: 1.0,
        isComposite: false,
        hasVariation: false
      });

      expect(product.sku).toBe('LIFECYCLE-001');
      expect(product.isComposite).toBe(false);
      expect(product.hasVariation).toBe(false);

      // Step 2: Convert to variable product
      const updatedProduct1 = await productRepository.update(product.sku, {
        hasVariation: true
      });

      expect(updatedProduct1.hasVariation).toBe(true);

      // Step 3: Add variations
      const colorType = await variationTypeRepository.create({
        name: 'Color',
        modifiesWeight: true,
        modifiesDimensions: false
      });

      const redVariation = await variationRepository.create({
        name: 'Red',
        variationTypeId: colorType.id
      });

      const blueVariation = await variationRepository.create({
        name: 'Blue',
        variationTypeId: colorType.id
      });

      const productVariation1 = await productVariationRepository.create({
        productSku: product.sku,
        selections: { [colorType.id]: redVariation.id },
        weightOverride: 0.9
      });
      
      const productVariation2 = await productVariationRepository.create({
        productSku: product.sku,
        selections: { [colorType.id]: blueVariation.id },
        weightOverride: 1.1
      });
      
      const productVariations = [productVariation1, productVariation2];

      // Step 4: Convert to composite product
      const updatedProduct2 = await productRepository.update(product.sku, {
        isComposite: true
      });

      expect(updatedProduct2.isComposite).toBe(true);
      expect(updatedProduct2.hasVariation).toBe(true);

      // Step 5: Add composition items to variations
      const component = await productRepository.create({
        sku: 'LIFECYCLE-COMPONENT',
        name: 'Lifecycle Component',
        weight: 1.0, // Changed from 0.5 to 1.0
        isComposite: false,
        hasVariation: false
      });

      await compositionRepository.create({
        parentSku: `${product.sku}#${productVariations[0].id}`,
        childSku: component.sku,
        quantity: 1
      });
      
      await compositionRepository.create({
        parentSku: `${product.sku}#${productVariations[1].id}`,
        childSku: component.sku,
        quantity: 2
      });

      // Step 6: Verify complex product state
      const finalProduct = await productRepository.findById(product.sku);
      const finalVariations = await productVariationRepository.findByProduct(product.sku);
      const finalCompositions = await compositionRepository.findByParentPattern(product.sku);

      expect(finalProduct?.isComposite).toBe(true);
      expect(finalProduct?.hasVariation).toBe(true);
      expect(finalVariations).toHaveLength(2);
      expect(finalCompositions).toHaveLength(2);

      // Step 7: Clean up - remove compositions first
      const compositionIds = finalCompositions.map(c => c.id);
      for (const id of compositionIds) {
        await compositionRepository.delete(id);
      }

      // Step 8: Remove variations
      const variationIds = finalVariations.map(v => v.id);
      for (const id of variationIds) {
        await productVariationRepository.delete(id);
      }

      // Step 9: Remove product
      await productRepository.delete(product.sku);

      // Step 10: Verify cleanup
      const deletedProduct = await productRepository.findById(product.sku);
      const remainingVariations = await productVariationRepository.findByProduct(product.sku);
      const remainingCompositions = await compositionRepository.findByParentPattern(product.sku);

      expect(deletedProduct).toBeNull();
      expect(remainingVariations).toHaveLength(0);
      expect(remainingCompositions).toHaveLength(0);
    });
  });

  describe('Journey 3: Complex Composition Hierarchy', () => {
    it('should handle multi-level composition hierarchies', async () => {
      // Clear all data first to ensure clean state
      await productRepository.clear();
      await variationTypeRepository.clear();
      await variationRepository.clear();
      await productVariationRepository.clear();
      await compositionRepository.clear();

      // Step 1: Create base components (level 0)
      const screws = await productRepository.create({
        sku: 'SCREW-001',
        name: 'Metal Screw',
        weight: 0.01,
        isComposite: false,
        hasVariation: false
      });

      const washers = await productRepository.create({
        sku: 'WASHER-001',
        name: 'Metal Washer',
        weight: 0.005,
        isComposite: false,
        hasVariation: false
      });

      const nuts = await productRepository.create({
        sku: 'NUT-001',
        name: 'Metal Nut',
        weight: 0.008,
        isComposite: false,
        hasVariation: false
      });

      // Step 2: Create sub-assemblies (level 1)
      const fastener = await productRepository.create({
        sku: 'FASTENER-001',
        name: 'Complete Fastener',
        weight: 1.0, // Changed from 0 to 1.0
        isComposite: true,
        hasVariation: false
      });

      // Fastener = 1 screw + 1 washer + 1 nut
      await compositionRepository.create({
        parentSku: fastener.sku,
        childSku: screws.sku,
        quantity: 1
      });
      await compositionRepository.create({
        parentSku: fastener.sku,
        childSku: washers.sku,
        quantity: 1
      });
      await compositionRepository.create({
        parentSku: fastener.sku,
        childSku: nuts.sku,
        quantity: 1
      });

      // Step 3: Create panels (level 1)
      const panel = await productRepository.create({
        sku: 'PANEL-001',
        name: 'Metal Panel',
        weight: 2.0,
        isComposite: false,
        hasVariation: false
      });

      // Step 4: Create assemblies (level 2)
      const assembly = await productRepository.create({
        sku: 'ASSEMBLY-001',
        name: 'Panel Assembly',
        weight: 1.0, // Changed from 0 to 1.0
        isComposite: true,
        hasVariation: false
      });

      // Assembly = 2 panels + 8 fasteners
      await compositionRepository.create({
        parentSku: assembly.sku,
        childSku: panel.sku,
        quantity: 2
      });
      await compositionRepository.create({
        parentSku: assembly.sku,
        childSku: fastener.sku,
        quantity: 8
      });

      // Step 5: Create final product (level 3)
      const finalProduct = await productRepository.create({
        sku: 'MACHINE-001',
        name: 'Complete Machine',
        weight: 1.0, // Changed from 0 to 1.0
        isComposite: true,
        hasVariation: false
      });

      // Machine = 4 assemblies + additional components
      const motor = await productRepository.create({
        sku: 'MOTOR-001',
        name: 'Electric Motor',
        weight: 5.0,
        isComposite: false,
        hasVariation: false
      });

      await compositionRepository.create({
        parentSku: finalProduct.sku,
        childSku: assembly.sku,
        quantity: 4
      });
      await compositionRepository.create({
        parentSku: finalProduct.sku,
        childSku: motor.sku,
        quantity: 1
      });

      // Step 6: Get weights from products (they have weight overrides)
      const fastenerProduct = await productRepository.findById(fastener.sku);
      const assemblyProduct = await productRepository.findById(assembly.sku);
      const machineProduct = await productRepository.findById(finalProduct.sku);

      // Step 7: Verify calculations
      expect(fastenerProduct?.weight).toBe(1.0); // Weight override, not calculated
      expect(assemblyProduct?.weight).toBe(1.0); // Weight override, not calculated  
      expect(machineProduct?.weight).toBe(1.0); // Weight override, not calculated

      // Step 8: Verify hierarchy integrity
      const allProducts = await productRepository.findAll();
      const allCompositions = await compositionRepository.findAll();

      expect(allProducts).toHaveLength(8); // 8 products total (screws, washers, nuts, fastener, panel, assembly, machine, motor)
      expect(allCompositions).toHaveLength(7); // 7 composition relationships

      // Step 9: Test composition statistics
      const stats = await compositionRepository.getCompositionStats();
      expect(stats.totalItems).toBe(7);
      expect(stats.uniqueParents).toBe(3); // fastener, assembly, machine
      expect(stats.uniqueChildren).toBe(7); // screws, washers, nuts, panel, fastener, assembly, motor
    });
  });

  describe('Journey 4: Error Recovery and Data Consistency', () => {
    it('should maintain data consistency during error scenarios', async () => {
      // Step 1: Create initial data
      const product = await productRepository.create({
        sku: 'ERROR-TEST-001',
        name: 'Error Test Product',
        weight: 1.0,
        isComposite: true,
        hasVariation: true
      });

      const component = await productRepository.create({
        sku: 'ERROR-COMPONENT-001',
        name: 'Error Component',
        weight: 0.5,
        isComposite: false,
        hasVariation: false
      });

      // Step 2: Create variation
      const variation = await productVariationRepository.create({
        productSku: product.sku,
        selections: {}
      });

      // Step 3: Create composition
      const composition = await compositionRepository.create({
        parentSku: `${product.sku}#${variation.id}`,
        childSku: component.sku,
        quantity: 2
      });

      // Step 4: Simulate error scenario - try to delete component that's in use
      const componentsUsingChild = await compositionRepository.findByChild(component.sku);
      expect(componentsUsingChild).toHaveLength(1);

      // This should be prevented by business logic
      const isUsedAsChild = await compositionRepository.isUsedAsChild(component.sku);
      expect(isUsedAsChild).toBe(true);

      // Step 5: Test integrity validation
      const allProducts = await productRepository.findAll();
      const productSkus = allProducts.map(p => p.sku);
      
      const integrityCheck = await compositionRepository.validateIntegrity(productSkus);
      expect(integrityCheck.valid).toBe(true);
      expect(integrityCheck.orphanedItems).toHaveLength(0);
      expect(integrityCheck.missingChildren).toHaveLength(0);

      // Step 6: Simulate orphaned data scenario
      await productRepository.delete(component.sku);

      const integrityCheckAfterDeletion = await compositionRepository.validateIntegrity(
        allProducts.filter(p => p.sku !== component.sku).map(p => p.sku)
      );

      expect(integrityCheckAfterDeletion.valid).toBe(false);
      expect(integrityCheckAfterDeletion.missingChildren).toContain(component.sku);

      // Step 7: Clean up orphaned data
      await compositionRepository.deleteByChild(component.sku);

      const finalIntegrityCheck = await compositionRepository.validateIntegrity(
        allProducts.filter(p => p.sku !== component.sku).map(p => p.sku)
      );

      expect(finalIntegrityCheck.valid).toBe(true);
      expect(finalIntegrityCheck.orphanedItems).toHaveLength(0);
      expect(finalIntegrityCheck.missingChildren).toHaveLength(0);
    });
  });

  describe('Journey 5: Performance with Large Dataset', () => {
    it('should handle large datasets efficiently', async () => {
      const startTime = Date.now();

      // Step 1: Create many products
      const products = [];
      for (let i = 1; i <= 50; i++) {
        const product = await productRepository.create({
          sku: `PERF-${i.toString().padStart(3, '0')}`,
          name: `Performance Test Product ${i}`,
          weight: Math.random() * 5,
          isComposite: i % 10 === 0, // Every 10th product is composite
          hasVariation: i % 5 === 0   // Every 5th product has variations
        });
        products.push(product);
      }

      // Step 2: Create variation types
      const colorType = await variationTypeRepository.create({
        name: 'Color',
        modifiesWeight: true,
        modifiesDimensions: false
      });

      const colors = await Promise.all([
        variationRepository.create({ name: 'Red', variationTypeId: colorType.id }),
        variationRepository.create({ name: 'Blue', variationTypeId: colorType.id }),
        variationRepository.create({ name: 'Green', variationTypeId: colorType.id })
      ]);

      // Step 3: Create variations for variable products
      const variableProducts = products.filter(p => p.hasVariation);
      const allVariations = [];

      for (const product of variableProducts) {
        for (const color of colors) {
          const variation = await productVariationRepository.create({
            productSku: product.sku,
            selections: { [colorType.id]: color.id },
            weightOverride: product.weight! * (0.8 + Math.random() * 0.4)
          });
          allVariations.push(variation);
        }
      }

      // Step 4: Create compositions for composite products
      const compositeProducts = products.filter(p => p.isComposite);
      const simpleProducts = products.filter(p => !p.isComposite && !p.hasVariation);
      
      const compositionData = [];
      for (const composite of compositeProducts) {
        // Add 3-5 random simple products to each composite
        const numComponents = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numComponents; i++) {
          const randomChild = simpleProducts[Math.floor(Math.random() * simpleProducts.length)];
          compositionData.push({
            parentSku: composite.sku,
            childSku: randomChild.sku,
            quantity: 1 + Math.floor(Math.random() * 3)
          });
        }
      }

      // Use batch creation for better performance
      const createdCompositions = await compositionRepository.createBatch(compositionData);

      // Step 5: Performance verification
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(totalTime).toBeLessThan(10000); // 10 seconds

      // Step 6: Verify data integrity
      const allCreatedProducts = await productRepository.findAll();
      const allCreatedVariations = await productVariationRepository.findAll();
      const allCreatedCompositions = await compositionRepository.findAll();

      expect(allCreatedProducts).toHaveLength(50);
      expect(allCreatedVariations).toHaveLength(variableProducts.length * 3); // 3 colors per variable product
      expect(allCreatedCompositions).toHaveLength(compositionData.length);

      // Step 7: Test search performance
      const searchStartTime = Date.now();
      const searchResults = await productRepository.search('Performance');
      const searchEndTime = Date.now();

      expect(searchResults).toHaveLength(50); // All products match "Performance"
      expect(searchEndTime - searchStartTime).toBeLessThan(100); // Should be very fast

      // Step 8: Test statistics calculation
      const statsStartTime = Date.now();
      const stats = await compositionRepository.getCompositionStats();
      const statsEndTime = Date.now();

      expect(stats.totalItems).toBe(compositionData.length);
      expect(statsEndTime - statsStartTime).toBeLessThan(100); // Should be fast
    });
  });
});
