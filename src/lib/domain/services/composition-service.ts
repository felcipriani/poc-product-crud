import { CompositionItem, CreateCompositionItemData, UpdateCompositionItemData } from '../entities/composition-item';
import { Product } from '../entities/product';
import { ProductVariationItem } from '../entities/product-variation-item';
import { CompositionItemRepository } from '../../storage/repositories/composition-item-repository';
import { ProductRepository } from '../../storage/repositories/product-repository';
import { ProductVariationItemRepository } from '../../storage/repositories/product-variation-item-repository';

/**
 * Enhanced composition service with variation support
 * Handles both traditional composition and variation-scoped composition
 */
export class CompositionService {
  private compositionItemRepository: CompositionItemRepository;
  private productRepository: ProductRepository;
  private variationItemRepository: ProductVariationItemRepository;

  constructor(
    compositionItemRepository?: CompositionItemRepository,
    productRepository?: ProductRepository,
    variationItemRepository?: ProductVariationItemRepository
  ) {
    this.compositionItemRepository = compositionItemRepository || new CompositionItemRepository();
    this.productRepository = productRepository || new ProductRepository();
    this.variationItemRepository = variationItemRepository || new ProductVariationItemRepository();
  }

  /**
   * Get composition items for a product
   */
  async getCompositionItems(productSku: string): Promise<CompositionItem[]> {
    return this.compositionItemRepository.findByParent(productSku);
  }

  /**
   * Get available items for composition
   */
  async getCompositionAvailableItems(): Promise<any[]> {
    const allProducts = await this.productRepository.findAll();
    return allProducts
      .filter(p => !p.isComposite || !p.hasVariation) // Only simple products or non-variable composites
      .map(p => ({
        id: p.sku,
        sku: p.sku,
        displayName: p.name,
        weight: p.weight,
        type: p.isComposite ? 'composite' as const : 'simple' as const
      }));
  }

  /**
   * Calculate composite weight for a product
   */
  async calculateCompositeWeight(productSku: string, options: any = {}): Promise<number> {
    return this.compositionItemRepository.calculateCompositeWeight(productSku, options);
  }

  /**
   * Create a composition item
   */
  async createCompositionItem(data: CreateCompositionItemData): Promise<CompositionItem> {
    return this.compositionItemRepository.create(data);
  }

  /**
   * Update a composition item
   */
  async updateCompositionItem(id: string, data: UpdateCompositionItemData): Promise<CompositionItem> {
    return this.compositionItemRepository.update(id, data);
  }

  /**
   * Delete a composition item
   */
  async deleteCompositionItem(id: string): Promise<void> {
    return this.compositionItemRepository.delete(id);
  }

  /**
   * Get composition tree for a product
   */
  async getCompositionTree(productSku: string): Promise<CompositionTreeNode | null> {
    try {
      const compositionItems = await this.getCompositionItems(productSku);
      const products = await this.productRepository.findAll();
      return CompositionService.buildCompositionTree(productSku, compositionItems, products);
    } catch (err) {
      console.error('Error building composition tree:', err);
      return null;
    }
  }

  /**
   * Validate composition complexity
   */
  async validateCompositionComplexity(productSku: string): Promise<any> {
    try {
      const compositionItems = await this.getCompositionItems(productSku);
      const products = await this.productRepository.findAll();
      
      return CompositionService.validateVariationComposition(
        productSku,
        'default',
        compositionItems,
        products
      );
    } catch (err) {
      console.error('Error validating composition complexity:', err);
      return {
        valid: false,
        errors: ['Failed to validate composition complexity']
      };
    }
  }

  /**
   * Calculate weight for a product considering variations
   */
  static calculateProductWeight(
    product: Product,
    compositionItems: CompositionItem[],
    variations: ProductVariationItem[] = [],
    childProducts: Product[] = []
  ): number {
    // If product has variations, weight depends on selected variation
    if (product.hasVariation && variations.length > 0) {
      // For products with variations, weight is calculated per variation
      // This method calculates base weight - specific variation weight should be calculated separately
      return 0;
    }

    // If product is composite, calculate from composition items
    if (product.isComposite && compositionItems.length > 0) {
      return compositionItems.reduce((total, item) => {
        const childProduct = childProducts.find(p => p.sku === item.childSku);
        const childWeight = childProduct?.weight || 0;
        return total + (childWeight * item.quantity);
      }, 0);
    }

    // Return product's own weight
    return product.weight || 0;
  }

  /**
   * Calculate weight for a specific variation
   */
  static calculateVariationWeight(
    product: Product,
    variation: ProductVariationItem,
    compositionItems: CompositionItem[],
    childProducts: Product[] = []
  ): number {
    // If variation has weight override, use it
    if (variation.weightOverride !== undefined) {
      return variation.weightOverride;
    }

    // If product is composite, calculate from variation's composition items
    if (product.isComposite) {
      const variationSku = `${product.sku}#${variation.id}`;
      const variationItems = compositionItems.filter(item => item.parentSku === variationSku);
      
      return variationItems.reduce((total, item) => {
        const childProduct = childProducts.find(p => p.sku === item.childSku);
        const childWeight = childProduct?.weight || 0;
        return total + (childWeight * item.quantity);
      }, 0);
    }

    // Fallback to product's base weight
    return product.weight || 0;
  }

