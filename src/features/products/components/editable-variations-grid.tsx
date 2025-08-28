"use client";

import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Trash2, Save, X } from "lucide-react";
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
  onUpdateVariation: (
    id: string,
    data: UpdateProductVariationItemData
  ) => Promise<void>;
  onDeleteVariation: (id: string) => Promise<void>;
  onReorderVariations: (ids: string[]) => Promise<void>;
  loading?: boolean;
}

interface GridRow {
  id: string;
  isNew: boolean;
  isEditing: boolean;
  name: string;
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
  onReorderVariations,
  loading = false,
}: EditableVariationsGridProps) {
  const [rows, setRows] = useState<GridRow[]>([]);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const rowsRef = useRef<GridRow[]>([]);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // Get selected variation types
  const selectedTypes = variationTypes.filter((type) =>
    selectedTypeIds.includes(type.id)
  );

  // Check which types modify dimensions or weight
  const dimensionModifyingType = selectedTypes.find(
    (type) => type.modifiesDimensions
  );
  const weightModifyingType = selectedTypes.find((type) => type.modifiesWeight);

  // Convert existing variations to grid rows
  useEffect(() => {
    const gridRows: GridRow[] = variations.map((variation, index) => ({
      id: variation.id,
      isNew: false,
      isEditing: false,
      name: variation.name || `Variation ${index + 1}`,
      selections: { ...variation.selections },
      weightOverride: variation.weightOverride,
      dimensionsOverride: variation.dimensionsOverride,
      originalItem: variation,
    }));
    setRows(gridRows);
  }, [variations]);

  const generateDefaultName = useCallback(() => {
    let counter = 1;
    const existing = new Set(rows.map((r) => r.name.toLowerCase()));
    while (existing.has(`variation ${counter}`)) {
      counter++;
    }
    return `Variation ${counter}`;
  }, [rows]);

  const addNewRow = () => {
    const newRow: GridRow = {
      id: `new-${Date.now()}`,
      isNew: true,
      isEditing: true,
      name: generateDefaultName(),
      selections: {},
      weightOverride: undefined,
      dimensionsOverride: undefined,
    };
    setRows((prev) => [...prev, newRow]);
    setEditingRowId(newRow.id);
  };

  const startEditing = (rowId: string) => {
    setEditingRowId(rowId);
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, isEditing: true } : row))
    );
  };

  const cancelEditing = (rowId: string) => {
    setEditingRowId(null);
    setRows((prev) => {
      if (prev.find((row) => row.id === rowId)?.isNew) {
        // Remove new row if cancelled
        return prev.filter((row) => row.id !== rowId);
      } else {
        // Restore original values for existing row
        return prev.map((row) => {
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
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;

    // Validate that all required selections are filled
    const missingSelections = selectedTypeIds.filter(
      (typeId) => !row.selections[typeId]
    );
    if (missingSelections.length > 0) {
      alert("Please fill all variation selections");
      return;
    }

    // Check for duplicate combinations
    const isDuplicate = rows.some((otherRow) => {
      if (otherRow.id === rowId || otherRow.isNew) return false;
      return selectedTypeIds.every(
        (typeId) => otherRow.selections[typeId] === row.selections[typeId]
      );
    });

    if (isDuplicate) {
      alert("This combination already exists");
      return;
    }

    const nameExists = rows.some(
      (otherRow) =>
        otherRow.id !== rowId &&
        otherRow.name.trim().toLowerCase() === row.name.trim().toLowerCase()
    );
    if (nameExists) {
      alert("Variation name must be unique");
      return;
    }

    try {
      if (row.isNew) {
        // Create new variation
        await onCreateVariation({
          productSku: product.sku,
          selections: row.selections,
          name: row.name,
          weightOverride: row.weightOverride,
          dimensionsOverride: row.dimensionsOverride,
        });
      } else if (row.originalItem) {
        // Update existing variation
        await onUpdateVariation(row.originalItem.id, {
          selections: row.selections,
          name: row.name,
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
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;

    if (row.isNew) {
      // Just remove from local state
      setRows((prev) => prev.filter((r) => r.id !== rowId));
    } else if (row.originalItem) {
      // Delete from backend
      try {
        await onDeleteVariation(row.originalItem.id);
      } catch (error) {
        console.error("Failed to delete variation:", error);
      }
    }
  };

  const updateRowSelection = (
    rowId: string,
    typeId: string,
    variationId: string
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? { ...row, selections: { ...row.selections, [typeId]: variationId } }
          : row
      )
    );
  };

  const updateRowName = (rowId: string, name: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, name } : row))
    );
  };

  const updateRowWeight = (rowId: string, weight: number | undefined) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, weightOverride: weight } : row
      )
    );
  };

  const updateRowDimensions = (
    rowId: string,
    field: "height" | "width" | "depth",
    value: number | undefined
  ) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const newDimensions = row.dimensionsOverride || {
            height: 0,
            width: 0,
            depth: 0,
          };
          return {
            ...row,
            dimensionsOverride: {
              ...newDimensions,
              [field]: value || 0,
            },
          };
        }
        return row;
      })
    );
  };

  const moveRow = useCallback((dragIndex: number, hoverIndex: number) => {
    setRows((prev) => {
      const updated = [...prev];
      const [removed] = updated.splice(dragIndex, 1);
      updated.splice(hoverIndex, 0, removed);
      return updated;
    });
  }, []);

  const DraggableRow: React.FC<{
    row: GridRow;
    index: number;
    children: React.ReactNode;
  }> = ({ row, index, children }) => {
    const ref = useRef<HTMLTableRowElement>(null);
    const [, drop] = useDrop<{ index: number }>({
      accept: "row",
      hover(item) {
        if (!ref.current) return;
        const dragIndex = item.index;
        const hoverIndex = index;
        if (dragIndex === hoverIndex) return;
        moveRow(dragIndex, hoverIndex);
        item.index = hoverIndex;
      },
    });
    const [{ isDragging }, drag] = useDrag({
      type: "row",
      item: { index },
      end: () =>
        onReorderVariations(
          rowsRef.current.filter((r) => !r.isNew).map((r) => r.id)
        ),
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    });
    drag(drop(ref));
    return (
      <tr
        ref={ref}
        className={cn(
          "border-t",
          row.isEditing && "bg-blue-50",
          isDragging && "opacity-50"
        )}
      >
        {children}
      </tr>
    );
  };

  const getVariationName = (typeId: string, variationId: string): string => {
    const variation = availableVariations[typeId]?.find(
      (v) => v.id === variationId
    );
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
    <DndProvider backend={HTML5Backend}>
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
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Name
                  </th>
                  {/* Variation type columns */}
                  {selectedTypes.map((type) => (
                    <th
                      key={type.id}
                      className="px-4 py-3 text-left text-sm font-medium"
                    >
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
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        Height (cm)
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        Width (cm)
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium">
                        Depth (cm)
                      </th>
                    </>
                  )}

                  {/* Actions column */}
                  <th className="px-4 py-3 text-left text-sm font-medium w-24">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <DraggableRow key={row.id} index={index} row={row}>
                    <td className="px-4 py-3">
                      {row.isEditing ? (
                        <Input
                          value={row.name}
                          onChange={(e) =>
                            updateRowName(row.id, e.target.value)
                          }
                          className="w-full text-sm"
                        />
                      ) : (
                        <span className="text-sm">{row.name}</span>
                      )}
                    </td>
                    {/* Variation selection cells */}
                    {selectedTypes.map((type) => (
                      <td key={type.id} className="px-4 py-3">
                        {row.isEditing ? (
                          <select
                            value={row.selections[type.id] || ""}
                            onChange={(e) =>
                              updateRowSelection(
                                row.id,
                                type.id,
                                e.target.value
                              )
                            }
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            <option value="">Select {type.name}</option>
                            {availableVariations[type.id]?.map((variation) => (
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
                            onChange={(e) =>
                              updateRowWeight(
                                row.id,
                                e.target.value
                                  ? parseFloat(e.target.value)
                                  : undefined
                              )
                            }
                            className="w-20 text-sm"
                            placeholder="0.00"
                          />
                        ) : (
                          <span className="text-sm">
                            {row.weightOverride
                              ? `${row.weightOverride} kg`
                              : "—"}
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
                              onChange={(e) =>
                                updateRowDimensions(
                                  row.id,
                                  "height",
                                  e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined
                                )
                              }
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
                              onChange={(e) =>
                                updateRowDimensions(
                                  row.id,
                                  "width",
                                  e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined
                                )
                              }
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
                              onChange={(e) =>
                                updateRowDimensions(
                                  row.id,
                                  "depth",
                                  e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined
                                )
                              }
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
                  </DraggableRow>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={
                        selectedTypes.length +
                        (weightModifyingType ? 1 : 0) +
                        (dimensionModifyingType ? 3 : 0) +
                        2
                      }
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No variations created yet. Click &quot;New Line&quot; to
                      add your first variation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
