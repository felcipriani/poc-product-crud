"use client";

import * as React from "react";
import { useState, useCallback, useMemo } from "react";
import {
  Product,
  CreateProductData,
  UpdateProductData,
} from "@/lib/domain/entities/product";
import { ProductList } from "./product-list";
import { ProductForm } from "./product-form";
import { ProductEditTabs } from "./product-edit-tabs";
import { ProductVariationsInterface } from "./product-variations-interface";
import { ProductCompositionInterface } from "./product-composition-interface";
import { LegacyModal } from "@/components/shared/modals/modal";
import { Button } from "@/components/ui/button";
import { useProducts, ProductFilters } from "../hooks/use-products";
import { CompositionItemRepository } from "@/lib/storage/repositories/composition-item-repository";
import { ProductVariationItemRepository } from "@/lib/storage/repositories/product-variation-item-repository";
import { showErrorToast } from "@/lib/utils/error-handling";

type ViewMode = "list" | "create" | "edit";

export function ProductManagement() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [createStep, setCreateStep] = useState<
    "form" | "variations" | "composition"
  >("form");
  const [draftProduct, setDraftProduct] = useState<CreateProductData | null>(
    null
  );

  const compositionRepo = useMemo(() => new CompositionItemRepository(), []);
  const variationRepo = useMemo(() => new ProductVariationItemRepository(), []);

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
    setCreateStep("form");
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
        const { isComposite, hasVariation } = data as CreateProductData;
        if (isComposite || hasVariation) {
          const draft: Product = {
            ...(data as CreateProductData),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          setDraftProduct(data as CreateProductData);
          setSelectedProduct(draft);
          if (isComposite && !hasVariation) {
            setCreateStep("composition");
          } else {
            // variations step covers both variation-only and composite+variation cases
            setCreateStep("variations");
          }
          return;
        }

        await createProduct(data as CreateProductData);
      } else if (viewMode === "edit" && selectedProduct) {
        await updateProduct(selectedProduct.sku, data as UpdateProductData);
      }

      setViewMode("list");
      setSelectedProduct(null);
      setCreateStep("form");
    } catch (error) {
      // Error handling is done in the hook
      throw error;
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormCancel = async () => {
    if (draftProduct) {
      await compositionRepo.deleteByParent(draftProduct.sku);
      await variationRepo.deleteByProduct(draftProduct.sku);
      setDraftProduct(null);
    }
    setViewMode("list");
    setSelectedProduct(null);
    setCreateStep("form");
  };

  const handleFinishCreation = async () => {
    if (!draftProduct) return;

    try {
      setFormLoading(true);

      if (draftProduct.isComposite) {
        const count = await compositionRepo.countByParent(draftProduct.sku);
        if (count === 0) {
          showErrorToast(
            new Error("Composite products require at least one component"),
            "Invalid Composition"
          );
          return;
        }
      }

      if (draftProduct.hasVariation) {
        const count = await variationRepo.countByProduct(draftProduct.sku);
        if (count === 0) {
          showErrorToast(
            new Error("Variable products require at least one variation"),
            "Invalid Variations"
          );
          return;
        }
      }

      await createProduct(draftProduct);
      setDraftProduct(null);
      setViewMode("list");
      setSelectedProduct(null);
      setCreateStep("form");
    } finally {
      setFormLoading(false);
    }
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
    <>
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

      <LegacyModal
        open={viewMode === "create"}
        onOpenChange={(open) => {
          if (!open) {
            handleFormCancel();
          }
        }}
        title={
          createStep === "form"
            ? "Create Product"
            : createStep === "variations"
              ? "Configure Variations"
              : "Configure Composition"
        }
        description={
          createStep === "form"
            ? "Add a new product to your catalog"
            : "Complete the product setup"
        }
        size="xl"
        className="max-h-[90vh] overflow-y-auto"
      >
        {createStep === "form" && (
          <ProductForm
            product={undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            loading={formLoading}
          />
        )}

        {createStep === "variations" && selectedProduct && (
          <div className="space-y-6">
            <ProductVariationsInterface product={selectedProduct} />
            <div className="flex justify-end">
              <Button onClick={handleFinishCreation}>Finish</Button>
            </div>
          </div>
        )}

        {createStep === "composition" && selectedProduct && (
          <div className="space-y-6">
            <ProductCompositionInterface product={selectedProduct} />
            <div className="flex justify-end">
              <Button onClick={handleFinishCreation}>Finish</Button>
            </div>
          </div>
        )}
      </LegacyModal>
    </>
  );
}
