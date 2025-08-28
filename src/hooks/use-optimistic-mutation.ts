"use client";

import { useState, useCallback, useRef } from "react";
import {
  showErrorToast,
  showSuccessToast,
  OptimisticUpdate,
} from "@/lib/utils/error-handling";

export interface OptimisticMutationOptions<TData, TVariables> {
  // The actual mutation function
  mutationFn: (variables: TVariables) => Promise<TData>;

  // Function to apply optimistic update
  onOptimisticUpdate?: (variables: TVariables, currentData: TData) => TData;

  // Success callback
  onSuccess?: (data: TData, variables: TVariables) => void;

  // Error callback
  onError?: (error: unknown, variables: TVariables) => void;

  // Success message
  successMessage?: string | ((data: TData, variables: TVariables) => string);

  // Error message
  errorMessage?: string | ((error: unknown, variables: TVariables) => string);

  // Whether to show toast notifications
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
}

export interface OptimisticMutationResult<TData, TVariables> {
  // Current data (with optimistic updates applied)
  data: TData;

  // Mutation state
  isLoading: boolean;
  error: unknown | null;

  // Mutation function
  mutate: (variables: TVariables) => Promise<void>;

  // Manual data update
  setData: (data: TData) => void;

  // Reset to original data
  reset: () => void;

  // Check if there are pending optimistic updates
  hasPendingUpdates: boolean;
}

