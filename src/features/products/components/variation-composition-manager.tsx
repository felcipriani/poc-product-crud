"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Package,
  AlertCircle,
} from "lucide-react";
import { Product } from "@/lib/domain/entities/product";
import {
  CompositeVariation,
  CreateCompositeVariationData,
  UpdateCompositeVariationData,
} from "@/lib/domain/entities/composite-variation";
import {
  CompositionItem,
  CreateCompositionItemData,
  UpdateCompositionItemData,
} from "@/lib/domain/entities/composition-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";
import { CompositeVariationRules } from "@/lib/domain/entities/composite-variation";

export interface VariationCompositionManagerProps {
  product: Product;
  variations: CompositeVariation[];
  onVariationCreate: (data: CreateCompositeVariationData) => Promise<void>;
  onVariationUpdate: (
    id: string,
    data: UpdateCompositeVariationData
  ) => Promise<void>;
  onVariationDelete: (id: string) => Promise<void>;
  onCompositionItemAdd: (
    variationId: string,
    item: CreateCompositionItemData
  ) => Promise<void>;
  onCompositionItemUpdate: (
    variationId: string,
    itemId: string,
    data: UpdateCompositionItemData
  ) => Promise<void>;
  onCompositionItemDelete: (
    variationId: string,
    itemId: string
  ) => Promise<void>;
  loading?: boolean;
}

