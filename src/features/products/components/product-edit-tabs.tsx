"use client";

import * as React from "react";
import { Product, UpdateProductData } from "@/lib/domain/entities/product";
import { ProductForm } from "./product-form";
import { ProductVariationsInterface } from "./product-variations-interface";
import { ProductCompositionInterface } from "./product-composition-interface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Layers, Settings } from "lucide-react";
import { useCompositeVariations } from "../hooks/use-composite-variations";
import { useComposition } from "../hooks/use-composition";

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
  loading = false 
}: ProductEditTabsProps) {
  const [activeTab, setActiveTab] = React.useState("details");
  
  // Hook for composite variations (only used when product has both flags)
  const compositeVariationsHook = useCompositeVariations(product.sku);
  
  // Hook for composition (for availableCompositionItems)
  const compositionHook = useComposition(product.sku);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Product</h1>
        <p className="text-muted-foreground">
          Update details for {product.name} ({product.sku})
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Details
          </TabsTrigger>
          
          <TabsTrigger 
            value="variations" 
            disabled={!product.hasVariation}
            className="flex items-center gap-2"
          >
            <Layers className="h-4 w-4" />
            Variations
            {!product.hasVariation && (
              <span className="text-xs opacity-50">(disabled)</span>
            )}
          </TabsTrigger>
          
          <TabsTrigger 
            value="composition" 
            disabled={!product.isComposite}
            className="flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            Composition
            {!product.isComposite && (
              <span className="text-xs opacity-50">(disabled)</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <ProductForm
            product={product}
            onSubmit={onUpdateProduct}
            onCancel={onCancel}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="variations" className="mt-6">
          {product.hasVariation ? (
            <ProductVariationsInterface 
              product={product}
            />
          ) : (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                Enable &quot;Product Variations&quot; in the Details tab to manage variations.
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="composition" className="mt-6">
          <ProductCompositionInterface product={product} />
        </TabsContent>
      </Tabs>
    </div>
  );
}