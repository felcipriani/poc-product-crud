import {
  Product,
  CreateProductData,
  UpdateProductData,
  // ProductBusinessRules, // TODO: Implement this class
} from '../entities/product';
import { ProductRepository } from '../../storage/repositories/product-repository';
import { ProductVariationItemRepository } from '../../storage/repositories/product-variation-item-repository';
import { CompositionItemRepository } from '../../storage/repositories/composition-item-repository';
import { ValidationError, BusinessRuleError, StorageError } from '../../utils/error-handling';

export class ProductService {
  constructor(
    private productRepository: ProductRepository,
    private variationItemRepository: ProductVariationItemRepository,
    private compositionItemRepository: CompositionItemRepository
  ) {}

  /**
   * Creates a new product with business rule validation
   */
  async createProduct(data: CreateProductData): Promise<Product> {
    try {
      // Validate business rules
      await this.validateProductCreation(data);

      // Create the product
      const product = await this.productRepository.create(data);

      return product;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof BusinessRuleError) {
        throw error;
      }
      throw new StorageError(
        `Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'create',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Updates an existing product with business rule validation
   */
  async updateProduct(sku: string, data: UpdateProductData): Promise<Product> {
    try {
      // Validate business rules
      await this.validateProductUpdate(sku, data);

      // Update the product
      const product = await this.productRepository.update(sku, data);

      return product;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof BusinessRuleError) {
        throw error;
      }
      throw new StorageError(
        `Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'update',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Deletes a product with constraint validation
   */
  async deleteProduct(sku: string): Promise<void> {
    try {
      // Validate deletion constraints
      await this.validateProductDeletion(sku);

      // Delete related data first
      await this.variationItemRepository.deleteByProduct(sku);
      await this.compositionItemRepository.deleteByParent(sku);

      // Delete the product
      await this.productRepository.delete(sku);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof BusinessRuleError) {
        throw error;
      }
      throw new StorageError(
        `Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'delete',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Gets a product by SKU
   */
  async getProduct(sku: string): Promise<Product | null> {
    return this.productRepository.findBySku(sku);
  }

  /**
   * Gets all products
   */
  async getAllProducts(): Promise<Product[]> {
    return this.productRepository.findAll();
  }

  /**
   * Searches products by query
   */
  async searchProducts(query: string): Promise<Product[]> {
    return this.productRepository.search(query);
  }

  /**
   * Gets products by type filters
   */
  async getProductsByType(filters: {
    isComposite?: boolean;
    hasVariation?: boolean;
  }): Promise<Product[]> {
    return this.productRepository.findByType(filters);
  }

  /**
   * Gets products eligible for composition (non-variable products)
   */
  async getCompositionEligibleProducts(): Promise<Product[]> {
    return this.productRepository.findCompositionEligible();
  }

  /**
   * Gets the effective weight for a product
   * For composite products, calculates from composition items
   * For products with variations, uses base weight unless overridden
   */
  async getEffectiveWeight(sku: string): Promise<number | undefined> {
    const product = await this.productRepository.findBySku(sku);
    if (!product) {
      throw new Error(`Product with SKU '${sku}' not found`);
    }

    if (product.isComposite) {
      return this.calculateCompositeWeight(sku);
    }

    return product.weight;
  }

  /**
   * Calculates the total weight of a composite product
   */
  async calculateCompositeWeight(parentSku: string): Promise<number> {
    const compositionItems = await this.compositionItemRepository.findByParent(parentSku);
    
    if (compositionItems.length === 0) {
      return 0;
    }

    let totalWeight = 0;

    for (const item of compositionItems) {
      const childWeight = await this.getEffectiveWeight(item.childSku);
      if (childWeight !== undefined) {
        totalWeight += childWeight * item.quantity;
      }
    }

    return totalWeight;
  }

  /**
   * Validates product creation business rules
   */
  private async validateProductCreation(data: CreateProductData): Promise<void> {
    // Check SKU uniqueness
    const existingProduct = await this.productRepository.findBySku(data.sku);
    if (existingProduct) {
      throw new ValidationError(`Product with SKU '${data.sku}' already exists`, 'sku', 'unique');
    }

    // Validate composite weight rule
    if (data.isComposite && data.weight !== undefined) {
      throw new BusinessRuleError(
        'Composite products should not have a weight specified - it will be calculated from components',
        'composite_weight_rule',
        { sku: data.sku, weight: data.weight }
      );
    }

    // Validate SKU format
    if (!data.sku || typeof data.sku !== 'string') {
      throw new ValidationError('SKU is required and must be a string', 'sku', 'required');
    }

    // Validate name
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      throw new ValidationError('Product name is required', 'name', 'required');
    }

    // Validate weight if provided
    if (data.weight !== undefined && (typeof data.weight !== 'number' || data.weight <= 0)) {
      throw new ValidationError('Weight must be a positive number', 'weight', 'positive');
    }

    // Validate dimensions if provided
    if (data.dimensions) {
      const { height, width, depth } = data.dimensions;
      if (height !== undefined && (typeof height !== 'number' || height <= 0)) {
        throw new ValidationError('Height must be a positive number', 'dimensions.height', 'positive');
      }
      if (width !== undefined && (typeof width !== 'number' || width <= 0)) {
        throw new ValidationError('Width must be a positive number', 'dimensions.width', 'positive');
      }
      if (depth !== undefined && (typeof depth !== 'number' || depth <= 0)) {
        throw new ValidationError('Depth must be a positive number', 'dimensions.depth', 'positive');
      }
    }
  }

  /**
   * Validates product update business rules
   */
  private async validateProductUpdate(sku: string, data: UpdateProductData): Promise<void> {
    const existingProduct = await this.productRepository.findBySku(sku);
    if (!existingProduct) {
      throw new ValidationError(`Product with SKU '${sku}' not found`, 'sku', 'not_found');
    }

    const updatedProduct = { ...existingProduct, ...data };

    // Validate composite weight rule
    if (updatedProduct.isComposite && updatedProduct.weight !== undefined) {
      throw new BusinessRuleError(
        'Composite products should not have a weight specified - it will be calculated from components',
        'composite_weight_rule',
        { sku, weight: updatedProduct.weight }
      );
    }

    // Validate name if provided
    if (data.name !== undefined && (!data.name || data.name.trim().length === 0)) {
      throw new ValidationError('Product name cannot be empty', 'name', 'required');
    }

    // Validate weight if provided
    if (data.weight !== undefined && (typeof data.weight !== 'number' || data.weight <= 0)) {
      throw new ValidationError('Weight must be a positive number', 'weight', 'positive');
    }

    // Validate dimensions if provided
    if (data.dimensions) {
      const { height, width, depth } = data.dimensions;
      if (height !== undefined && (typeof height !== 'number' || height <= 0)) {
        throw new ValidationError('Height must be a positive number', 'dimensions.height', 'positive');
      }
      if (width !== undefined && (typeof width !== 'number' || width <= 0)) {
        throw new ValidationError('Width must be a positive number', 'dimensions.width', 'positive');
      }
      if (depth !== undefined && (typeof depth !== 'number' || depth <= 0)) {
        throw new ValidationError('Depth must be a positive number', 'dimensions.depth', 'positive');
      }
    }

    // If changing hasVariation flag, validate constraints
    if (data.hasVariation !== undefined && data.hasVariation !== existingProduct.hasVariation) {
      await this.validateVariationFlagChange(sku, data.hasVariation);
    }

    // If changing isComposite flag, validate constraints
    if (data.isComposite !== undefined && data.isComposite !== existingProduct.isComposite) {
      await this.validateCompositeFlagChange(sku, data.isComposite);
    }
  }

  /**
   * Validates product deletion constraints
   */
  private async validateProductDeletion(sku: string): Promise<void> {
    const product = await this.productRepository.findBySku(sku);
    if (!product) {
      throw new ValidationError(`Product with SKU '${sku}' not found`, 'sku', 'not_found');
    }

    // Check if product is used in any compositions as a child
    const usageAsChild = await this.compositionItemRepository.countByChild(sku);
    if (usageAsChild > 0) {
      throw new BusinessRuleError(
        `Cannot delete product '${sku}': it is used in ${usageAsChild} composition(s). Remove it from compositions first.`,
        'referential_integrity',
        { sku, usageCount: usageAsChild }
      );
    }
  }

  /**
   * Validates changing the hasVariation flag
   */
  private async validateVariationFlagChange(sku: string, newHasVariation: boolean): Promise<void> {
    const variationCount = await this.variationItemRepository.countByProduct(sku);

    if (newHasVariation && variationCount === 0) {
      // Enabling variations is allowed even without existing variations
      return;
    }

    if (!newHasVariation && variationCount > 0) {
      throw new BusinessRuleError(
        `Cannot disable variations for product '${sku}': ${variationCount} variation combinations exist. Delete them first.`,
        'variation_flag_constraint',
        { sku, variationCount }
      );
    }
  }

  /**
   * Validates changing the isComposite flag
   */
  private async validateCompositeFlagChange(sku: string, newIsComposite: boolean): Promise<void> {
    const compositionCount = await this.compositionItemRepository.countByParent(sku);

    if (newIsComposite && compositionCount === 0) {
      // Enabling composite is allowed even without existing compositions
      return;
    }

    if (!newIsComposite && compositionCount > 0) {
      throw new BusinessRuleError(
        `Cannot disable composite for product '${sku}': ${compositionCount} composition items exist. Delete them first.`,
        'composite_flag_constraint',
        { sku, compositionCount }
      );
    }
  }

  /**
   * Validates that a product meets its business rule requirements
   */
  async validateProductConstraints(sku: string): Promise<void> {
    const product = await this.productRepository.findBySku(sku);
    if (!product) {
      throw new Error(`Product with SKU '${sku}' not found`);
    }

    // Validate variation requirement
    if (product.hasVariation) {
      const variationCount = await this.variationItemRepository.countByProduct(sku);
      // TODO: Validate variation requirement
      if (variationCount === 0) {
        throw new Error('Products with hasVariation=true must have at least one variation combination');
      }
    }

    // Validate composition requirement
    if (product.isComposite) {
      const compositionCount = await this.compositionItemRepository.countByParent(sku);
      // TODO: Validate composition requirement
      if (compositionCount === 0) {
        throw new Error('Products with isComposite=true must have at least one composition item');
      }
    }
  }

  /**
   * Gets product statistics
   */
  async getProductStats(): Promise<{
    total: number;
    simple: number;
    withVariations: number;
    composite: number;
    compositeWithVariations: number;
  }> {
    const allProducts = await this.productRepository.findAll();

    const stats = {
      total: allProducts.length,
      simple: 0,
      withVariations: 0,
      composite: 0,
      compositeWithVariations: 0,
    };

    for (const product of allProducts) {
      if (product.isComposite && product.hasVariation) {
        stats.compositeWithVariations++;
      } else if (product.isComposite) {
        stats.composite++;
      } else if (product.hasVariation) {
        stats.withVariations++;
      } else {
        stats.simple++;
      }
    }

    return stats;
  }

  /**
   * Checks if a product can be used in compositions
   */
  async canBeUsedInComposition(sku: string): Promise<boolean> {
    const product = await this.productRepository.findBySku(sku);
    if (!product) {
      return false;
    }

    // Variable products cannot be used directly in compositions
    return !product.hasVariation;
  }

  /**
   * Gets products that depend on a given product (use it in compositions)
   */
  async getDependentProducts(sku: string): Promise<string[]> {
    return this.compositionItemRepository.getParentsUsingChild(sku);
  }

  /**
   * Gets products that a given product depends on (its composition children)
   */
  async getProductDependencies(sku: string): Promise<string[]> {
    return this.compositionItemRepository.getChildrenOfParent(sku);
  }
}