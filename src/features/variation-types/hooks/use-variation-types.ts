import { useState, useEffect, useCallback, useMemo } from "react";
import { VariationTypeRepository } from "@/lib/storage/repositories/variation-type-repository";
import { StorageService } from "@/lib/storage/storage-service";
import {
  VariationType,
  CreateVariationTypeData,
  UpdateVariationTypeData,
} from "@/lib/domain/entities/variation-type";
import { toast } from "@/hooks/use-toast";

export interface UseVariationTypesReturn {
  variationTypes: VariationType[];
  loading: boolean;
  error: string | null;
  createVariationType: (data: CreateVariationTypeData) => Promise<void>;
  updateVariationType: (
    id: string,
    data: UpdateVariationTypeData
  ) => Promise<void>;
  deleteVariationType: (id: string) => Promise<void>;
  searchVariationTypes: (query: string) => Promise<void>;
  refreshVariationTypes: () => Promise<void>;
}

export function useVariationTypes(): UseVariationTypesReturn {
  const [variationTypes, setVariationTypes] = useState<VariationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repository = useMemo(() => new VariationTypeRepository(), []);

  const loadVariationTypes = useCallback(
    async (clearError = true) => {
      try {
        setLoading(true);
        if (clearError) setError(null);
        const data = await repository.findAll();
        setVariationTypes(data);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load variation types";
        setError(message);
        toast.error("Error", message);
      } finally {
        setLoading(false);
      }
    },
    [repository]
  );

  const createVariationType = useCallback(
    async (data: CreateVariationTypeData) => {
      try {
        setError(null);
        await repository.create(data);
        await loadVariationTypes(false);
        toast.success("Success", "Variation type created successfully");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to create variation type";
        setError(message);
        toast.error("Error", message);
      }
    },
    [repository, loadVariationTypes]
  );

  const updateVariationType = useCallback(
    async (id: string, data: UpdateVariationTypeData) => {
      try {
        setError(null);
        await repository.update(id, data);
        await loadVariationTypes(false);
        toast.success("Success", "Variation type updated successfully");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to update variation type";
        setError(message);
        toast.error("Error", message);
      }
    },
    [repository, loadVariationTypes]
  );

  const deleteVariationType = useCallback(
    async (id: string) => {
      try {
        setError(null);
        await repository.delete(id);
        await loadVariationTypes(false);
        toast.success("Success", "Variation type deleted successfully");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to delete variation type";
        setError(message);
        toast.error("Error", message);
      }
    },
    [repository, loadVariationTypes]
  );

  const searchVariationTypes = useCallback(
    async (query: string) => {
      try {
        setLoading(true);
        setError(null);
        const data = await repository.search(query);
        setVariationTypes(data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to search variation types";
        setError(message);
        toast.error("Error", message);
      } finally {
        setLoading(false);
      }
    },
    [repository]
  );

  const refreshVariationTypes = useCallback(async () => {
    await loadVariationTypes();
  }, [loadVariationTypes]);

  useEffect(() => {
    loadVariationTypes();
  }, [loadVariationTypes]);

  return {
    variationTypes,
    loading,
    error,
    createVariationType,
    updateVariationType,
    deleteVariationType,
    searchVariationTypes,
    refreshVariationTypes,
  };
}
