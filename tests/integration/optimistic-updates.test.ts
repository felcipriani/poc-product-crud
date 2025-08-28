import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useOptimisticMutation,
  useOptimisticList,
} from "@/hooks/use-optimistic-mutation";
import {
  CreateProductData,
  UpdateProductData,
  Product,
} from "@/lib/domain/entities/product";

// Mock toast notifications
vi.mock("@/hooks/use-toast", () => {
  const toast = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  };
  return {
    toast,
    useToast: () => ({
      toasts: [],
      addToast: vi.fn(),
      removeToast: vi.fn(),
      clearAllToasts: vi.fn(),
      ...toast,
      toast: vi.fn(),
    }),
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("Optimistic Updates Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue("{}");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("useOptimisticMutation Hook", () => {
    it("should apply optimistic updates immediately", async () => {
      const initialData = { count: 0 };
      const mockMutation = vi.fn().mockResolvedValue({ count: 1 });

      const { result } = renderHook(() =>
        useOptimisticMutation(initialData, {
          mutationFn: mockMutation,
          onOptimisticUpdate: (variables, currentData) => ({
            count: currentData.count + variables.increment,
          }),
          showSuccessToast: false,
          showErrorToast: false,
        })
      );

      expect(result.current.data).toEqual({ count: 0 });
      expect(result.current.hasPendingUpdates).toBe(false);

      // Trigger mutation with optimistic update
      act(() => {
        result.current.mutate({ increment: 1 });
      });

      // Should immediately show optimistic update
      expect(result.current.data).toEqual({ count: 1 });
      expect(result.current.hasPendingUpdates).toBe(true);
      expect(result.current.isLoading).toBe(true);

      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should commit the real data
      expect(result.current.data).toEqual({ count: 1 });
      expect(result.current.hasPendingUpdates).toBe(false);
      expect(mockMutation).toHaveBeenCalledWith({ increment: 1 });
    });

    it("should rollback optimistic updates on error", async () => {
      const initialData = { count: 0 };
      const mockMutation = vi
        .fn()
        .mockRejectedValue(new Error("Mutation failed"));

      const { result } = renderHook(() =>
        useOptimisticMutation(initialData, {
          mutationFn: mockMutation,
          onOptimisticUpdate: (variables, currentData) => ({
            count: currentData.count + variables.increment,
          }),
          showSuccessToast: false,
          showErrorToast: false,
        })
      );

      expect(result.current.data).toEqual({ count: 0 });

      // Trigger mutation with optimistic update
      await act(async () => {
        try {
          await result.current.mutate({ increment: 1 });
        } catch {
          // Expected to fail
        }
      });

      // Should rollback to original data
      expect(result.current.data).toEqual({ count: 0 });
      expect(result.current.hasPendingUpdates).toBe(false);
      expect(result.current.error).toBeInstanceOf(Error);
    });

    it("should handle multiple concurrent optimistic updates", async () => {
      const initialData = { count: 0 };
      const mockMutation = vi
        .fn()
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 2 });

      const { result } = renderHook(() =>
        useOptimisticMutation(initialData, {
          mutationFn: mockMutation,
          onOptimisticUpdate: (variables, currentData) => ({
            count: currentData.count + variables.increment,
          }),
          showSuccessToast: false,
          showErrorToast: false,
        })
      );

      // First mutation
      act(() => {
        result.current.mutate({ increment: 1 });
      });

      expect(result.current.data).toEqual({ count: 1 });

      // Wait for first mutation to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Second mutation
      act(() => {
        result.current.mutate({ increment: 1 });
      });

      expect(result.current.data).toEqual({ count: 2 });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockMutation).toHaveBeenCalledTimes(2);
    });
  });

  describe("useOptimisticList Hook", () => {
    it("should handle list operations optimistically", () => {
      const initialItems = [
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ];

      const { result } = renderHook(() =>
        useOptimisticList(initialItems, (item) => item.id)
      );

      expect(result.current.items).toEqual(initialItems);
      expect(result.current.hasPendingChanges).toBe(false);

      // Add item optimistically
      act(() => {
        result.current.addOptimistic({ id: "3", name: "Item 3" });
      });

      expect(result.current.items).toHaveLength(3);
      expect(result.current.items[2]).toEqual({ id: "3", name: "Item 3" });
      expect(result.current.hasPendingChanges).toBe(true);

      // Update item optimistically
      act(() => {
        result.current.updateOptimistic("1", { name: "Updated Item 1" });
      });

      expect(result.current.items[0]).toEqual({
        id: "1",
        name: "Updated Item 1",
      });

      // Remove item optimistically
      act(() => {
        result.current.removeOptimistic("2");
      });

      expect(result.current.items).toHaveLength(2);
      expect(
        result.current.items.find((item) => item.id === "2")
      ).toBeUndefined();

      // Commit changes
      act(() => {
        result.current.commit();
      });

      expect(result.current.hasPendingChanges).toBe(false);
    });

    it("should rollback list changes on error", () => {
      const initialItems = [
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ];

      const { result } = renderHook(() =>
        useOptimisticList(initialItems, (item) => item.id)
      );

      // Make several optimistic changes
      act(() => {
        result.current.addOptimistic({ id: "3", name: "Item 3" });
        result.current.updateOptimistic("1", { name: "Updated Item 1" });
        result.current.removeOptimistic("2");
      });

      expect(result.current.items).toHaveLength(2);
      expect(result.current.items[0].name).toBe("Updated Item 1");
      expect(result.current.hasPendingChanges).toBe(true);

      // Rollback all changes
      act(() => {
        result.current.rollback();
      });

      expect(result.current.items).toEqual(initialItems);
      expect(result.current.hasPendingChanges).toBe(false);
    });
  });

  describe("Product Management with Optimistic Updates", () => {
    it("should create products optimistically using service layer", () => {
      const { result } = renderHook(() =>
        useOptimisticList<Product, string>([], (product) => product.sku)
      );

      expect(result.current.items).toHaveLength(0);

      const productData: Product = {
        sku: "TEST-001",
        name: "Test Product",
        isComposite: false,
        hasVariation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Apply optimistic update
      act(() => {
        result.current.addOptimistic(productData);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].sku).toBe("TEST-001");
      expect(result.current.items[0].name).toBe("Test Product");
      expect(result.current.hasPendingChanges).toBe(true);

      // Commit the change
      act(() => {
        result.current.commit();
      });

      expect(result.current.hasPendingChanges).toBe(false);
    });

    it("should update products optimistically using service layer", () => {
      const existingProduct: Product = {
        sku: "TEST-001",
        name: "Original Product",
        isComposite: false,
        hasVariation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { result } = renderHook(() =>
        useOptimisticList<Product, string>(
          [existingProduct],
          (product) => product.sku
        )
      );

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].name).toBe("Original Product");

      // Apply optimistic update
      act(() => {
        result.current.updateOptimistic("TEST-001", {
          name: "Updated Product",
        });
      });

      expect(result.current.items[0].name).toBe("Updated Product");
      expect(result.current.hasPendingChanges).toBe(true);
    });

    it("should delete products optimistically using service layer", () => {
      const existingProduct: Product = {
        sku: "TEST-001",
        name: "Test Product",
        isComposite: false,
        hasVariation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const { result } = renderHook(() =>
        useOptimisticList<Product, string>(
          [existingProduct],
          (product) => product.sku
        )
      );

      expect(result.current.items).toHaveLength(1);

      // Apply optimistic delete
      act(() => {
        result.current.removeOptimistic("TEST-001");
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.hasPendingChanges).toBe(true);
    });

    it("should rollback failed product operations using service layer", () => {
      const { result } = renderHook(() =>
        useOptimisticList<Product, string>([], (product) => product.sku)
      );

      expect(result.current.items).toHaveLength(0);

      const productData: Product = {
        sku: "TEST-001",
        name: "Test Product",
        isComposite: false,
        hasVariation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Apply optimistic update
      act(() => {
        result.current.addOptimistic(productData);
      });

      expect(result.current.items).toHaveLength(1);

      // Simulate failure and rollback
      act(() => {
        result.current.rollback();
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.hasPendingChanges).toBe(false);
    });
  });

  describe("Complex Optimistic Update Scenarios", () => {
    it("should handle nested optimistic updates", async () => {
      const initialData = {
        products: [{ sku: "PROD-1", name: "Product 1", variations: [] }],
      };

      const mockMutation = vi.fn().mockResolvedValue({
        products: [
          {
            sku: "PROD-1",
            name: "Product 1",
            variations: [{ id: "VAR-1", name: "Variation 1" }],
          },
        ],
      });

      const { result } = renderHook(() =>
        useOptimisticMutation(initialData, {
          mutationFn: mockMutation,
          onOptimisticUpdate: (variables, currentData) => ({
            products: currentData.products.map((product) =>
              product.sku === variables.productSku
                ? {
                    ...product,
                    variations: [...product.variations, variables.variation],
                  }
                : product
            ),
          }),
          showSuccessToast: false,
          showErrorToast: false,
        })
      );

      // Add variation optimistically
      act(() => {
        result.current.mutate({
          productSku: "PROD-1",
          variation: { id: "VAR-1", name: "Variation 1" },
        });
      });

      // Should immediately show the variation
      expect(result.current.data.products[0].variations).toHaveLength(1);
      expect(result.current.data.products[0].variations[0].name).toBe(
        "Variation 1"
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should maintain the variation after commit
      expect(result.current.data.products[0].variations).toHaveLength(1);
    });

    it("should handle optimistic updates with dependencies", async () => {
      const initialData = {
        products: [{ sku: "PROD-1", name: "Product 1", compositionItems: [] }],
        inventory: [{ sku: "COMP-1", quantity: 10 }],
      };

      const mockMutation = vi.fn().mockResolvedValue({
        products: [
          {
            sku: "PROD-1",
            name: "Product 1",
            compositionItems: [{ sku: "COMP-1", quantity: 2 }],
          },
        ],
        inventory: [
          { sku: "COMP-1", quantity: 8 }, // Reduced by 2
        ],
      });

      const { result } = renderHook(() =>
        useOptimisticMutation(initialData, {
          mutationFn: mockMutation,
          onOptimisticUpdate: (variables, currentData) => ({
            products: currentData.products.map((product) =>
              product.sku === variables.productSku
                ? {
                    ...product,
                    compositionItems: [
                      ...product.compositionItems,
                      variables.compositionItem,
                    ],
                  }
                : product
            ),
            inventory: currentData.inventory.map((item) =>
              item.sku === variables.compositionItem.sku
                ? {
                    ...item,
                    quantity:
                      item.quantity - variables.compositionItem.quantity,
                  }
                : item
            ),
          }),
          showSuccessToast: false,
          showErrorToast: false,
        })
      );

      // Add composition item optimistically
      act(() => {
        result.current.mutate({
          productSku: "PROD-1",
          compositionItem: { sku: "COMP-1", quantity: 2 },
        });
      });

      // Should immediately update both products and inventory
      expect(result.current.data.products[0].compositionItems).toHaveLength(1);
      expect(result.current.data.inventory[0].quantity).toBe(8);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should maintain updates after commit
      expect(result.current.data.products[0].compositionItems).toHaveLength(1);
      expect(result.current.data.inventory[0].quantity).toBe(8);
    });
  });

  describe("Performance with Optimistic Updates", () => {
    it("should handle rapid optimistic updates efficiently", () => {
      const initialItems: Array<{ id: string; value: number }> = [];

      const { result } = renderHook(() =>
        useOptimisticList(initialItems, (item) => item.id)
      );

      const startTime = Date.now();

      // Perform 1000 rapid optimistic updates
      act(() => {
        for (let i = 0; i < 1000; i++) {
          result.current.addOptimistic({ id: `item-${i}`, value: i });
        }
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.current.items).toHaveLength(1000);
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });

    it("should not cause memory leaks with frequent updates", () => {
      const initialData = { counter: 0 };
      const mockMutation = vi.fn().mockResolvedValue({ counter: 1 });

      const { result, unmount } = renderHook(() =>
        useOptimisticMutation(initialData, {
          mutationFn: mockMutation,
          onOptimisticUpdate: (variables, currentData) => ({
            counter: currentData.counter + 1,
          }),
          showSuccessToast: false,
          showErrorToast: false,
        })
      );

      // Perform many updates
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.mutate({});
        });
      }

      // Unmount should not cause issues
      expect(() => unmount()).not.toThrow();
    });
  });
});
