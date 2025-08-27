'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AccessibleTable, Column } from '@/components/shared/data-table';
import { LoadingSpinner } from '@/components/shared/loading';
import { Modal } from '@/components/shared/modals';
import { Variation, CreateVariationData } from '@/lib/domain/entities/variation';
import { VariationForm } from './variation-form';
import { useVariations } from '../hooks/use-variations';

interface VariationListProps {
  onVariationSelect?: (variation: Variation) => void;
  selectable?: boolean;
  filterByVariationType?: string;
}

export function VariationList({
  onVariationSelect,
  selectable = false,
  filterByVariationType,
}: VariationListProps) {
  const {
    variations,
    variationTypes,
    loading,
    error,
    createVariation,
    updateVariation,
    deleteVariation,
    searchVariations,
    refreshVariations,
    getVariationTypeName,
  } = useVariations();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVariationTypeFilter, setSelectedVariationTypeFilter] = useState(
    filterByVariationType || ''
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingVariation, setEditingVariation] = useState<Variation | null>(null);
  const [deletingVariation, setDeletingVariation] = useState<Variation | null>(null);

  // Filter variations based on the current filters
  const filteredVariations = variations.filter((variation) => {
    if (selectedVariationTypeFilter && variation.variationTypeId !== selectedVariationTypeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      return variation.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const performSearch = useCallback(async (query: string) => {
    if (query.trim()) {
      await searchVariations(query, selectedVariationTypeFilter || undefined);
    } else {
      await refreshVariations();
    }
  }, [searchVariations, refreshVariations, selectedVariationTypeFilter]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedVariationTypeFilter, performSearch]);

  const handleVariationTypeFilter = (variationTypeId: string) => {
    setSelectedVariationTypeFilter(variationTypeId);
    if (searchQuery.trim()) {
      searchVariations(searchQuery, variationTypeId || undefined);
    }
  };

  const handleEdit = (variation: Variation) => {
    setEditingVariation(variation);
  };

  const handleDelete = (variation: Variation) => {
    setDeletingVariation(variation);
  };

  const confirmDelete = async () => {
    if (deletingVariation) {
      await deleteVariation(deletingVariation.id);
      setDeletingVariation(null);
    }
  };

  const columns: Column<Variation>[] = [
    {
      key: 'name' as keyof Variation,
      label: 'Name',
      sortable: true,
      render: (_, variation: Variation) => (
        <div>
          <div className="font-medium text-gray-900">{variation.name}</div>
          <div className="text-sm text-gray-500">
            Created {new Date(variation.createdAt).toLocaleDateString('en-US')}
          </div>
        </div>
      ),
    },
    {
      key: 'variationTypeId' as keyof Variation,
      label: 'Variation Type',
      render: (_, variation: Variation) => {
        const variationType = variationTypes.find((vt) => vt.id === variation.variationTypeId);
        return (
          <div>
            <div className="font-medium text-gray-900">
              {getVariationTypeName(variation.variationTypeId)}
            </div>
            {variationType && (
              <div className="flex space-x-1 mt-1">
                {variationType.modifiesWeight && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Weight
                  </span>
                )}
                {variationType.modifiesDimensions && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Dimensions
                  </span>
                )}
                {!variationType.modifiesWeight && !variationType.modifiesDimensions && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    Aesthetic
                  </span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'id' as keyof Variation,
      label: 'Actions',
      render: (_, variation: Variation) => (
        <div className="flex space-x-2">
          {selectable && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onVariationSelect?.(variation)}
            >
              Select
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => handleEdit(variation)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDelete(variation)}
            className="text-red-600 hover:text-red-700"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Variations</h1>
          <p className="text-gray-600">
            Manage specific variations within each variation type
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>Create Variation</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search variations..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="w-64">
          <select
            value={selectedVariationTypeFilter}
            onChange={(e) => handleVariationTypeFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            {variationTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <Button variant="outline" onClick={() => {
          setSearchQuery('');
          setSelectedVariationTypeFilter('');
        }}>
          Clear
        </Button>
      </div>

      {variationTypes.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">No Variation Types</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  You need to create variation types before you can create variations.{' '}
                  <a href="/variation-types" className="underline">
                    Create variation types first
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <AccessibleTable
        data={filteredVariations}
        columns={columns}
        emptyMessage="No variations found. Create your first variation to get started."
      />

      <VariationForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={(data) => createVariation(data as CreateVariationData)}
        variationTypes={variationTypes}
        selectedVariationTypeId={selectedVariationTypeFilter}
        title="Create Variation"
      />

      {editingVariation && (
        <VariationForm
          isOpen={true}
          onClose={() => setEditingVariation(null)}
          onSubmit={(data) => updateVariation(editingVariation.id, data)}
          variation={editingVariation}
          variationTypes={variationTypes}
          title="Edit Variation"
        />
      )}

      {deletingVariation && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingVariation(null)}
          title="Delete Variation"
        >
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to delete the variation &ldquo;{deletingVariation.name}&rdquo;?
              This action cannot be undone.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">Warning</h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      This variation cannot be deleted if it is being used in any product variations. 
                      Please remove it from all products first.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setDeletingVariation(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}