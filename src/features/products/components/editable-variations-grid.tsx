"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Plus, Trash2, Save, X } from "lucide-react";
import { Product } from "@/lib/domain/entities/product";
import { ProductVariationItem, CreateProductVariationItemData, UpdateProductVariationItemData } from "@/lib/domain/entities/product-variation-item";
import { VariationType } from "@/lib/domain/entities/variation-type";
import { Variation } from "@/lib/domain/entities/variation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

export interface EditableVariationsGridProps {
  product: Product;
  variations: ProductVariationItem[];
  variationTypes: VariationType[];
  availableVariations: Record<string, Variation[]>;
  selectedTypeIds: string[];
  onCreateVariation: (data: CreateProductVariationItemData) => Promise<void>;
  onUpdateVariation: (id: string, data: UpdateProductVariationItemData) => Promise<void>;
  onDeleteVariation: (id: string) => Promise<void>;
  loading?: boolean;
}

interface GridRow {
  id: string;
  isNew: boolean;
  isEditing: boolean;
  selections: Record<string, string>;
  weightOverride?: number;
  dimensionsOverride?: {
    height: number;
    width: number;
    depth: number;
  };
  originalItem?: ProductVariationItem;
}

export function EditableVariationsGrid({
  product,
  variations,
  variationTypes,
  availableVariations,
  selectedTypeIds,
  onCreateVariation,
  onUpdateVariation,
  onDeleteVariation,
  loading = false,
}: EditableVariationsGridProps) {
  const [rows, setRows] = useState<GridRow[]>([]);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  // Get selected variation types
  const selectedTypes = variationTypes.filter(type => selectedTypeIds.includes(type.id));
  
  // Check which types modify dimensions or weight
  const dimensionModifyingType = selectedTypes.find(type => type.modifiesDimensions);
  const weightModifyingType = selectedTypes.find(type => type.modifiesWeight);

  // Convert existing variations to grid rows
  useEffect(() => {
    const gridRows: GridRow[] = variations.map(variation => ({
      id: variation.id,
      isNew: false,
      isEditing: false,
      selections: { ...variation.selections },
      weightOverride: variation.weightOverride,
      dimensionsOverride: variation.dimensionsOverride,
      originalItem: variation,
    }));
    setRows(gridRows);
  }, [variations]);

  const addNewRow = () => {
    const newRow: GridRow = {
      id: `new-${Date.now()}`,
      isNew: true,
      isEditing: true,
      selections: {},
      weightOverride: undefined,
      dimensionsOverride: undefined,
    };
    setRows(prev => [...prev, newRow]);
    setEditingRowId(newRow.id);
  };

  const startEditing = (rowId: string) => {
    setEditingRowId(rowId);
    setRows(prev => prev.map(row => 
      row.id === rowId ? { ...row, isEditing: true } : row
    ));
  };

  const cancelEditing = (rowId: string) => {
    setEditingRowId(null);
    setRows(prev => {
      if (prev.find(row => row.id === rowId)?.isNew) {
        // Remove new row if cancelled
        return prev.filter(row => row.id !== rowId);
      } else {
        // Restore original values for existing row
        return prev.map(row => {
          if (row.id === rowId && row.originalItem) {
            return {
              ...row,
              isEditing: false,
              selections: { ...row.originalItem.selections },
              weightOverride: row.originalItem.weightOverride,
              dimensionsOverride: row.originalItem.dimensionsOverride,
            };
          }
          return row;
        });
      }
    });
  };

  const saveRow = async (rowId: string) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;

    // Validate that all required selections are filled
    const missingSelections = selectedTypeIds.filter(typeId => !row.selections[typeId]);
    if (missingSelections.length > 0) {
      alert("Please fill all variation selections");
      return;
    }

    // Check for duplicates
    const isDuplicate = rows.some(otherRow => {
      if (otherRow.id === rowId || otherRow.isNew) return false;
      return selectedTypeIds.every(typeId => 
        otherRow.selections[typeId] === row.selections[typeId]
      );
    });

    if (isDuplicate) {
      alert("This combination already exists");
      return;
    }

    try {
      if (row.isNew) {
        // Create new variation
        await onCreateVariation({
          productSku: product.sku,
          selections: row.selections,
          weightOverride: row.weightOverride,
          dimensionsOverride: row.dimensionsOverride,
        });
      } else if (row.originalItem) {
        // Update existing variation
        await onUpdateVariation(row.originalItem.id, {
          selections: row.selections,
          weightOverride: row.weightOverride,
          dimensionsOverride: row.dimensionsOverride,
        });
      }
      
      setEditingRowId(null);
    } catch (error) {
      console.error("Failed to save variation:", error);
    }
  };

  const deleteRow = async (rowId: string) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;

    if (row.isNew) {
      // Just remove from local state
      setRows(prev => prev.filter(r => r.id !== rowId));
    } else if (row.originalItem) {
      // Delete from backend
      try {
        await onDeleteVariation(row.originalItem.id);
      } catch (error) {
        console.error("Failed to delete variation:", error);
      }
    }
  };

  const updateRowSelection = (rowId: string, typeId: string, variationId: string) => {
    setRows(prev => prev.map(row => 
      row.id === rowId 
        ? { ...row, selections: { ...row.selections, [typeId]: variationId } }
        : row
    ));
  };

  const updateRowWeight = (rowId: string, weight: number | undefined) => {
    setRows(prev => prev.map(row => 
      row.id === rowId ? { ...row, weightOverride: weight } : row
    ));
  };

  const updateRowDimensions = (rowId: string, field: 'height' | 'width' | 'depth', value: number | undefined) => {
    setRows(prev => prev.map(row => {
      if (row.id === rowId) {
        const newDimensions = row.dimensionsOverride || { height: 0, width: 0, depth: 0 };
        return {
          ...row,
          dimensionsOverride: {
            ...newDimensions,
            [field]: value || 0,
          }
        };
      }
      return row;
    }));
  };

  const getVariationName = (typeId: string, variationId: string): string => {
    const variation = availableVariations[typeId]?.find(v => v.id === variationId);
    return variation?.name || "";
  };

  if (selectedTypeIds.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">
          Select variation types above to start creating variations
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Variation Combinations</h3>
        <Button
          onClick={addNewRow}
          disabled={loading || editingRowId !== null}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Line
        </Button>
      </div>

      {/* Grid */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                {/* Variation type columns */}
                {selectedTypes.map(type => (
                  <th key={type.id} className="px-4 py-3 text-left text-sm font-medium">
                    {type.name}
                  </th>
                ))}
                
                {/* Weight column if there's a weight-modifying type */}
                {weightModifyingType && (
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Weight (kg)
                  </th>
                )}
                
                {/* Dimension columns if there's a dimension-modifying type */}
                {dimensionModifyingType && (
                  <>
                    <th className="px-4 py-3 text-left text-sm font-medium">Height (cm)</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Width (cm)</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Depth (cm)</th>
                  </>
                )}
                
                {/* Actions column */}
                <th className="px-4 py-3 text-left text-sm font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className={cn(
                  "border-t",
                  row.isEditing && "bg-blue-50"
                )}>
                  {/* Variation selection cells */}
                  {selectedTypes.map(type => (
                    <td key={type.id} className="px-4 py-3">
                      {row.isEditing ? (
                        <select
                          value={row.selections[type.id] || ""}
                          onChange={(e) => updateRowSelection(row.id, type.id, e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="">Select {type.name}</option>
                          {availableVariations[type.id]?.map(variation => (
                            <option key={variation.id} value={variation.id}>
                              {variation.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm">
                          {getVariationName(type.id, row.selections[type.id])}
                        </span>
                      )}
                    </td>
                  ))}
                  
                  {/* Weight override cell */}
                  {weightModifyingType && (
                    <td className="px-4 py-3">
                      {row.isEditing ? (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.weightOverride || ""}
                          onChange={(e) => updateRowWeight(row.id, e.target.value ? parseFloat(e.target.value) : undefined)}
                          className="w-20 text-sm"
                          placeholder="0.00"
                        />
                      ) : (
                        <span className="text-sm">
                          {row.weightOverride ? `${row.weightOverride} kg` : "—"}
                        </span>
                      )}
                    </td>
                  )}
                  
                  {/* Dimension override cells */}
                  {dimensionModifyingType && (
                    <>
                      <td className="px-4 py-3">
                        {row.isEditing ? (
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={row.dimensionsOverride?.height || ""}
                            onChange={(e) => updateRowDimensions(row.id, 'height', e.target.value ? parseFloat(e.target.value) : undefined)}
                            className="w-20 text-sm"
                            placeholder="0.0"
                          />
                        ) : (
                          <span className="text-sm">
                            {row.dimensionsOverride?.height || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.isEditing ? (
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={row.dimensionsOverride?.width || ""}
                            onChange={(e) => updateRowDimensions(row.id, 'width', e.target.value ? parseFloat(e.target.value) : undefined)}
                            className="w-20 text-sm"
                            placeholder="0.0"
                          />
                        ) : (
                          <span className="text-sm">
                            {row.dimensionsOverride?.width || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.isEditing ? (
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            value={row.dimensionsOverride?.depth || ""}
                            onChange={(e) => updateRowDimensions(row.id, 'depth', e.target.value ? parseFloat(e.target.value) : undefined)}
                            className="w-20 text-sm"
                            placeholder="0.0"
                          />
                        ) : (
                          <span className="text-sm">
                            {row.dimensionsOverride?.depth || "—"}
                          </span>
                        )}
                      </td>
                    </>
                  )}
                  
                  {/* Actions cell */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {row.isEditing ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => saveRow(row.id)}
                            disabled={loading}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelEditing(row.id)}
                            disabled={loading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(row.id)}
                            disabled={loading || editingRowId !== null}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRow(row.id)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              
              {rows.length === 0 && (
                <tr>
                  <td 
                    colSpan={selectedTypes.length + (weightModifyingType ? 1 : 0) + (dimensionModifyingType ? 3 : 0) + 1}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No variations created yet. Click &quot;New Line&quot; to add your first variation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}