export function useOptimisticMutation<TData, TVariables>(
  initialData: TData,
  options: OptimisticMutationOptions<TData, TVariables>
): OptimisticMutationResult<TData, TVariables> {
  const {
    mutationFn,
    onOptimisticUpdate,
    onSuccess,
    onError,
    successMessage,
    errorMessage,
    showSuccessToast: showSuccess = true,
    showErrorToast: showError = true,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  // Use ref to maintain optimistic update state
  const optimisticUpdateRef = useRef(new OptimisticUpdate(initialData));
  const [, forceUpdate] = useState({});

  // Force re-render when optimistic state changes
  const triggerUpdate = useCallback(() => {
    forceUpdate({});
  }, []);

  const mutate = useCallback(
    async (variables: TVariables) => {
      setIsLoading(true);
      setError(null);

      // Apply optimistic update if provided
      if (onOptimisticUpdate) {
        const currentData = optimisticUpdateRef.current.getValue();
        const optimisticData = onOptimisticUpdate(variables, currentData);
        optimisticUpdateRef.current.apply(optimisticData, triggerUpdate);
      }

      try {
        // Execute the actual mutation
        const result = await mutationFn(variables);

        // Commit the optimistic update
        optimisticUpdateRef.current.commit();

        // Update with real data
        optimisticUpdateRef.current = new OptimisticUpdate(result);
        triggerUpdate();

        // Show success message
        if (showSuccess && successMessage) {
          const message =
            typeof successMessage === "function"
              ? successMessage(result, variables)
              : successMessage;
          showSuccessToast(message);
        }

        // Call success callback
        onSuccess?.(result, variables);
      } catch (err) {
        // Rollback optimistic update
        optimisticUpdateRef.current.rollback();

        setError(err);

        // Show error message
        if (showError) {
          const message = errorMessage
            ? typeof errorMessage === "function"
              ? errorMessage(err, variables)
              : errorMessage
            : undefined;

          if (message) {
            showErrorToast(new Error(message));
          } else {
            showErrorToast(err);
          }
        }

        // Call error callback
        onError?.(err, variables);

        // Re-throw error for caller to handle
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [
      mutationFn,
      onOptimisticUpdate,
      onSuccess,
      onError,
      successMessage,
      errorMessage,
      showSuccess,
      showError,
      triggerUpdate,
    ]
  );

  const setData = useCallback(
    (data: TData) => {
      optimisticUpdateRef.current = new OptimisticUpdate(data);
      triggerUpdate();
    },
    [triggerUpdate]
  );

  const reset = useCallback(() => {
    optimisticUpdateRef.current.rollback();
    setError(null);
    triggerUpdate();
  }, [triggerUpdate]);

  return {
    data: optimisticUpdateRef.current.getValue(),
    isLoading,
    error,
    mutate,
    setData,
    reset,
    hasPendingUpdates: optimisticUpdateRef.current.hasPendingChanges(),
  };
}

// Specialized hook for list operations (add, update, delete)
export function useOptimisticList<TItem, TId = string>(
  initialItems: TItem[],
  getId: (item: TItem) => TId
) {
  const [items, setItems] = useState<TItem[]>(initialItems);
  const optimisticUpdateRef = useRef(new OptimisticUpdate(initialItems));
  const [, forceUpdate] = useState({});

  const triggerUpdate = useCallback(() => {
    forceUpdate({});
  }, []);

  // Add item optimistically
  const addOptimistic = useCallback(
    (item: TItem) => {
      const currentItems = optimisticUpdateRef.current.getValue();
      const newItems = [...currentItems, item];
      optimisticUpdateRef.current.apply(newItems, triggerUpdate);
    },
    [triggerUpdate]
  );

  // Update item optimistically
  const updateOptimistic = useCallback(
    (id: TId, updates: Partial<TItem>) => {
      const currentItems = optimisticUpdateRef.current.getValue();
      const newItems = currentItems.map((item) =>
        getId(item) === id ? { ...item, ...updates } : item
      );
      optimisticUpdateRef.current.apply(newItems, triggerUpdate);
    },
    [getId, triggerUpdate]
  );

  // Remove item optimistically
  const removeOptimistic = useCallback(
    (id: TId) => {
      const currentItems = optimisticUpdateRef.current.getValue();
      const newItems = currentItems.filter((item) => getId(item) !== id);
      optimisticUpdateRef.current.apply(newItems, triggerUpdate);
    },
    [getId, triggerUpdate]
  );

  // Commit changes (after successful mutation)
  const commit = useCallback(
    (newItems?: TItem[]) => {
      if (newItems) {
        optimisticUpdateRef.current = new OptimisticUpdate(newItems);
      } else {
        optimisticUpdateRef.current.commit();
      }
      triggerUpdate();
    },
    [triggerUpdate]
  );

  // Rollback changes (after failed mutation)
  const rollback = useCallback(() => {
    optimisticUpdateRef.current.rollback();
    triggerUpdate();
  }, [triggerUpdate]);

  // Update the entire list
  const setList = useCallback(
    (newItems: TItem[]) => {
      optimisticUpdateRef.current = new OptimisticUpdate(newItems);
      triggerUpdate();
    },
    [triggerUpdate]
  );

  return {
    items: optimisticUpdateRef.current.getValue(),
    addOptimistic,
    updateOptimistic,
    removeOptimistic,
    commit,
    rollback,
    setList,
    hasPendingChanges: optimisticUpdateRef.current.hasPendingChanges(),
  };
}

// Hook for managing multiple concurrent optimistic mutations
export function useOptimisticQueue<TData, TVariables>() {
  const [queue, setQueue] = useState<
    Array<{
      id: string;
      variables: TVariables;
      status: "pending" | "success" | "error";
      error?: unknown;
    }>
  >([]);

  const addToQueue = useCallback((id: string, variables: TVariables) => {
    setQueue((prev) => [...prev, { id, variables, status: "pending" }]);
  }, []);

  const updateQueueItem = useCallback(
    (id: string, status: "success" | "error", error?: unknown) => {
      setQueue((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status, error } : item))
      );
    },
    []
  );

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const pendingCount = queue.filter((item) => item.status === "pending").length;
  const errorCount = queue.filter((item) => item.status === "error").length;

  return {
    queue,
    addToQueue,
    updateQueueItem,
    removeFromQueue,
    clearQueue,
    pendingCount,
    errorCount,
    hasErrors: errorCount > 0,
    hasPending: pendingCount > 0,
  };
}
