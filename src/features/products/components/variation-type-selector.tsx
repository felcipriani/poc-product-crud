"use client";

import * as React from "react";
import { useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { VariationType } from "@/lib/domain/entities/variation-type";
import { Button } from "@/components/ui/button";

export interface VariationTypeSelectorProps {
  variationTypes: VariationType[];
  selectedTypeIds: string[];
  onSelectionChange: (typeIds: string[]) => void;
  availableVariations: Record<string, Array<{ id: string; name: string }>>;
  usedTypeIds?: string[]; // Types that are already being used by existing variations
}

export function VariationTypeSelector({
  variationTypes,
  selectedTypeIds,
  onSelectionChange,
  availableVariations,
  usedTypeIds = [],
}: VariationTypeSelectorProps) {
  const [pendingSelection, setPendingSelection] = useState<string[]>(selectedTypeIds);

  const handleTypeToggle = (typeId: string, selected: boolean) => {
    // Prevent deselecting types that are already being used
    if (!selected && usedTypeIds.includes(typeId)) {
      alert("Cannot remove this variation type because it's already being used by existing variations. Delete the variations first.");
      return;
    }

    const newSelection = selected
      ? [...pendingSelection, typeId]
      : pendingSelection.filter(id => id !== typeId);

    // Validate business rules
    const selectedTypes = variationTypes.filter(type => newSelection.includes(type.id));
    const dimensionModifyingTypes = selectedTypes.filter(type => type.modifiesDimensions);
    const weightModifyingTypes = selectedTypes.filter(type => type.modifiesWeight);

    // Check for multiple dimension-modifying types
    if (dimensionModifyingTypes.length > 1) {
      alert("Only one dimension-modifying variation type is allowed per product");
      return;
    }

    // Check for multiple weight-modifying types
    if (weightModifyingTypes.length > 1) {
      alert("Only one weight-modifying variation type is allowed per product");
      return;
    }

    setPendingSelection(newSelection);
  };

  const applySelection = () => {
    onSelectionChange(pendingSelection);
  };

  const resetSelection = () => {
    setPendingSelection(selectedTypeIds);
  };

  const hasChanges = JSON.stringify(pendingSelection.sort()) !== JSON.stringify(selectedTypeIds.sort());

  const selectedTypes = variationTypes.filter(type => pendingSelection.includes(type.id));
  const dimensionModifyingType = selectedTypes.find(type => type.modifiesDimensions);
  const weightModifyingType = selectedTypes.find(type => type.modifiesWeight);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Select Variation Types</h3>
        <p className="text-sm text-muted-foreground">
          Choose which types of variations this product will have. Each type will become a column in the variations grid.
        </p>
      </div>

      {/* Variation Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {variationTypes.map((type) => {
          const hasVariations = availableVariations[type.id]?.length > 0;
          const isSelected = pendingSelection.includes(type.id);
          const isUsed = usedTypeIds.includes(type.id);
          
          return (
            <div 
              key={type.id} 
              className={`border rounded-lg p-3 ${
                isSelected 
                  ? isUsed 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-primary bg-primary/5' 
                  : 'border-border'
              }`}
            >
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id={`type-${type.id}`}
                  checked={isSelected}
                  onChange={(e) => handleTypeToggle(type.id, e.target.checked)}
                  disabled={!hasVariations}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                />
                <div className="flex-1 min-w-0">
                  <label 
                    htmlFor={`type-${type.id}`} 
                    className={`block text-sm font-medium ${!hasVariations ? 'text-muted-foreground' : ''}`}
                  >
                    {type.name}
                  </label>
                  
                  {/* Type flags and status */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {type.modifiesDimensions && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                        Dimensions
                      </span>
                    )}
                    {type.modifiesWeight && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                        Weight
                      </span>
                    )}
                    {isUsed && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800 font-medium">
                        ✓ In Use
                      </span>
                    )}
                  </div>
                  
                  {!hasVariations && (
                    <p className="text-xs text-muted-foreground mt-1">
                      No variations available
                    </p>
                  )}
                  
                  {hasVariations && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {availableVariations[type.id]?.length} variation(s) available
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Validation Messages */}
      {pendingSelection.length > 0 && (
        <div className="space-y-2">
          {dimensionModifyingType && (
            <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 p-3 rounded">
              <Info className="h-4 w-4" />
              <span>
                <strong>{dimensionModifyingType.name}</strong> will add Height, Width, and Depth columns to the grid
              </span>
            </div>
          )}
          
          {weightModifyingType && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded">
              <Info className="h-4 w-4" />
              <span>
                <strong>{weightModifyingType.name}</strong> will add a Weight override column to the grid
              </span>
            </div>
          )}
        </div>
      )}

      {/* Warning about existing variations */}
      {hasChanges && selectedTypeIds.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded">
          <AlertTriangle className="h-4 w-4" />
          <span>
            Changing variation types will affect existing variation combinations. 
            New columns will be added to all existing rows and must be filled.
          </span>
        </div>
      )}

      {/* Action Buttons */}
      {hasChanges && (
        <div className="flex items-center gap-2">
          <Button onClick={applySelection} size="sm">
            Apply Changes
          </Button>
          <Button onClick={resetSelection} variant="outline" size="sm">
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}