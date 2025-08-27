"use client";

import * as React from "react";
import { useMemo } from "react";
import { Product } from "@/lib/domain/entities/product";
import { AccessibleTable, Column } from "@/components/shared/data-table/accessible-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Layers, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface EnhancedProductListProps {
  products: Product[];
  onProductEdit: (sku: string) => void;
  onProductDelete: (sku: string) => void;
  loading?: boolean;
}

interface DynamicColumn extends Omit<Column<Product>, 'key'> {
  key: keyof Product | 'actions';
  visible: (products: Product[]) => boolean;
}

export function EnhancedProductList({
  products,
  onProductEdit,
  onProductDelete,
  loading = false
}: EnhancedProductListProps) {
  
  // Define all possible columns with visibility logic
  const allColumns: DynamicColumn[] = useMemo(() => [
    {
      key: 'sku',
      label: 'SKU',
      visible: () => true,
      sortable: true,
      render: (_, product) => (
        <div className="font-mono text-sm">{product.sku}</div>
      )
    },
    {
      key: 'name',
      label: 'Product Name',
      visible: () => true,
      sortable: true,
      render: (_, product) => (
        <div>
          <div className="font-medium">{product.name}</div>
          <div className="flex items-center gap-1 mt-1">
            {product.isComposite && (
              <Badge variant="secondary" className="text-xs">
                <Package className="h-3 w-3 mr-1" />
                Composite
              </Badge>
            )}
            {product.hasVariation && (
              <Badge variant="outline" className="text-xs">
                <Layers className="h-3 w-3 mr-1" />
                Variations
              </Badge>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'weight',
      label: 'Weight (kg)',
      visible: () => true,
      sortable: true,
      render: (_, product) => (
        <div className="text-right">
          {product.weight ? (
            <span>{product.weight.toFixed(3)}</span>
          ) : (
            <span className="text-muted-foreground">
              {product.isComposite ? 'Calculated' : '—'}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'isComposite',
      label: 'Composite',
      visible: (products) => products.some(p => p.isComposite),
      sortable: true,
      render: (_, product) => (
        <div className="text-center">
          {product.isComposite ? (
            <Badge variant="secondary">
              <Package className="h-3 w-3 mr-1" />
              Yes
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      )
    },
    {
      key: 'hasVariation',
      label: 'Variations',
      visible: (products) => products.some(p => p.hasVariation),
      sortable: true,
      render: (_, product) => (
        <div className="text-center">
          {product.hasVariation ? (
            <Badge variant="outline">
              <Layers className="h-3 w-3 mr-1" />
              Yes
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      visible: () => true,
      render: (_, product) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onProductEdit(product.sku)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
            <span className="sr-only">Edit {product.name}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onProductDelete(product.sku)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete {product.name}</span>
          </Button>
        </div>
      )
    }
  ], [onProductEdit, onProductDelete]);

  // Filter visible columns based on data
  const visibleColumns = useMemo(() => {
    return allColumns
      .filter(col => col.visible(products))
      .map(({ visible, ...col }) => col as Column<Product>);
  }, [allColumns, products]);

  // Calculate statistics for header
  const stats = useMemo(() => {
    const total = products.length;
    const composite = products.filter(p => p.isComposite).length;
    const variations = products.filter(p => p.hasVariation).length;
    const both = products.filter(p => p.isComposite && p.hasVariation).length;
    
    return { total, composite, variations, both };
  }, [products]);

  return (
    <div className="space-y-4">
      {/* Header with statistics */}
      <ProductListHeader stats={stats} />
      
      {/* Enhanced table */}
      <div className="rounded-lg border">
        <AccessibleTable
          data={products}
          columns={visibleColumns}
          loading={loading}
          emptyMessage="No products found"
        />
      </div>
    </div>
  );
}

interface ProductListHeaderProps {
  stats: {
    total: number;
    composite: number;
    variations: number;
    both: number;
  };
}

function ProductListHeader({ stats }: ProductListHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-semibold">Products</h2>
        <p className="text-sm text-muted-foreground">
          Manage your product catalog
        </p>
      </div>
      
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">{stats.total}</span>
          <span className="text-muted-foreground">Total</span>
        </div>
        
        {stats.composite > 0 && (
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600" />
            <span className="font-medium">{stats.composite}</span>
            <span className="text-muted-foreground">Composite</span>
          </div>
        )}
        
        {stats.variations > 0 && (
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-green-600" />
            <span className="font-medium">{stats.variations}</span>
            <span className="text-muted-foreground">With Variations</span>
          </div>
        )}
        
        {stats.both > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex">
              <Package className="h-4 w-4 text-purple-600" />
              <Layers className="h-4 w-4 text-purple-600 -ml-1" />
            </div>
            <span className="font-medium">{stats.both}</span>
            <span className="text-muted-foreground">Complex</span>
          </div>
        )}
      </div>
    </div>
  );
}
