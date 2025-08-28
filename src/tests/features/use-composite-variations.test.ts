import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCompositeVariations } from "@/features/products/hooks/use-composite-variations";
import { ProductVariationItemRepository } from "@/lib/storage/repositories/product-variation-item-repository";
import { CompositionItemRepository } from "@/lib/storage/repositories/composition-item-repository";
import { ProductRepository } from "@/lib/storage/repositories/product-repository";

vi.mock("@/lib/storage/repositories/product-variation-item-repository");
vi.mock("@/lib/storage/repositories/composition-item-repository");
vi.mock("@/lib/storage/repositories/product-repository");
vi.mock("@/lib/storage/storage-service");

const mockVariationRepository = {
  findByProductSku: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
};

const mockCompositionRepository = {
  findByParent: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockProductRepository = {
  findBySku: vi.fn(),
};

vi.mocked(ProductVariationItemRepository).mockImplementation(
  () => mockVariationRepository as any
);
vi.mocked(CompositionItemRepository).mockImplementation(
  () => mockCompositionRepository as any
);
vi.mocked(ProductRepository).mockImplementation(
  () => mockProductRepository as any
);

describe("useCompositeVariations", () => {
  const productSku = "PARENT-001";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates totalWeight using child product weights for simple products", async () => {
    const variation = {
      id: "var-1",
      productSku,
      selections: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockVariationRepository.findByProductSku.mockResolvedValue([variation]);

    const compositionItems = [
      {
        id: "comp-1",
        parentSku: `${productSku}#var-1`,
        childSku: "CHILD-001",
        quantity: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "comp-2",
        parentSku: `${productSku}#var-1`,
        childSku: "CHILD-002",
        quantity: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockCompositionRepository.findByParent.mockResolvedValue(compositionItems);

    mockProductRepository.findBySku.mockImplementation((sku: string) => {
      const weight = sku === "CHILD-001" ? 1 : 0.5;
      return Promise.resolve({
        sku,
        name: "Product",
        weight,
        isComposite: false,
        hasVariation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    const { result } = renderHook(() => useCompositeVariations(productSku));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.variations[0].totalWeight).toBeCloseTo(4);
    expect(mockProductRepository.findBySku).toHaveBeenCalledWith("CHILD-001");
    expect(mockProductRepository.findBySku).toHaveBeenCalledWith("CHILD-002");
  });

  it("calculates totalWeight using child product weights for variation SKUs", async () => {
    const variation = {
      id: "var-1",
      productSku,
      selections: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockVariationRepository.findByProductSku.mockResolvedValue([variation]);

    const compositionItems = [
      {
        id: "comp-1",
        parentSku: `${productSku}#var-1`,
        childSku: "CHILD-003#opt",
        quantity: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockCompositionRepository.findByParent.mockResolvedValue(compositionItems);

    mockProductRepository.findBySku.mockResolvedValue({
      sku: "CHILD-003#opt",
      name: "Child Variation",
      weight: 5,
      isComposite: false,
      hasVariation: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { result } = renderHook(() => useCompositeVariations(productSku));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.variations[0].totalWeight).toBe(15);
    expect(mockProductRepository.findBySku).toHaveBeenCalledWith(
      "CHILD-003#opt"
    );
  });

  it("allows creating variations and adding composition items", async () => {
    const variation = {
      id: "var-1",
      productSku,
      selections: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockVariationRepository.findByProductSku
      .mockResolvedValueOnce([]) // initial load
      .mockResolvedValue([variation]); // subsequent loads

    const items: any[] = [];
    mockCompositionRepository.findByParent.mockImplementation(
      async (parent) => {
        if (parent === `${productSku}#var-1`) return items;
        return [];
      }
    );
    mockCompositionRepository.create.mockImplementation(async (data) => {
      const item = {
        id: "comp-1",
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      items.push(item);
      return item;
    });

    const { result } = renderHook(() => useCompositeVariations(productSku));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.variations).toHaveLength(0);

    await result.current.createVariation({ productSku });
    await waitFor(() => expect(result.current.variations).toHaveLength(1));

    await result.current.addCompositionItem("var-1", {
      childSku: "CHILD-001",
      quantity: 1,
    });
    await waitFor(() =>
      expect(result.current.variations[0].compositionItems).toHaveLength(1)
    );
  });
});
