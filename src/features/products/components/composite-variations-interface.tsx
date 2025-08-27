"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Plus, Trash2, Save, X, Package } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Product } from "@/lib/domain/entities/product";
import {
  ProductVariationItem,
  CreateProductVariationItemData,
  UpdateProductVariationItemData,
} from "@/lib/domain/entities/product-variation-item";
import { VariationType } from "@/lib/domain/entities/variation-type";
import { Variation } from "@/lib/domain/entities/variation";
import {
  CompositionItem,
  CreateCompositionItemData,
} from "@/lib/domain/entities/composition-item";
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
  onUpdateVariation: (
    id: string,
    data: UpdateProductVariationItemData
  ) => Promise<void>;
  onDeleteVariation: (id: string) => Promise<void>;
  onReorderVariations: (ids: string[]) => Promise<void>;
  onCreateCompositionItem: (data: CreateCompositionItemData) => Promise<void>;
  onDeleteCompositionItem: (id: string) => Promise<void>;
  compositionItems: CompositionItem[];
  availableCompositionItems: Array<{
    id: string;
    sku: string;
    displayName: string;
    weight?: number;
    type: "simple" | "composite" | "variation";
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
  onReorderVariations,
  onCreateCompositionItem,
  onDeleteCompositionItem,
  compositionItems,
  availableCompositionItems,
  loading = false,
}: CompositeVariationsInterfaceProps) {
  const [templates, setTemplates] = useState<CompositionTemplate[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null
  );
  const templatesRef = useRef<CompositionTemplate[]>([]);
  useEffect(() => {
    templatesRef.current = templates;
  }, [templates]);

  // For composite products, we don't use traditional variation types
  // Instead, each variation is defined by its unique composition
  const isCompositeVariationMode = product.isComposite && product.hasVariation;

  // Helper function to generate variation display names
  const generateVariationDisplayName = useCallback(
    (
      variation: ProductVariationItem,
      types: VariationType[],
      availableVars: Record<string, Variation[]>
    ): string => {
      const parts: string[] = [];

      Object.entries(variation.selections).forEach(([typeId, variationId]) => {
        const type = types.find((t) => t.id === typeId);
        const variationOptions = availableVars[typeId] || [];
        const selectedVariation = variationOptions.find(
          (v) => v.id === variationId
        );

        if (type && selectedVariation) {
          parts.push(`${type.name}: ${selectedVariation.name}`);
        }
      });

      return parts.join(", ");
    },
    []
  );

  // Build composition templates from existing variations and composition items
  useEffect(() => {
    if (!isCompositeVariationMode) {
      // Traditional composite + variation mode (with variation types)
      const selectedTypes = variationTypes.filter((type) =>
        selectedTypeIds.includes(type.id)
      );
      const weightModifyingType = selectedTypes.find(
        (type) => type.modifiesWeight
      );

      const newTemplates: CompositionTemplate[] = variations.map(
        (variation) => {
          const variationSku = `${product.sku}#${variation.id}`;
          const variationCompositionItems = compositionItems.filter(
            (item) => item.parentSku === variationSku
          );

          const displayName = generateVariationDisplayName(
            variation,
            selectedTypes,
            availableVariations
          );

          let totalWeight = 0;
          if (weightModifyingType && variation.weightOverride) {
            totalWeight = variation.weightOverride;
          } else {
            totalWeight = variationCompositionItems.reduce((sum, item) => {
              const availableItem = availableCompositionItems.find(
                (ai) => ai.sku === item.childSku
              );
              return sum + (availableItem?.weight || 0) * item.quantity;
            }, 0);
          }

          return {
            variationId: variation.id,
            variationDisplayName: displayName,
            items: variationCompositionItems.map((item) => {
              const availableItem = availableCompositionItems.find(
                (ai) => ai.sku === item.childSku
              );
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
        }
      );

      setTemplates(newTemplates);
    } else {
      // Pure composite variation mode (no variation types)
      const newTemplates: CompositionTemplate[] = variations.map(
        (variation, index) => {
          const variationSku = `${product.sku}#${variation.id}`;
          const variationCompositionItems = compositionItems.filter(
            (item) => item.parentSku === variationSku
          );

          // For composite variations, use a simple naming scheme
          const displayName = `Variation ${index + 1}`;

          const totalWeight = variationCompositionItems.reduce((sum, item) => {
            const availableItem = availableCompositionItems.find(
              (ai) => ai.sku === item.childSku
            );
            return sum + (availableItem?.weight || 0) * item.quantity;
          }, 0);

          return {
            variationId: variation.id,
            variationDisplayName: displayName,
            items: variationCompositionItems.map((item) => {
              const availableItem = availableCompositionItems.find(
                (ai) => ai.sku === item.childSku
              );
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
        }
      );

      setTemplates(newTemplates);
    }
  }, [
    variations,
    compositionItems,
    availableCompositionItems,
    variationTypes,
    selectedTypeIds,
    availableVariations,
    product.sku,
    isCompositeVariationMode,
    generateVariationDisplayName,
  ]);

  const addNewVariationCombination = useCallback(() => {
    if (isCompositeVariationMode) {
      // For pure composite variations, create a simple variation without traditional types
      const newVariationData: CreateProductVariationItemData = {
        productSku: product.sku,
        selections: {}, // Empty selections for composite variations
        weightOverride: undefined, // Weight will be calculated from composition
      };
      onCreateVariation(newVariationData);
    } else {
      // Traditional composite + variation mode
      const selectedTypes = variationTypes.filter((type) =>
        selectedTypeIds.includes(type.id)
      );
      const weightModifyingType = selectedTypes.find(
        (type) => type.modifiesWeight
      );

      const newVariationData: CreateProductVariationItemData = {
        productSku: product.sku,
        selections: {},
        weightOverride: weightModifyingType ? 0 : undefined,
      };
      onCreateVariation(newVariationData);
    }
  }, [
    product.sku,
    isCompositeVariationMode,
    variationTypes,
    selectedTypeIds,
    onCreateVariation,
  ]);

  const addCompositionItemToTemplate = useCallback((templateId: string) => {
    setTemplates((prev) =>
      prev.map((template) => {
        if (template.variationId === templateId) {
          const newItem = {
            id: `new-${Date.now()}`,
            childSku: "",
            displayName: "",
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
      })
    );
    setEditingTemplateId(templateId);
  }, []);

  const updateCompositionItem = useCallback(
    (templateId: string, itemId: string, field: string, value: any) => {
      setTemplates((prev) =>
        prev.map((template) => {
          if (template.variationId === templateId) {
            return {
              ...template,
              items: template.items.map((item) => {
                if (item.id === itemId) {
                  const updatedItem = { ...item, [field]: value };

                  // If changing childSku, update display name and weight
                  if (field === "childSku") {
                    const availableItem = availableCompositionItems.find(
                      (ai) => ai.sku === value
                    );
                    updatedItem.displayName =
                      availableItem?.displayName || value;
                    updatedItem.weight = availableItem?.weight;
                  }

                  return updatedItem;
                }
                return item;
              }),
            };
          }
          return template;
        })
      );
    },
    [availableCompositionItems]
  );

  const updateTemplateName = useCallback(
    (templateId: string, value: string) => {
      setTemplates((prev) =>
        prev.map((t) =>
          t.variationId === templateId
            ? { ...t, variationDisplayName: value }
            : t
        )
      );
    },
    []
  );

  const saveTemplateName = useCallback(
    async (templateId: string) => {
      const template = templates.find((t) => t.variationId === templateId);
      if (!template) return;
      const name = template.variationDisplayName.trim();
      if (!name) {
        alert("Name is required");
        return;
      }
      const exists = templates.some(
        (t) =>
          t.variationId !== templateId &&
          t.variationDisplayName.trim().toLowerCase() === name.toLowerCase()
      );
      if (exists) {
        alert("Variation name must be unique");
        return;
      }
      try {
        await onUpdateVariation(templateId, { name });
      } catch (error) {
        console.error("Failed to update variation name:", error);
      }
    },
    [templates, onUpdateVariation]
  );

  const saveCompositionItem = useCallback(
    async (templateId: string, itemId: string) => {
      const template = templates.find((t) => t.variationId === templateId);
      const item = template?.items.find((i) => i.id === itemId);

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
    },
    [templates, product.sku, onCreateCompositionItem]
  );

  const cancelEditCompositionItem = useCallback(
    (templateId: string, itemId: string) => {
      setTemplates((prev) =>
        prev.map((template) => {
          if (template.variationId === templateId) {
            if (template.items.find((i) => i.id === itemId)?.isNew) {
              // Remove new item
              return {
                ...template,
                items: template.items.filter((i) => i.id !== itemId),
              };
            } else {
              // Reset existing item
              return {
                ...template,
                items: template.items.map((item) =>
                  item.id === itemId ? { ...item, isEditing: false } : item
                ),
              };
            }
          }
          return template;
        })
      );
      setEditingTemplateId(null);
    },
    []
  );

  const deleteCompositionItem = useCallback(
    async (templateId: string, itemId: string) => {
      const template = templates.find((t) => t.variationId === templateId);
      const item = template?.items.find((i) => i.id === itemId);

      if (!item) return;

      if (item.isNew) {
        // Just remove from local state
        setTemplates((prev) =>
          prev.map((template) => {
            if (template.variationId === templateId) {
              return {
                ...template,
                items: template.items.filter((i) => i.id !== itemId),
              };
            }
            return template;
          })
        );
      } else {
        // Delete from backend
        try {
          await onDeleteCompositionItem(itemId);
        } catch (error) {
          console.error("Failed to delete composition item:", error);
        }
      }
    },
    [templates, onDeleteCompositionItem]
  );

  const moveTemplate = useCallback((dragIndex: number, hoverIndex: number) => {
    setTemplates((prev) => {
      const updated = [...prev];
      const [removed] = updated.splice(dragIndex, 1);
      updated.splice(hoverIndex, 0, removed);
      return updated;
    });
  }, []);

  const DraggableTemplate: React.FC<{
    template: CompositionTemplate;
    index: number;
    children: React.ReactNode;
  }> = ({ template, index, children }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [, drop] = useDrop<{ index: number }>({
      accept: "template",
      hover(item) {
        if (!ref.current) return;
        const dragIndex = item.index;
        const hoverIndex = index;
        if (dragIndex === hoverIndex) return;
        moveTemplate(dragIndex, hoverIndex);
        item.index = hoverIndex;
      },
    });
    const [{ isDragging }, drag] = useDrag({
      type: "template",
      item: { index },
      end: () =>
        onReorderVariations(templatesRef.current.map((t) => t.variationId)),
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    });
    drag(drop(ref));
    return (
      <div
        ref={ref}
        className={cn("border rounded-lg p-6", isDragging && "opacity-50")}
      >
        {children}
      </div>
    );
  };

  // Show different interfaces based on whether we're using traditional variation types or pure composite variations
  if (!isCompositeVariationMode && selectedTypeIds.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">
          Select variation types above to start creating composite variations
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">
              {isCompositeVariationMode
                ? "Composition-Based Variations"
                : "Composite Variations"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isCompositeVariationMode
                ? "Create variations by defining different composition combinations"
                : "Each variation combination has its own composition template"}
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
              <strong>
                {isCompositeVariationMode
                  ? "Pure Composite Variations:"
                  : "Composite + Variations Mode:"}
              </strong>
            </div>
            <div className="text-xs space-y-1">
              {isCompositeVariationMode ? (
                <>
                  <div>
                    • Each variation is defined by its unique composition
                  </div>
                  <div>• No traditional variation types are used</div>
                  <div>
                    • Create different &ldquo;versions&rdquo; by varying the
                    composition items
                  </div>
                  <div>
                    • Example: &ldquo;Kit Basic&rdquo; vs &ldquo;Kit
                    Premium&rdquo; with different components
                  </div>
                </>
              ) : (
                <>
                  <div>
                    • Each variation combination gets its own composition
                    template
                  </div>
                  <div>
                    • Specify exact child products/variations for each
                    combination
                  </div>
                  <div>
                    • Weight is calculated from selected child items (unless
                    overridden)
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Variation Templates */}
        <div className="space-y-6">
          {templates.map((template, index) => (
            <DraggableTemplate
              key={template.variationId}
              template={template}
              index={index}
            >
              {/* Template Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Input
                    value={template.variationDisplayName}
                    onChange={(e) =>
                      updateTemplateName(template.variationId, e.target.value)
                    }
                    onBlur={() => saveTemplateName(template.variationId)}
                    className="font-medium mb-1"
                  />
                  <p className="text-sm text-muted-foreground">
                    Total Weight: {template.totalWeight.toFixed(2)} kg
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      addCompositionItemToTemplate(template.variationId)
                    }
                    disabled={loading || editingTemplateId !== null}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDeleteVariation(template.variationId)}
                    disabled={loading || templates.length <= 1}
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
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        Child Product
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        Unit Weight
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        Total Weight
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium w-24">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {template.items.map((item) => (
                      <tr
                        key={item.id}
                        className={cn(
                          "border-t",
                          item.isEditing && "bg-blue-50"
                        )}
                      >
                        <td className="px-4 py-3">
                          {item.isEditing ? (
                            <select
                              value={item.childSku}
                              onChange={(e) =>
                                updateCompositionItem(
                                  template.variationId,
                                  item.id,
                                  "childSku",
                                  e.target.value
                                )
                              }
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              <option value="">Select Product</option>
                              {availableCompositionItems.map(
                                (availableItem) => (
                                  <option
                                    key={availableItem.sku}
                                    value={availableItem.sku}
                                  >
                                    {availableItem.displayName} (
                                    {availableItem.type})
                                  </option>
                                )
                              )}
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
                              onChange={(e) =>
                                updateCompositionItem(
                                  template.variationId,
                                  item.id,
                                  "quantity",
                                  parseInt(e.target.value) || 1
                                )
                              }
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
                            {item.weight
                              ? `${(item.weight * item.quantity).toFixed(2)} kg`
                              : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {item.isEditing ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    saveCompositionItem(
                                      template.variationId,
                                      item.id
                                    )
                                  }
                                  disabled={loading}
                                  aria-label="Save"
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    cancelEditCompositionItem(
                                      template.variationId,
                                      item.id
                                    )
                                  }
                                  disabled={loading}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  deleteCompositionItem(
                                    template.variationId,
                                    item.id
                                  )
                                }
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
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-muted-foreground"
                        >
                          No composition items yet. Click &quot;Add Item&quot;
                          to start building this variation.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </DraggableTemplate>
          ))}

          {templates.length === 0 && (
            <div className="text-center py-8">
              <div className="text-muted-foreground">
                No variation combinations created yet. Click &quot;New
                Variation&quot; to create your first composite variation.
              </div>
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
}
