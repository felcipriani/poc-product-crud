import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useProductVariations } from "@/features/products/hooks/use-product-variations";
import { ProductVariationItemRepository } from "@/lib/storage/repositories/product-variation-item-repository";
import { VariationTypeRepository } from "@/lib/storage/repositories/variation-type-repository";
import { VariationRepository } from "@/lib/storage/repositories/variation-repository";
import type { ProductVariationItem } from "@/lib/domain/entities/product-variation-item";

vi.mock("@/lib/storage/repositories/product-variation-item-repository");
vi.mock("@/lib/storage/repositories/variation-type-repository");
vi.mock("@/lib/storage/repositories/variation-repository");

const mockVariationRepo = {
  findByProductSku: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockVariationTypeRepo = {
  findAll: vi.fn(),
};

const mockVarRepo = {
  findByVariationType: vi.fn(),
};

vi.mocked(ProductVariationItemRepository).mockImplementation(
  () => mockVariationRepo as any
);
vi.mocked(VariationTypeRepository).mockImplementation(
  () => mockVariationTypeRepo as any
);
vi.mocked(VariationRepository).mockImplementation(() => mockVarRepo as any);

const productSku = "PROD-1";

describe("useProductVariations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVariationTypeRepo.findAll.mockResolvedValue([]);
    mockVarRepo.findByVariationType.mockResolvedValue([]);
  });

  it("auto-generates sequential variation names", async () => {
    const existing: ProductVariationItem[] = [
      {
        id: "var-1",
        productSku,
        selections: {},
        name: "Variation 1",
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockVariationRepo.findByProductSku.mockResolvedValue(existing);
    mockVariationRepo.create.mockResolvedValue(undefined);

    const { result } = renderHook(() => useProductVariations(productSku));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createVariation({ productSku, selections: {} });
    });

    expect(mockVariationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Variation 2", sortOrder: 1 })
    );
  });

  it("validates uniqueness when renaming", async () => {
    const existing: ProductVariationItem[] = [
      {
        id: "var-1",
        productSku,
        selections: {},
        name: "Variation 1",
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "var-2",
        productSku,
        selections: {},
        name: "Variation 2",
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockVariationRepo.findByProductSku.mockResolvedValue(existing);

    const { result } = renderHook(() => useProductVariations(productSku));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      result.current.updateVariation("var-1", { name: "Variation 2" })
    ).rejects.toThrow("Variation name must be unique");
    expect(mockVariationRepo.update).not.toHaveBeenCalled();
  });

  it("prevents deleting the last variation", async () => {
    const existing: ProductVariationItem[] = [
      {
        id: "var-1",
        productSku,
        selections: {},
        name: "Variation 1",
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockVariationRepo.findByProductSku.mockResolvedValue(existing);

    const { result } = renderHook(() => useProductVariations(productSku));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(result.current.deleteVariation("var-1")).rejects.toThrow(
      "At least one variation is required"
    );
    expect(mockVariationRepo.delete).not.toHaveBeenCalled();
  });

  it("reorders variations with updated sort order", async () => {
    const existing: ProductVariationItem[] = [
      {
        id: "var-1",
        productSku,
        selections: {},
        name: "Variation 1",
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "var-2",
        productSku,
        selections: {},
        name: "Variation 2",
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockVariationRepo.findByProductSku.mockResolvedValue(existing);
    mockVariationRepo.update.mockResolvedValue(undefined);

    const { result } = renderHook(() => useProductVariations(productSku));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.reorderVariations(["var-2", "var-1"]);
    });

    expect(mockVariationRepo.update).toHaveBeenNthCalledWith(1, "var-2", {
      sortOrder: 0,
    });
    expect(mockVariationRepo.update).toHaveBeenNthCalledWith(2, "var-1", {
      sortOrder: 1,
    });
  });
});
