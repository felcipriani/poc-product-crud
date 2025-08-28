"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Product,
  CreateProductData,
  UpdateProductData,
} from "@/lib/domain/entities/product";
import { ProductService } from "@/lib/domain/services/product-service";
import { ProductRepository } from "@/lib/storage/repositories/product-repository";
import { ProductVariationItemRepository } from "@/lib/storage/repositories/product-variation-item-repository";
import { CompositionItemRepository } from "@/lib/storage/repositories/composition-item-repository";
import { useOptimisticList } from "@/hooks/use-optimistic-mutation";
import {
  withErrorHandling,
  showSuccessToast,
  showErrorToast,
} from "@/lib/utils/error-handling";

export interface ProductFilters {
  search?: string;
  isComposite?: boolean;
  hasVariation?: boolean;
}

export interface UseProductsReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  filters: ProductFilters;
  setFilters: (filters: ProductFilters) => void;
  createProduct: (data: CreateProductData) => Promise<void>;
  updateProduct: (sku: string, data: UpdateProductData) => Promise<void>;
  deleteProduct: (sku: string) => Promise<void>;
  refreshProducts: () => Promise<void>;
}

export function useProducts(): UseProductsReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilters>({});

  // Use optimistic list for better UX
  const optimisticList = useOptimisticList<Product, string>(
    [],
    (product) => product.sku
  );

  // Initialize services with useMemo to prevent recreation on every render
  const productRepository = useMemo(() => new ProductRepository(), []);
  const productService = useMemo(() => {
    // ProductService is static, no need to instantiate
    return ProductService;
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await withErrorHandling(
      async () => {
        let products: Product[];

        if (filters.search) {
          products = await productRepository.search(filters.search);
        } else if (
          filters.isComposite !== undefined ||
          filters.hasVariation !== undefined
        ) {
          products = await productRepository.findWhere((product) => {
            if (
              filters.isComposite !== undefined &&
              product.isComposite !== filters.isComposite
            ) {
              return false;
            }
            if (
              filters.hasVariation !== undefined &&
              product.hasVariation !== filters.hasVariation
            ) {
              return false;
            }
            return true;
          });
        } else {
          products = await productRepository.findAll();
        }

        return products;
      },
      {
        errorTitle: "Failed to load products",
        showErrorToast: true,
        onError: (err) => {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to load products";
          setError(errorMessage);
        },
      }
    );

    if (result) {
      optimisticList.setList(result);
    }

    setLoading(false);
  }, [filters, optimisticList.setList, productRepository]);

  const createProduct = useCallback(
    async (data: CreateProductData) => {
      // Create optimistic product
      const optimisticProduct: Product = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Apply optimistic update
      optimisticList.addOptimistic(optimisticProduct);

      try {
        const createdProduct = await productRepository.create(data);

        // Commit the optimistic update with real data
        const currentProducts = optimisticList.items.filter(
          (p) => p.sku !== data.sku
        );
        optimisticList.commit([...currentProducts, createdProduct]);

        showSuccessToast(`Product "${data.name}" created successfully`);
      } catch (err) {
        // Rollback optimistic update
        optimisticList.rollback();
        showErrorToast(err, "Failed to create product");
        throw err;
      }
    },
    [optimisticList, productRepository]
  );

  const updateProduct = useCallback(
    async (sku: string, data: UpdateProductData) => {
      // Apply optimistic update
      optimisticList.updateOptimistic(sku, { ...data, updatedAt: new Date() });

      try {
        const updatedProduct = await productRepository.update(sku, data);

        // Commit the optimistic update with real data
        const currentProducts = optimisticList.items.map((p) =>
          p.sku === sku ? updatedProduct : p
        );
        optimisticList.commit(currentProducts);

        showSuccessToast(`Product "${sku}" updated successfully`);
      } catch (err) {
        // Rollback optimistic update
        optimisticList.rollback();
        showErrorToast(err, "Failed to update product");
        throw err;
      }
    },
    [optimisticList, productRepository]
  );

  const deleteProduct = useCallback(
    async (sku: string) => {
      // Apply optimistic update
      optimisticList.removeOptimistic(sku);

      try {
        await productRepository.delete(sku);

        // Commit the optimistic update
        optimisticList.commit();

        showSuccessToast(`Product "${sku}" deleted successfully`);
      } catch (err) {
        // Rollback optimistic update
        optimisticList.rollback();
        showErrorToast(err, "Failed to delete product");
        throw err;
      }
    },
    [optimisticList, productRepository]
  );

  const refreshProducts = useCallback(async () => {
    await loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return {
    products: optimisticList.items,
    loading,
    error,
    filters,
    setFilters,
    createProduct,
    updateProduct,
    deleteProduct,
    refreshProducts,
  };
}
