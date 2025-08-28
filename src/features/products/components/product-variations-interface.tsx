"use client";

import * as React from "react";
import { useState } from "react";
import { Product } from "@/lib/domain/entities/product";
import { useProductVariations } from "../hooks/use-product-variations";
import { useCompositeVariations } from "../hooks/use-composite-variations";
import { useComposition } from "../hooks/use-composition";
import { VariationTypeSelector } from "./variation-type-selector";
import { EditableVariationsGrid } from "./editable-variations-grid";
import { CompositeVariationsInterface } from "./composite-variations-interface";

export interface ProductVariationsInterfaceProps {
  product: Product;
  onCountChange?: (count: number) => void;
  showHeader?: boolean;
}

export function ProductVariationsInterface({
  product,
  onCountChange,
  showHeader = true,
}: ProductVariationsInterfaceProps) {
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);

  // Load hooks for both modes to satisfy Rules of Hooks
  const compositeHook = useCompositeVariations(product.sku);
  const compositionHook = useComposition(product.sku);
  const variationHook = useProductVariations(product.sku);
  const isComposite = product.isComposite;

  const variations = isComposite
    ? compositeHook.variations
    : variationHook.variations;
  const variationTypes = isComposite ? [] : variationHook.variationTypes;
  const availableVariations = isComposite
    ? {}
    : variationHook.availableVariations;
  const loading = isComposite
    ? compositeHook.loading || compositionHook.loading
    : variationHook.loading;
  const error = isComposite ? compositeHook.error : variationHook.error;

  const createVariationFn = isComposite
    ? async (_data: any) =>
        compositeHook.createVariation({ productSku: product.sku, name: "" })
    : variationHook.createVariation;
  const updateVariationFn = isComposite
    ? (id: string, data: any) =>
        compositeHook.updateVariation(id, { name: data.name })
    : variationHook.updateVariation;
  const deleteVariationFn = isComposite
    ? compositeHook.deleteVariation
    : variationHook.deleteVariation;
  const reorderVariationsFn = isComposite
    ? compositeHook.reorderVariations
    : variationHook.reorderVariations;

  const createCompositionItem = isComposite
    ? compositeHook.addCompositionItem
    : undefined;
  const deleteCompositionItem = isComposite
    ? compositeHook.deleteCompositionItem
    : undefined;

  React.useEffect(() => {
    onCountChange?.(variations.length);
  }, [variations.length, onCountChange]);

  // Auto-detect and pre-select variation types based on existing variations
  React.useEffect(() => {
    if (!isComposite && variations.length > 0 && selectedTypeIds.length === 0) {
      const usedTypeIds = new Set<string>();
      (variations as any).forEach((variation: any) => {
        Object.keys(variation.selections).forEach((typeId: string) => {
          usedTypeIds.add(typeId);
        });
      });
      if (usedTypeIds.size > 0) {
        setSelectedTypeIds(Array.from(usedTypeIds));
      }
    }
  }, [variations, selectedTypeIds.length, isComposite]);

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
      {showHeader && (
        <div>
          <h2 className="text-xl font-semibold">Product Variations</h2>
          <p className="text-muted-foreground">
            {product.isComposite
              ? "Configure composition templates for each variation combination"
              : "Configure variation types and create specific combinations for this product"}
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Different interfaces based on product type */}
      {product.isComposite ? (
        // COMPOSITE + VARIATIONS: Use composition-based interface (NO variation type selector)
        <div className="space-y-6">
          {/* Info about composite variations */}
          <div className="rounded-md bg-blue-50 p-4">
            <div className="text-sm text-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <strong>🔧 Composite Product with Variations:</strong>
              </div>
              <div className="text-xs space-y-1">
                <div>• This product uses composition-based variations</div>
                <div>
                  • Each variation combination has its own composition template
                </div>
                <div>
                  • You define variations by creating different composition
                  combinations
                </div>
                <div>
                  • No traditional variation types are used for composite
                  products
                </div>
              </div>
            </div>
          </div>

          {/* Direct Composite Variations Interface */}
          <div className="rounded-lg border p-6">
            <CompositeVariationsInterface
              product={product}
              variations={variations.map((v: any) => ({
                id: v.id,
                productSku: v.productSku,
                name: v.name,
                selections: {},
                weightOverride: undefined,
                sortOrder: v.sortOrder,
                createdAt: v.createdAt,
                updatedAt: v.updatedAt,
              }))}
              variationTypes={[]}
              availableVariations={{}}
              selectedTypeIds={[]}
              onCreateVariation={createVariationFn}
              onUpdateVariation={updateVariationFn as any}
              onDeleteVariation={deleteVariationFn}
              onReorderVariations={reorderVariationsFn}
              onCreateCompositionItem={createCompositionItem!}
              onDeleteCompositionItem={deleteCompositionItem!}
              compositionItems={variations.flatMap(
                (v: any) => v.compositionItems
              )}
              availableCompositionItems={compositionHook!.availableItems}
              loading={loading}
            />
          </div>
        </div>
      ) : (
        // REGULAR VARIATIONS: Use traditional variation type selector + grid
        <div className="space-y-6">
          {/* Info about existing variations */}
          {variations.length > 0 && (
            <div className="rounded-md bg-blue-50 p-4">
              <div className="text-sm text-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <strong>📋 Existing Variations:</strong>
                  <span>
                    This product has {variations.length} variation
                    combination(s) configured.
                  </span>
                </div>
                <div className="text-xs">
                  The variation types currently in use are automatically
                  selected below and cannot be removed until all variations are
                  deleted.
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
              usedTypeIds={
                variations.length > 0
                  ? Array.from(
                      new Set(
                        (variations as any).flatMap((v: any) =>
                          Object.keys(v.selections)
                        )
                      )
                    )
                  : []
              }
            />
          </div>

          {/* Traditional Variations Grid */}
          {selectedTypeIds.length > 0 && (
            <div className="rounded-lg border p-6">
              <EditableVariationsGrid
                product={product}
                variations={variations as any}
                variationTypes={variationTypes}
                availableVariations={availableVariations}
                selectedTypeIds={selectedTypeIds}
                onCreateVariation={createVariationFn}
                onUpdateVariation={updateVariationFn}
                onDeleteVariation={deleteVariationFn}
                onReorderVariations={reorderVariationsFn}
                loading={loading}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