export function VariationCompositionManager({
  product,
  variations,
  onVariationCreate,
  onVariationUpdate,
  onVariationDelete,
  onCompositionItemAdd,
  onCompositionItemUpdate,
  onCompositionItemDelete,
  loading = false,
}: VariationCompositionManagerProps) {
  const [activeVariationId, setActiveVariationId] = useState(variations[0]?.id);
  const [editingVariationId, setEditingVariationId] = useState<string | null>(
    null
  );
  const [newVariationName, setNewVariationName] = useState("");

  const activeVariation = useMemo(
    () => variations.find((v) => v.id === activeVariationId),
    [variations, activeVariationId]
  );

  // Auto-select first variation when variations change
  React.useEffect(() => {
    if (variations.length > 0 && !activeVariationId) {
      setActiveVariationId(variations[0].id);
    }
  }, [variations, activeVariationId]);

  const handleVariationRename = async (id: string, newName: string) => {
    const trimmedName = newName.trim();

    if (!trimmedName) {
      setEditingVariationId(null);
      setNewVariationName("");
      return;
    }

    // Validate name uniqueness
    const validation = CompositeVariationRules.validateNameUniqueness(
      trimmedName,
      product.sku,
      variations,
      id
    );

    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    try {
      await onVariationUpdate(id, { name: trimmedName });
      setEditingVariationId(null);
      setNewVariationName("");
    } catch (error) {
      console.error("Failed to rename variation:", error);
      alert("Failed to rename variation. Please try again.");
    }
  };

  const handleVariationDelete = async (id: string) => {
    const variation = variations.find((v) => v.id === id);
    if (!variation) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${variation.name}"? This will permanently remove all composition items for this variation.`
    );

    if (!confirmed) return;

    try {
      await onVariationDelete(id);

      // Switch to another variation if the active one was deleted
      if (activeVariationId === id) {
        const remainingVariations = variations.filter((v) => v.id !== id);
        if (remainingVariations.length > 0) {
          setActiveVariationId(remainingVariations[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to delete variation:", error);
      alert("Failed to delete variation. Please try again.");
    }
  };

  const handleCreateVariation = async () => {
    const nextName =
      CompositeVariationRules.generateNextVariationName(variations);

    try {
      await onVariationCreate({
        productSku: product.sku,
        name: nextName,
      });
    } catch (error) {
      console.error("Failed to create variation:", error);
      alert("Failed to create variation. Please try again.");
    }
  };

  if (!product.isComposite || !product.hasVariation) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <div className="text-muted-foreground">
          This interface is only available for composite products with
          variations enabled.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Composition Variations</h3>
          <p className="text-sm text-muted-foreground">
            Each variation has its own unique composition of components
          </p>
        </div>

        <Button
          onClick={handleCreateVariation}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Variation
        </Button>
      </div>

      {/* Info Box */}
      <div className="rounded-md bg-blue-50 p-4">
        <div className="text-sm text-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4" />
            <strong>Composition-Based Variations:</strong>
          </div>
          <div className="text-xs space-y-1">
            <div>• Each variation is defined by its unique composition</div>
            <div>• No traditional variation types are used</div>
            <div>
              • Create different &ldquo;versions&rdquo; by varying the
              composition items
            </div>
            <div>
              • Example: &ldquo;Kit Basic&rdquo; vs &ldquo;Kit Premium&rdquo;
              with different components
            </div>
          </div>
        </div>
      </div>

      {variations.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <div className="text-lg font-medium text-muted-foreground mb-2">
            No variations created yet
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            Create your first variation to start building different compositions
          </div>
          <Button onClick={handleCreateVariation} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Variation
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          {/* Variation Tabs */}
          <div className="flex items-center border-b bg-gray-50 p-1 overflow-x-auto">
            {variations.map((variation) => (
              <div
                key={variation.id}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors whitespace-nowrap",
                  activeVariationId === variation.id
                    ? "bg-white shadow-sm border"
                    : "hover:bg-gray-100"
                )}
                onClick={() => setActiveVariationId(variation.id)}
              >
                {editingVariationId === variation.id ? (
                  <Input
                    value={newVariationName}
                    onChange={(e) => setNewVariationName(e.target.value)}
                    onBlur={() => {
                      if (newVariationName.trim()) {
                        handleVariationRename(
                          variation.id,
                          newVariationName.trim()
                        );
                      } else {
                        setEditingVariationId(null);
                        setNewVariationName("");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      } else if (e.key === "Escape") {
                        setEditingVariationId(null);
                        setNewVariationName("");
                      }
                    }}
                    className="h-6 text-sm min-w-[120px]"
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="text-sm font-medium">
                      {variation.name}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {variation.compositionItems.length} items
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {variation.totalWeight.toFixed(2)}kg
                    </span>
                  </>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreHorizontal className="h-3 w-3" />
                      <span className="sr-only">Variation options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingVariationId(variation.id);
                        setNewVariationName(variation.name);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleVariationDelete(variation.id)}
                      disabled={variations.length <= 1}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>

          {/* Active Variation Composition */}
          <div className="p-6">
            {activeVariation ? (
              <VariationCompositionEditor
                variation={activeVariation}
                onItemAdd={(item) =>
                  onCompositionItemAdd(activeVariation.id, item)
                }
                onItemUpdate={(itemId, data) =>
                  onCompositionItemUpdate(activeVariation.id, itemId, data)
                }
                onItemDelete={(itemId) =>
                  onCompositionItemDelete(activeVariation.id, itemId)
                }
                loading={loading}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No variation selected
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Placeholder for VariationCompositionEditor - will be implemented next
interface VariationCompositionEditorProps {
  variation: CompositeVariation;
  onItemAdd: (item: CreateCompositionItemData) => Promise<void>;
  onItemUpdate: (
    itemId: string,
    data: UpdateCompositionItemData
  ) => Promise<void>;
  onItemDelete: (itemId: string) => Promise<void>;
  loading?: boolean;
}

function VariationCompositionEditor({
  variation,
  onItemAdd,
  onItemUpdate,
  onItemDelete,
  loading = false,
}: VariationCompositionEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{variation.name} Composition</h4>
        <Button size="sm" disabled={loading}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {variation.compositionItems.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
          <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <div className="text-sm text-muted-foreground">
            No composition items yet. Add items to build this variation.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {variation.compositionItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div>
                <div className="font-medium">{item.childSku}</div>
                <div className="text-sm text-muted-foreground">
                  Quantity: {item.quantity}
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-red-600">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
