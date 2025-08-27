import {
  ProductVariationItem,
  CreateProductVariationItemData,
  UpdateProductVariationItemData,
} from "../entities/product-variation-item";
import {
  CompositeVariation,
  CreateCompositeVariationData,
  UpdateCompositeVariationData,
} from "../entities/composite-variation";
import { CompositionItem } from "../entities/composition-item";
import { Product } from "../entities/product";

/**
 * Service for managing composite variations and traditional variations
 */
export class VariationService {
  /**
   * Validate variation creation.
   *
   * @param data - New variation data submitted by the user.
   * @param existingVariations - Variations already registered for the product.
   * @param product - The product to which the variation belongs.
   * @returns Object with validity flag and a list of errors.
   */
  static validateVariationCreation(
    data: CreateProductVariationItemData,
    existingVariations: ProductVariationItem[],
    product: Product
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // For composite products with variations, selections should be empty
    if (product.isComposite && product.hasVariation) {
      if (Object.keys(data.selections).length > 0) {
        errors.push(
          "Composite variations should not have traditional variation selections"
        );
      }
    }

    // For traditional variations, check for duplicate combinations
    if (!product.isComposite && Object.keys(data.selections).length > 0) {
      const duplicate = existingVariations.find(
        (v) => JSON.stringify(v.selections) === JSON.stringify(data.selections)
      );
      if (duplicate) {
        errors.push("This variation combination already exists");
      }
    }

    // Validate weight override
    if (data.weightOverride !== undefined && data.weightOverride < 0) {
      errors.push("Weight override must be non-negative");
    }

    // Validate dimensions override
    if (data.dimensionsOverride) {
      const { height, width, depth } = data.dimensionsOverride;
      if (height !== undefined && height <= 0) {
        errors.push("Height override must be positive");
      }
      if (width !== undefined && width <= 0) {
        errors.push("Width override must be positive");
      }
      if (depth !== undefined && depth <= 0) {
        errors.push("Depth override must be positive");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate automatic variation name for composite variations.
   *
   * @param existingVariations - Existing variations to base the numbering on.
   * @param prefix - Optional prefix for the generated name.
   * @returns Generated variation name that does not clash with existing ones.
   */
  static generateVariationName(
    existingVariations: ProductVariationItem[],
    prefix: string = "Variation"
  ): string {
    const existingNumbers = existingVariations
      .map((v) => {
        // Try to extract number from names like "Variation 1", "Variation 2" or IDs
        const nameOrId = v.name || v.id;
        const match = nameOrId.match(new RegExp(`^${prefix}[\\s-]?(\\d+)$`));
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((num): num is number => num !== null)
      .sort((a, b) => a - b);

    let nextNumber = 1;
    for (const num of existingNumbers) {
      if (num === nextNumber) {
        nextNumber++;
      } else {
        break;
      }
    }

    return `${prefix} ${nextNumber}`;
  }

  /**
   * Validate minimum variation requirements
   */
  static validateMinimumVariations(
    variations: ProductVariationItem[],
    product: Product
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Products with variations must have at least one variation
    if (product.hasVariation && variations.length === 0) {
      errors.push("Products with variations must have at least one variation");
    }

    // Composite products with variations must have at least one variation
    if (
      product.isComposite &&
      product.hasVariation &&
      variations.length === 0
    ) {
      errors.push(
        "Composite products with variations must have at least one variation"
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate variation weight considering composition
   */
  static calculateVariationWeight(
    variation: ProductVariationItem,
    product: Product,
    compositionItems: CompositionItem[],
    childProducts: Product[] = []
  ): number {
    // If variation has explicit weight override, use it
    if (variation.weightOverride !== undefined) {
      return variation.weightOverride;
    }

    // For composite variations, calculate from composition items
    if (product.isComposite) {
      const variationSku = `${product.sku}#${variation.id}`;
      const variationCompositionItems = compositionItems.filter(
        (item) => item.parentSku === variationSku
      );

      return variationCompositionItems.reduce((total, item) => {
        const childProduct = childProducts.find((p) => p.sku === item.childSku);
        const childWeight = childProduct?.weight || 0;
        return total + childWeight * item.quantity;
      }, 0);
    }

    // Fallback to product base weight
    return product.weight || 0;
  }

  /**
   * Validate variation ordering
   */
  static validateVariationOrdering(
    variations: ProductVariationItem[],
    newOrder: string[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check that all variation IDs are present
    const variationIds = new Set(variations.map((v) => v.id));
    const orderIds = new Set(newOrder);

    if (variationIds.size !== orderIds.size) {
      errors.push("Order must include all variations");
    }

    for (const id of newOrder) {
      if (!variationIds.has(id)) {
        errors.push(`Unknown variation ID: ${id}`);
      }
    }

    for (const id of variationIds) {
      if (!orderIds.has(id)) {
        errors.push(`Missing variation ID in order: ${id}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Convert ProductVariationItem to CompositeVariation
   */
  static toCompositeVariation(
    variation: ProductVariationItem,
    product: Product,
    compositionItems: CompositionItem[],
    index: number
  ): CompositeVariation {
    const variationSku = `${product.sku}#${variation.id}`;
    const variationCompositionItems = compositionItems.filter(
      (item) => item.parentSku === variationSku
    );

    const totalWeight = this.calculateVariationWeight(
      variation,
      product,
      compositionItems
    );

    return {
      id: variation.id,
      productSku: product.sku,
      name: `Variation ${index + 1}`, // Simple naming for now
      compositionItems: variationCompositionItems,
      totalWeight,
      isActive: true,
      createdAt: variation.createdAt,
      updatedAt: variation.updatedAt,
    };
  }

  /**
   * Validate composite variation data
   */
  static validateCompositeVariation(
    data: CreateCompositeVariationData | UpdateCompositeVariationData,
    existingVariations: CompositeVariation[] = [],
    excludeId?: string
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate name uniqueness if provided
    if ("name" in data && data.name) {
      const normalizedName = data.name.toLowerCase().trim();
      const duplicate = existingVariations.find(
        (v) =>
          v.name.toLowerCase().trim() === normalizedName && v.id !== excludeId
      );
      if (duplicate) {
        errors.push(`Variation name "${data.name}" is already in use`);
      }
    }

    // Validate composition items if provided
    if ("compositionItems" in data && data.compositionItems) {
      if (data.compositionItems.length === 0) {
        errors.push("Variation must have at least one composition item");
      }

      // Check for duplicate child SKUs
      const childSkus = data.compositionItems.map((item) => item.childSku);
      const uniqueSkus = new Set(childSkus);
      if (childSkus.length !== uniqueSkus.size) {
        errors.push("Duplicate products are not allowed in the same variation");
      }

      // Validate quantities
      const invalidQuantities = data.compositionItems.filter(
        (item) => item.quantity <= 0
      );
      if (invalidQuantities.length > 0) {
        errors.push("All quantities must be greater than zero");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
