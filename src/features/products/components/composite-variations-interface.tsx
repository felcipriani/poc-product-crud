"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Trash2, Save, X, Package } from "lucide-react";
import { Product } from "@/lib/domain/entities/product";
import { ProductVariationItem, CreateProductVariationItemData, UpdateProductVariationItemData } from "@/lib/domain/entities/product-variation-item";
import { VariationType } from "@/lib/domain/entities/variation-type";
import { Variation } from "@/lib/domain/entities/variation";
import { CompositionItem, CreateCompositionItemData } from "@/lib/domain/entities/composition-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

export interface CompositeVariationsInterfaceProps {
  product: Product;
  variations: ProductVariationItem[];
  variationTypes: VariationType[];
  availableVariations: Record<string, Variation[]>;
  selectedTypeIds: string[];
  onCreateVariation: (data: CreateProductVariationItemData) => Promise<void>;
  onUpdateVariation: (id: string, data: UpdateProductVariationItemData) => Promise<void>;
  onDeleteVariation: (id: string) => Promise<void>;
  onCreateCompositionItem: (data: CreateCompositionItemData) => Promise<void>;
  onDeleteCompositionItem: (id: string) => Promise<void>;
  compositionItems: CompositionItem[];
  availableCompositionItems: Array<{
    id: string;
    sku: string;
    displayName: string;
    weight?: number;
    type: 'simple' | 'composite' | 'variation';
    parentSku?: string;
  }>;
  loading?: boolean;
}

interface CompositionTemplate {
  variationId: string;
  variationDisplayName: string;
  items: Array<{
    id: string;
    childSku: string;
    displayName: string;
    quantity: number;
    weight?: number;
    isEditing?: boolean;
    isNew?: boolean;
  }>;
  totalWeight: number;
}

