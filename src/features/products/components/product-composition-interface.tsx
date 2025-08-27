"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { Product } from "@/lib/domain/entities/product";
import { CompositionItem, CreateCompositionItemData } from "@/lib/domain/entities/composition-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccessibleTable, Column } from "@/components/shared/data-table/accessible-table";
import { LoadingSpinner } from "@/components/shared/loading/loading-spinner";
import { LegacyModal } from "@/components/shared/modals/modal";
import { Search, Plus, Trash2, Package, Calculator } from "lucide-react";
import { useComposition, CompositionItemWithDetails } from "../hooks/use-composition";

export interface ProductCompositionInterfaceProps {
  product: Product;
}

export function ProductCompositionInterface({ product }: ProductCompositionInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedChildSku, setSelectedChildSku] = useState("");
  const [quantity, setQuantity] = useState(1);

  const {
    compositionItems,
    availableItems,
    totalWeight,
    loading,
    error,
    createCompositionItem,
    updateCompositionItem,
    deleteCompositionItem,
    refreshComposition,
  } = useComposition(product.sku);

  // Filter available items based on search query
  const filteredAvailableItems = React.useMemo(() => {
    if (!searchQuery.trim()) return availableItems;
    
    const query = searchQuery.toLowerCase();
    return availableItems.filter(item => 
      item.displayName.toLowerCase().includes(query) ||
      item.sku.toLowerCase().includes(query)
    );
  }, [availableItems, searchQuery]);

  const handleAddCompositionItem = useCallback(async () => {
    if (!selectedChildSku || quantity <= 0) return;

    try {
      await createCompositionItem({
        parentSku: product.sku,
        childSku: selectedChildSku,
        quantity,
      });
      
      // Reset form
      setSelectedChildSku("");
      setQuantity(1);
      setShowAddModal(false);
    } catch (error) {
      console.error("Failed to add composition item:", error);
    }
  }, [selectedChildSku, quantity, product.sku, createCompositionItem]);

  const handleUpdateQuantity = useCallback(async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) return;
    
    try {
      await updateCompositionItem(itemId, { quantity: newQuantity });
    } catch (error) {
      console.error("Failed to update quantity:", error);
    }
  }, [updateCompositionItem]);

  const handleDeleteItem = useCallback(async (itemId: string) => {
    if (!confirm("Are you sure you want to remove this item from the composition?")) {
      return;
    }
    
    try {
      await deleteCompositionItem(itemId);
    } catch (error) {
      console.error("Failed to delete composition item:", error);
    }
  }, [deleteCompositionItem]);

  if (!product.isComposite) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <div className="text-muted-foreground">
          This product is not marked as composite. Enable &ldquo;Composite Product&rdquo; in the Details tab to manage composition.
        </div>
      </div>
    );
  }

  const columns: Column<CompositionItemWithDetails>[] = [
    {
      key: "displayName",
      label: "Product",
      sortable: true,
      render: (_, item) => (
        <div>
          <div className="font-medium">{item.displayName || item.childSku}</div>
          <div className="text-sm text-muted-foreground">
            SKU: {item.childSku}
            {item.childType && (
              <span className="ml-2 px-2 py-1 bg-gray-100 text-xs rounded">
                {item.childType}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "quantity",
      label: "Quantity",
      sortable: true,
      render: (_, item) => (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => {
              const newQuantity = parseInt(e.target.value);
              if (newQuantity > 0) {
                handleUpdateQuantity(item.id, newQuantity);
              }
            }}
            className="w-20"
          />
        </div>
      ),
    },
    {
      key: "unitWeight",
      label: "Unit Weight (kg)",
      sortable: true,
      render: (_, item) => (
        <div className="text-center">
          {item.unitWeight !== undefined ? item.unitWeight.toFixed(2) : "—"}
        </div>
      ),
    },
    {
      key: "unitWeight", // Using unitWeight as key since totalWeight is calculated
      label: "Total Weight (kg)",
      sortable: true,
      render: (_, item) => (
        <div className="text-center font-medium">
          {item.unitWeight !== undefined 
            ? (item.unitWeight * item.quantity).toFixed(2) 
            : "—"
          }
        </div>
      ),
    },
    {
      key: "id",
      label: "Actions",
      render: (_, item) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteItem(item.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Composition
          </h2>
          <p className="text-muted-foreground">
            Configure the components that make up this composite product
          </p>
        </div>
        
        <Button onClick={() => setShowAddModal(true)} disabled={loading}>
          <Plus className="h-4 w-4 mr-2" />
          Add Component
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Weight Summary */}
      <div className="rounded-lg border p-4 bg-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-900">Total Calculated Weight</span>
          </div>
          <div className="text-xl font-bold text-blue-900">
            {totalWeight !== undefined ? `${totalWeight.toFixed(2)} kg` : "Calculating..."}
          </div>
        </div>
        <div className="text-sm text-blue-700 mt-1">
          Weight is automatically calculated from component products and their quantities
        </div>
      </div>

      {/* Composition Items Table */}
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : compositionItems.length === 0 ? (
        <div className="text-center py-8 border rounded-lg">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <div className="text-muted-foreground mb-4">
            No composition items configured yet
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Component
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <AccessibleTable
            data={compositionItems}
            columns={columns}
            loading={loading}
            emptyMessage="No composition items found"
          />
        </div>
      )}

      {/* Add Composition Item Modal */}
      <LegacyModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        title="Add Composition Item"
        description="Select a product and specify the quantity to add to this composition"
        size="lg"
      >
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Product Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Product</label>
            <div className="max-h-60 overflow-y-auto border rounded-md">
              {filteredAvailableItems.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  {searchQuery ? 'No products match your search' : 'No products available'}
                </div>
              ) : (
                filteredAvailableItems.map((item) => (
                  <div
                    key={item.sku}
                    className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                      selectedChildSku === item.sku ? "bg-blue-50 border-blue-200" : ""
                    }`}
                    onClick={() => setSelectedChildSku(item.sku)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{item.displayName}</div>
                        <div className="text-sm text-muted-foreground">
                          SKU: {item.sku}
                          {item.weight && (
                            <span className="ml-2">• Weight: {item.weight}kg</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-gray-100 text-xs rounded">
                          {item.type}
                        </span>
                        {selectedChildSku === item.sku && (
                          <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quantity</label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              placeholder="Enter quantity"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setSelectedChildSku("");
                setQuantity(1);
                setSearchQuery("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddCompositionItem}
              disabled={!selectedChildSku || quantity <= 0}
            >
              Add to Composition
            </Button>
          </div>
        </div>
      </LegacyModal>
    </div>
  );
}