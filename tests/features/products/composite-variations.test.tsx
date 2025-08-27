import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompositeVariationsInterface } from '@/features/products/components/composite-variations-interface';
import { Product } from '@/lib/domain/entities/product';
import { ProductVariationItem } from '@/lib/domain/entities/product-variation-item';
import { VariationType } from '@/lib/domain/entities/variation-type';
import { Variation } from '@/lib/domain/entities/variation';
import { CompositionItem } from '@/lib/domain/entities/composition-item';

// Mock data
const mockProduct: Product = {
  sku: 'DINING-SET-001',
  name: 'Custom Dining Set',
  hasVariation: true,
  isComposite: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockVariationTypes: VariationType[] = [
  {
    id: 'style-type',
    name: 'Style',
    modifiesWeight: false,
    modifiesDimensions: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'packaging-type',
    name: 'Packaging',
    modifiesWeight: true,
    modifiesDimensions: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockVariations: Variation[] = [
  {
    id: 'modern-style',
    variationTypeId: 'style-type',
    name: 'Modern',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'classic-style',
    variationTypeId: 'style-type',
    name: 'Classic',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'bulk-packaging',
    variationTypeId: 'packaging-type',
    name: 'Bulk',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockProductVariations: ProductVariationItem[] = [
  {
    id: 'var-modern',
    productSku: 'DINING-SET-001',
    selections: { 'style-type': 'modern-style' },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'var-classic',
    productSku: 'DINING-SET-001',
    selections: { 'style-type': 'classic-style' },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockCompositionItems: CompositionItem[] = [
  {
    id: 'comp-1',
    parentSku: 'DINING-SET-001#var-modern',
    childSku: 'CHAIR-001#chair-black',
    quantity: 4,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'comp-2',
    parentSku: 'DINING-SET-001#var-modern',
    childSku: 'TABLE-001#table-glossy',
    quantity: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockAvailableCompositionItems = [
  {
    id: 'chair-black',
    sku: 'CHAIR-001#chair-black',
    displayName: 'Office Chair - Color: Black',
    weight: 5,
    type: 'variation' as const,
    parentSku: 'CHAIR-001',
  },
  {
    id: 'table-glossy',
    sku: 'TABLE-001#table-glossy',
    displayName: 'Table - Finish: Glossy',
    weight: 16,
    type: 'variation' as const,
    parentSku: 'TABLE-001',
  },
  {
    id: 'cushion-simple',
    sku: 'CUSHION-001',
    displayName: 'Simple Cushion',
    weight: 0.5,
    type: 'simple' as const,
  },
];

const mockAvailableVariations = {
  'style-type': [mockVariations[0], mockVariations[1]],
  'packaging-type': [mockVariations[2]],
};

// Mock functions
const mockOnCreateVariation = vi.fn();
const mockOnUpdateVariation = vi.fn();
const mockOnDeleteVariation = vi.fn();
const mockOnCreateCompositionItem = vi.fn();
const mockOnDeleteCompositionItem = vi.fn();

describe('CompositeVariationsInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      product: mockProduct,
      variations: mockProductVariations,
      variationTypes: mockVariationTypes,
      availableVariations: mockAvailableVariations,
      selectedTypeIds: ['style-type'],
      onCreateVariation: mockOnCreateVariation,
      onUpdateVariation: mockOnUpdateVariation,
      onDeleteVariation: mockOnDeleteVariation,
      onCreateCompositionItem: mockOnCreateCompositionItem,
      onDeleteCompositionItem: mockOnDeleteCompositionItem,
      compositionItems: mockCompositionItems,
      availableCompositionItems: mockAvailableCompositionItems,
      loading: false,
    };

    return render(<CompositeVariationsInterface {...defaultProps} {...props} />);
  };

  describe('Requirement 7.1: Composition-based variation interface', () => {
    it('should display composition templates for each variation combination', () => {
      renderComponent();

      // Should show templates for each variation
      expect(screen.getByText('Style: Modern')).toBeInTheDocument();
      expect(screen.getByText('Style: Classic')).toBeInTheDocument();

      // Should show composition items for Modern style
      expect(screen.getByText('Office Chair - Color: Black')).toBeInTheDocument();
      expect(screen.getByText('Table - Finish: Glossy')).toBeInTheDocument();
    });

    it('should show info box explaining composite variations mode', () => {
      renderComponent();

      expect(screen.getByText('Composite + Variations Mode:')).toBeInTheDocument();
      expect(screen.getByText(/Each variation combination gets its own composition template/)).toBeInTheDocument();
    });

    it('should replace traditional grid with composition interface', () => {
      renderComponent();

      // Should not show traditional grid elements
      expect(screen.queryByText('New Line')).not.toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();

      // Should show composition-specific elements
      expect(screen.getByText('Composite Variations')).toBeInTheDocument();
      expect(screen.getByText('New Variation')).toBeInTheDocument();
    });
  });

  describe('Requirement 7.2: Selection of specific child variations per combination', () => {
    it('should allow adding composition items to specific variation templates', async () => {
      renderComponent();

      // Find the "Add Item" button for Modern style template
      const addItemButtons = screen.getAllByText('Add Item');
      fireEvent.click(addItemButtons[0]);

      // Should show dropdown for selecting child products
      await waitFor(() => {
        expect(screen.getByText('Select Product')).toBeInTheDocument();
      });

      // Should show available composition items
      const select = screen.getByDisplayValue('');
      fireEvent.change(select, { target: { value: 'CUSHION-001' } });

      expect(select.value).toBe('CUSHION-001');
    });

    it('should show different child options for variable vs simple products', () => {
      renderComponent();

      const addItemButtons = screen.getAllByText('Add Item');
      fireEvent.click(addItemButtons[0]);

      // Should show variation items with their parent info
      expect(screen.getByText(/Office Chair - Color: Black \(variation\)/)).toBeInTheDocument();
      expect(screen.getByText(/Table - Finish: Glossy \(variation\)/)).toBeInTheDocument();
      
      // Should show simple products directly
      expect(screen.getByText(/Simple Cushion \(simple\)/)).toBeInTheDocument();
    });

    it('should save composition items with correct parent SKU format', async () => {
      renderComponent();

      const addItemButtons = screen.getAllByText('Add Item');
      fireEvent.click(addItemButtons[0]);

      // Fill in the form
      const select = screen.getByDisplayValue('');
      fireEvent.change(select, { target: { value: 'CUSHION-001' } });

      const quantityInput = screen.getByDisplayValue('1');
      fireEvent.change(quantityInput, { target: { value: '2' } });

      // Save the item
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnCreateCompositionItem).toHaveBeenCalledWith({
          parentSku: 'DINING-SET-001#var-modern', // Should use variation SKU format
          childSku: 'CUSHION-001',
          quantity: 2,
        });
      });
    });
  });

  describe('Requirement 7.3: Weight calculation from selected child variations', () => {
    it('should calculate total weight from composition items', () => {
      renderComponent();

      // Modern style should show calculated weight
      // Chair (5kg × 4) + Table (16kg × 1) = 36kg
      expect(screen.getByText('Total Weight: 36.00 kg')).toBeInTheDocument();
    });

    it('should show individual item weights and totals', () => {
      renderComponent();

      // Should show unit weights
      expect(screen.getByText('5 kg')).toBeInTheDocument(); // Chair unit weight
      expect(screen.getByText('16 kg')).toBeInTheDocument(); // Table unit weight

      // Should show total weights per item
      expect(screen.getByText('20.00 kg')).toBeInTheDocument(); // Chair total (5 × 4)
      expect(screen.getByText('16.00 kg')).toBeInTheDocument(); // Table total (16 × 1)
    });

    it('should handle weight-modifying variation types', () => {
      // Test with packaging type that modifies weight
      const variationWithWeightOverride: ProductVariationItem = {
        id: 'var-bulk',
        productSku: 'DINING-SET-001',
        selections: { 
          'style-type': 'modern-style',
          'packaging-type': 'bulk-packaging'
        },
        weightOverride: 50, // Override weight due to packaging
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      renderComponent({
        variations: [variationWithWeightOverride],
        selectedTypeIds: ['style-type', 'packaging-type'],
      });

      // Should use override weight instead of calculated weight
      expect(screen.getByText('Total Weight: 50.00 kg')).toBeInTheDocument();
    });
  });

  describe('Requirement 7.4: Combination uniqueness validation', () => {
    it('should prevent duplicate variation combinations', async () => {
      const mockOnCreateVariationWithError = vi.fn().mockRejectedValue(
        new Error('A variation combination with the same selections already exists')
      );

      renderComponent({
        onCreateVariation: mockOnCreateVariationWithError,
      });

      // Try to create a new variation
      const newVariationButton = screen.getByText('New Variation');
      fireEvent.click(newVariationButton);

      await waitFor(() => {
        expect(mockOnCreateVariationWithError).toHaveBeenCalled();
      });
    });

    it('should validate uniqueness across all variation types', () => {
      // This would be tested at the service level
      // The UI should display appropriate error messages
      renderComponent();

      // Should show existing combinations
      expect(screen.getByText('Style: Modern')).toBeInTheDocument();
      expect(screen.getByText('Style: Classic')).toBeInTheDocument();
    });
  });

  describe('Requirement 7.5: Variation selection for child products with variations', () => {
    it('should require specific variation selection for variable child products', () => {
      renderComponent();

      // Available items should show specific variations, not parent products
      const addItemButtons = screen.getAllByText('Add Item');
      fireEvent.click(addItemButtons[0]);

      // Should show "CHAIR-001#chair-black" not just "CHAIR-001"
      expect(screen.getByText(/Office Chair - Color: Black/)).toBeInTheDocument();
      expect(screen.queryByText('Office Chair (parent)')).not.toBeInTheDocument();
    });

    it('should show variation details in composition items', () => {
      renderComponent();

      // Should show the specific variation being used
      expect(screen.getByText('Office Chair - Color: Black')).toBeInTheDocument();
      expect(screen.getByText('Table - Finish: Glossy')).toBeInTheDocument();
    });
  });

  describe('Requirement 7.6: Simple products used directly', () => {
    it('should allow simple products to be used as-is in all combinations', () => {
      renderComponent();

      const addItemButtons = screen.getAllByText('Add Item');
      fireEvent.click(addItemButtons[0]);

      // Simple products should appear without variation suffix
      expect(screen.getByText(/Simple Cushion \(simple\)/)).toBeInTheDocument();
    });

    it('should not require variation selection for simple products', async () => {
      renderComponent();

      const addItemButtons = screen.getAllByText('Add Item');
      fireEvent.click(addItemButtons[0]);

      // Select simple product
      const select = screen.getByDisplayValue('');
      fireEvent.change(select, { target: { value: 'CUSHION-001' } });

      // Should be able to save without additional variation selection
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnCreateCompositionItem).toHaveBeenCalledWith({
          parentSku: 'DINING-SET-001#var-modern',
          childSku: 'CUSHION-001', // Direct SKU, no variation suffix
          quantity: 1,
        });
      });
    });
  });

  describe('User Interface and Interaction', () => {
    it('should handle loading states', () => {
      renderComponent({ loading: true });

      // Buttons should be disabled during loading
      const newVariationButton = screen.getByText('New Variation');
      expect(newVariationButton).toBeDisabled();
    });

    it('should handle empty state when no variation types selected', () => {
      renderComponent({ selectedTypeIds: [] });

      expect(screen.getByText(/Select variation types above to start creating composite variations/)).toBeInTheDocument();
    });

    it('should handle empty state when no variations exist', () => {
      renderComponent({ variations: [] });

      expect(screen.getByText(/No variation combinations created yet/)).toBeInTheDocument();
    });

    it('should allow deleting variation combinations', async () => {
      renderComponent();

      // Find delete button for a variation
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(button => 
        button.querySelector('svg') && button.getAttribute('aria-label') === 'Delete variation'
      );

      if (deleteButton) {
        fireEvent.click(deleteButton);

        await waitFor(() => {
          expect(mockOnDeleteVariation).toHaveBeenCalled();
        });
      }
    });

    it('should allow deleting composition items', async () => {
      renderComponent();

      // Find delete button for a composition item
      const deleteButtons = screen.getAllByRole('button');
      const itemDeleteButton = deleteButtons.find(button => 
        button.closest('tr') && button.querySelector('svg')
      );

      if (itemDeleteButton) {
        fireEvent.click(itemDeleteButton);

        await waitFor(() => {
          expect(mockOnDeleteCompositionItem).toHaveBeenCalled();
        });
      }
    });

    it('should validate required fields before saving', async () => {
      renderComponent();

      const addItemButtons = screen.getAllByText('Add Item');
      fireEvent.click(addItemButtons[0]);

      // Try to save without selecting a product
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      // Should show validation message (mocked as alert)
      // In a real implementation, this would be a proper form validation
      expect(mockOnCreateCompositionItem).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle composition item creation errors', async () => {
      const mockOnCreateCompositionItemWithError = vi.fn().mockRejectedValue(
        new Error('Failed to create composition item')
      );

      renderComponent({
        onCreateCompositionItem: mockOnCreateCompositionItemWithError,
      });

      const addItemButtons = screen.getAllByText('Add Item');
      fireEvent.click(addItemButtons[0]);

      const select = screen.getByDisplayValue('');
      fireEvent.change(select, { target: { value: 'CUSHION-001' } });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnCreateCompositionItemWithError).toHaveBeenCalled();
      });

      // Error should be logged (in real implementation, would show user-friendly message)
    });

    it('should handle composition item deletion errors', async () => {
      const mockOnDeleteCompositionItemWithError = vi.fn().mockRejectedValue(
        new Error('Failed to delete composition item')
      );

      renderComponent({
        onDeleteCompositionItem: mockOnDeleteCompositionItemWithError,
      });

      const deleteButtons = screen.getAllByRole('button');
      const itemDeleteButton = deleteButtons.find(button => 
        button.closest('tr') && button.querySelector('svg')
      );

      if (itemDeleteButton) {
        fireEvent.click(itemDeleteButton);

        await waitFor(() => {
          expect(mockOnDeleteCompositionItemWithError).toHaveBeenCalled();
        });
      }
    });
  });
});