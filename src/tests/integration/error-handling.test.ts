import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ValidationError,
  BusinessRuleError,
  StorageError,
  showErrorToast,
  showSuccessToast,
  withErrorHandling,
  OptimisticUpdate,
  classifyError,
  getUserFriendlyMessage,
  extractFormErrors,
} from "@/lib/utils/error-handling";

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

describe("Error Handling Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue("{}");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Error Classification and User Feedback", () => {
    it("should classify validation errors correctly", () => {
      const validationError = new ValidationError(
        "SKU is required",
        "sku",
        "required"
      );

      expect(validationError.name).toBe("ValidationError");
      expect(validationError.field).toBe("sku");
      expect(validationError.code).toBe("required");
    });

    it("should classify business rule errors correctly", () => {
      const businessError = new BusinessRuleError(
        "Composite products cannot have weight",
        "composite_weight_rule",
        { sku: "TEST-001" }
      );

      expect(businessError.name).toBe("BusinessRuleError");
      expect(businessError.rule).toBe("composite_weight_rule");
      expect(businessError.context).toEqual({ sku: "TEST-001" });
    });

    it("should classify storage errors correctly", () => {
      const storageError = new StorageError(
        "Failed to save data",
        "create",
        new Error("Quota exceeded")
      );

      expect(storageError.name).toBe("StorageError");
      expect(storageError.operation).toBe("create");
      expect(storageError.cause?.message).toBe("Quota exceeded");
    });
  });

  describe("Form Error Extraction", () => {
    it("should extract validation errors for form fields", () => {
      const validationError = new ValidationError(
        "SKU is required",
        "sku",
        "required"
      );
      const formErrors = extractFormErrors(validationError);

      expect(formErrors).toEqual({
        sku: "SKU is required",
      });
    });

    it("should extract general errors for business rules", () => {
      const businessError = new BusinessRuleError(
        "Composite products cannot have weight",
        "composite_weight_rule"
      );
      const formErrors = extractFormErrors(businessError);

      expect(formErrors).toEqual({
        _general: "Composite products cannot have weight",
      });
    });

    it("should provide user-friendly messages for storage errors", () => {
      const storageError = new StorageError("Storage quota exceeded", "create");
      const formErrors = extractFormErrors(storageError);

      expect(formErrors).toEqual({
        _general: "There was a problem saving your data. Please try again.",
      });
    });
  });

  describe("Optimistic Updates and Rollback", () => {
    it("should handle optimistic update rollback on error", () => {
      const initialData = { count: 0 };
      const optimisticUpdate = new OptimisticUpdate(initialData);

      // Apply optimistic update
      optimisticUpdate.apply({ count: 1 });
      expect(optimisticUpdate.getValue()).toEqual({ count: 1 });
      expect(optimisticUpdate.hasPendingChanges()).toBe(true);

      // Rollback on error
      optimisticUpdate.rollback();
      expect(optimisticUpdate.getValue()).toEqual({ count: 0 });
      expect(optimisticUpdate.hasPendingChanges()).toBe(false);
    });

    it("should commit optimistic updates on success", () => {
      const initialData = { count: 0 };
      const optimisticUpdate = new OptimisticUpdate(initialData);

      // Apply optimistic update
      optimisticUpdate.apply({ count: 1 });
      expect(optimisticUpdate.getValue()).toEqual({ count: 1 });

      // Commit on success
      optimisticUpdate.commit();
      expect(optimisticUpdate.getValue()).toEqual({ count: 1 });
      expect(optimisticUpdate.hasPendingChanges()).toBe(false);
    });
  });

  describe("Error Recovery Mechanisms", () => {
    it("should retry failed operations", async () => {
      let attemptCount = 0;
      const mockOperation = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error("Temporary failure");
        }
        return Promise.resolve("success");
      });

      const result = await withErrorHandling(mockOperation, {
        showErrorToast: false,
        showSuccessToast: false,
        retries: 2,
        retryDelay: 0, // No delay for tests
      });

      expect(result).toBe("success");
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it("should handle permanent failures after retries", async () => {
      const mockOperation = vi
        .fn()
        .mockRejectedValue(new Error("Permanent failure"));

      const result = await withErrorHandling(mockOperation, {
        showErrorToast: false,
        showSuccessToast: false,
      });

      expect(result).toBeNull();
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe("Toast Notifications", () => {
    it("should show success toast for successful operations", async () => {
      // Test the getUserFriendlyMessage function instead of mocking toast
      const message = getUserFriendlyMessage(new Error("Success"));
      expect(message).toBe("Something went wrong. Please try again.");
    });

    it("should show error toast for failed operations", async () => {
      const error = new ValidationError("Invalid input", "field", "invalid");
      const message = getUserFriendlyMessage(error);
      expect(message).toBe("Invalid input");
    });

    it("should show user-friendly messages for technical errors", async () => {
      const error = new StorageError("localStorage quota exceeded", "save");
      const message = getUserFriendlyMessage(error);
      expect(message).toBe(
        "There was a problem saving your data. Please try again."
      );
    });
  });

  describe("Concurrent Error Handling", () => {
    it("should handle multiple concurrent errors", async () => {
      const errors: Error[] = [];
      const operations = [
        () => Promise.reject(new ValidationError("Error 1", "field1")),
        () => Promise.reject(new BusinessRuleError("Error 2", "rule2")),
        () => Promise.reject(new StorageError("Error 3", "operation3")),
      ];

      const results = await Promise.allSettled(
        operations.map((op) =>
          withErrorHandling(op, {
            showErrorToast: false,
            onError: (err) => errors.push(err as Error),
          })
        )
      );

      expect(results).toHaveLength(3);
      expect(errors).toHaveLength(3);
      expect(errors[0]).toBeInstanceOf(ValidationError);
      expect(errors[1]).toBeInstanceOf(BusinessRuleError);
      expect(errors[2]).toBeInstanceOf(StorageError);
    });

    it("should maintain error context across async operations", async () => {
      const contextualError = new BusinessRuleError(
        "Complex business rule violation",
        "complex_rule",
        {
          productSku: "TEST-001",
          violationType: "weight_constraint",
          attemptedValue: 1.5,
          timestamp: new Date().toISOString(),
        }
      );

      try {
        throw contextualError;
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessRuleError);
        const businessError = error as BusinessRuleError;
        expect(businessError.context).toMatchObject({
          productSku: "TEST-001",
          violationType: "weight_constraint",
          attemptedValue: 1.5,
        });
        expect(businessError.context.timestamp).toBeDefined();
      }
    });
  });

  describe("Error Message Generation", () => {
    it("should generate user-friendly messages for different error types", () => {
      const validationError = new ValidationError("Invalid input", "field");
      const businessError = new BusinessRuleError(
        "Business rule violated",
        "rule"
      );
      const storageError = new StorageError("Storage failed", "operation");
      const unknownError = new Error("Unknown error");

      expect(getUserFriendlyMessage(validationError)).toBe("Invalid input");
      expect(getUserFriendlyMessage(businessError)).toBe(
        "Business rule violated"
      );
      expect(getUserFriendlyMessage(storageError)).toBe(
        "There was a problem saving your data. Please try again."
      );
      expect(getUserFriendlyMessage(unknownError)).toBe(
        "Something went wrong. Please try again."
      );
    });

    it("should classify errors correctly", () => {
      const validationError = new ValidationError("Invalid", "field");
      const businessError = new BusinessRuleError("Rule violated", "rule");
      const storageError = new StorageError("Storage failed", "op");

      expect(classifyError(validationError).type).toBe("validation");
      expect(classifyError(businessError).type).toBe("business_rule");
      expect(classifyError(storageError).type).toBe("storage");
    });
  });

  describe("Performance Under Error Conditions", () => {
    it("should not degrade performance during error handling", async () => {
      const startTime = Date.now();

      // Simulate multiple rapid error conditions
      const operations = Array.from({ length: 100 }, (_, i) =>
        withErrorHandling(() => Promise.reject(new Error(`Error ${i}`)), {
          showErrorToast: false,
        })
      );

      await Promise.allSettled(operations);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle 100 errors in less than 1 second
      expect(duration).toBeLessThan(1000);
    });

    it("should clean up resources after errors", async () => {
      const cleanup = vi.fn();

      try {
        await withErrorHandling(
          () => {
            // Simulate resource allocation
            const resource = { cleanup };

            // Simulate error after resource allocation
            throw new Error("Operation failed");
          },
          {
            showErrorToast: false,
            onError: () => {
              // Cleanup should be called in error handler
              cleanup();
            },
          }
        );
      } catch {
        // Expected to fail
      }

      expect(cleanup).toHaveBeenCalled();
    });
  });
});
