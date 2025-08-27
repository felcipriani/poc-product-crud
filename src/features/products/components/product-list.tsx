"use client";

import * as React from "react";
import { useState } from "react";
import { Search, Plus, Filter, Edit, Trash2, Package, Layers, Zap } from "lucide-react";
import { Product } from "@/lib/domain/entities/product";
import { AccessibleTable, Column, SortDirection } from "@/components/shared/data-table/accessible-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/shared/modals/modal";
import { cn } from "@/lib/utils/cn";

export interface ProductListProps {
  products: Product[];
  loading: boolean;
  onCreateProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (sku: string) => Promise<void>;
  onSearch: (query: string) => void;
  onFilterChange: (filters: { isComposite?: boolean; hasVariation?: boolean }) => void;
  searchQuery: string;
  filters: { isComposite?: boolean; hasVariation?: boolean };
}

export function ProductList({
  products,
  loading,
  onCreateProduct,
  onEditProduct,
  onDeleteProduct,
  onSearch,
  onFilterChange,
  searchQuery,
  filters,
}: ProductListProps) {
  const [sortBy, setSortBy] = useState<keyof Product>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; product?: Product }>({
    open: false,
  });
  const [deleting, setDeleting] = useState(false);

  const handleSort = (key: keyof Product, direction: SortDirection) => {
    setSortBy(key);
    setSortDirection(direction);
  };

  const handleDeleteClick = (product: Product) => {
    setDeleteModal({ open: true, product });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.product) return;
    
    try {
      setDeleting(true);
      await onDeleteProduct(deleteModal.product.sku);
      setDeleteModal({ open: false });
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setDeleting(false);
    }
  };

  const handleFilterClick = (filterType: "composite" | "variation" | "all") => {
    switch (filterType) {
      case "composite":
        onFilterChange({ 
          isComposite: filters.isComposite ? undefined : true,
          hasVariation: undefined 
        });
        break;
      case "variation":
        onFilterChange({ 
          isComposite: undefined,
          hasVariation: filters.hasVariation ? undefined : true 
        });
        break;
      case "all":
        onFilterChange({});
        break;
    }
  };

  // Sort products
  const sortedProducts = React.useMemo(() => {
    if (!sortDirection) return products;

    return [...products].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (aValue === bValue) return 0;
      
      let comparison = 0;
      if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [products, sortBy, sortDirection]);

  const columns: Column<Product>[] = [
    {
      key: "sku",
      label: "SKU",
      sortable: true,
      className: "font-mono text-sm",
    },
    {
      key: "name",
      label: "Product Name",
      sortable: true,
      className: "font-medium",
    },
    {
      key: "weight",
      label: "Weight (kg)",
      sortable: true,
      render: (value, row) => {
        if (row.isComposite) {
          return (
            <span className="text-muted-foreground italic">
              Calculated
            </span>
          );
        }
        return value ? `${value} kg` : "—";
      },
    },
    {
      key: "dimensions",
      label: "Dimensions (cm)",
      render: (value) => {
        if (!value) return "—";
        const dimensions = value as { height: number; width: number; depth: number };
        return `${dimensions.height}×${dimensions.width}×${dimensions.depth}`;
      },
    },
    {
      key: "isComposite",
      label: "Type",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          {row.isComposite && (
            <div className="flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              <Package className="h-3 w-3" />
              Composite
            </div>
          )}
          {row.hasVariation && (
            <div className="flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              <Layers className="h-3 w-3" />
              Variations
            </div>
          )}
          {!row.isComposite && !row.hasVariation && (
            <div className="flex items-center gap-1 text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
              <Zap className="h-3 w-3" />
              Simple
            </div>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (value) => new Date(value as Date).toLocaleDateString(),
    },
    {
      key: "actions" as keyof Product,
      label: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditProduct(row)}
            aria-label={`Edit product ${row.sku}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(row)}
            aria-label={`Delete product ${row.sku}`}
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            Manage your product catalog with variations and compositions
          </p>
        </div>
        <Button onClick={onCreateProduct} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Product
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by SKU or name..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={filters.isComposite ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterClick("composite")}
            className="flex items-center gap-1"
          >
            <Package className="h-3 w-3" />
            Composite
          </Button>
          <Button
            variant={filters.hasVariation ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterClick("variation")}
            className="flex items-center gap-1"
          >
            <Layers className="h-3 w-3" />
            Variations
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFilterClick("all")}
            disabled={!filters.isComposite && !filters.hasVariation}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Products Table */}
      <AccessibleTable
        data={sortedProducts}
        columns={columns}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={handleSort}
        loading={loading}
        emptyMessage="No products found. Create your first product to get started."
        caption="Product catalog with search and filtering capabilities"
        rowKey={(row) => row.sku}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ open })}
        title="Delete Product"
        description={
          deleteModal.product
            ? `Are you sure you want to delete "${deleteModal.product.name}" (${deleteModal.product.sku})? This action cannot be undone.`
            : ""
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />
    </div>
  );
}