  /**
   * Validate composition item for creation
   */
  static validateCompositionItem(
    itemData: CreateCompositionItemData,
    existingItems: CompositionItem[],
    availableProducts: Product[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if child product exists
    const childProduct = availableProducts.find(p => p.sku === itemData.childSku);
    if (!childProduct) {
      errors.push(`Product with SKU "${itemData.childSku}" not found`);
    }

    // Check for duplicate child SKU in same parent
    const duplicate = existingItems.find(item => 
      item.parentSku === itemData.parentSku && 
      item.childSku === itemData.childSku
    );
    if (duplicate) {
      errors.push(`Product "${itemData.childSku}" is already in this composition`);
    }

    // Validate quantity
    if (itemData.quantity <= 0) {
      errors.push('Quantity must be greater than zero');
    }

    // Check for circular dependencies
    if (this.wouldCreateCircularDependency(itemData.parentSku, itemData.childSku, existingItems)) {
      errors.push('This would create a circular dependency');
    }

    // Check if child product has variations (should use specific variation SKU)
    if (childProduct?.hasVariation && !itemData.childSku.includes('#')) {
      errors.push(`Product "${itemData.childSku}" has variations. Please select a specific variation.`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check for circular dependencies in composition
   */
  static wouldCreateCircularDependency(
    parentSku: string,
    childSku: string,
    existingItems: CompositionItem[]
  ): boolean {
    // Extract base SKU (remove variation suffix if present)
    const baseParentSku = parentSku.split('#')[0];
    const baseChildSku = childSku.split('#')[0];

    // Direct circular dependency
    if (baseParentSku === baseChildSku) {
      return true;
    }

    // Indirect circular dependency - check if parent is used as child somewhere in child's composition
    const childCompositionItems = existingItems.filter(item => 
      item.parentSku.startsWith(baseChildSku)
    );

    for (const item of childCompositionItems) {
      const itemBaseSku = item.childSku.split('#')[0];
      if (itemBaseSku === baseParentSku) {
        return true;
      }
      
      // Recursive check
      if (this.wouldCreateCircularDependency(baseParentSku, item.childSku, existingItems)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get composition tree for a product
   */
  static buildCompositionTree(
    productSku: string,
    compositionItems: CompositionItem[],
    products: Product[],
    maxDepth: number = 5
  ): CompositionTreeNode {
    const product = products.find(p => p.sku === productSku);
    if (!product) {
      throw new Error(`Product not found: ${productSku}`);
    }

    return this.buildCompositionTreeRecursive(productSku, compositionItems, products, 0, maxDepth);
  }

  private static buildCompositionTreeRecursive(
    productSku: string,
    compositionItems: CompositionItem[],
    products: Product[],
    currentDepth: number,
    maxDepth: number
  ): CompositionTreeNode {
    const product = products.find(p => p.sku === productSku);
    if (!product) {
      throw new Error(`Product not found: ${productSku}`);
    }

    const node: CompositionTreeNode = {
      sku: productSku,
      name: product.name,
      weight: product.weight || 0,
      quantity: 1,
      children: []
    };

    // Prevent infinite recursion
    if (currentDepth >= maxDepth) {
      return node;
    }

    // Get composition items for this product
    const items = compositionItems.filter(item => item.parentSku === productSku);
    
    for (const item of items) {
      const childNode = this.buildCompositionTreeRecursive(
        item.childSku,
        compositionItems,
        products,
        currentDepth + 1,
        maxDepth
      );
      
      childNode.quantity = item.quantity;
      node.children.push(childNode);
    }

    return node;
  }

  /**
   * Calculate total weight of composition tree
   */
  static calculateTreeWeight(tree: CompositionTreeNode): number {
    let totalWeight = tree.weight * tree.quantity;
    
    for (const child of tree.children) {
      totalWeight += this.calculateTreeWeight(child);
    }
    
    return totalWeight;
  }

  /**
   * Validate composition constraints for variations
   */
  static validateVariationComposition(
    productSku: string,
    variationId: string,
    compositionItems: CompositionItem[],
    products: Product[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const variationSku = `${productSku}#${variationId}`;
    const variationItems = compositionItems.filter(item => item.parentSku === variationSku);

    // Check minimum items requirement
    if (variationItems.length === 0) {
      errors.push('Variation must have at least one composition item');
    }

    // Validate each item
    for (const item of variationItems) {
      const validation = this.validateCompositionItem(
        {
          parentSku: item.parentSku,
          childSku: item.childSku,
          quantity: item.quantity
        },
        variationItems.filter(vi => vi.id !== item.id),
        products
      );

      if (!validation.valid) {
        errors.push(...validation.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export interface CompositionTreeNode {
  sku: string;
  name: string;
  weight: number;
  quantity: number;
  children: CompositionTreeNode[];
}
