"use client";

import * as React from "react";
import { Product, UpdateProductData } from "@/lib/domain/entities/product";
import { ProductForm } from "./product-form";
import { ProductVariationsInterface } from "./product-variations-interface";
import { ProductCompositionInterface } from "./product-composition-interface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Layers, Settings } from "lucide-react";
import { useComposition } from "../hooks/use-composition";
import { Button } from "@/components/ui/button";
import { showErrorToast } from "@/lib/utils/error-handling";

export interface ProductEditTabsProps {
  product: Product;
  onUpdateProduct: (data: UpdateProductData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ProductEditTabs({
  product,
  onUpdateProduct,
  onCancel,
  loading = false,
}: ProductEditTabsProps) {
  const [activeTab, setActiveTab] = React.useState("details");

  // Hook for composition (for availableCompositionItems)
  const compositionHook = useComposition(product.sku);
  const [variationCount, setVariationCount] = React.useState(0);
  const [compositionCount, setCompositionCount] = React.useState(0);

  const handleVariationsSave = () => {
    if (variationCount === 0) {
      showErrorToast(
        new Error("Variable products require at least one variation"),
        "Invalid Variations"
      );
      return;
    }
    onCancel();
  };

  const handleCompositionSave = () => {
    if (compositionCount === 0) {
      showErrorToast(
        new Error("Composite products require at least one component"),
        "Invalid Composition"
      );
      return;
    }
    onCancel();
  };

  const showVariationsTab = product.hasVariation && !product.isComposite;
  const showCompositionTab = product.isComposite;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Product</h1>
        <p className="text-muted-foreground">
          Update details for {product.name} ({product.sku})
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList
          className={`grid w-full ${
            showVariationsTab && showCompositionTab
              ? "grid-cols-3"
              : showVariationsTab || showCompositionTab
                ? "grid-cols-2"
                : "grid-cols-1"
          }`}
        >
          <TabsTrigger value="details" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Details
          </TabsTrigger>

          {showVariationsTab && (
            <TabsTrigger value="variations" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Variations
            </TabsTrigger>
          )}

          {showCompositionTab && (
            <TabsTrigger
              value="composition"
              className="flex items-center gap-2"
            >
              <Package className="h-4 w-4" />
              Composition
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <ProductForm
            product={product}
            onSubmit={onUpdateProduct}
            onCancel={onCancel}
            loading={loading}
          />
        </TabsContent>

        {showVariationsTab && (
          <TabsContent value="variations" className="mt-6">
            <div className="space-y-6">
              <ProductVariationsInterface
                product={product}
                onCountChange={setVariationCount}
              />
              <div className="flex justify-end">
                <Button onClick={handleVariationsSave} disabled={loading}>
                  Save
                </Button>
              </div>
            </div>
          </TabsContent>
        )}

        {showCompositionTab && (
          <TabsContent value="composition" className="mt-6">
            {product.hasVariation ? (
              <div className="space-y-6">
                <ProductVariationsInterface
                  product={product}
                  compositionItems={compositionHook.compositionItems}
                  availableCompositionItems={compositionHook.availableItems}
                  onCreateCompositionItem={
                    compositionHook.createCompositionItem
                  }
                  onDeleteCompositionItem={
                    compositionHook.deleteCompositionItem
                  }
                  onCountChange={setVariationCount}
                />
                <div className="flex justify-end">
                  <Button onClick={handleVariationsSave} disabled={loading}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <ProductCompositionInterface
                  product={product}
                  onItemCountChange={setCompositionCount}
                />
                <div className="flex justify-end">
                  <Button onClick={handleCompositionSave} disabled={loading}>
                    Save
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
