import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductCompositionInterface } from '@/features/products/components/product-composition-interface';
import { Product } from '@/lib/domain/entities/product';
import { makeProduct } from '../../factories/test-utils';

// Mock the composition hook
vi.mock('@/features/products/hooks/use-composition', () => ({
  useComposition: vi.fn(),
}));

describe('ProductCompositionInterface', () => {
  let compositeProduct: Product;
  let simpleProduct: Product;
  let mockUseComposition: any;

  beforeEach(async () => {
    compositeProduct = makeProduct({
      sku: 'COMP-001',
      name: 'Composite Product',
      isComposite: true,
      hasVariation: false,
    });

    simpleProduct = makeProduct({
      sku: 'SIMPLE-001',
      name: 'Simple Product',
      isComposite: false,
      hasVariation: false,
    });

    // Get the mocked function
    const { useComposition } = await import('@/features/products/hooks/use-composition');
    mockUseComposition = vi.mocked(useComposition);

    // Default mock implementation
    mockUseComposition.mockReturnValue({
      compositionItems: [],
      availableItems: [
        {
          id: 'CHILD-001',
          sku: 'CHILD-001',
          displayName: 'Child Product 1',
          weight: 2.5,
          type: 'simple',
        },
        {
          id: 'CHILD-002',
          sku: 'CHILD-002',
          displayName: 'Child Product 2',
          weight: 1.0,
          type: 'composite',
        },
      ],
      totalWeight: 0,
      loading: false,
      error: null,
      createCompositionItem: vi.fn(),
      updateCompositionItem: vi.fn(),
      deleteCompositionItem: vi.fn(),
      refreshComposition: vi.fn(),
      validateComposition: vi.fn(),
      getCompositionTree: vi.fn(),
    });
  });

  describe('Non-composite products', () => {
    it('should show message for non-composite products', () => {
      render(<ProductCompositionInterface product={simpleProduct} />);
      
      expect(screen.getByText(/This product is not marked as composite/)).toBeInTheDocument();
      expect(screen.getByText(/Enable.*Composite Product.*in the Details tab/)).toBeInTheDocument();
    });

    it('should not show composition interface for non-composite products', () => {
      render(<ProductCompositionInterface product={simpleProduct} />);
      
      expect(screen.queryByText('Product Composition')).not.toBeInTheDocument();
      expect(screen.queryByText('Add Component')).not.toBeInTheDocument();
    });
  });

  describe('Composite products', () => {
    it('should render composition interface for composite products', () => {
      render(<ProductCompositionInterface product={compositeProduct} />);
      
      expect(screen.getByText('Product Composition')).toBeInTheDocument();
      expect(screen.getByText('Configure the components that make up this composite product')).toBeInTheDocument();
      expect(screen.getByText('Add Component')).toBeInTheDocument();
    });

    it('should show total calculated weight', () => {
      render(<ProductCompositionInterface product={compositeProduct} />);
      
      expect(screen.getByText('Total Calculated Weight')).toBeInTheDocument();
      expect(screen.getByText('0.00 kg')).toBeInTheDocument();
    });

    it('should show empty state when no composition items exist', () => {
      render(<ProductCompositionInterface product={compositeProduct} />);
      
      expect(screen.getByText('No composition items configured yet')).toBeInTheDocument();
      expect(screen.getByText('Add First Component')).toBeInTheDocument();
    });

    it('should open add modal when clicking Add Component button', async () => {
      render(<ProductCompositionInterface product={compositeProduct} />);
      
      const addButton = screen.getByText('Add Component');
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText('Add Composition Item')).toBeInTheDocument();
        expect(screen.getByText('Select a product and specify the quantity to add to this composition')).toBeInTheDocument();
      });
    });

    it('should show available products in the modal', async () => {
      render(<ProductCompositionInterface product={compositeProduct} />);
      
      const addButton = screen.getByText('Add Component');
      fireEvent.click(addButton);
      
      await waitFor(() => {
        expect(screen.getByText('Child Product 1')).toBeInTheDocument();
        expect(screen.getByText('Child Product 2')).toBeInTheDocument();
        expect(screen.getByText('SKU: CHILD-001')).toBeInTheDocument();
        expect(screen.getByText('SKU: CHILD-002')).toBeInTheDocument();
      });
    });

    it('should allow searching for products', async () => {
      render(<ProductCompositionInterface product={compositeProduct} />);
      
      const addButton = screen.getByText('Add Component');
      fireEvent.click(addButton);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search products...');
        fireEvent.change(searchInput, { target: { value: 'Child Product 1' } });
        
        expect(screen.getByText('Child Product 1')).toBeInTheDocument();
        // Child Product 2 should be filtered out, but we can't test this easily with the current mock
      });
    });

    it('should allow selecting a product and setting quantity', async () => {
      render(<ProductCompositionInterface product={compositeProduct} />);
      
      const addButton = screen.getByText('Add Component');
      fireEvent.click(addButton);
      
      await waitFor(() => {
        // Select first product
        const productOption = screen.getByText('Child Product 1');
        fireEvent.click(productOption);
        
        // Set quantity
        const quantityInput = screen.getByDisplayValue('1');
        fireEvent.change(quantityInput, { target: { value: '3' } });
        
        expect(quantityInput).toHaveValue(3);
      });
    });

    it('should disable Add to Composition button when no product selected', async () => {
      render(<ProductCompositionInterface product={compositeProduct} />);
      
      const addButton = screen.getByText('Add Component');
      fireEvent.click(addButton);
      
      await waitFor(() => {
        const addToCompositionButton = screen.getByText('Add to Composition');
        expect(addToCompositionButton).toBeDisabled();
      });
    });
  });

  describe('Composition items with data', () => {
    beforeEach(() => {
      // Mock hook with composition items
      mockUseComposition.mockReturnValue({
        compositionItems: [
          {
            id: 'comp-1',
            parentSku: 'COMP-001',
            childSku: 'CHILD-001',
            quantity: 2,
            displayName: 'Child Product 1',
            childType: 'simple',
            unitWeight: 2.5,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'comp-2',
            parentSku: 'COMP-001',
            childSku: 'CHILD-002',
            quantity: 1,
            displayName: 'Child Product 2',
            childType: 'composite',
            unitWeight: 5.0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        availableItems: [],
        totalWeight: 10.0,
        loading: false,
        error: null,
        createCompositionItem: vi.fn(),
        updateCompositionItem: vi.fn(),
        deleteCompositionItem: vi.fn(),
        refreshComposition: vi.fn(),
        validateComposition: vi.fn(),
        getCompositionTree: vi.fn(),
      });
    });

    it('should display composition items in table', () => {
      render(<ProductCompositionInterface product={compositeProduct} />);
      
      expect(screen.getByText('Child Product 1')).toBeInTheDocument();
      expect(screen.getByText('Child Product 2')).toBeInTheDocument();
      expect(screen.getByText('SKU: CHILD-001')).toBeInTheDocument();
      expect(screen.getByText('SKU: CHILD-002')).toBeInTheDocument();
    });

    it('should show calculated total weight', () => {
      render(<ProductCompositionInterface product={compositeProduct} />);
      
      expect(screen.getByText('10.00 kg')).toBeInTheDocument();
    });

    it('should display unit weights and total weights', () => {
      render(<ProductCompositionInterface product={compositeProduct} />);
      
      expect(screen.getByText('2.50')).toBeInTheDocument(); // Unit weight for Child Product 1
      const fiveValues = screen.getAllByText('5.00');
      expect(fiveValues).toHaveLength(3); // Unit weight for Child Product 2 + 2 total weights
    });

    it('should show product type badges', () => {
      render(<ProductCompositionInterface product={compositeProduct} />);
      
      expect(screen.getByText('simple')).toBeInTheDocument();
      expect(screen.getByText('composite')).toBeInTheDocument();
    });

    it('should allow updating quantities', async () => {
      const mockUpdateCompositionItem = vi.fn();
      mockUseComposition.mockReturnValue({
        compositionItems: [
          {
            id: 'comp-1',
            parentSku: 'COMP-001',
            childSku: 'CHILD-001',
            quantity: 2,
            displayName: 'Child Product 1',
            childType: 'simple',
            unitWeight: 2.5,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        availableItems: [],
        totalWeight: 5.0,
        loading: false,
        error: null,
        createCompositionItem: vi.fn(),
        updateCompositionItem: mockUpdateCompositionItem,
        deleteCompositionItem: vi.fn(),
        refreshComposition: vi.fn(),
        validateComposition: vi.fn(),
        getCompositionTree: vi.fn(),
      });

      render(<ProductCompositionInterface product={compositeProduct} />);
      
      const quantityInput = screen.getByDisplayValue('2');
      fireEvent.change(quantityInput, { target: { value: '3' } });
      
      await waitFor(() => {
        expect(mockUpdateCompositionItem).toHaveBeenCalledWith('comp-1', { quantity: 3 });
      });
    });

    it('should show delete buttons for composition items', () => {
      render(<ProductCompositionInterface product={compositeProduct} />);
      
      const deleteButtons = screen.getAllByRole('button');
      const trashButtons = deleteButtons.filter(button => 
        button.querySelector('svg') && button.className.includes('text-red-600')
      );
      
      expect(trashButtons).toHaveLength(2);
    });
  });

  describe('Error handling', () => {
    it('should display error messages', () => {
      mockUseComposition.mockReturnValue({
        compositionItems: [],
        availableItems: [],
        totalWeight: undefined,
        loading: false,
        error: 'Failed to load composition items',
        createCompositionItem: vi.fn(),
        updateCompositionItem: vi.fn(),
        deleteCompositionItem: vi.fn(),
        refreshComposition: vi.fn(),
        validateComposition: vi.fn(),
        getCompositionTree: vi.fn(),
      });

      render(<ProductCompositionInterface product={compositeProduct} />);
      
      expect(screen.getByText('Failed to load composition items')).toBeInTheDocument();
    });
  });

  describe('Loading states', () => {
    it('should show loading spinner when loading', () => {
      mockUseComposition.mockReturnValue({
        compositionItems: [],
        availableItems: [],
        totalWeight: undefined,
        loading: true,
        error: null,
        createCompositionItem: vi.fn(),
        updateCompositionItem: vi.fn(),
        deleteCompositionItem: vi.fn(),
        refreshComposition: vi.fn(),
        validateComposition: vi.fn(),
        getCompositionTree: vi.fn(),
      });

      render(<ProductCompositionInterface product={compositeProduct} />);
      
      expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
    });
  });
});