export function CompositeVariationsInterface({
  product,
  variations,
  variationTypes,
  availableVariations,
  selectedTypeIds,
  onCreateVariation,
  onUpdateVariation,
  onDeleteVariation,
  onCreateCompositionItem,
  onDeleteCompositionItem,
  compositionItems,
  availableCompositionItems,
  loading = false,
}: CompositeVariationsInterfaceProps) {
  const [templates, setTemplates] = useState<CompositionTemplate[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Memoize selected types to prevent recreation on every render
  const selectedTypes = useMemo(() => 
    variationTypes.filter(type => selectedTypeIds.includes(type.id)),
    [variationTypes, selectedTypeIds]
  );

  // Memoize weight modifying type
  const weightModifyingType = useMemo(() => 
    selectedTypes.find(type => type.modifiesWeight),
    [selectedTypes]
  );

  // Memoize the generateVariationDisplayName function
  const generateVariationDisplayName = useCallback((
    variation: ProductVariationItem,
    types: VariationType[],
    availableVars: Record<string, Variation[]>
  ): string => {
    const parts: string[] = [];
    
    Object.entries(variation.selections).forEach(([typeId, variationId]) => {
      const type = types.find(t => t.id === typeId);
      const variationOptions = availableVars[typeId] || [];
      const selectedVariation = variationOptions.find(v => v.id === variationId);
      
      if (type && selectedVariation) {
        parts.push(`${type.name}: ${selectedVariation.name}`);
      }
    });
    
    return parts.join(", ");
  }, []);

  // Build composition templates from existing variations and composition items
  useEffect(() => {
    const newTemplates: CompositionTemplate[] = variations.map(variation => {
      // Get composition items for this variation
      const variationSku = `${product.sku}#${variation.id}`;
      const variationCompositionItems = compositionItems.filter(item => 
        item.parentSku === variationSku
      );

      // Build display name for this variation
      const displayName = generateVariationDisplayName(variation, selectedTypes, availableVariations);

      // Calculate total weight
      let totalWeight = 0;
      if (weightModifyingType && variation.weightOverride) {
        // If parent variation type modifies weight, use override
        totalWeight = variation.weightOverride;
      } else {
        // Calculate from composition items
        totalWeight = variationCompositionItems.reduce((sum, item) => {
          const availableItem = availableCompositionItems.find(ai => ai.sku === item.childSku);
          return sum + ((availableItem?.weight || 0) * item.quantity);
        }, 0);
      }

      return {
        variationId: variation.id,
        variationDisplayName: displayName,
        items: variationCompositionItems.map(item => {
          const availableItem = availableCompositionItems.find(ai => ai.sku === item.childSku);
          return {
            id: item.id,
            childSku: item.childSku,
            displayName: availableItem?.displayName || item.childSku,
            quantity: item.quantity,
            weight: availableItem?.weight,
            isEditing: false,
            isNew: false,
          };
        }),
        totalWeight,
      };
    });

    setTemplates(newTemplates);
  }, [
    variations, 
    compositionItems, 
    availableCompositionItems, 
    selectedTypes, 
    availableVariations, 
    weightModifyingType, 
    product.sku,
    generateVariationDisplayName
  ]);

  const addNewVariationCombination = useCallback(() => {
    // This will trigger the parent to show a modal or form for creating a new variation
    // For now, we'll create a basic combination that needs to be filled
    const newVariationData: CreateProductVariationItemData = {
      productSku: product.sku,
      selections: {},
      weightOverride: weightModifyingType ? 0 : undefined,
    };

    onCreateVariation(newVariationData);
  }, [product.sku, weightModifyingType, onCreateVariation]);

  const addCompositionItemToTemplate = useCallback((templateId: string) => {
    setTemplates(prev => prev.map(template => {
      if (template.variationId === templateId) {
        const newItem = {
          id: `new-${Date.now()}`,
          childSku: '',
          displayName: '',
          quantity: 1,
          weight: 0,
          isEditing: true,
          isNew: true,
        };
        return {
          ...template,
          items: [...template.items, newItem],
        };
      }
      return template;
    }));
    setEditingTemplateId(templateId);
  }, []);

  const updateCompositionItem = useCallback((templateId: string, itemId: string, field: string, value: any) => {
    setTemplates(prev => prev.map(template => {
      if (template.variationId === templateId) {
        return {
          ...template,
          items: template.items.map(item => {
            if (item.id === itemId) {
              const updatedItem = { ...item, [field]: value };
              
              // If changing childSku, update display name and weight
              if (field === 'childSku') {
                const availableItem = availableCompositionItems.find(ai => ai.sku === value);
                updatedItem.displayName = availableItem?.displayName || value;
                updatedItem.weight = availableItem?.weight;
              }
              
              return updatedItem;
            }
            return item;
          }),
        };
      }
      return template;
    }));
  }, [availableCompositionItems]);

  const saveCompositionItem = useCallback(async (templateId: string, itemId: string) => {
    const template = templates.find(t => t.variationId === templateId);
    const item = template?.items.find(i => i.id === itemId);
    
    if (!template || !item || !item.childSku || item.quantity <= 0) {
      alert("Please fill all required fields");
      return;
    }

    try {
      if (item.isNew) {
        // Create new composition item
        const variationSku = `${product.sku}#${template.variationId}`;
        await onCreateCompositionItem({
          parentSku: variationSku,
          childSku: item.childSku,
          quantity: item.quantity,
        });
      }
      
      setEditingTemplateId(null);
    } catch (error) {
      console.error("Failed to save composition item:", error);
    }
  }, [templates, product.sku, onCreateCompositionItem]);

  const cancelEditCompositionItem = useCallback((templateId: string, itemId: string) => {
    setTemplates(prev => prev.map(template => {
      if (template.variationId === templateId) {
        if (template.items.find(i => i.id === itemId)?.isNew) {
          // Remove new item
          return {
            ...template,
            items: template.items.filter(i => i.id !== itemId),
          };
        } else {
          // Reset existing item
          return {
            ...template,
            items: template.items.map(item => 
              item.id === itemId ? { ...item, isEditing: false } : item
            ),
          };
        }
      }
      return template;
    }));
    setEditingTemplateId(null);
  }, []);

  const deleteCompositionItem = useCallback(async (templateId: string, itemId: string) => {
    const template = templates.find(t => t.variationId === templateId);
    const item = template?.items.find(i => i.id === itemId);
    
    if (!item) return;

    if (item.isNew) {
      // Just remove from local state
      setTemplates(prev => prev.map(template => {
        if (template.variationId === templateId) {
          return {
            ...template,
            items: template.items.filter(i => i.id !== itemId),
          };
        }
        return template;
      }));
    } else {
      // Delete from backend
      try {
        await onDeleteCompositionItem(itemId);
      } catch (error) {
        console.error("Failed to delete composition item:", error);
      }
    }
  }, [templates, onDeleteCompositionItem]);

  if (selectedTypeIds.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">
          Select variation types above to start creating composite variations
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Composite Variations</h3>
          <p className="text-sm text-muted-foreground">
            Each variation combination has its own composition template
          </p>
        </div>
        <Button
          onClick={addNewVariationCombination}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Variation
        </Button>
      </div>

      {/* Info Box */}
      <div className="rounded-md bg-blue-50 p-4">
        <div className="text-sm text-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4" />
            <strong>Composite + Variations Mode:</strong>
          </div>
          <div className="text-xs space-y-1">
            <div>• Each variation combination gets its own composition template</div>
            <div>• Specify exact child products/variations for each combination</div>
            <div>• Weight is calculated from selected child items (unless overridden)</div>
          </div>
        </div>
      </div>

      {/* Variation Templates */}
      <div className="space-y-6">
        {templates.map((template) => (
          <div key={template.variationId} className="border rounded-lg p-6">
            {/* Template Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium">{template.variationDisplayName}</h4>
                <p className="text-sm text-muted-foreground">
                  Total Weight: {template.totalWeight.toFixed(2)} kg
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addCompositionItemToTemplate(template.variationId)}
                  disabled={loading || editingTemplateId !== null}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDeleteVariation(template.variationId)}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Composition Items Table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Child Product</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Quantity</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Unit Weight</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Total Weight</th>
                    <th className="px-4 py-3 text-left text-sm font-medium w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {template.items.map((item) => (
                    <tr key={item.id} className={cn(
                      "border-t",
                      item.isEditing && "bg-blue-50"
                    )}>
                      <td className="px-4 py-3">
                        {item.isEditing ? (
                          <select
                            value={item.childSku}
                            onChange={(e) => updateCompositionItem(template.variationId, item.id, 'childSku', e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            <option value="">Select Product</option>
                            {availableCompositionItems.map(availableItem => (
                              <option key={availableItem.sku} value={availableItem.sku}>
                                {availableItem.displayName} ({availableItem.type})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm">{item.displayName}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.isEditing ? (
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) => updateCompositionItem(template.variationId, item.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-20 text-sm"
                          />
                        ) : (
                          <span className="text-sm">{item.quantity}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">
                          {item.weight ? `${item.weight} kg` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">
                          {item.weight ? `${(item.weight * item.quantity).toFixed(2)} kg` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {item.isEditing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => saveCompositionItem(template.variationId, item.id)}
                                disabled={loading}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => cancelEditCompositionItem(template.variationId, item.id)}
                                disabled={loading}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCompositionItem(template.variationId, item.id)}
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  
                  {template.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No composition items yet. Click &quot;Add Item&quot; to start building this variation.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="text-center py-8">
            <div className="text-muted-foreground">
              No variation combinations created yet. Click &quot;New Variation&quot; to create your first composite variation.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}