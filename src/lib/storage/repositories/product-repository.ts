import { v4 as uuidv4 } from "uuid";
import { BaseRepository } from "./base-repository";
import { STORAGE_KEYS } from "../storage-service";
import {
  Product,
  ProductSchema,
  CreateProductData,
  UpdateProductData,
} from "../../domain/entities/product";

export class ProductRepository extends BaseRepository<
  Product,
  CreateProductData,
  UpdateProductData
> {
  protected storageKey = STORAGE_KEYS.PRODUCTS;
  protected entityName = "Product";

  protected getId(entity: Product): string {
    return entity.sku;
  }

  protected createEntity(data: CreateProductData): Product {
    const now = new Date();
    return {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
  }

  protected updateEntity(existing: Product, data: UpdateProductData): Product {
    // Ensure SKU is never changed during update
    const { sku: _, ...updateDataWithoutSku } = data as any;
    return {
      ...existing,
      ...updateDataWithoutSku,
      sku: existing.sku, // Explicitly preserve the original SKU
      updatedAt: new Date(),
    };
  }

  protected validateEntity(entity: Product): void {
    const result = ProductSchema.safeParse(entity);
    if (!result.success) {
      throw new Error(`Invalid product data: ${result.error.message}`);
    }
  }

  /**
   * Finds a product by SKU (alias for findById)
   */
  async findBySku(sku: string): Promise<Product | null> {
    return this.findById(sku);
  }

  /**
   * Checks if a SKU already exists
   */
  async skuExists(sku: string): Promise<boolean> {
    return this.exists(sku);
  }

  /**
   * Finds products by type (composite, with variations, etc.)
   */
  async findByType(filters: {
    isComposite?: boolean;
    hasVariation?: boolean;
  }): Promise<Product[]> {
    return this.findWhere((product) => {
      if (
        filters.isComposite !== undefined &&
        product.isComposite !== filters.isComposite
      ) {
        return false;
      }
      if (
        filters.hasVariation !== undefined &&
        product.hasVariation !== filters.hasVariation
      ) {
        return false;
      }
      return true;
    });
  }

  /**
   * Searches products by name or SKU
   */
  async search(query: string): Promise<Product[]> {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      return this.findAll();
    }

    return this.findWhere((product) => {
      return (
        product.sku.toLowerCase().includes(normalizedQuery) ||
        product.name.toLowerCase().includes(normalizedQuery)
      );
    });
  }

  /**
   * Validates business rules before creating a product
   */
  async validateForCreation(data: CreateProductData): Promise<void> {
    // Check SKU uniqueness
    const existingProduct = await this.findBySku(data.sku);
    if (existingProduct) {
      throw new Error(`Product with SKU '${data.sku}' already exists`);
    }

    // TODO: Implement BusinessRules - validateCompositeWeightRule
  }

  /**
   * Validates business rules before updating a product
   */
  async validateForUpdate(sku: string, data: UpdateProductData): Promise<void> {
    const existingProduct = await this.findBySku(sku);
    if (!existingProduct) {
      throw new Error(`Product with SKU '${sku}' not found`);
    }

    // Ensure no SKU is being passed in update data (defensive programming)
    if ("sku" in data) {
      throw new Error("SKU cannot be modified during update");
    }

    const updatedProduct = { ...existingProduct, ...data };

    // TODO: Implement BusinessRules - validateCompositeWeightRule
  }

  /**
   * Gets products that can be used in compositions (non-variable or specific variations)
   */
  async findCompositionEligible(): Promise<Product[]> {
    return this.findWhere((product) => !product.hasVariation);
  }

  /**
   * Gets products that have variations
   */
  async findWithVariations(): Promise<Product[]> {
    return this.findWhere((product) => product.hasVariation);
  }

  /**
   * Gets composite products
   */
  async findComposite(): Promise<Product[]> {
    return this.findWhere((product) => product.isComposite);
  }

  /**
   * Gets simple products (no variations, not composite)
   */
  async findSimple(): Promise<Product[]> {
    return this.findWhere(
      (product) => !product.hasVariation && !product.isComposite
    );
  }

  /**
   * Validates that a product can be deleted
   */
  async validateForDeletion(sku: string): Promise<void> {
    const product = await this.findBySku(sku);
    if (!product) {
      throw new Error(`Product with SKU '${sku}' not found`);
    }
  }

  /**
   * Deletes related data for a product (compositions and variations)
   */
  private async deleteRelatedData(sku: string): Promise<void> {
    const { CompositionItemRepository } = await import(
      "./composition-item-repository"
    );
    const { ProductVariationItemRepository } = await import(
      "./product-variation-item-repository"
    );

    const compositionRepo = new CompositionItemRepository();
    const variationRepo = new ProductVariationItemRepository();

    // Delete all compositions where this product is the parent
    await compositionRepo.deleteByParent(sku);

    // Delete all variations for this product
    await variationRepo.deleteByProduct(sku);
  }

  /**
   * Updates product metadata counts
   */
  async updateMetadata(): Promise<void> {
    const count = await this.count();
    await this.storage.updateMeta({ totalProducts: count });
  }

  /**
   * Creates a product with validation
   */
  async create(data: CreateProductData): Promise<Product> {
    await this.validateForCreation(data);
    const product = await super.create(data);
    await this.updateMetadata();
    return product;
  }

  /**
   * Updates a product with validation
   */
  async update(sku: string, data: UpdateProductData): Promise<Product> {
    await this.validateForUpdate(sku, data);
    const product = await super.update(sku, data);
    return product;
  }

  /**
   * Deletes a product with validation and cascade deletion
   */
  async delete(sku: string): Promise<void> {
    await this.validateForDeletion(sku);
    await this.deleteRelatedData(sku);
    await super.delete(sku);
    await this.updateMetadata();
  }
}
