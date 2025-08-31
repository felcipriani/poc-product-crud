import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ValidationError,
  BusinessRuleError,
  StorageError,
  classifyError,
  getUserFriendlyMessage,
  extractFormErrors,
  withErrorHandling,
  OptimisticUpdate,
  withRetry,
  createDebouncedErrorHandler,
  showSuccessToast,
  showErrorToast,
} from "@/lib/utils/error-handling";

// Mock toast API
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

import { toast } from "@/hooks/use-toast";

describe("error handling utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("classifies errors and returns user friendly messages", () => {
    const vErr = new ValidationError("Invalid", "field");
    const bErr = new BusinessRuleError("Rule", "rule");
    const sErr = new StorageError("Store fail", "save");

    expect(classifyError(vErr).type).toBe("validation");
    expect(getUserFriendlyMessage(bErr)).toBe("Rule");
    expect(getUserFriendlyMessage(sErr)).toBe(
      "There was a problem saving your data. Please try again."
    );
  });

  it("extracts form errors from different error types", () => {
    const fieldErr = new ValidationError("Required", "sku");
    expect(extractFormErrors(fieldErr)).toEqual({ sku: "Required" });

    const zodErr = new Error(
      '[{"path":["name"],"message":"validation issue"}]'
    );
    expect(extractFormErrors(zodErr)).toEqual({ name: "validation issue" });

    const unknown = new Error("oops");
    expect(extractFormErrors(unknown)).toEqual({
      _general: "Something went wrong. Please try again.",
    });
  });

  it("handles operations with retries and success/error toasts", async () => {
    const op = vi.fn().mockResolvedValue("ok");
    const result = await withErrorHandling(op, {
      showSuccessToast: true,
      successMessage: "done",
    });
    expect(result).toBe("ok");
    expect(toast).toHaveBeenCalledWith({
      title: "Success",
      message: "done",
      type: "success",
    });

    const failing = vi.fn().mockRejectedValue(new Error("fail"));
    const failResult = await withErrorHandling(failing, {
      showErrorToast: true,
    });
    expect(failResult).toBeNull();
    expect(toast).toHaveBeenLastCalledWith({
      title: "Error",
      message: "Something went wrong. Please try again.",
      type: "error",
      duration: 0,
    });
  });

  it("optimistic update commits and rollbacks correctly", () => {
    const opt = new OptimisticUpdate({ count: 0 });
    opt.apply({ count: 1 });
    expect(opt.getValue()).toEqual({ count: 1 });
    opt.rollback();
    expect(opt.getValue()).toEqual({ count: 0 });
    opt.apply({ count: 2 });
    opt.commit();
    expect(opt.getValue()).toEqual({ count: 2 });
  });

  it("withRetry wraps non-error rejections", async () => {
    await expect(withRetry(() => Promise.reject("bad"), 1, 0)).rejects.toThrow(
      "bad"
    );
  });

  it("creates debounced error handlers", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const handler = createDebouncedErrorHandler(cb, 200);
    handler("err");
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(cb).toHaveBeenCalledWith("err");
    vi.useRealTimers();
  });

  it("delegates toast helpers", () => {
    showSuccessToast("yay");
    showErrorToast(new Error("no"));
    expect(toast).toHaveBeenNthCalledWith(1, {
      title: "Success",
      message: "yay",
      type: "success",
    });
    expect(toast).toHaveBeenNthCalledWith(2, {
      title: "Error",
      message: "Something went wrong. Please try again.",
      type: "error",
      duration: 0,
    });
  });
});
