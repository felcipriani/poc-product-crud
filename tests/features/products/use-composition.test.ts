import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useComposition } from '@/features/products/hooks/use-composition';
import { CompositionService } from '@/lib/domain/services/composition-service';
import { CompositionItemRepository } from '@/lib/storage/repositories/composition-item-repository';
import { ProductRepository } from '@/lib/storage/repositories/product-repository';
import { ProductVariationItemRepository } from '@/lib/storage/repositories/product-variation-item-repository';
import { makeProduct } from '../../factories/test-utils';

// Mock the services
vi.mock('@/lib/domain/services/composition-service');
vi.mock('@/lib/storage/repositories/composition-item-repository');
vi.mock('@/lib/storage/repositories/product-repository');
vi.mock('@/lib/storage/repositories/product-variation-item-repository');
vi.mock('@/lib/storage/storage-service');

const mockCompositionService = {
  getCompositionItems: vi.fn(),
  getCompositionAvailableItems: vi.fn(),
  calculateCompositeWeight: vi.fn(),
  createCompositionItem: vi.fn(),
  updateCompositionItem: vi.fn(),
  deleteCompositionItem: vi.fn(),
  getCompositionTree: vi.fn(),
  validateCompositionComplexity: vi.fn(),
};

const mockProductRepository = {
  findBySku: vi.fn(),
};

const mockVariationItemRepository = {
  findById: vi.fn(),
  getEffectiveWeight: vi.fn(),
};

// Mock the service instances
vi.mocked(CompositionService).mockImplementation(() => mockCompositionService as any);
vi.mocked(ProductRepository).mockImplementation(() => mockProductRepository as any);
vi.mocked(ProductVariationItemRepository).mockImplementation(() => mockVariationItemRepository as any);

