import {
  Product,
  CreateProductData,
  UpdateProductData,
} from "../entities/product";
import { CompositionItem } from "../entities/composition-item";
import { ProductVariationItem } from "../entities/product-variation-item";

/**
 * Enhanced product service with transition logic and validation
 */
export class ProductService {
  /**
   * Validate product data for creation or update operations.
   *
   * @param data - Raw product payload submitted by the user.
   * @param existingProducts - List of existing products used for uniqueness checks.
   * @param excludeSku - Optional SKU to exclude from uniqueness validation (useful on update).
   * @returns Object containing validity flag and a list of validation errors.
   */
  static validateProductData(
    data: CreateProductData | UpdateProductData,
    existingProducts: Product[] = [],
    excludeSku?: string
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate SKU uniqueness (only for creation)
    if ("sku" in data && data.sku) {
      const duplicate = existingProducts.find(
        (p) => p.sku === data.sku && p.sku !== excludeSku
      );
      if (duplicate) {
        errors.push(`SKU "${data.sku}" is already in use`);
      }

      // Validate SKU format
      if (!/^[A-Z0-9-]+$/.test(data.sku)) {
        errors.push(
          "SKU must contain only uppercase letters, numbers, and hyphens"
        );
      }
    }

    // Validate name uniqueness (case-insensitive)
    if (data.name) {
      const normalizedName = data.name.toLowerCase().trim();
      const duplicate = existingProducts.find(
        (p) =>
          p.name.toLowerCase().trim() === normalizedName && p.sku !== excludeSku
      );
      if (duplicate) {
        errors.push(`Product name "${data.name}" is already in use`);
      }
    }

    // Validate weight
    if (data.weight !== undefined && data.weight <= 0) {
      errors.push("Weight must be a positive number");
    }

    // Validate dimensions
    if (data.dimensions) {
      const { height, width, depth } = data.dimensions;
      if (height !== undefined && height <= 0) {
        errors.push("Height must be a positive number");
      }
      if (width !== undefined && width <= 0) {
        errors.push("Width must be a positive number");
      }
      if (depth !== undefined && depth <= 0) {
        errors.push("Depth must be a positive number");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate product state transitions when toggling composite or variation flags.
   *
   * @param currentProduct - The current persisted product.
   * @param targetFlags - Desired flag changes for `isComposite` and `hasVariation`.
   * @param compositionItems - Existing composition items for the product.
   * @param variations - Existing variations for the product.
   * @returns Object describing validation result and any warnings.
   */
  static validateStateTransition(
    currentProduct: Product,
    targetFlags: { isComposite?: boolean; hasVariation?: boolean },
    compositionItems: CompositionItem[] = [],
    variations: ProductVariationItem[] = []
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const currentFlags = {
      isComposite: currentProduct.isComposite,
      hasVariation: currentProduct.hasVariation,
    };

    const newFlags = {
      isComposite: targetFlags.isComposite ?? currentFlags.isComposite,
      hasVariation: targetFlags.hasVariation ?? currentFlags.hasVariation,
    };

    // Validate disabling composite when data exists
    if (currentFlags.isComposite && !newFlags.isComposite) {
      const hasCompositionData =
        compositionItems.length > 0 || variations.length > 0;
      if (hasCompositionData) {
        warnings.push(
          "Disabling composite will permanently delete all composition data"
        );
      }
    }

    // Validate disabling variations when data exists
    if (currentFlags.hasVariation && !newFlags.hasVariation) {
      if (variations.length > 0) {
        warnings.push(
          "Disabling variations will permanently delete all variation data"
        );
      }
    }

    // Validate enabling variations on composite
    if (
      !currentFlags.hasVariation &&
      newFlags.hasVariation &&
      newFlags.isComposite
    ) {
      if (compositionItems.length > 0) {
        warnings.push(
          "Existing composition will be migrated to the first variation"
        );
      }
    }

    // Business rule: Cannot have variations without being composite in some contexts
    // This is configurable based on business requirements

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
