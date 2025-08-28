"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import {
  Product,
  CreateProductData,
  UpdateProductData,
} from "@/lib/domain/entities/product";
import { ProductList } from "./product-list";
import { ProductForm } from "./product-form";
import { ProductEditTabs } from "./product-edit-tabs";
import { LegacyModal } from "@/components/shared/modals/modal";
import { useProducts, ProductFilters } from "../hooks/use-products";

type ViewMode = "list" | "create" | "edit";

export function ProductManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const {
    products,
    loading,
    error,
    filters,
    setFilters,
    createProduct,
    updateProduct,
    deleteProduct,
    refreshProducts,
  } = useProducts();

  const handleCreateProduct = () => {
    setSelectedProduct(null);
    setViewMode("create");
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setViewMode("edit");
  };

  const handleFormSubmit = async (
    data: CreateProductData | UpdateProductData
  ) => {
    try {
      setFormLoading(true);

      if (viewMode === "create") {
        await createProduct(data as CreateProductData);
      } else if (viewMode === "edit" && selectedProduct) {
        await updateProduct(selectedProduct.sku, data as UpdateProductData);
      }

      setViewMode("list");
      setSelectedProduct(null);
    } catch (error) {
      // Error handling is done in the hook
      throw error;
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormCancel = () => {
    setViewMode("list");
    setSelectedProduct(null);
  };

  const handleSearch = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, search: query }));
  }, []);

  const handleFilterChange = useCallback(
    (newFilters: Partial<ProductFilters>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
    },
    []
  );

  const handleDeleteProduct = async (sku: string) => {
    await deleteProduct(sku);
  };

  if (viewMode === "list") {
    return (
      <ProductList
        products={products}
        loading={loading}
        onCreateProduct={handleCreateProduct}
        onEditProduct={handleEditProduct}
        onDeleteProduct={handleDeleteProduct}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        searchQuery={filters.search || ""}
        filters={{
          isComposite: filters.isComposite,
          hasVariation: filters.hasVariation,
        }}
      />
    );
  }

  if (viewMode === "edit" && selectedProduct) {
    return (
      <ProductEditTabs
        product={selectedProduct}
        onUpdateProduct={async (data) => {
          await updateProduct(selectedProduct.sku, data);
          setViewMode("list");
          setSelectedProduct(null);
        }}
        onCancel={handleFormCancel}
        loading={formLoading}
      />
    );
  }

  return (
    <LegacyModal
      open={viewMode === "create"}
      onOpenChange={(open) => {
        if (!open) {
          handleFormCancel();
        }
      }}
      title="Create Product"
      description="Add a new product to your catalog"
      size="lg"
    >
      <ProductForm
        product={undefined}
        onSubmit={handleFormSubmit}
        onCancel={handleFormCancel}
        loading={formLoading}
      />
    </LegacyModal>
  );
}
