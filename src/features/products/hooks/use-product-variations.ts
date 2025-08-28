"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ProductVariationItem,
  CreateProductVariationItemData,
  UpdateProductVariationItemData,
} from "@/lib/domain/entities/product-variation-item";
import { VariationType } from "@/lib/domain/entities/variation-type";
import { Variation } from "@/lib/domain/entities/variation";
import { ProductVariationItemRepository } from "@/lib/storage/repositories/product-variation-item-repository";
import { VariationTypeRepository } from "@/lib/storage/repositories/variation-type-repository";
import { VariationRepository } from "@/lib/storage/repositories/variation-repository";

export interface UseProductVariationsReturn {
  variations: ProductVariationItem[];
  variationTypes: VariationType[];
  availableVariations: Record<string, Variation[]>;
  loading: boolean;
  error: string | null;
  createVariation: (data: CreateProductVariationItemData) => Promise<void>;
  updateVariation: (
    id: string,
    data: UpdateProductVariationItemData
  ) => Promise<void>;
  deleteVariation: (id: string) => Promise<void>;
  reorderVariations: (ids: string[]) => Promise<void>;
  generateCombinations: (selectedTypeIds: string[]) => Promise<void>;
  refreshVariations: () => Promise<void>;
}

export function useProductVariations(
  productSku: string
): UseProductVariationsReturn {
  const [variations, setVariations] = useState<ProductVariationItem[]>([]);
  const [variationTypes, setVariationTypes] = useState<VariationType[]>([]);
  const [availableVariations, setAvailableVariations] = useState<
    Record<string, Variation[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const variationItemRepo = useMemo(
    () => new ProductVariationItemRepository(),
    []
  );
  const variationTypeRepo = useMemo(() => new VariationTypeRepository(), []);
  const variationRepo = useMemo(() => new VariationRepository(), []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load product variations
      const productVariations =
        await variationItemRepo.findByProductSku(productSku);
      setVariations(productVariations);

      // Load variation types
      const types = await variationTypeRepo.findAll();
      setVariationTypes(types);

      // Load available variations for each type
      const variationsMap: Record<string, Variation[]> = {};
      for (const type of types) {
        const typeVariations = await variationRepo.findByVariationType(type.id);
        variationsMap[type.id] = typeVariations;
      }
      setAvailableVariations(variationsMap);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load variations"
      );
    } finally {
      setLoading(false);
    }
  }, [productSku, variationItemRepo, variationTypeRepo, variationRepo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const generateDefaultName = (baseName = "Variation") => {
    let counter = 1;
    const existingNames = new Set(variations.map((v) => v.name?.toLowerCase()));
    while (existingNames.has(`${baseName.toLowerCase()} ${counter}`)) {
      counter++;
    }
    return `${baseName} ${counter}`;
  };

  const createVariation = async (data: CreateProductVariationItemData) => {
    try {
      setError(null);
      const name =
        data.name && data.name.trim().length > 0
          ? data.name
          : generateDefaultName();
      const sortOrder = variations.length;
      await variationItemRepo.create({ ...data, name, sortOrder });
      await loadData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create variation";
      setError(message);
      throw new Error(message);
    }
  };

  const updateVariation = async (
    id: string,
    data: UpdateProductVariationItemData
  ) => {
    try {
      setError(null);
      if (data.name) {
        const exists = variations.some(
          (v) =>
            v.id !== id && v.name?.toLowerCase() === data.name?.toLowerCase()
        );
        if (exists) {
          throw new Error("Variation name must be unique");
        }
      }
      await variationItemRepo.update(id, data);
      await loadData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update variation";
      setError(message);
      throw new Error(message);
    }
  };

  const deleteVariation = async (id: string) => {
    try {
      setError(null);
      await variationItemRepo.delete(id);
      await loadData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete variation";
      setError(message);
      throw new Error(message);
    }
  };

  const reorderVariations = async (ids: string[]) => {
    try {
      setError(null);
      await Promise.all(
        ids.map((id, index) =>
          variationItemRepo.update(id, { sortOrder: index })
        )
      );
      await loadData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to reorder variations";
      setError(message);
      throw new Error(message);
    }
  };

  const generateCombinations = async (selectedTypeIds: string[]) => {
    try {
      setError(null);
      setLoading(true);

      // Get variations for selected types
      const typeVariations = selectedTypeIds.map((typeId) => ({
        typeId,
        variations: availableVariations[typeId] || [],
      }));

      // Generate cartesian product
      const combinations = generateCartesianProduct(typeVariations);

      // Create variation items for each combination
      for (const combination of combinations) {
        const selections: Record<string, string> = {};
        combination.forEach(({ typeId, variationId }) => {
          selections[typeId] = variationId;
        });

        // Check if combination already exists
        const existingVariation = variations.find((v) => {
          const existingHash = Object.entries(v.selections)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([typeId, variationId]) => `${typeId}:${variationId}`)
            .join("|");

          const newHash = Object.entries(selections)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([typeId, variationId]) => `${typeId}:${variationId}`)
            .join("|");

          return existingHash === newHash;
        });

        if (!existingVariation) {
          await variationItemRepo.create({
            productSku,
            selections,
          });
        }
      }

      await loadData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate combinations";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    variations,
    variationTypes,
    availableVariations,
    loading,
    error,
    createVariation,
    updateVariation,
    deleteVariation,
    reorderVariations,
    generateCombinations,
    refreshVariations: loadData,
  };
}

// Helper function to generate cartesian product
function generateCartesianProduct(
  typeVariations: Array<{ typeId: string; variations: Variation[] }>
): Array<Array<{ typeId: string; variationId: string }>> {
  if (typeVariations.length === 0) return [];
  if (typeVariations.length === 1) {
    return typeVariations[0].variations.map((v) => [
      {
        typeId: typeVariations[0].typeId,
        variationId: v.id,
      },
    ]);
  }

  const [first, ...rest] = typeVariations;
  const restCombinations = generateCartesianProduct(rest);

  const result: Array<Array<{ typeId: string; variationId: string }>> = [];

  for (const variation of first.variations) {
    for (const restCombination of restCombinations) {
      result.push([
        { typeId: first.typeId, variationId: variation.id },
        ...restCombination,
      ]);
    }
  }

  return result;
}
