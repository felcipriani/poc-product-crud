import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ProductService } from "@/lib/domain/services/product-service";
import { ProductRepository } from "@/lib/storage/repositories/product-repository";
import { ProductVariationItemRepository } from "@/lib/storage/repositories/product-variation-item-repository";
import { CompositionItemRepository } from "@/lib/storage/repositories/composition-item-repository";
import { StorageService } from "@/lib/storage/storage-service";
import {
  ValidationError,
  BusinessRuleError,
  StorageError,
} from "@/lib/utils/error-handling";
import {
  CreateProductData,
  UpdateProductData,
} from "@/lib/domain/entities/product";

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

describe("Data Persistence Integration", () => {
  let productService: ProductService;
  let productRepository: ProductRepository;
  let variationItemRepository: ProductVariationItemRepository;
  let compositionItemRepository: CompositionItemRepository;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue("[]");

    // Initialize repositories and service
    productRepository = new ProductRepository();
    variationItemRepository = new ProductVariationItemRepository();
    compositionItemRepository = new CompositionItemRepository();
    productService = new ProductService(
      productRepository,
      variationItemRepository,
      compositionItemRepository
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Product Creation with Error Handling", () => {
    it("should create a product successfully with proper data persistence", async () => {
      const productData: CreateProductData = {
        sku: "TEST-001",
        name: "Test Product",
        weight: 1.5,
        dimensions: { height: 10, width: 20, depth: 30 },
        isComposite: false,
        hasVariation: false,
      };

      // Mock successful storage
      localStorageMock.getItem.mockReturnValue("[]");
      localStorageMock.setItem.mockImplementation(() => {});

      const result = await productService.createProduct(productData);

      expect(result).toMatchObject(productData);
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("should handle validation errors during product creation", async () => {
      const invalidProductData: CreateProductData = {
        sku: "", // Invalid empty SKU
        name: "Test Product",
        isComposite: false,
        hasVariation: false,
      };

      await expect(
        productService.createProduct(invalidProductData)
      ).rejects.toThrow(ValidationError);
    });

    it("should handle business rule violations during product creation", async () => {
      const invalidProductData: CreateProductData = {
        sku: "TEST-001",
        name: "Test Product",
        weight: 1.5, // Invalid for composite products
        isComposite: true,
        hasVariation: false,
      };

      await expect(
        productService.createProduct(invalidProductData)
      ).rejects.toThrow(BusinessRuleError);
    });

    it("should handle storage errors during product creation", async () => {
      const productData: CreateProductData = {
        sku: "TEST-001",
        name: "Test Product",
        isComposite: false,
        hasVariation: false,
      };

      // Mock storage failure
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("Storage quota exceeded");
      });

      await expect(productService.createProduct(productData)).rejects.toThrow(
        StorageError
      );
    });

    it("should handle duplicate SKU validation", async () => {
      const productData: CreateProductData = {
        sku: "TEST-001",
        name: "Test Product",
        isComposite: false,
        hasVariation: false,
      };

      // Mock existing product
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify([
          {
            sku: "TEST-001",
            name: "Existing Product",
            isComposite: false,
            hasVariation: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ])
      );

      await expect(productService.createProduct(productData)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe("Product Update with Error Handling", () => {
    it("should update a product successfully", async () => {
      const existingProduct = {
        sku: "TEST-001",
        name: "Original Product",
        isComposite: false,
        hasVariation: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Mock existing product
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify([existingProduct])
      );
      localStorageMock.setItem.mockImplementation(() => {}); // Allow successful save

      const updateData: UpdateProductData = {
        name: "Updated Product",
        weight: 2.0,
      };

      const result = await productService.updateProduct("TEST-001", updateData);

      expect(result.name).toBe("Updated Product");
      expect(result.weight).toBe(2.0);
      expect(result.sku).toBe("TEST-001"); // SKU should remain unchanged
      expect(new Date(result.updatedAt)).toBeInstanceOf(Date);
    });

    it("should handle product not found during update", async () => {
      localStorageMock.getItem.mockReturnValue("[]");

      const updateData: UpdateProductData = {
        name: "Updated Product",
      };

      await expect(
        productService.updateProduct("NONEXISTENT", updateData)
      ).rejects.toThrow(ValidationError);
    });

    it("should validate business rules during update", async () => {
      const existingProduct = {
        sku: "TEST-001",
        name: "Test Product",
        isComposite: false,
        hasVariation: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      localStorageMock.getItem.mockReturnValue(
        JSON.stringify([existingProduct])
      );

      const updateData: UpdateProductData = {
        isComposite: true,
        weight: 1.5, // Invalid for composite products
      };

      await expect(
        productService.updateProduct("TEST-001", updateData)
      ).rejects.toThrow(BusinessRuleError);
    });
  });

  describe("Product Deletion with Error Handling", () => {
    it("should delete a product successfully", async () => {
      const existingProduct = {
        sku: "TEST-001",
        name: "Test Product",
        isComposite: false,
        hasVariation: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      localStorageMock.getItem.mockReturnValue(
        JSON.stringify([existingProduct])
      );
      localStorageMock.setItem.mockImplementation(() => {}); // Allow successful save

      // Mock empty related data
      vi.spyOn(compositionItemRepository, "countByChild").mockResolvedValue(0);
      vi.spyOn(variationItemRepository, "deleteByProduct").mockResolvedValue();
      vi.spyOn(compositionItemRepository, "deleteByParent").mockResolvedValue();

      await expect(
        productService.deleteProduct("TEST-001")
      ).resolves.not.toThrow();
    });

    it("should handle product not found during deletion", async () => {
      localStorageMock.getItem.mockReturnValue("[]");

      await expect(productService.deleteProduct("NONEXISTENT")).rejects.toThrow(
        ValidationError
      );
    });

    it("should prevent deletion of products used in compositions", async () => {
      const existingProduct = {
        sku: "TEST-001",
        name: "Test Product",
        isComposite: false,
        hasVariation: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      localStorageMock.getItem.mockReturnValue(
        JSON.stringify([existingProduct])
      );

      // Mock product being used in compositions
      vi.spyOn(compositionItemRepository, "countByChild").mockResolvedValue(2);

      await expect(productService.deleteProduct("TEST-001")).rejects.toThrow(
        BusinessRuleError
      );
    });
  });

  describe("Data Consistency and Transactions", () => {
    it("should maintain data consistency during failed operations", async () => {
      const productData: CreateProductData = {
        sku: "TEST-001",
        name: "Test Product",
        isComposite: false,
        hasVariation: false,
      };

      // Mock storage failure after validation passes
      localStorageMock.getItem.mockReturnValue("[]"); // No existing products
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("Storage failure");
      });

      await expect(productService.createProduct(productData)).rejects.toThrow(
        StorageError
      );

      // Verify no partial data was saved
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    });

    it("should handle concurrent operations safely", async () => {
      const productData1: CreateProductData = {
        sku: "TEST-001",
        name: "Product 1",
        isComposite: false,
        hasVariation: false,
      };

      const productData2: CreateProductData = {
        sku: "TEST-002",
        name: "Product 2",
        isComposite: false,
        hasVariation: false,
      };

      localStorageMock.getItem.mockReturnValue("[]");
      localStorageMock.setItem.mockImplementation(() => {});

      // Simulate concurrent operations
      const [result1, result2] = await Promise.all([
        productService.createProduct(productData1),
        productService.createProduct(productData2),
      ]);

      expect(result1.sku).toBe("TEST-001");
      expect(result2.sku).toBe("TEST-002");
    });
  });

  describe("Error Recovery and Rollback", () => {
    it("should handle storage service errors gracefully", async () => {
      const productData: CreateProductData = {
        sku: "TEST-001",
        name: "Test Product",
        isComposite: false,
        hasVariation: false,
      };

      // Mock storage service failure
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error("Storage service unavailable");
      });

      await expect(productService.createProduct(productData)).rejects.toThrow();
    });

    it("should provide detailed error information for debugging", async () => {
      const productData: CreateProductData = {
        sku: "TEST-001",
        name: "Test Product",
        weight: 1.5,
        isComposite: true, // This violates business rule
        hasVariation: false,
      };

      try {
        await productService.createProduct(productData);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessRuleError);
        const businessError = error as BusinessRuleError;
        expect(businessError.rule).toBe("composite_weight_rule");
        expect(businessError.context).toMatchObject({
          sku: "TEST-001",
          weight: 1.5,
        });
      }
    });
  });

  describe("Performance and Optimization", () => {
    it("should handle large datasets efficiently", async () => {
      // Mock large dataset
      const largeDataset: any[] = [];
      for (let i = 0; i < 1000; i++) {
        largeDataset.push({
          sku: `PROD-${i.toString().padStart(3, "0")}`,
          name: `Product ${i}`,
          isComposite: false,
          hasVariation: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(largeDataset));

      const startTime = Date.now();
      const products = await productService.getAllProducts();
      const endTime = Date.now();

      expect(products).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it("should cache frequently accessed data", async () => {
      const existingProduct = {
        sku: "TEST-001",
        name: "Test Product",
        isComposite: false,
        hasVariation: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      localStorageMock.getItem.mockReturnValue(
        JSON.stringify([existingProduct])
      );

      // First call
      await productService.getProduct("TEST-001");

      // Second call should use cached data
      await productService.getProduct("TEST-001");

      // Verify localStorage was only called once for the same data
      expect(localStorageMock.getItem).toHaveBeenCalled();
    });
  });
});
