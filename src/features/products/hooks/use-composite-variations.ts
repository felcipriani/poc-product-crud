"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CompositeVariation,
  CreateCompositeVariationData,
  UpdateCompositeVariationData,
} from "@/lib/domain/entities/composite-variation";
import {
  CreateCompositionItemData,
  UpdateCompositionItemData,
} from "@/lib/domain/entities/composition-item";
import { ProductVariationItemRepository } from "@/lib/storage/repositories/product-variation-item-repository";
import { CompositionItemRepository } from "@/lib/storage/repositories/composition-item-repository";
import { ProductRepository } from "@/lib/storage/repositories/product-repository";

export function useCompositeVariations(productSku: string) {
  const [variations, setVariations] = useState<CompositeVariation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const variationRepository = useMemo(
    () => new ProductVariationItemRepository(),
    []
  );
  const compositionRepository = useMemo(
    () => new CompositionItemRepository(),
    []
  );
  const productRepository = useMemo(() => new ProductRepository(), []);

  // Load variations and their composition items
  const loadVariations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get product variations
      const productVariations =
        await variationRepository.findByProductSku(productSku);

      // Build composite variations with composition items
      const compositeVariations: CompositeVariation[] = await Promise.all(
        productVariations.map(async (variation, index) => {
          const variationSku = `${productSku}#${variation.id}`;
          const compositionItems =
            await compositionRepository.findByParent(variationSku);

          // Calculate total weight using actual child product weights
          const weights = await Promise.all(
            compositionItems.map(async (item) => {
              const product = await productRepository.findBySku(item.childSku);
              return product?.weight ?? 0;
            })
          );

          const totalWeight = compositionItems.reduce(
            (sum, item, index) => sum + weights[index] * item.quantity,
            0
          );

          return {
            id: variation.id,
            productSku,
            name: variation.name || `Variation ${index + 1}`,
            compositionItems,
            totalWeight,
            isActive: true,
            sortOrder: variation.sortOrder,
            createdAt: variation.createdAt,
            updatedAt: variation.updatedAt,
          };
        })
      );

      setVariations(compositeVariations);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load variations"
      );
    } finally {
      setLoading(false);
    }
  }, [
    productSku,
    variationRepository,
    compositionRepository,
    productRepository,
  ]);

  // Create new variation
  const generateDefaultName = useCallback(() => {
    let counter = 1;
    const existing = new Set(variations.map((v) => v.name.toLowerCase()));
    while (existing.has(`variation ${counter}`)) {
      counter++;
    }
    return `Variation ${counter}`;
  }, [variations]);

  const createVariation = useCallback(
    async (data: CreateCompositeVariationData) => {
      try {
        setError(null);
        const name = generateDefaultName();
        await variationRepository.create({
          productSku: data.productSku,
          selections: {},
          weightOverride: undefined,
          name,
          sortOrder: variations.length,
        });
        await loadVariations();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create variation"
        );
        throw err;
      }
    },
    [
      variationRepository,
      loadVariations,
      generateDefaultName,
      variations.length,
    ]
  );

  // Update variation
  const updateVariation = useCallback(
    async (id: string, data: UpdateCompositeVariationData) => {
      try {
        setError(null);
        if (data.name) {
          const exists = variations.some(
            (v) =>
              v.id !== id && v.name.toLowerCase() === data.name.toLowerCase()
          );
          if (exists) {
            throw new Error("Variation name must be unique");
          }
        }
        await variationRepository.update(id, data);
        await loadVariations();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update variation"
        );
        throw err;
      }
    },
    [variationRepository, loadVariations, variations]
  );

  // Delete variation
  const deleteVariation = useCallback(
    async (id: string) => {
      try {
        setError(null);

        if (variations.length <= 1) {
          throw new Error("At least one variation is required");
        }

        // Delete composition items first
        const variationSku = `${productSku}#${id}`;
        const compositionItems =
          await compositionRepository.findByParent(variationSku);

        for (const item of compositionItems) {
          await compositionRepository.delete(item.id);
        }

        // Delete the underlying product variation
        await variationRepository.delete(id);

        // Reload variations
        await loadVariations();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to delete variation"
        );
        throw err;
      }
    },
    [
      productSku,
      variationRepository,
      compositionRepository,
      loadVariations,
      variations.length,
    ]
  );

  const reorderVariations = useCallback(
    async (ids: string[]) => {
      try {
        setError(null);
        await Promise.all(
          ids.map((id, index) =>
            variationRepository.update(id, { sortOrder: index })
          )
        );
        await loadVariations();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to reorder variations"
        );
        throw err;
      }
    },
    [variationRepository, loadVariations]
  );

  // Add composition item to variation
  const addCompositionItem = useCallback(
    async (variationId: string, itemData: CreateCompositionItemData) => {
      try {
        setError(null);

        const variationSku = `${productSku}#${variationId}`;
        await compositionRepository.create({
          ...itemData,
          parentSku: variationSku,
        });

        // Reload variations to update composition
        await loadVariations();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to add composition item"
        );
        throw err;
      }
    },
    [productSku, compositionRepository, loadVariations]
  );

  // Update composition item
  const updateCompositionItem = useCallback(
    async (
      variationId: string,
      itemId: string,
      itemData: UpdateCompositionItemData
    ) => {
      try {
        setError(null);

        await compositionRepository.update(itemId, itemData);

        // Reload variations to update composition
        await loadVariations();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to update composition item"
        );
        throw err;
      }
    },
    [compositionRepository, loadVariations]
  );

  // Delete composition item
  const deleteCompositionItem = useCallback(
    async (variationId: string, itemId: string) => {
      try {
        setError(null);

        await compositionRepository.delete(itemId);

        // Reload variations to update composition
        await loadVariations();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to delete composition item"
        );
        throw err;
      }
    },
    [compositionRepository, loadVariations]
  );

  // Load variations on mount
  useEffect(() => {
    loadVariations();
  }, [loadVariations]);

  return {
    variations,
    loading,
    error,
    createVariation,
    updateVariation,
    deleteVariation,
    reorderVariations,
    addCompositionItem,
    updateCompositionItem,
    deleteCompositionItem,
    reload: loadVariations,
  };
}
