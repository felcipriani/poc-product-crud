import {
  CompositionItem,
  CreateCompositionItemData,
  UpdateCompositionItemData,
  // CompositionItemBusinessRules, // TODO: Implement this class
} from "../entities/composition-item";
import { Product } from "../entities/product";
import { CompositionItemRepository } from "../../storage/repositories/composition-item-repository";
import { ProductRepository } from "../../storage/repositories/product-repository";
import { ProductVariationItemRepository } from "../../storage/repositories/product-variation-item-repository";

export class CompositionService {
  constructor(
    private compositionItemRepository: CompositionItemRepository,
    private productRepository: ProductRepository,
    private variationItemRepository: ProductVariationItemRepository
  ) {}

  /**
   * Creates a new composition item with business rule validation
   */
  async createCompositionItem(
    data: CreateCompositionItemData
  ): Promise<CompositionItem> {
    // Validate business rules
    await this.validateCompositionItemCreation(data);

    // Create the composition item
    const compositionItem = await this.compositionItemRepository.create(data);

    return compositionItem;
  }

  /**
   * Updates an existing composition item with business rule validation
   */
  async updateCompositionItem(
    id: string,
    data: UpdateCompositionItemData
  ): Promise<CompositionItem> {
    // Validate business rules
    await this.validateCompositionItemUpdate(id, data);

    // Update the composition item
    const compositionItem = await this.compositionItemRepository.update(
      id,
      data
    );

    return compositionItem;
  }

  /**
   * Deletes a composition item
   */
  async deleteCompositionItem(id: string): Promise<void> {
    await this.compositionItemRepository.delete(id);
  }

  /**
   * Gets all composition items for a parent product
   */
  async getCompositionItems(parentSku: string): Promise<CompositionItem[]> {
    return this.compositionItemRepository.findByParent(parentSku);
  }

  /**
   * Gets all composition items
   */
  async getAllCompositionItems(): Promise<CompositionItem[]> {
    return this.compositionItemRepository.findAll();
  }

  /**
   * Gets compositions grouped by parent
   */
  async getCompositionsGroupedByParent(): Promise<
    Record<string, CompositionItem[]>
  > {
    return this.compositionItemRepository.findGroupedByParent();
  }

  /**
   * Calculates the total weight of a composite product
   */
  async calculateCompositeWeight(parentSku: string): Promise<number> {
    const compositionItems =
      await this.compositionItemRepository.findByParent(parentSku);

    if (!compositionItems || compositionItems.length === 0) {
      return 0;
    }

    let totalWeight = 0;

    for (const item of compositionItems) {
      const childWeight = await this.getChildProductWeight(item.childSku);
      if (childWeight !== undefined) {
        totalWeight += childWeight * item.quantity;
      }
    }

    return totalWeight;
  }

  /**
   * Gets the effective weight of a child product
   * Handles both simple products and specific variation combinations
   */
  private async getChildProductWeight(
    childSku: string
  ): Promise<number | undefined> {
    // Check if this is a variation SKU (contains variation identifiers)
    if (childSku.includes("-VAR-") || childSku.includes(":")) {
      // This is a specific variation combination
      // In a real implementation, you'd need to parse the variation SKU
      // and get the weight from the variation item
      // For now, we'll assume the SKU format allows us to extract the parent
      const parentSku = childSku.split(/[-VAR-|:]/)[0];
      const parentProduct = await this.productRepository.findBySku(parentSku);

      if (parentProduct) {
        // In a real implementation, you'd find the specific variation item
        // and return its effective weight (override or base weight)
        return parentProduct.weight;
      }
    } else {
      // This is a simple product
      const childProduct = await this.productRepository.findBySku(childSku);
      if (childProduct) {
        if (childProduct.isComposite) {
          // Recursive calculation for nested composites
          return this.calculateCompositeWeight(childSku);
        }
        return childProduct.weight;
      }
    }

    return undefined;
  }

  /**
   * Gets products that can be used in compositions
   * Implements Requirement 6.6: Show only valid products for composition
   * - Simple products: Show as-is
   * - Variable products: Excluded (use getVariationCombinationsForComposition instead)
   * - Composite products: Show as-is (can nest composites)
   */
  async getCompositionEligibleProducts(): Promise<Product[]> {
    return this.productRepository.findCompositionEligible();
  }

