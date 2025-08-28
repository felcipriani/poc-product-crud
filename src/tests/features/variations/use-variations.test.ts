import { renderHook, act } from "@testing-library/react";
import { vi } from "vitest";

const mockVariationRepo = vi.hoisted(() => ({
  findAll: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  search: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/storage/repositories/variation-repository", () => ({
  VariationRepository: vi.fn(() => mockVariationRepo),
}));

const mockVariationTypeRepo = vi.hoisted(() => ({
  findAll: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/storage/repositories/variation-type-repository", () => ({
  VariationTypeRepository: vi.fn(() => mockVariationTypeRepo),
}));

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast,
  useToast: () => ({
    toasts: [],
    addToast: vi.fn(),
    removeToast: vi.fn(),
    clearAllToasts: vi.fn(),
    ...toast,
    toast: vi.fn(),
  }),
}));

import { useVariations } from "@/features/variations/hooks/use-variations";

describe("useVariations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows success toast on create", async () => {
    const { result } = renderHook(() => useVariations());

    await act(async () => {
      await result.current.createVariation({
        variationTypeId: "1",
        name: "Red",
      });
    });

    expect(toast.success).toHaveBeenCalledWith(
      "Success",
      "Variation created successfully"
    );
  });

  it("shows error toast on delete failure", async () => {
    const error = new Error("Failed to delete variation");
    mockVariationRepo.delete.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useVariations());

    await act(async () => {
      await expect(result.current.deleteVariation("1")).rejects.toThrow(error);
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Error",
      "Failed to delete variation"
    );
  });
});
