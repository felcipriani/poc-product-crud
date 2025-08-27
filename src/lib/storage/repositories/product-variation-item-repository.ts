import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './base-repository';
import { STORAGE_KEYS } from '../storage-service';
import {
  ProductVariationItem,
  ProductVariationItemSchema,
  CreateProductVariationItemData,
  UpdateProductVariationItemData,
} from '../../domain/entities/product-variation-item';

export class ProductVariationItemRepository extends BaseRepository<
  ProductVariationItem,
  CreateProductVariationItemData,
  UpdateProductVariationItemData
> {
  protected storageKey = STORAGE_KEYS.PRODUCT_VARIATIONS;
  protected entityName = 'ProductVariationItem';

  protected getId(entity: ProductVariationItem): string {
    return entity.id;
  }

  protected createEntity(data: CreateProductVariationItemData): ProductVariationItem {
    const now = new Date();
    return {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
  }

  protected updateEntity(
    existing: ProductVariationItem,
    data: UpdateProductVariationItemData
  ): ProductVariationItem {
    return {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
  }

  protected validateEntity(entity: ProductVariationItem): void {
    const result = ProductVariationItemSchema.safeParse(entity);
    if (!result.success) {
      throw new Error(`Invalid product variation item data: ${result.error.message}`);
    }
  }

  /**
   * Finds all variation items for a specific product
   */
  async findByProduct(productSku: string): Promise<ProductVariationItem[]> {
    return this.findWhere((item) => item.productSku === productSku);
  }

  /**
   * Alias for findByProduct for consistency with hook usage
   */
  async findByProductSku(productSku: string): Promise<ProductVariationItem[]> {
    return this.findByProduct(productSku);
  }

  /**
   * Finds a variation item by product and selections
   */
  async findBySelections(
    productSku: string,
    selections: Record<string, string>
  ): Promise<ProductVariationItem | null> {
    return this.findFirst((item) => {
      if (item.productSku !== productSku) return false;
      
      // Check if all selections match
      const itemSelectionKeys = Object.keys(item.selections);
      const searchSelectionKeys = Object.keys(selections);
      
      if (itemSelectionKeys.length !== searchSelectionKeys.length) return false;
      
      return searchSelectionKeys.every(key => 
        item.selections[key] === selections[key]
      );
    });
  }

  /**
   * Counts variation items for a specific product
   */
  async countByProduct(productSku: string): Promise<number> {
    const items = await this.findByProduct(productSku);
    return items.length;
  }

  /**
   * Finds items that use a specific variation
   */
  async findByVariation(variationId: string): Promise<ProductVariationItem[]> {
    return this.findWhere((item) =>
      Object.values(item.selections).includes(variationId)
    );
  }

  /**
   * Finds items that use any variation from a specific variation type
   */
  async findByVariationType(variationTypeId: string): Promise<ProductVariationItem[]> {
    return this.findWhere((item) =>
      Object.keys(item.selections).includes(variationTypeId)
    );
  }

  /**
   * Generates all possible combinations for a product
   */
  async *generateCombinations(
    variationTypeIds: string[],
    variationsByType: Record<string, Array<{ id: string; name: string }>>
  ): AsyncGenerator<Record<string, string>> {
    if (variationTypeIds.length === 0) return;
    
    // Generate cartesian product of all variations
    const generateCartesianProduct = (arrays: string[][]): string[][] => {
      return arrays.reduce((acc, curr) => 
        acc.flatMap(x => curr.map(y => [...x, y])), 
        [[]] as string[][]
      );
    };
    
    const variationArrays = variationTypeIds.map(typeId => 
      variationsByType[typeId]?.map(v => v.id) || []
    );
    
    const combinations = generateCartesianProduct(variationArrays);
    
    for (const combination of combinations) {
      const selections: Record<string, string> = {};
      variationTypeIds.forEach((typeId, index) => {
        selections[typeId] = combination[index];
      });
      yield selections;
    }
  }

  /**
   * Creates multiple variation items from combinations
   */
  async createFromCombinations(
    productSku: string,
    combinations: Record<string, string>[],
    defaultOverrides?: {
      weightOverride?: number;
      dimensionsOverride?: { height: number; width: number; depth: number };
    }
  ): Promise<ProductVariationItem[]> {
    const items: CreateProductVariationItemData[] = combinations.map((selections) => ({
      productSku,
      selections,
      weightOverride: defaultOverrides?.weightOverride,
      dimensionsOverride: defaultOverrides?.dimensionsOverride,
    }));

    return this.createMany(items);
  }

  /**
   * Validates business rules before creating a variation item
   */
  async validateForCreation(data: CreateProductVariationItemData): Promise<void> {
    // Check combination uniqueness
    const existing = await this.findBySelections(data.productSku, data.selections);
    if (existing) {
      throw new Error('A variation with this combination already exists for this product');
    }

    // Additional validation would include:
    // - Checking that all variation IDs exist
    // - Checking that variation types are valid for the product
    // - Validating weight/dimension override requirements
  }

  /**
   * Validates business rules before updating a variation item
   */
  async validateForUpdate(
    id: string,
    data: UpdateProductVariationItemData
  ): Promise<void> {
    const existingItem = await this.findById(id);
    if (!existingItem) {
      throw new Error(`Product variation item with ID '${id}' not found`);
    }

    // Check combination uniqueness if selections are being updated
    if (data.selections !== undefined) {
      const existing = await this.findBySelections(existingItem.productSku, data.selections);
      if (existing && existing.id !== id) {
        throw new Error('A variation with this combination already exists for this product');
      }
    }
  }

  /**
   * Validates that a variation item can be deleted
   */
  async validateForDeletion(id: string): Promise<void> {
    const item = await this.findById(id);
    if (!item) {
      throw new Error(`Product variation item with ID '${id}' not found`);
    }

    // Additional validation would check if this variation is used in compositions
  }

  /**
   * Deletes all variation items for a specific product
   */
  async deleteByProduct(productSku: string): Promise<void> {
    const items = await this.findByProduct(productSku);
    const itemIds = items.map((item) => item.id);
    
    if (itemIds.length > 0) {
      await this.deleteMany(itemIds);
    }
  }

  /**
   * Deletes all variation items that use a specific variation
   */
  async deleteByVariation(variationId: string): Promise<void> {
    const items = await this.findByVariation(variationId);
    const itemIds = items.map((item) => item.id);
    
    if (itemIds.length > 0) {
      await this.deleteMany(itemIds);
    }
  }

  /**
   * Gets the effective weight for a variation item
   */
  getEffectiveWeight(
    item: ProductVariationItem,
    baseWeight?: number
  ): number | undefined {
    if (item.weightOverride !== undefined) {
      return item.weightOverride;
    }
    return baseWeight;
  }

  /**
   * Gets the effective dimensions for a variation item
   */
  getEffectiveDimensions(
    item: ProductVariationItem,
    baseDimensions?: { height: number; width: number; depth: number }
  ): { height: number; width: number; depth: number } | undefined {
    if (item.dimensionsOverride !== undefined) {
      return item.dimensionsOverride;
    }
    return baseDimensions;
  }

  /**
   * Searches variation items by product SKU or variation names
   */
  async search(query: string): Promise<ProductVariationItem[]> {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      return this.findAll();
    }

    return this.findWhere((item) =>
      item.productSku.toLowerCase().includes(normalizedQuery)
    );
  }

  /**
   * Creates a variation item with validation
   */
  async create(data: CreateProductVariationItemData): Promise<ProductVariationItem> {
    await this.validateForCreation(data);
    return super.create(data);
  }

  /**
   * Updates a variation item with validation
   */
  async update(
    id: string,
    data: UpdateProductVariationItemData
  ): Promise<ProductVariationItem> {
    await this.validateForUpdate(id, data);
    return super.update(id, data);
  }

  /**
   * Deletes a variation item with validation
   */
  async delete(id: string): Promise<void> {
    await this.validateForDeletion(id);
    await super.delete(id);
  }
}