  /**
   * Gets all available items for composition selection
   * Implements Requirements 6.2, 6.3, 6.6: Show appropriate options based on product type
   */
  async getCompositionAvailableItems(): Promise<
    Array<{
      id: string;
      sku: string;
      displayName: string;
      weight?: number;
      type: "simple" | "composite" | "variation";
      parentSku?: string;
    }>
  > {
    const allProducts = await this.productRepository.findAll();
    const availableItems: Array<{
      id: string;
      sku: string;
      displayName: string;
      weight?: number;
      type: "simple" | "composite" | "variation";
      parentSku?: string;
    }> = [];

    for (const product of allProducts) {
      if (product.hasVariation) {
        // For variable products, show individual variations only (Requirement 6.2)
        const variations = await this.getVariationCombinationsForComposition(
          product.sku
        );
        availableItems.push(
          ...variations.map((v) => ({
            id: v.id,
            sku: v.sku,
            displayName: v.displayName || `${product.name} (Variation)`,
            weight: v.weight,
            type: "variation" as const,
            parentSku: product.sku,
          }))
        );
      } else {
        // For simple and composite products, show as-is (Requirement 6.6)
        availableItems.push({
          id: product.sku,
          sku: product.sku,
          displayName: product.name,
          weight: product.weight,
          type: product.isComposite ? "composite" : "simple",
        });
      }
    }

    return availableItems.sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    );
  }

  /**
   * Gets specific variation combinations that can be used in compositions
   * For products with hasVariation=true, returns their variation items
   * Implements Requirement 6.3: Show specific variations for variable products
   */
  async getVariationCombinationsForComposition(productSku: string): Promise<
    Array<{
      id: string;
      sku: string;
      displayName: string;
      weight?: number;
    }>
  > {
    const product = await this.productRepository.findBySku(productSku);
    if (!product || !product.hasVariation) {
      return [];
    }

    const variationItems =
      await this.variationItemRepository.findByProduct(productSku);

    // Convert variation items to composition-eligible format
    return variationItems.map((item) => ({
      id: item.id,
      sku: `${productSku}#${item.id}`, // Generate variation SKU
      displayName: this.generateVariationDisplayName(product, item),
      weight: this.variationItemRepository.getEffectiveWeight(
        item,
        product.weight
      ),
    }));
  }

  /**
   * Generates a human-readable display name for a variation combination
   */
  private generateVariationDisplayName(
    product: Product,
    variationItem: any
  ): string {
    // In a real implementation, this would look up variation type and variation names
    // For now, use a simplified format
    const variationCount = Object.keys(variationItem.selections || {}).length;
    return `${product.name} (${variationCount} variation${variationCount !== 1 ? "s" : ""})`;
  }

  /**
   * Validates that a product can be used as a child in compositions
   * Implements Requirement 6.1: Variable parent products cannot be used directly in compositions
   */
  async validateChildProductEligibility(childSku: string): Promise<void> {
    // Check if it's a variation SKU (format: PRODUCT-SKU#VARIATION-ID or PRODUCT-SKU:variation)
    if (this.isVariationSku(childSku)) {
      // Variation SKUs are allowed - validate the variation exists
      await this.validateVariationSku(childSku);
      return;
    }

    // Check if it's a simple product (not variable)
    const product = await this.productRepository.findBySku(childSku);
    if (!product) {
      throw new Error(`Product with SKU '${childSku}' not found`);
    }

    // Requirement 6.1: Variable products cannot be used directly in compositions
    if (product.hasVariation) {
      throw new Error(
        `Variable products cannot be used directly in compositions. ` +
          `Product '${childSku}' has variations - use specific variation combinations instead.`
      );
    }

    // Composite products can be nested (Requirement 6.6)
    // No additional validation needed for composite products
  }

  /**
   * Checks if a SKU represents a variation (contains variation identifier)
   */
  private isVariationSku(sku: string): boolean {
    return sku.includes("#") || sku.includes(":") || sku.includes("-VAR-");
  }

  /**
   * Validates that a variation SKU is valid and the variation exists
   */
  private async validateVariationSku(variationSku: string): Promise<void> {
    const { productSku, variationId } = this.parseVariationSku(variationSku);

    // Validate the base product exists and has variations
    const product = await this.productRepository.findBySku(productSku);
    if (!product) {
      throw new Error(
        `Base product '${productSku}' not found for variation SKU '${variationSku}'`
      );
    }

    if (!product.hasVariation) {
      throw new Error(`Product '${productSku}' does not have variations`);
    }

    // Validate the specific variation exists
    const variation = await this.variationItemRepository.findById(variationId);
    if (!variation) {
      throw new Error(
        `Variation '${variationId}' not found for product '${productSku}'`
      );
    }

    if (variation.productSku !== productSku) {
      throw new Error(
        `Variation '${variationId}' does not belong to product '${productSku}'`
      );
    }
  }

  /**
   * Parses a variation SKU to extract product SKU and variation ID
   */
  private parseVariationSku(variationSku: string): {
    productSku: string;
    variationId: string;
  } {
    // Handle format: PRODUCT-SKU#VARIATION-ID
    if (variationSku.includes("#")) {
      const [productSku, variationId] = variationSku.split("#");
      return { productSku, variationId };
    }

    // Handle format: PRODUCT-SKU:variation-name (legacy)
    if (variationSku.includes(":")) {
      const [productSku, variationName] = variationSku.split(":");
      // For legacy format, we'd need to look up by name, but for now throw error
      throw new Error(
        `Legacy variation SKU format not supported: '${variationSku}'. Use format 'PRODUCT-SKU#VARIATION-ID'`
      );
    }

    // Handle format: PRODUCT-SKU-VAR-hash
    if (variationSku.includes("-VAR-")) {
      const parts = variationSku.split("-VAR-");
      if (parts.length !== 2) {
        throw new Error(`Invalid variation SKU format: '${variationSku}'`);
      }
      return { productSku: parts[0], variationId: parts[1] };
    }

    throw new Error(`Invalid variation SKU format: '${variationSku}'`);
  }

  /**
   * Gets the composition tree for a product (recursive)
   * Supports nested compositions (Requirement 6.6)
   */
  async getCompositionTree(
    parentSku: string,
    maxDepth = 10
  ): Promise<CompositionTree> {
    if (maxDepth <= 0) {
      throw new Error(
        "Maximum composition depth exceeded - possible circular dependency or excessive nesting"
      );
    }

    const product = await this.productRepository.findBySku(parentSku);
    if (!product) {
      throw new Error(`Product with SKU '${parentSku}' not found`);
    }

    const tree: CompositionTree = {
      sku: parentSku,
      name: product.name,
      weight: product.weight,
      isComposite: product.isComposite,
      hasVariation: product.hasVariation,
      children: [],
      depth: 10 - maxDepth + 1, // Track current depth
    };

    if (product.isComposite) {
      const compositionItems =
        await this.compositionItemRepository.findByParent(parentSku);

      for (const item of compositionItems) {
        let childSku = item.childSku;
        let childProduct: Product | null = null;

        // Handle variation SKUs
        if (this.isVariationSku(childSku)) {
          const { productSku } = this.parseVariationSku(childSku);
          childProduct = await this.productRepository.findBySku(productSku);

          if (!childProduct) {
            throw new Error(
              `Base product '${productSku}' not found for variation '${childSku}'`
            );
          }

          // For variations, create a simplified tree node
          const variationWeight = await this.getVariationWeight(childSku);
          tree.children.push({
            sku: childSku,
            name: `${childProduct.name} (Variation)`,
            weight: variationWeight,
            calculatedWeight: variationWeight,
            isComposite: false,
            hasVariation: false,
            children: [],
            quantity: item.quantity,
            totalWeight: (variationWeight || 0) * item.quantity,
            depth: (tree.depth || 0) + 1,
            isVariation: true,
            parentProductSku: productSku,
          });
        } else {
          // Regular product - recurse if composite
          childProduct = await this.productRepository.findBySku(childSku);
          if (!childProduct) {
            throw new Error(`Child product '${childSku}' not found`);
          }

          if (childProduct.isComposite) {
            // Recursive call for nested composite
            const childTree = await this.getCompositionTree(
              childSku,
              maxDepth - 1
            );
            tree.children.push({
              ...childTree,
              quantity: item.quantity,
              totalWeight: (childTree.calculatedWeight || 0) * item.quantity,
            });
          } else {
            // Simple product
            tree.children.push({
              sku: childSku,
              name: childProduct.name,
              weight: childProduct.weight,
              calculatedWeight: childProduct.weight || 0,
              isComposite: false,
              hasVariation: childProduct.hasVariation,
              children: [],
              quantity: item.quantity,
              totalWeight: (childProduct.weight || 0) * item.quantity,
              depth: (tree.depth || 0) + 1,
            });
          }
        }
      }

      // Calculate total weight from children
      tree.calculatedWeight = tree.children.reduce(
        (total, child) => total + (child.totalWeight || 0),
        0
      );
    } else {
      tree.calculatedWeight = product.weight || 0;
    }

    return tree;
  }

  /**
   * Gets the effective weight for a variation SKU
   */
  private async getVariationWeight(
    variationSku: string
  ): Promise<number | undefined> {
    if (!this.isVariationSku(variationSku)) {
      return undefined;
    }

    const { productSku, variationId } = this.parseVariationSku(variationSku);
    const product = await this.productRepository.findBySku(productSku);
    const variation = await this.variationItemRepository.findById(variationId);

    if (!product || !variation) {
      return undefined;
    }

    return this.variationItemRepository.getEffectiveWeight(
      variation,
      product.weight
    );
  }

  /**
   * Validates that nested compositions don't exceed reasonable limits
   */
  async validateCompositionComplexity(parentSku: string): Promise<{
    isValid: boolean;
    maxDepth: number;
    totalItems: number;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    try {
      const tree = await this.getCompositionTree(parentSku, 15); // Allow deeper for analysis
      const maxDepth = this.calculateTreeDepth(tree);
      const totalItems = this.countTreeItems(tree);

      // Check complexity thresholds
      if (maxDepth > 5) {
        warnings.push(
          `Composition depth of ${maxDepth} may impact performance`
        );
      }

      if (totalItems > 50) {
        warnings.push(
          `Total composition items (${totalItems}) may impact performance`
        );
      }

      return {
        isValid: maxDepth <= 10 && totalItems <= 100,
        maxDepth,
        totalItems,
        warnings,
      };
    } catch (error) {
      return {
        isValid: false,
        maxDepth: 0,
        totalItems: 0,
        warnings: [
          `Failed to analyze composition: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }

  /**
   * Counts total items in a composition tree
   */
  private countTreeItems(tree: CompositionTree): number {
    let count = 1; // Count this node
    for (const child of tree.children) {
      count += this.countTreeItems(child);
    }
    return count;
  }

  /**
   * Gets products that depend on a given product (use it in compositions)
   */
  async getDependentProducts(childSku: string): Promise<string[]> {
    return this.compositionItemRepository.getParentsUsingChild(childSku);
  }

  /**
   * Gets products that a given product depends on (its composition children)
   */
  async getProductDependencies(parentSku: string): Promise<string[]> {
    return this.compositionItemRepository.getChildrenOfParent(parentSku);
  }

  /**
   * Checks for circular dependencies in the composition hierarchy
   * Implements Requirement 10.4: Validate referential integrity
   */
  async hasCircularDependency(
    parentSku: string,
    childSku: string
  ): Promise<boolean> {
    // Extract base SKU if child is a variation
    const actualChildSku = this.isVariationSku(childSku)
      ? this.parseVariationSku(childSku).productSku
      : childSku;

    try {
      // Get the composition tree for the child
      const childTree = await this.getCompositionTree(actualChildSku);

      // Check if the parent appears anywhere in the child's tree
      return this.containsProduct(childTree, parentSku);
    } catch {
      // If we can't build the tree, assume no circular dependency
      return false;
    }
  }

  /**
   * Validates comprehensive referential integrity for compositions
   * Implements Requirement 10.4: Validate referential integrity
   */
  async validateReferentialIntegrity(
    parentSku: string,
    childSku: string
  ): Promise<void> {
    // 1. Validate parent product exists and is composite
    const parentProduct = await this.productRepository.findBySku(parentSku);
    if (!parentProduct) {
      throw new Error(`Parent product '${parentSku}' not found`);
    }
    if (!parentProduct.isComposite) {
      throw new Error(
        `Product '${parentSku}' is not marked as composite and cannot have composition items`
      );
    }

    // 2. Validate child product eligibility
    await this.validateChildProductEligibility(childSku);

    // 3. Check for circular dependencies
    const hasCircular = await this.hasCircularDependency(parentSku, childSku);
    if (hasCircular) {
      throw new Error(
        `Cannot add '${childSku}' to '${parentSku}': this would create a circular dependency in the composition hierarchy`
      );
    }

    // 4. Validate no duplicate child in same parent
    const existingItems =
      await this.compositionItemRepository.findByParent(parentSku);
    const duplicate = existingItems.find((item) => item.childSku === childSku);
    if (duplicate) {
      throw new Error(
        `Child '${childSku}' is already part of the composition for '${parentSku}'. ` +
          `Each child can only appear once in a composition.`
      );
    }

    // 5. Validate composition depth limits (prevent excessive nesting)
    const maxDepth = 10; // Configurable limit
    try {
      await this.getCompositionTree(parentSku, maxDepth);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Maximum composition depth")
      ) {
        throw new Error(
          `Adding '${childSku}' to '${parentSku}' would exceed the maximum composition depth of ${maxDepth} levels`
        );
      }
      throw error;
    }
  }

  /**
   * Helper method to check if a composition tree contains a specific product
   */
  private containsProduct(tree: CompositionTree, targetSku: string): boolean {
    if (tree.sku === targetSku) {
      return true;
    }

    return tree.children.some((child) =>
      this.containsProduct(child, targetSku)
    );
  }

  /**
   * Validates composition item creation business rules
   * Implements comprehensive validation for Requirements 6.1, 6.2, 6.3, 10.4
   */
  private async validateCompositionItemCreation(
    data: CreateCompositionItemData
  ): Promise<void> {
    // Validate no self-reference (basic business rule)
    if (data.parentSku === data.childSku) {
      throw new Error("A product cannot be composed of itself");
    }

    // Handle variation SKUs for self-reference check
    if (this.isVariationSku(data.childSku)) {
      const { productSku } = this.parseVariationSku(data.childSku);
      if (data.parentSku === productSku) {
        throw new Error("A product cannot be composed of its own variations");
      }
    }

    // Validate quantity bounds
    if (data.quantity <= 0) {
      throw new Error("Quantity must be a positive integer");
    }

    if (!Number.isInteger(data.quantity)) {
      throw new Error("Quantity must be an integer");
    }

    // Comprehensive referential integrity validation
    await this.validateReferentialIntegrity(data.parentSku, data.childSku);
  }

  /**
   * Validates composition item update business rules
   */
  private async validateCompositionItemUpdate(
    id: string,
    data: UpdateCompositionItemData
  ): Promise<void> {
    const existingItem = await this.compositionItemRepository.findById(id);
    if (!existingItem) {
      throw new Error(`Composition item with ID '${id}' not found`);
    }

    // Validate quantity bounds if being updated
    if (data.quantity !== undefined && data.quantity <= 0) {
      throw new Error("Quantity must be a positive integer");
    }

    // Additional validation for parent/child changes would go here
    // (though typically these shouldn't be changed after creation)
  }

  /**
   * Gets composition statistics
   */
  async getCompositionStats(): Promise<{
    totalCompositions: number;
    totalCompositeProducts: number;
    averageItemsPerComposite: number;
    maxCompositionDepth: number;
    mostUsedChildProducts: Array<{ sku: string; usageCount: number }>;
  }> {
    const allCompositions = await this.compositionItemRepository.findAll();
    const compositeProducts = await this.productRepository.findComposite();

    // Calculate average items per composite
    const compositionsGrouped =
      await this.compositionItemRepository.findGroupedByParent();
    const itemCounts = Object.values(compositionsGrouped).map(
      (items) => items.length
    );
    const averageItemsPerComposite =
      itemCounts.length > 0
        ? itemCounts.reduce((sum, count) => sum + count, 0) / itemCounts.length
        : 0;

    // Find most used child products
    const childUsage: Record<string, number> = {};
    for (const item of allCompositions) {
      childUsage[item.childSku] = (childUsage[item.childSku] || 0) + 1;
    }
    const mostUsedChildProducts = Object.entries(childUsage)
      .map(([sku, count]) => ({ sku, usageCount: count }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);

    // Calculate max composition depth (simplified - would need recursive calculation)
    let maxDepth = 0;
    for (const product of compositeProducts) {
      try {
        const tree = await this.getCompositionTree(product.sku, 5);
        const depth = this.calculateTreeDepth(tree);
        maxDepth = Math.max(maxDepth, depth);
      } catch {
        // Skip products that cause issues
      }
    }

    return {
      totalCompositions: allCompositions.length,
      totalCompositeProducts: compositeProducts.length,
      averageItemsPerComposite,
      maxCompositionDepth: maxDepth,
      mostUsedChildProducts,
    };
  }

  /**
   * Helper method to calculate the depth of a composition tree
   */
  private calculateTreeDepth(tree: CompositionTree): number {
    if (tree.children.length === 0) {
      return 1;
    }

    const childDepths = tree.children.map((child) =>
      this.calculateTreeDepth(child)
    );
    return 1 + Math.max(...childDepths);
  }

  /**
   * Validates that a product can be safely deleted without breaking referential integrity
   * Implements Requirement 10.5: Prevent deletion of referenced entities
   */
  async validateProductDeletionImpact(productSku: string): Promise<{
    canDelete: boolean;
    blockers: string[];
    affectedCompositions: string[];
    cascadeDeletes: string[];
  }> {
    const blockers: string[] = [];
    const affectedCompositions: string[] = [];
    const cascadeDeletes: string[] = [];

    // Check if product is used as a child in any compositions
    const parentCompositions = await this.getDependentProducts(productSku);
    if (parentCompositions.length > 0) {
      blockers.push(
        `Product is used in ${parentCompositions.length} composition(s): ${parentCompositions.join(", ")}`
      );
      affectedCompositions.push(...parentCompositions);
    }

    // Check if product has variations that are used in compositions
    const product = await this.productRepository.findBySku(productSku);
    if (product?.hasVariation) {
      const variations =
        await this.variationItemRepository.findByProduct(productSku);
      for (const variation of variations) {
        const variationSku = `${productSku}#${variation.id}`;
        const variationParents = await this.getDependentProducts(variationSku);
        if (variationParents.length > 0) {
          blockers.push(
            `Product variation '${variation.id}' is used in composition(s): ${variationParents.join(", ")}`
          );
          affectedCompositions.push(...variationParents);
        }
      }
    }

    // Check if product is composite and has composition items
    if (product?.isComposite) {
      const compositionItems =
        await this.compositionItemRepository.findByParent(productSku);
      if (compositionItems.length > 0) {
        cascadeDeletes.push(
          `${compositionItems.length} composition item(s) will be deleted`
        );
      }
    }

    return {
      canDelete: blockers.length === 0,
      blockers,
      affectedCompositions: [...new Set(affectedCompositions)],
      cascadeDeletes,
    };
  }

  /**
   * Safely deletes all composition items for a product (cascade delete)
   */
  async cascadeDeleteCompositionItems(productSku: string): Promise<void> {
    // Delete as parent (if composite)
    await this.compositionItemRepository.deleteByParent(productSku);

    // Delete as child (including variations)
    await this.compositionItemRepository.deleteByChild(productSku);

    // Delete variations as children
    const product = await this.productRepository.findBySku(productSku);
    if (product?.hasVariation) {
      const variations =
        await this.variationItemRepository.findByProduct(productSku);
      for (const variation of variations) {
        const variationSku = `${productSku}#${variation.id}`;
        await this.compositionItemRepository.deleteByChild(variationSku);
      }
    }
  }

  /**
   * Gets detailed referential integrity report for a product
   */
  async getReferentialIntegrityReport(productSku: string): Promise<{
    productExists: boolean;
    isComposite: boolean;
    hasVariations: boolean;
    compositionItemsCount: number;
    usedInCompositionsCount: number;
    variationsUsedInCompositions: Array<{
      variationId: string;
      usedInCompositions: string[];
    }>;
    dependencyChain: string[];
  }> {
    const product = await this.productRepository.findBySku(productSku);

    if (!product) {
      return {
        productExists: false,
        isComposite: false,
        hasVariations: false,
        compositionItemsCount: 0,
        usedInCompositionsCount: 0,
        variationsUsedInCompositions: [],
        dependencyChain: [],
      };
    }

    const compositionItems =
      await this.compositionItemRepository.findByParent(productSku);
    const usedInCompositions = await this.getDependentProducts(productSku);

    const variationsUsedInCompositions: Array<{
      variationId: string;
      usedInCompositions: string[];
    }> = [];

    if (product.hasVariation) {
      const variations =
        await this.variationItemRepository.findByProduct(productSku);
      for (const variation of variations) {
        const variationSku = `${productSku}#${variation.id}`;
        const variationParents = await this.getDependentProducts(variationSku);
        if (variationParents.length > 0) {
          variationsUsedInCompositions.push({
            variationId: variation.id,
            usedInCompositions: variationParents,
          });
        }
      }
    }

    // Build dependency chain
    const dependencyChain: string[] = [];
    try {
      if (product.isComposite) {
        const tree = await this.getCompositionTree(productSku, 5);
        this.buildDependencyChain(tree, dependencyChain);
      }
    } catch {
      // Ignore errors in dependency chain building
    }

    return {
      productExists: true,
      isComposite: product.isComposite,
      hasVariations: product.hasVariation,
      compositionItemsCount: compositionItems.length,
      usedInCompositionsCount: usedInCompositions.length,
      variationsUsedInCompositions,
      dependencyChain: [...new Set(dependencyChain)],
    };
  }

  /**
   * Builds a flat list of all products in a dependency chain
   */
  private buildDependencyChain(tree: CompositionTree, chain: string[]): void {
    chain.push(tree.sku);
    for (const child of tree.children) {
      this.buildDependencyChain(child, chain);
    }
  }

  /**
   * Calculates weight for a composite variation combination
   * Implements Requirement 7.3: Derive weight from selected child variations
   */
  async calculateCompositeVariationWeight(
    productSku: string,
    variationId: string
  ): Promise<number> {
    const product = await this.productRepository.findBySku(productSku);
    if (!product || !product.isComposite || !product.hasVariation) {
      throw new Error(
        `Product '${productSku}' is not a composite product with variations`
      );
    }

    const variation = await this.variationItemRepository.findById(variationId);
    if (!variation || variation.productSku !== productSku) {
      throw new Error(
        `Variation '${variationId}' not found for product '${productSku}'`
      );
    }

    // Check if parent variation types modify weight
    const variationTypes = await this.getVariationTypesForProduct(productSku);
    const weightModifyingType = variationTypes.find(
      (type) => type.modifiesWeight
    );

    if (weightModifyingType && variation.weightOverride !== undefined) {
      // Parent variation type modifies weight, use override (Requirement 7.7)
      return variation.weightOverride;
    }

    // Calculate from composition items
    const variationSku = `${productSku}#${variationId}`;
    return this.calculateCompositeWeight(variationSku);
  }

  /**
   * Gets variation types used by a product
   */
  private async getVariationTypesForProduct(
    productSku: string
  ): Promise<any[]> {
    // This would need to be implemented based on your variation type repository
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Validates composite variation combination uniqueness
   * Implements Requirement 7.4: Ensure combination uniqueness
   */
  async validateCompositeVariationUniqueness(
    productSku: string,
    variationId: string,
    excludeVariationId?: string
  ): Promise<void> {
    const variation = await this.variationItemRepository.findById(variationId);
    if (!variation) {
      throw new Error(`Variation '${variationId}' not found`);
    }

    // Get all variations for this product
    const allVariations =
      await this.variationItemRepository.findByProduct(productSku);

    // Check for duplicate selections
    const duplicateVariation = allVariations.find((v) => {
      if (v.id === variationId || v.id === excludeVariationId) return false;

      // Compare selections
      const currentSelections = Object.entries(variation.selections).sort();
      const otherSelections = Object.entries(v.selections).sort();

      if (currentSelections.length !== otherSelections.length) return false;

      return currentSelections.every(([typeId, varId], index) => {
        const [otherTypeId, otherVarId] = otherSelections[index];
        return typeId === otherTypeId && varId === otherVarId;
      });
    });

    if (duplicateVariation) {
      throw new Error(
        `A variation combination with the same selections already exists. ` +
          `Each composite variation must have unique variation type selections.`
      );
    }
  }

  /**
   * Creates composition items for a composite variation
   * Implements Requirement 7.2: Allow selection of specific child variations per combination
   */
  async createCompositeVariationComposition(
    productSku: string,
    variationId: string,
    compositionData: Array<{
      childSku: string;
      quantity: number;
    }>
  ): Promise<void> {
    const product = await this.productRepository.findBySku(productSku);
    if (!product || !product.isComposite || !product.hasVariation) {
      throw new Error(
        `Product '${productSku}' is not a composite product with variations`
      );
    }

    const variation = await this.variationItemRepository.findById(variationId);
    if (!variation || variation.productSku !== productSku) {
      throw new Error(
        `Variation '${variationId}' not found for product '${productSku}'`
      );
    }

    // Validate each child product
    for (const item of compositionData) {
      await this.validateChildProductEligibility(item.childSku);
    }

    // Create composition items using variation SKU as parent
    const variationSku = `${productSku}#${variationId}`;

    for (const item of compositionData) {
      await this.createCompositionItem({
        parentSku: variationSku,
        childSku: item.childSku,
        quantity: item.quantity,
      });
    }
  }

  /**
   * Gets composition items for a specific composite variation
   */
  async getCompositeVariationComposition(
    productSku: string,
    variationId: string
  ): Promise<CompositionItem[]> {
    const variationSku = `${productSku}#${variationId}`;
    return this.compositionItemRepository.findByParent(variationSku);
  }

  /**
   * Updates composition for a composite variation
   */
  async updateCompositeVariationComposition(
    productSku: string,
    variationId: string,
    compositionData: Array<{
      childSku: string;
      quantity: number;
    }>
  ): Promise<void> {
    const variationSku = `${productSku}#${variationId}`;

    // Remove existing composition items
    await this.compositionItemRepository.deleteByParent(variationSku);

    // Create new composition items
    await this.createCompositeVariationComposition(
      productSku,
      variationId,
      compositionData
    );
  }

  /**
   * Validates that composite variations have required composition items
   * Implements Requirement 7.5: Require variation selection for child products with variations
   */
  async validateCompositeVariationCompleteness(
    productSku: string,
    variationId: string
  ): Promise<{
    isComplete: boolean;
    missingItems: string[];
    invalidItems: string[];
  }> {
    const compositionItems = await this.getCompositeVariationComposition(
      productSku,
      variationId
    );
    const missingItems: string[] = [];
    const invalidItems: string[] = [];

    for (const item of compositionItems) {
      try {
        await this.validateChildProductEligibility(item.childSku);
      } catch (error) {
        invalidItems.push(item.childSku);
      }
    }

    // Check if composition has at least one item (business rule for composite products)
    if (compositionItems.length === 0) {
      missingItems.push("At least one composition item is required");
    }

    return {
      isComplete: missingItems.length === 0 && invalidItems.length === 0,
      missingItems,
      invalidItems,
    };
  }

  /**
   * Gets all composite variations with their composition details
   */
  async getCompositeVariationsWithComposition(productSku: string): Promise<
    Array<{
      variation: any;
      compositionItems: CompositionItem[];
      totalWeight: number;
      isComplete: boolean;
    }>
  > {
    const product = await this.productRepository.findBySku(productSku);
    if (!product || !product.isComposite || !product.hasVariation) {
      return [];
    }

    const variations =
      await this.variationItemRepository.findByProduct(productSku);
    const results = [];

    for (const variation of variations) {
      const compositionItems = await this.getCompositeVariationComposition(
        productSku,
        variation.id
      );
      const totalWeight = await this.calculateCompositeVariationWeight(
        productSku,
        variation.id
      );
      const completeness = await this.validateCompositeVariationCompleteness(
        productSku,
        variation.id
      );

      results.push({
        variation,
        compositionItems,
        totalWeight,
        isComplete: completeness.isComplete,
      });
    }

    return results;
  }
}

// Type for composition tree structure
export interface CompositionTree {
  sku: string;
  name: string;
  weight?: number;
  calculatedWeight?: number;
  isComposite: boolean;
  hasVariation?: boolean;
  children: Array<
    CompositionTree & {
      quantity: number;
      totalWeight?: number;
    }
  >;
  depth?: number;
  isVariation?: boolean;
  parentProductSku?: string; // For variation nodes, the SKU of the parent product
}
