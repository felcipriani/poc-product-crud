import { useState, useEffect, useCallback, useMemo } from "react";
import { CompositionService } from "@/lib/domain/services/composition-service";
import { ProductRepository } from "@/lib/storage/repositories/product-repository";
import { ProductVariationItemRepository } from "@/lib/storage/repositories/product-variation-item-repository";
import {
  CompositionItem,
  CreateCompositionItemData,
  UpdateCompositionItemData,
} from "@/lib/domain/entities/composition-item";

export interface CompositionItemWithDetails extends CompositionItem {
  displayName: string;
  childType: "simple" | "composite" | "variation";
  unitWeight?: number;
  parentProductSku?: string;
}

export interface AvailableCompositionItem {
  id: string;
  sku: string;
  displayName: string;
  weight?: number;
  type: "simple" | "composite" | "variation";
  parentSku?: string;
}

export function useComposition(
  productSku: string,
  compositionService?: CompositionService,
  productRepository?: ProductRepository,
  variationItemRepository?: ProductVariationItemRepository
) {
  // Use provided services or create default instances (memoized)
  const service = useMemo(
    () => compositionService || new CompositionService(),
    [compositionService]
  );
  const prodRepo = useMemo(
    () => productRepository || new ProductRepository(),
    [productRepository]
  );
  const varRepo = useMemo(
    () => variationItemRepository || new ProductVariationItemRepository(),
    [variationItemRepository]
  );

  const [compositionItems, setCompositionItems] = useState<
    CompositionItemWithDetails[]
  >([]);
  const [availableItems, setAvailableItems] = useState<
    AvailableCompositionItem[]
  >([]);
  const [totalWeight, setTotalWeight] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get weight for a variation SKU
  const getVariationWeight = useCallback(
    async (variationSku: string): Promise<number | undefined> => {
      try {
        const { productSku, variationId } = parseVariationSku(variationSku);
        const product = await prodRepo.findBySku(productSku);
        const variation = await varRepo.findById(variationId);

        if (!product || !variation) {
          return undefined;
        }

        return varRepo.getEffectiveWeight(variation, product.weight);
      } catch {
        return undefined;
      }
    },
    [prodRepo, varRepo]
  );

  // Enhance composition item with display information
  const enhanceCompositionItem = useCallback(
    async (item: CompositionItem): Promise<CompositionItemWithDetails> => {
      try {
        // Check if this is a variation SKU
        if (
          item.childSku.includes("#") ||
          item.childSku.includes(":") ||
          item.childSku.includes("-VAR-")
        ) {
          // This is a variation
          const { productSku: parentSku } = parseVariationSku(item.childSku);
          const parentProduct = await prodRepo.findBySku(parentSku);

          if (parentProduct) {
            const variationWeight = await getVariationWeight(item.childSku);
            return {
              ...item,
              displayName: `${parentProduct.name} (Variation)`,
              childType: "variation",
              unitWeight: variationWeight,
              parentProductSku: parentSku,
            };
          }
        }

        // Regular product
        const childProduct = await prodRepo.findBySku(item.childSku);
        if (childProduct) {
          let unitWeight = childProduct.weight;

          // If child is composite, calculate its weight
          if (childProduct.isComposite) {
            try {
              unitWeight = await service.calculateCompositeWeight(
                item.childSku,
                {}
              );
            } catch {
              // If calculation fails, use base weight or undefined
              unitWeight = childProduct.weight;
            }
          }

          return {
            ...item,
            displayName: childProduct.name,
            childType: childProduct.isComposite ? "composite" : "simple",
            unitWeight,
          };
        }

        // Fallback if product not found
        return {
          ...item,
          displayName: item.childSku,
          childType: "simple",
          unitWeight: undefined,
        };
      } catch (err) {
        console.error("Error enhancing composition item:", err);
        return {
          ...item,
          displayName: item.childSku,
          childType: "simple",
          unitWeight: undefined,
        };
      }
    },
    [getVariationWeight, prodRepo, service]
  );

  // Load composition items for the product
  const loadCompositionItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const items = await service.getCompositionItems(productSku);

      // Enhance items with display information
      const enhancedItems: CompositionItemWithDetails[] = [];

      for (const item of items) {
        const enhanced = await enhanceCompositionItem(item);
        enhancedItems.push(enhanced);
      }

      setCompositionItems(enhancedItems);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load composition items";
      setError(errorMessage);
      console.error("Error loading composition items:", err);
    } finally {
      setLoading(false);
    }
  }, [productSku, enhanceCompositionItem, service]);

  // Load available items for composition
  const loadAvailableItems = useCallback(async () => {
    try {
      const items = await service.getCompositionAvailableItems();
      setAvailableItems(items);
    } catch (err) {
      console.error("Error loading available composition items:", err);
    }
  }, [service]);

  // Calculate total weight
  const calculateTotalWeight = useCallback(async () => {
    try {
      const weight = await service.calculateCompositeWeight(productSku, {});
      setTotalWeight(weight);
    } catch (err) {
      console.error("Error calculating total weight:", err);
      setTotalWeight(undefined);
    }
  }, [productSku, service]);

  // Parse variation SKU to extract product SKU and variation ID
  const parseVariationSku = (
    variationSku: string
  ): { productSku: string; variationId: string } => {
    // Handle format: PRODUCT-SKU#VARIATION-ID
    if (variationSku.includes("#")) {
      const [productSku, variationId] = variationSku.split("#");
      return { productSku, variationId };
    }

    // Handle format: PRODUCT-SKU:variation-name (legacy)
    if (variationSku.includes(":")) {
      const [productSku, variationName] = variationSku.split(":");
      return { productSku, variationId: variationName };
    }

    // Handle format: PRODUCT-SKU-VAR-hash
    if (variationSku.includes("-VAR-")) {
      const parts = variationSku.split("-VAR-");
      return { productSku: parts[0], variationId: parts[1] };
    }

    throw new Error(`Invalid variation SKU format: '${variationSku}'`);
  };

  // Create composition item
  const createCompositionItem = useCallback(
    async (data: CreateCompositionItemData) => {
      setLoading(true);
      setError(null);

      try {
        await service.createCompositionItem(data);

        // Reload data only on success - don't await to avoid clearing error state
        loadCompositionItems();
        calculateTotalWeight();
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to create composition item";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [loadCompositionItems, calculateTotalWeight, service]
  );

  // Update composition item
  const updateCompositionItem = useCallback(
    async (id: string, data: UpdateCompositionItemData) => {
      setLoading(true);
      setError(null);

      try {
        await service.updateCompositionItem(id, data);

        // Reload data only on success
        await Promise.all([loadCompositionItems(), calculateTotalWeight()]);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to update composition item";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [loadCompositionItems, calculateTotalWeight, service]
  );

  // Delete composition item
  const deleteCompositionItem = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);

      try {
        await service.deleteCompositionItem(id);

        // Reload data only on success
        await Promise.all([loadCompositionItems(), calculateTotalWeight()]);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to delete composition item";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [loadCompositionItems, calculateTotalWeight, service]
  );

  // Refresh all composition data
  const refreshComposition = useCallback(async () => {
    await Promise.all([
      loadCompositionItems(),
      loadAvailableItems(),
      calculateTotalWeight(),
    ]);
  }, [loadCompositionItems, loadAvailableItems, calculateTotalWeight]);

  // Validate composition constraints
  const validateComposition = useCallback(async () => {
    try {
      return await service.validateCompositionComplexity(productSku);
    } catch (err) {
      console.error("Error validating composition:", err);
      return {
        isValid: false,
        maxDepth: 0,
        totalItems: 0,
        warnings: ["Failed to validate composition"],
      };
    }
  }, [productSku, service]);

  // Get composition tree for visualization
  const getCompositionTree = useCallback(async () => {
    try {
      return await service.getCompositionTree(productSku);
    } catch (err) {
      console.error("Error getting composition tree:", err);
      return null;
    }
  }, [productSku, service]);

  // Load initial data
  useEffect(() => {
    loadCompositionItems();
    loadAvailableItems();
    calculateTotalWeight();
  }, [loadCompositionItems, loadAvailableItems, calculateTotalWeight]);

  return {
    compositionItems,
    availableItems,
    totalWeight,
    loading,
    error,
    createCompositionItem,
    updateCompositionItem,
    deleteCompositionItem,
    refreshComposition,
    validateComposition,
    getCompositionTree,
  };
}
