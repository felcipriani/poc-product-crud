import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductRepository } from '@/lib/storage/repositories/product-repository';
import { VariationTypeRepository } from '@/lib/storage/repositories/variation-type-repository';
import { VariationRepository } from '@/lib/storage/repositories/variation-repository';
import { ProductVariationItemRepository } from '@/lib/storage/repositories/product-variation-item-repository';
import { VariationService } from '@/lib/domain/services/variation-service';

describe('Product Variations Integration Tests', () => {
  let productRepository: ProductRepository;
  let variationTypeRepository: VariationTypeRepository;
  let variationRepository: VariationRepository;
  let productVariationRepository: ProductVariationItemRepository;

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
  });

  describe('Variation Type Management', () => {
    it('should create variation types with different properties', async () => {
      // Create color variation type (affects weight)
      const colorType = await variationTypeRepository.create({
        name: 'Color',
        modifiesWeight: true,
        modifiesDimensions: false
      });

      // Create size variation type (affects dimensions)
      const sizeType = await variationTypeRepository.create({
        name: 'Size',
        modifiesWeight: false,
        modifiesDimensions: true
      });

      // Create material variation type (affects both)
      const materialType = await variationTypeRepository.create({
        name: 'Material',
        modifiesWeight: true,
        modifiesDimensions: true
      });

      expect(colorType.name).toBe('Color');
      expect(colorType.modifiesWeight).toBe(true);
      expect(colorType.modifiesDimensions).toBe(false);

      expect(sizeType.name).toBe('Size');
      expect(sizeType.modifiesWeight).toBe(false);
      expect(sizeType.modifiesDimensions).toBe(true);

      expect(materialType.name).toBe('Material');
      expect(materialType.modifiesWeight).toBe(true);
      expect(materialType.modifiesDimensions).toBe(true);
    });

    it('should prevent duplicate variation type names', async () => {
      // Create first variation type
      await variationTypeRepository.create({
        name: 'Color',
        modifiesWeight: true,
        modifiesDimensions: false
      });

      // Try to create duplicate (should fail)
      await expect(
        variationTypeRepository.create({
          name: 'Color', // Same name
          modifiesWeight: false,
          modifiesDimensions: true
        })
      ).rejects.toThrow();
    });
  });

  describe('Variation Values Management', () => {
    it('should create variations for different types', async () => {
      // Create variation types
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

      // Create color variations
      const redVariation = await variationRepository.create({
        name: 'Red',
        variationTypeId: colorType.id
      });

      const blueVariation = await variationRepository.create({
        name: 'Blue',
        variationTypeId: colorType.id
      });

      // Create size variations
      const smallVariation = await variationRepository.create({
        name: 'Small',
        variationTypeId: sizeType.id
      });

      const largeVariation = await variationRepository.create({
        name: 'Large',
        variationTypeId: sizeType.id
      });

      // Verify variations were created correctly
      expect(redVariation.variationTypeId).toBe(colorType.id);
      expect(blueVariation.variationTypeId).toBe(colorType.id);
      expect(smallVariation.variationTypeId).toBe(sizeType.id);
      expect(largeVariation.variationTypeId).toBe(sizeType.id);

      // Verify we can find variations by type
      const colorVariations = await variationRepository.findByType(colorType.id);
      const sizeVariations = await variationRepository.findByType(sizeType.id);

      expect(colorVariations).toHaveLength(2);
      expect(sizeVariations).toHaveLength(2);
      expect(colorVariations.map(v => v.name)).toContain('Red');
      expect(colorVariations.map(v => v.name)).toContain('Blue');
      expect(sizeVariations.map(v => v.name)).toContain('Small');
      expect(sizeVariations.map(v => v.name)).toContain('Large');
    });
  });

  describe('Product Variation Combinations', () => {
    it('should create product variations with different combinations', async () => {
      // Setup variation types and values
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

      const redVariation = await variationRepository.create({
        name: 'Red',
        variationTypeId: colorType.id
      });

      const blueVariation = await variationRepository.create({
        name: 'Blue',
        variationTypeId: colorType.id
      });

      const smallVariation = await variationRepository.create({
        name: 'Small',
        variationTypeId: sizeType.id
      });

      const largeVariation = await variationRepository.create({
        name: 'Large',
        variationTypeId: sizeType.id
      });

      // Create product with variations
      const product = await productRepository.create({
        sku: 'VAR-PRODUCT-001',
        name: 'Variable Product',
        weight: 1.0,
        dimensions: { height: 10, width: 10, depth: 10 },
        isComposite: false,
        hasVariation: true
      });

      // Create product variation combinations
      const redSmall = await productVariationRepository.create({
        productSku: product.sku,
        selections: {
          [colorType.id]: redVariation.id,
          [sizeType.id]: smallVariation.id
        },
        weightOverride: 0.8, // Lighter for red
        dimensionsOverride: { height: 8, width: 8, depth: 8 } // Smaller for small
      });

      const redLarge = await productVariationRepository.create({
        productSku: product.sku,
        selections: {
          [colorType.id]: redVariation.id,
          [sizeType.id]: largeVariation.id
        },
        weightOverride: 0.8, // Lighter for red
        dimensionsOverride: { height: 12, width: 12, depth: 12 } // Larger for large
      });

      const blueSmall = await productVariationRepository.create({
        productSku: product.sku,
        selections: {
          [colorType.id]: blueVariation.id,
          [sizeType.id]: smallVariation.id
        },
        weightOverride: 1.2, // Heavier for blue
        dimensionsOverride: { height: 8, width: 8, depth: 8 } // Smaller for small
      });

      const blueLarge = await productVariationRepository.create({
        productSku: product.sku,
        selections: {
          [colorType.id]: blueVariation.id,
          [sizeType.id]: largeVariation.id
        },
        weightOverride: 1.2, // Heavier for blue
        dimensionsOverride: { height: 12, width: 12, depth: 12 } // Larger for large
      });

      // Verify all combinations were created
      const productVariations = await productVariationRepository.findByProduct(product.sku);
      expect(productVariations).toHaveLength(4);

      // Verify specific combinations
      expect(redSmall.weightOverride).toBe(0.8);
      expect(redSmall.dimensionsOverride?.height).toBe(8);
      expect(blueLarge.weightOverride).toBe(1.2);
      expect(blueLarge.dimensionsOverride?.height).toBe(12);
    });

    it('should prevent duplicate variation combinations', async () => {
      // Setup
      const colorType = await variationTypeRepository.create({
        name: 'Color',
        modifiesWeight: true,
        modifiesDimensions: false
      });

      const redVariation = await variationRepository.create({
        name: 'Red',
        variationTypeId: colorType.id
      });

      const product = await productRepository.create({
        sku: 'DUPLICATE-TEST',
        name: 'Duplicate Test Product',
        isComposite: false,
        hasVariation: true
      });

      // Create first variation
      await productVariationRepository.create({
        productSku: product.sku,
        selections: {
          [colorType.id]: redVariation.id
        }
      });

      // Try to create duplicate combination
      const existingVariations = await productVariationRepository.findByProduct(product.sku);
      const validation = VariationService.validateVariationCreation(
        {
          productSku: product.sku,
          selections: {
            [colorType.id]: redVariation.id // Same selection
          }
        },
        existingVariations,
        product
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('This variation combination already exists');
    });
  });

  describe('Weight and Dimension Overrides', () => {
    it('should calculate variation weight correctly', async () => {
      // Setup
      const colorType = await variationTypeRepository.create({
        name: 'Color',
        modifiesWeight: true,
        modifiesDimensions: false
      });

      const redVariation = await variationRepository.create({
        name: 'Red',
        variationTypeId: colorType.id
      });

      const product = await productRepository.create({
        sku: 'WEIGHT-TEST',
        name: 'Weight Test Product',
        weight: 1.0,
        isComposite: false,
        hasVariation: true
      });

      // Create variation with weight override
      const productVariation = await productVariationRepository.create({
        productSku: product.sku,
        selections: {
          [colorType.id]: redVariation.id
        },
        weightOverride: 1.5
      });

      // Calculate weight using service
      const calculatedWeight = VariationService.calculateVariationWeight(
        productVariation,
        product,
        [], // No composition items
        []  // No child products
      );

      expect(calculatedWeight).toBe(1.5); // Should use override
    });

    it('should fall back to product weight when no override', async () => {
      // Setup
      const colorType = await variationTypeRepository.create({
        name: 'Color',
        modifiesWeight: false, // Doesn't modify weight
        modifiesDimensions: false
      });

      const redVariation = await variationRepository.create({
        name: 'Red',
        variationTypeId: colorType.id
      });

      const product = await productRepository.create({
        sku: 'FALLBACK-TEST',
        name: 'Fallback Test Product',
        weight: 2.0,
        isComposite: false,
        hasVariation: true
      });

      // Create variation without weight override
      const productVariation = await productVariationRepository.create({
        productSku: product.sku,
        selections: {
          [colorType.id]: redVariation.id
        }
        // No weightOverride
      });

      // Calculate weight using service
      const calculatedWeight = VariationService.calculateVariationWeight(
        productVariation,
        product,
        [], // No composition items
        []  // No child products
      );

      expect(calculatedWeight).toBe(2.0); // Should use product base weight
    });
  });

  describe('Composite Variations', () => {
    it('should handle composite products with variations', async () => {
      // Create child products
      const child1 = await productRepository.create({
        sku: 'COMP-VAR-CHILD-1',
        name: 'Composite Variation Child 1',
        weight: 1.0,
        isComposite: false,
        hasVariation: false
      });

      const child2 = await productRepository.create({
        sku: 'COMP-VAR-CHILD-2',
        name: 'Composite Variation Child 2',
        weight: 2.0,
        isComposite: false,
        hasVariation: false
      });

      // Create composite product with variations
      const product = await productRepository.create({
        sku: 'COMP-VAR-PARENT',
        name: 'Composite Variable Product',
        weight: 1.0, // Changed from 0 to 1.0
        isComposite: true,
        hasVariation: true
      });

      // Create variations for composite product
      const basicVariation = await productVariationRepository.create({
        productSku: product.sku,
        selections: { [crypto.randomUUID()]: crypto.randomUUID() }, // Unique selections
        name: 'Basic Variation'
      });

      const premiumVariation = await productVariationRepository.create({
        productSku: product.sku,
        selections: { [crypto.randomUUID()]: crypto.randomUUID() }, // Unique selections
        name: 'Premium Variation'
      });

      // Verify composite variations were created
      const variations = await productVariationRepository.findByProduct(product.sku);
      expect(variations).toHaveLength(2);

      // Verify validation for composite variations
      const validation = VariationService.validateVariationCreation(
        {
          productSku: product.sku,
          selections: { 'some-type': 'some-value' } // Should not have selections
        },
        [],
        product
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Composite variations should not have traditional variation selections');
    });
  });

  describe('Variation Ordering and Management', () => {
    it('should generate automatic variation names', async () => {
      const product = await productRepository.create({
        sku: 'AUTO-NAME-TEST',
        name: 'Auto Name Test',
        isComposite: true,
        hasVariation: true
      });

      // Create some variations with unique names
      const variation1 = await productVariationRepository.create({
        productSku: product.sku,
        selections: { [crypto.randomUUID()]: crypto.randomUUID() },
        name: 'Variation 1'
      });

      const variation2 = await productVariationRepository.create({
        productSku: product.sku,
        selections: { [crypto.randomUUID()]: crypto.randomUUID() },
        name: 'Variation 2'
      });

      const variation3 = await productVariationRepository.create({
        productSku: product.sku,
        selections: { [crypto.randomUUID()]: crypto.randomUUID() },
        name: 'Variation 3'
      });

      const existingVariations = [variation1, variation2, variation3];

      // Generate next name
      const nextName = VariationService.generateVariationName(existingVariations);
      expect(nextName).toBe('Variation 4');

      // Test with custom prefix
      const customName = VariationService.generateVariationName(existingVariations, 'Kit');
      expect(customName).toBe('Kit 1'); // Should start from 1 since no "Kit X" names exist
    });

    it('should validate variation ordering', async () => {
      const product = await productRepository.create({
        sku: 'ORDER-TEST',
        name: 'Order Test',
        isComposite: true,
        hasVariation: true
      });

      const variations = await Promise.all([
        productVariationRepository.create({
          productSku: product.sku,
          selections: {}
        }),
        productVariationRepository.create({
          productSku: product.sku,
          selections: {}
        }),
        productVariationRepository.create({
          productSku: product.sku,
          selections: {}
        })
      ]);

      const variationIds = variations.map(v => v.id);

      // Valid ordering
      const validOrder = [...variationIds];
      const validValidation = VariationService.validateVariationOrdering(variations, validOrder);
      expect(validValidation.valid).toBe(true);

      // Invalid ordering (missing ID)
      const invalidOrder = variationIds.slice(0, 2); // Missing one ID
      const invalidValidation = VariationService.validateVariationOrdering(variations, invalidOrder);
      expect(invalidValidation.valid).toBe(false);
      expect(invalidValidation.errors).toContain('Order must include all variations');

      // Invalid ordering (extra ID)
      const extraOrder = [...variationIds, 'non-existent-id'];
      const extraValidation = VariationService.validateVariationOrdering(variations, extraOrder);
      expect(extraValidation.valid).toBe(false);
      expect(extraValidation.errors).toContain('Unknown variation ID: non-existent-id');
    });
  });

  describe('Minimum Variation Requirements', () => {
    it('should validate minimum variation requirements', async () => {
      const product = await productRepository.create({
        sku: 'MIN-VAR-TEST',
        name: 'Minimum Variation Test',
        isComposite: false,
        hasVariation: true
      });

      // Test with no variations (should fail)
      const noVariationsValidation = VariationService.validateMinimumVariations([], product);
      expect(noVariationsValidation.valid).toBe(false);
      expect(noVariationsValidation.errors).toContain('Products with variations must have at least one variation');

      // Create a variation
      const variation = await productVariationRepository.create({
        productSku: product.sku,
        selections: {}
      });

      // Test with one variation (should pass)
      const withVariationValidation = VariationService.validateMinimumVariations([variation], product);
      expect(withVariationValidation.valid).toBe(true);
      expect(withVariationValidation.errors).toHaveLength(0);
    });
  });
});
