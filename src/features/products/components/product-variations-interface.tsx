"use client";

import * as React from "react";
import { useState } from "react";
import { Product } from "@/lib/domain/entities/product";
import { useProductVariations } from "../hooks/use-product-variations";
import { VariationTypeSelector } from "./variation-type-selector";
import { EditableVariationsGrid } from "./editable-variations-grid";
import { CompositeVariationsInterface } from "./composite-variations-interface";

export interface ProductVariationsInterfaceProps {
  product: Product;
  compositionItems?: any[];
  availableCompositionItems?: any[];
  onCreateCompositionItem?: (data: any) => Promise<void>;
  onDeleteCompositionItem?: (id: string) => Promise<void>;
}

export function ProductVariationsInterface({ 
  product, 
  compositionItems = [], 
  availableCompositionItems = [], 
  onCreateCompositionItem, 
  onDeleteCompositionItem 
}: ProductVariationsInterfaceProps) {
  const {
    variations,
    variationTypes,
    availableVariations,
    loading,
    error,
    createVariation,
    updateVariation,
    deleteVariation,
  } = useProductVariations(product.sku);

  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);

  // Auto-detect and pre-select variation types based on existing variations
  React.useEffect(() => {
    if (variations.length > 0 && selectedTypeIds.length === 0) {
      // Extract all variation type IDs from existing variations
      const usedTypeIds = new Set<string>();
      variations.forEach(variation => {
        Object.keys(variation.selections).forEach(typeId => {
          usedTypeIds.add(typeId);
        });
      });
      
      if (usedTypeIds.size > 0) {
        setSelectedTypeIds(Array.from(usedTypeIds));
      }
    }
  }, [variations, selectedTypeIds.length]);

  if (!product.hasVariation) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">
          This product does not have variations enabled.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Product Variations</h2>
        <p className="text-muted-foreground">
          Configure variation types and create specific combinations for this product
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Info about existing variations */}
      {variations.length > 0 && (
        <div className="rounded-md bg-blue-50 p-4">
          <div className="text-sm text-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <strong>📋 Existing Variations:</strong> 
              <span>This product has {variations.length} variation combination(s) configured.</span>
            </div>
            <div className="text-xs">
              The variation types currently in use are automatically selected below and cannot be removed until all variations are deleted.
            </div>
          </div>
        </div>
      )}

      {/* Variation Type Selection */}
      <div className="rounded-lg border p-6">
        <VariationTypeSelector
          variationTypes={variationTypes}
          selectedTypeIds={selectedTypeIds}
          onSelectionChange={setSelectedTypeIds}
          availableVariations={availableVariations}
          usedTypeIds={variations.length > 0 ? Array.from(new Set(
            variations.flatMap(v => Object.keys(v.selections))
          )) : []}
        />
      </div>

      {/* Variations Interface - Choose between grid and composite based on product flags */}
      {selectedTypeIds.length > 0 && (
        <div className="rounded-lg border p-6">
          {product.isComposite ? (
            // Composite + Variations: Use composition-based interface
            <CompositeVariationsInterface
              product={product}
              variations={variations}
              variationTypes={variationTypes}
              availableVariations={availableVariations}
              selectedTypeIds={selectedTypeIds}
              onCreateVariation={createVariation}
              onUpdateVariation={updateVariation}
              onDeleteVariation={deleteVariation}
              onCreateCompositionItem={onCreateCompositionItem!}
              onDeleteCompositionItem={onDeleteCompositionItem!}
              compositionItems={compositionItems}
              availableCompositionItems={availableCompositionItems}
              loading={loading}
            />
          ) : (
            // Regular Variations: Use traditional grid
            <EditableVariationsGrid
              product={product}
              variations={variations}
              variationTypes={variationTypes}
              availableVariations={availableVariations}
              selectedTypeIds={selectedTypeIds}
              onCreateVariation={createVariation}
              onUpdateVariation={updateVariation}
              onDeleteVariation={deleteVariation}
              loading={loading}
            />
          )}
        </div>
      )}
    </div>
  );
}