describe('useComposition', () => {
  const productSku = 'COMP-001';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockCompositionService.getCompositionItems.mockResolvedValue([]);
    mockCompositionService.getCompositionAvailableItems.mockResolvedValue([]);
    mockCompositionService.calculateCompositeWeight.mockResolvedValue(0);
    mockCompositionService.validateCompositionComplexity.mockResolvedValue({
      isValid: true,
      maxDepth: 1,
      totalItems: 0,
      warnings: [],
    });
    mockCompositionService.getCompositionTree.mockResolvedValue({
      sku: productSku,
      name: 'Test Product',
      isComposite: true,
      children: [],
    });
  });

  describe('Initial loading', () => {
    it('should load composition items on mount', async () => {
      const mockItems = [
        {
          id: 'comp-1',
          parentSku: productSku,
          childSku: 'CHILD-001',
          quantity: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockProduct = makeProduct({
        sku: 'CHILD-001',
        name: 'Child Product',
        weight: 2.5,
      });

      mockCompositionService.getCompositionItems.mockResolvedValue(mockItems);
      mockProductRepository.findBySku.mockResolvedValue(mockProduct);

      const { result } = renderHook(() => useComposition(
        productSku,
        mockCompositionService as any,
        mockProductRepository as any,
        mockVariationItemRepository as any
      ));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockCompositionService.getCompositionItems).toHaveBeenCalledWith(productSku);
      expect(result.current.compositionItems).toHaveLength(1);
      expect(result.current.compositionItems[0]).toMatchObject({
        id: 'comp-1',
        displayName: 'Child Product',
        childType: 'simple',
        unitWeight: 2.5,
      });
    });

    it('should load available items on mount', async () => {
      const mockAvailableItems = [
        {
          id: 'CHILD-001',
          sku: 'CHILD-001',
          displayName: 'Child Product 1',
          weight: 2.5,
          type: 'simple' as const,
        },
      ];

      mockCompositionService.getCompositionAvailableItems.mockResolvedValue(mockAvailableItems);

      const { result } = renderHook(() => useComposition(productSku, mockCompositionService as any, mockProductRepository as any, mockVariationItemRepository as any));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockCompositionService.getCompositionAvailableItems).toHaveBeenCalled();
      expect(result.current.availableItems).toEqual(mockAvailableItems);
    });

    it('should calculate total weight on mount', async () => {
      const expectedWeight = 15.5;
      mockCompositionService.calculateCompositeWeight.mockResolvedValue(expectedWeight);

      const { result } = renderHook(() => useComposition(productSku, mockCompositionService as any, mockProductRepository as any, mockVariationItemRepository as any));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockCompositionService.calculateCompositeWeight).toHaveBeenCalledWith(productSku, {});
      expect(result.current.totalWeight).toBe(expectedWeight);
    });
  });

  describe('Composition item enhancement', () => {
    it('should enhance simple products correctly', async () => {
      const mockItem = {
        id: 'comp-1',
        parentSku: productSku,
        childSku: 'CHILD-001',
        quantity: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockProduct = makeProduct({
        sku: 'CHILD-001',
        name: 'Simple Child',
        weight: 3.0,
        isComposite: false,
      });

      mockCompositionService.getCompositionItems.mockResolvedValue([mockItem]);
      mockProductRepository.findBySku.mockResolvedValue(mockProduct);

      const { result } = renderHook(() => useComposition(productSku, mockCompositionService as any, mockProductRepository as any, mockVariationItemRepository as any));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.compositionItems[0]).toMatchObject({
        displayName: 'Simple Child',
        childType: 'simple',
        unitWeight: 3.0,
      });
    });

    it('should enhance composite products correctly', async () => {
      const mockItem = {
        id: 'comp-1',
        parentSku: productSku,
        childSku: 'CHILD-COMP',
        quantity: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockProduct = makeProduct({
        sku: 'CHILD-COMP',
        name: 'Composite Child',
        weight: 5.0,
        isComposite: true,
      });

      mockCompositionService.getCompositionItems.mockResolvedValue([mockItem]);
      mockProductRepository.findBySku.mockResolvedValue(mockProduct);
      mockCompositionService.calculateCompositeWeight.mockResolvedValue(8.5);

      const { result } = renderHook(() => useComposition(productSku, mockCompositionService as any, mockProductRepository as any, mockVariationItemRepository as any));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.compositionItems[0]).toMatchObject({
        displayName: 'Composite Child',
        childType: 'composite',
        unitWeight: 8.5,
      });
    });

    it('should enhance variation products correctly', async () => {
      const mockItem = {
        id: 'comp-1',
        parentSku: productSku,
        childSku: 'PARENT-001#var-123',
        quantity: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockParentProduct = makeProduct({
        sku: 'PARENT-001',
        name: 'Variable Parent',
        weight: 2.0,
        hasVariation: true,
      });

      const mockVariation = {
        id: 'var-123',
        productSku: 'PARENT-001',
        selections: { 'type-1': 'var-red' },
        weightOverride: 2.8,
      };

      mockCompositionService.getCompositionItems.mockResolvedValue([mockItem]);
      mockProductRepository.findBySku.mockResolvedValue(mockParentProduct);
      mockVariationItemRepository.findById.mockResolvedValue(mockVariation);
      mockVariationItemRepository.getEffectiveWeight.mockReturnValue(2.8);

      const { result } = renderHook(() => useComposition(productSku, mockCompositionService as any, mockProductRepository as any, mockVariationItemRepository as any));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.compositionItems[0]).toMatchObject({
        displayName: 'Variable Parent (Variation)',
        childType: 'variation',
        unitWeight: 2.8,
        parentProductSku: 'PARENT-001',
      });
    });

    it('should handle missing products gracefully', async () => {
      const mockItem = {
        id: 'comp-1',
        parentSku: productSku,
        childSku: 'MISSING-001',
        quantity: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCompositionService.getCompositionItems.mockResolvedValue([mockItem]);
      mockProductRepository.findBySku.mockResolvedValue(null);

      const { result } = renderHook(() => useComposition(productSku, mockCompositionService as any, mockProductRepository as any, mockVariationItemRepository as any));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.compositionItems[0]).toMatchObject({
        displayName: 'MISSING-001',
        childType: 'simple',
        unitWeight: undefined,
      });
    });
  });

  describe('CRUD operations', () => {
    it('should create composition item', async () => {
      const createData = {
        parentSku: productSku,
        childSku: 'CHILD-001',
        quantity: 3,
      };

      mockCompositionService.createCompositionItem.mockResolvedValue(undefined);
      mockCompositionService.getCompositionItems.mockResolvedValue([]);
      mockCompositionService.calculateCompositeWeight.mockResolvedValue(7.5);

      const { result } = renderHook(() => useComposition(productSku, mockCompositionService as any, mockProductRepository as any, mockVariationItemRepository as any));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.createCompositionItem(createData);
      });

      expect(mockCompositionService.createCompositionItem).toHaveBeenCalledWith(createData);
      expect(mockCompositionService.getCompositionItems).toHaveBeenCalledTimes(2); // Initial + after create
      expect(mockCompositionService.calculateCompositeWeight).toHaveBeenCalledTimes(2); // Initial + after create
    });

    it('should update composition item', async () => {
      const updateData = { quantity: 5 };

      mockCompositionService.updateCompositionItem.mockResolvedValue(undefined);
      mockCompositionService.getCompositionItems.mockResolvedValue([]);
      mockCompositionService.calculateCompositeWeight.mockResolvedValue(12.5);

      const { result } = renderHook(() => useComposition(productSku, mockCompositionService as any, mockProductRepository as any, mockVariationItemRepository as any));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateCompositionItem('comp-1', updateData);
      });

      expect(mockCompositionService.updateCompositionItem).toHaveBeenCalledWith('comp-1', updateData);
      expect(mockCompositionService.getCompositionItems).toHaveBeenCalledTimes(2); // Initial + after update
      expect(mockCompositionService.calculateCompositeWeight).toHaveBeenCalledTimes(2); // Initial + after update
    });

    it('should delete composition item', async () => {
      mockCompositionService.deleteCompositionItem.mockResolvedValue(undefined);
      mockCompositionService.getCompositionItems.mockResolvedValue([]);
      mockCompositionService.calculateCompositeWeight.mockResolvedValue(0);

      const { result } = renderHook(() => useComposition(productSku, mockCompositionService as any, mockProductRepository as any, mockVariationItemRepository as any));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteCompositionItem('comp-1');
      });

      expect(mockCompositionService.deleteCompositionItem).toHaveBeenCalledWith('comp-1');
      expect(mockCompositionService.getCompositionItems).toHaveBeenCalledTimes(2); // Initial + after delete
      expect(mockCompositionService.calculateCompositeWeight).toHaveBeenCalledTimes(2); // Initial + after delete
    });
  });

  describe('Error handling', () => {
    it('should handle loading errors', async () => {
      const errorMessage = 'Failed to load composition items';
      mockCompositionService.getCompositionItems.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useComposition(productSku, mockCompositionService as any, mockProductRepository as any, mockVariationItemRepository as any));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.compositionItems).toEqual([]);
    });

    it('should handle create errors', async () => {
      const errorMessage = 'Failed to create composition item';
      mockCompositionService.createCompositionItem.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useComposition(productSku, mockCompositionService as any, mockProductRepository as any, mockVariationItemRepository as any));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.createCompositionItem({
            parentSku: productSku,
            childSku: 'CHILD-001',
            quantity: 1,
          });
        })
      ).rejects.toThrow(errorMessage);

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });
    });

    it('should handle update errors', async () => {
      const errorMessage = 'Failed to update composition item';
      mockCompositionService.updateCompositionItem.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useComposition(productSku, mockCompositionService as any, mockProductRepository as any, mockVariationItemRepository as any));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.updateCompositionItem('comp-1', { quantity: 5 });
        })
      ).rejects.toThrow(errorMessage);

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });
    });

    it('should handle delete errors', async () => {
      const errorMessage = 'Failed to delete composition item';
      mockCompositionService.deleteCompositionItem.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useComposition(productSku, mockCompositionService as any, mockProductRepository as any, mockVariationItemRepository as any));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.deleteCompositionItem('comp-1');
        })
      ).rejects.toThrow(errorMessage);

      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('Utility functions', () => {
    it('should validate composition', async () => {
      const mockValidation = {
        isValid: true,
        maxDepth: 2,
        totalItems: 5,
        warnings: ['Performance warning'],
      };

      mockCompositionService.validateCompositionComplexity.mockResolvedValue(mockValidation);

      const { result } = renderHook(() => useComposition(productSku, mockCompositionService as any, mockProductRepository as any, mockVariationItemRepository as any));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const validation = await result.current.validateComposition();

      expect(mockCompositionService.validateCompositionComplexity).toHaveBeenCalledWith(productSku);
      expect(validation).toEqual(mockValidation);
    });

    it('should get composition tree', async () => {
      const mockTree = {
        sku: productSku,
        name: 'Test Product',
        isComposite: true,
        children: [
          {
            sku: 'CHILD-001',
            name: 'Child Product',
            isComposite: false,
            children: [],
            quantity: 2,
            totalWeight: 5.0,
          },
        ],
      };

      mockCompositionService.getCompositionTree.mockResolvedValue(mockTree);

      const { result } = renderHook(() => useComposition(productSku, mockCompositionService as any, mockProductRepository as any, mockVariationItemRepository as any));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const tree = await result.current.getCompositionTree();

      expect(mockCompositionService.getCompositionTree).toHaveBeenCalledWith(productSku);
      expect(tree).toEqual(mockTree);
    });

    it('should refresh all data', async () => {
      mockCompositionService.getCompositionItems.mockResolvedValue([]);
      mockCompositionService.getCompositionAvailableItems.mockResolvedValue([]);
      mockCompositionService.calculateCompositeWeight.mockResolvedValue(0);

      const { result } = renderHook(() => useComposition(productSku, mockCompositionService as any, mockProductRepository as any, mockVariationItemRepository as any));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshComposition();
      });

      expect(mockCompositionService.getCompositionItems).toHaveBeenCalledTimes(2); // Initial + refresh
      expect(mockCompositionService.getCompositionAvailableItems).toHaveBeenCalledTimes(2); // Initial + refresh
      expect(mockCompositionService.calculateCompositeWeight).toHaveBeenCalledTimes(2); // Initial + refresh
    });
  });

  describe('Variation SKU parsing', () => {
    it('should parse hash format variation SKUs', async () => {
      const mockItem = {
        id: 'comp-1',
        parentSku: productSku,
        childSku: 'PARENT-001#var-123',
        quantity: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockParentProduct = makeProduct({
        sku: 'PARENT-001',
        name: 'Variable Parent',
      });

      mockCompositionService.getCompositionItems.mockResolvedValue([mockItem]);
      mockProductRepository.findBySku.mockResolvedValue(mockParentProduct);

      const { result } = renderHook(() => useComposition(productSku, mockCompositionService as any, mockProductRepository as any, mockVariationItemRepository as any));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockProductRepository.findBySku).toHaveBeenCalledWith('PARENT-001');
      expect(mockVariationItemRepository.findById).toHaveBeenCalledWith('var-123');
    });

    it('should parse colon format variation SKUs', async () => {
      const mockItem = {
        id: 'comp-1',
        parentSku: productSku,
        childSku: 'PARENT-001:red',
        quantity: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockParentProduct = makeProduct({
        sku: 'PARENT-001',
        name: 'Variable Parent',
      });

      mockCompositionService.getCompositionItems.mockResolvedValue([mockItem]);
      mockProductRepository.findBySku.mockResolvedValue(mockParentProduct);

      const { result } = renderHook(() => useComposition(productSku, mockCompositionService as any, mockProductRepository as any, mockVariationItemRepository as any));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockProductRepository.findBySku).toHaveBeenCalledWith('PARENT-001');
      expect(mockVariationItemRepository.findById).toHaveBeenCalledWith('red');
    });

    it('should parse VAR format variation SKUs', async () => {
      const mockItem = {
        id: 'comp-1',
        parentSku: productSku,
        childSku: 'PARENT-001-VAR-abc123',
        quantity: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockParentProduct = makeProduct({
        sku: 'PARENT-001',
        name: 'Variable Parent',
      });

      mockCompositionService.getCompositionItems.mockResolvedValue([mockItem]);
      mockProductRepository.findBySku.mockResolvedValue(mockParentProduct);

      const { result } = renderHook(() => useComposition(productSku, mockCompositionService as any, mockProductRepository as any, mockVariationItemRepository as any));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockProductRepository.findBySku).toHaveBeenCalledWith('PARENT-001');
      expect(mockVariationItemRepository.findById).toHaveBeenCalledWith('abc123');
    });
  });
});