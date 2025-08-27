import { CompositionItem } from "./composition-item";

/**
 * Represents a variation of a composite product
 * Each variation has its own unique composition of items
 */
export interface CompositeVariation {
  id: string;
  productSku: string;
  name: string;
  compositionItems: CompositionItem[];
  totalWeight: number;
  isActive: boolean;
  sortOrder?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCompositeVariationData {
  productSku: string;
  name: string;
  compositionItems?: CompositionItem[];
  sortOrder?: number;
}

export interface UpdateCompositeVariationData {
  name?: string;
  isActive?: boolean;
  sortOrder?: number;
}

/**
 * Business rules for composite variations
 */
export class CompositeVariationRules {
  /**
   * Validate variation name uniqueness within product
   */
  static validateNameUniqueness(
    name: string,
    productSku: string,
    existingVariations: CompositeVariation[],
    excludeId?: string
  ): { valid: boolean; error?: string } {
    const normalizedName = name.trim().toLowerCase();

    if (!normalizedName) {
      return { valid: false, error: "Variation name is required" };
    }

    const duplicate = existingVariations.find(
      (v) =>
        v.productSku === productSku &&
        v.id !== excludeId &&
        v.name.toLowerCase() === normalizedName
    );

    if (duplicate) {
      return {
        valid: false,
        error: "A variation with this name already exists",
      };
    }

    return { valid: true };
  }

  /**
   * Generate next available variation name
   */
  static generateNextVariationName(
    existingVariations: CompositeVariation[]
  ): string {
    const existingNumbers = existingVariations
      .map((v) => v.name.match(/^Variation (\d+)$/)?.[1])
      .filter(Boolean)
      .map(Number)
      .sort((a, b) => a - b);

    let nextNumber = 1;
    for (const num of existingNumbers) {
      if (num === nextNumber) {
        nextNumber++;
      } else {
        break;
      }
    }

    return `Variation ${nextNumber}`;
  }

  /**
   * Calculate total weight from composition items
   */
  static calculateTotalWeight(compositionItems: CompositionItem[]): number {
    return compositionItems.reduce((total, item) => {
      // Note: In a real implementation, we'd need to look up the child product's weight
      // For now, we'll assume the weight is available in the item or return 0
      const itemWeight = (item as any).weight || 0;
      return total + itemWeight * item.quantity;
    }, 0);
  }

  /**
   * Validate minimum variation requirement
   */
  static validateMinimumVariations(variations: CompositeVariation[]): {
    valid: boolean;
    error?: string;
  } {
    if (variations.length === 0) {
      return {
        valid: false,
        error: "At least one variation is required for composite products",
      };
    }

    return { valid: true };
  }

  /**
   * Validate composition items for variation
   */
  static validateCompositionItems(items: CompositionItem[]): {
    valid: boolean;
    error?: string;
  } {
    if (items.length === 0) {
      return {
        valid: false,
        error: "Variation must have at least one composition item",
      };
    }

    // Check for duplicate child SKUs
    const skus = items.map((item) => item.childSku);
    const uniqueSkus = new Set(skus);

    if (skus.length !== uniqueSkus.size) {
      return {
        valid: false,
        error: "Duplicate products are not allowed in the same variation",
      };
    }

    // Validate quantities
    const invalidQuantities = items.filter((item) => item.quantity <= 0);
    if (invalidQuantities.length > 0) {
      return {
        valid: false,
        error: "All quantities must be greater than zero",
      };
    }

    return { valid: true };
  }
}
