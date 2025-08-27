import { useState, useEffect, useCallback, useMemo } from 'react';
import { VariationRepository } from '@/lib/storage/repositories/variation-repository';
import { VariationTypeRepository } from '@/lib/storage/repositories/variation-type-repository';
import { StorageService } from '@/lib/storage/storage-service';
import {
  Variation,
  CreateVariationData,
  UpdateVariationData,
} from '@/lib/domain/entities/variation';
import { VariationType } from '@/lib/domain/entities/variation-type';
import { toast } from '@/hooks/use-toast';

export interface UseVariationsReturn {
  variations: Variation[];
  variationTypes: VariationType[];
  loading: boolean;
  error: string | null;
  createVariation: (data: CreateVariationData) => Promise<void>;
  updateVariation: (id: string, data: UpdateVariationData) => Promise<void>;
  deleteVariation: (id: string) => Promise<void>;
  searchVariations: (query: string, variationTypeId?: string) => Promise<void>;
  refreshVariations: () => Promise<void>;
  getVariationsByType: (variationTypeId: string) => Variation[];
  getVariationTypeName: (variationTypeId: string) => string;
}

export function useVariations(): UseVariationsReturn {
  const [variations, setVariations] = useState<Variation[]>([]);
  const [variationTypes, setVariationTypes] = useState<VariationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const variationRepository = useMemo(() => new VariationRepository(), []);
  const variationTypeRepository = useMemo(() => new VariationTypeRepository(), []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [variationsData, variationTypesData] = await Promise.all([
        variationRepository.findAll(),
        variationTypeRepository.findAll(),
      ]);
      setVariations(variationsData);
      setVariationTypes(variationTypesData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
//       // toast({
//         title: 'Error',
//         description: message,
//         variant: 'destructive',
//       });
    } finally {
      setLoading(false);
    }
  }, [variationRepository, variationTypeRepository]);

  const createVariation = useCallback(
    async (data: CreateVariationData) => {
      try {
        setError(null);
        await variationRepository.create(data);
        await loadData();
//         // toast({
//           title: 'Success',
//           description: 'Variation created successfully',
//         });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create variation';
        setError(message);
//         // toast({
//           title: 'Error',
//           description: message,
//           variant: 'destructive',
//         });
        throw err;
      }
    },
    [variationRepository, loadData]
  );

  const updateVariation = useCallback(
    async (id: string, data: UpdateVariationData) => {
      try {
        setError(null);
        await variationRepository.update(id, data);
        await loadData();
//         // toast({
//           title: 'Success',
//           description: 'Variation updated successfully',
//         });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update variation';
        setError(message);
//         // toast({
//           title: 'Error',
//           description: message,
//           variant: 'destructive',
//         });
        throw err;
      }
    },
    [variationRepository, loadData]
  );

  const deleteVariation = useCallback(
    async (id: string) => {
      try {
        setError(null);
        await variationRepository.delete(id);
        await loadData();
//         // toast({
//           title: 'Success',
//           description: 'Variation deleted successfully',
//         });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete variation';
        setError(message);
//         // toast({
//           title: 'Error',
//           description: message,
//           variant: 'destructive',
//         });
        throw err;
      }
    },
    [variationRepository, loadData]
  );

  const searchVariations = useCallback(
    async (query: string, variationTypeId?: string) => {
      try {
        setLoading(true);
        setError(null);
        const data = await variationRepository.search(query, variationTypeId);
        setVariations(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to search variations';
        setError(message);
//         // toast({
//           title: 'Error',
//           description: message,
//           variant: 'destructive',
//         });
      } finally {
        setLoading(false);
      }
    },
    [variationRepository]
  );

  const refreshVariations = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const getVariationsByType = useCallback(
    (variationTypeId: string) => {
      return variations.filter((variation) => variation.variationTypeId === variationTypeId);
    },
    [variations]
  );

  const getVariationTypeName = useCallback(
    (variationTypeId: string) => {
      const variationType = variationTypes.find((vt) => vt.id === variationTypeId);
      return variationType?.name || 'Unknown Type';
    },
    [variationTypes]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    variations,
    variationTypes,
    loading,
    error,
    createVariation,
    updateVariation,
    deleteVariation,
    searchVariations,
    refreshVariations,
    getVariationsByType,
    getVariationTypeName,
  };
}