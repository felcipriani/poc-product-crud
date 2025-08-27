import { useState, useEffect, useCallback } from 'react';
import { CompositionService } from '@/lib/domain/services/composition-service';
import { CompositionItemRepository } from '@/lib/storage/repositories/composition-item-repository';
import { ProductRepository } from '@/lib/storage/repositories/product-repository';
import { ProductVariationItemRepository } from '@/lib/storage/repositories/product-variation-item-repository';
import { CreateCompositionItemData, CompositionItem } from '@/lib/domain/entities/composition-item';

// Initialize services
const compositionItemRepository = new CompositionItemRepository();
const productRepository = new ProductRepository();
const variationItemRepository = new ProductVariationItemRepository();
const compositionService = new CompositionService(
  compositionItemRepository,
  productRepository,
  variationItemRepository
);

export interface CompositeVariationData {
  variation: any;
  compositionItems: CompositionItem[];
  totalWeight: number;
  isComplete: boolean;
}

export function useCompositeVariations(productSku: string) {
  const [compositeVariations, setCompositeVariations] = useState<CompositeVariationData[]>([]);
  const [availableCompositionItems, setAvailableCompositionItems] = useState<Array<{
    id: string;
    sku: string;
    displayName: string;
    weight?: number;
    type: 'simple' | 'composite' | 'variation';
    parentSku?: string;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load composite variations data
  const loadCompositeVariations = useCallback(async () => {
    if (!productSku) return;

    try {
      setLoading(true);
      setError(null);

      const variations = await compositionService.getCompositeVariationsWithComposition(productSku);
      setCompositeVariations(variations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load composite variations');
      console.error('Error loading composite variations:', err);
    } finally {
      setLoading(false);
    }
  }, [productSku]);

  // Load available composition items
  const loadAvailableCompositionItems = useCallback(async () => {
    try {
      const items = await compositionService.getCompositionAvailableItems();
      setAvailableCompositionItems(items);
    } catch (err) {
      console.error('Error loading available composition items:', err);
    }
  }, []);

  // Create composition item for a variation
  const createCompositionItem = useCallback(async (data: CreateCompositionItemData) => {
    try {
      setLoading(true);
      setError(null);

      await compositionService.createCompositionItem(data);
      
      // Reload data
      await loadCompositeVariations();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create composition item';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loadCompositeVariations]);

  // Delete composition item
  const deleteCompositionItem = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      await compositionService.deleteCompositionItem(id);
      
      // Reload data
      await loadCompositeVariations();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete composition item';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loadCompositeVariations]);

  // Calculate weight for a specific variation
  const calculateVariationWeight = useCallback(async (variationId: string): Promise<number> => {
    try {
      return await compositionService.calculateCompositeVariationWeight(productSku, variationId);
    } catch (err) {
      console.error('Error calculating variation weight:', err);
      return 0;
    }
  }, [productSku]);

  // Validate variation completeness
  const validateVariationCompleteness = useCallback(async (variationId: string) => {
    try {
      return await compositionService.validateCompositeVariationCompleteness(productSku, variationId);
    } catch (err) {
      console.error('Error validating variation completeness:', err);
      return {
        isComplete: false,
        missingItems: ['Validation failed'],
        invalidItems: [],
      };
    }
  }, [productSku]);

  // Update composition for a variation
  const updateVariationComposition = useCallback(async (
    variationId: string,
    compositionData: Array<{ childSku: string; quantity: number }>
  ) => {
    try {
      setLoading(true);
      setError(null);

      await compositionService.updateCompositeVariationComposition(productSku, variationId, compositionData);
      
      // Reload data
      await loadCompositeVariations();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update variation composition';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [productSku, loadCompositeVariations]);

  // Load data on mount and when productSku changes
  useEffect(() => {
    loadCompositeVariations();
    loadAvailableCompositionItems();
  }, [loadCompositeVariations, loadAvailableCompositionItems]);

  return {
    compositeVariations,
    availableCompositionItems,
    loading,
    error,
    createCompositionItem,
    deleteCompositionItem,
    calculateVariationWeight,
    validateVariationCompleteness,
    updateVariationComposition,
    reload: loadCompositeVariations,
  };
}