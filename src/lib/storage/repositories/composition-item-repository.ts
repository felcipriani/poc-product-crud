import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './base-repository';
import { STORAGE_KEYS } from '../storage-service';
import {
  CompositionItem,
  CompositionItemSchema,
  CreateCompositionItemData,
  UpdateCompositionItemData,
} from '../../domain/entities/composition-item';

export class CompositionItemRepository extends BaseRepository<
  CompositionItem,
  CreateCompositionItemData,
  UpdateCompositionItemData
> {
  protected storageKey = STORAGE_KEYS.COMPOSITIONS;
  protected entityName = 'CompositionItem';

  protected getId(entity: CompositionItem): string {
    return entity.id;
  }

  protected createEntity(data: CreateCompositionItemData): CompositionItem {
    const now = new Date();
    return {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
  }

  protected updateEntity(
    existing: CompositionItem,
    data: UpdateCompositionItemData
  ): CompositionItem {
    return {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
  }

  protected validateEntity(entity: CompositionItem): void {
    const result = CompositionItemSchema.safeParse(entity);
    if (!result.success) {
      throw new Error(`Invalid composition item data: ${result.error.message}`);
    }
  }

  /**
   * Finds all composition items for a specific parent product
   */
  async findByParent(parentSku: string): Promise<CompositionItem[]> {
    // TODO: Implement BusinessRules - filterByParent
    const items = await this.findAll();
    return items.filter(item => item.parentSku === parentSku);
  }

  /**
   * Finds all composition items that use a specific child product
   */
  async findByChild(childSku: string): Promise<CompositionItem[]> {
    // TODO: Implement BusinessRules - filterByChild
    const items = await this.findAll();
    return items.filter(item => item.childSku === childSku);
  }

  /**
   * Gets compositions grouped by parent SKU
   */
  async findGroupedByParent(): Promise<Record<string, CompositionItem[]>> {
    const items = await this.findAll();
    // TODO: Implement BusinessRules - groupByParent
    return items.reduce((acc, item) => {
      if (!acc[item.parentSku]) {
        acc[item.parentSku] = [];
      }
      acc[item.parentSku].push(item);
      return acc;
    }, {} as Record<string, CompositionItem[]>);
  }

  /**
   * Counts composition items for a specific parent product
   */
  async countByParent(parentSku: string): Promise<number> {
    const items = await this.findByParent(parentSku);
    return items.length;
  }

  /**
   * Counts how many times a child product is used in compositions
   */
  async countByChild(childSku: string): Promise<number> {
    const items = await this.findByChild(childSku);
    return items.length;
  }

  /**
   * Calculates total weight for a composite product
   */
  async calculateCompositeWeight(
    parentSku: string,
    childWeights: Record<string, number>
  ): Promise<number> {
    const compositionItems = await this.findByParent(parentSku);
    // TODO: Implement BusinessRules - calculateCompositeWeight
    return compositionItems.reduce((total, item) => {
      const childWeight = childWeights[item.childSku] || 0;
      return total + (childWeight * item.quantity);
    }, 0);
  }

  /**
   * Finds a specific composition item by parent and child
   */
  async findByParentAndChild(
    parentSku: string,
    childSku: string
  ): Promise<CompositionItem | null> {
    return this.findFirst((item) =>
      item.parentSku === parentSku && item.childSku === childSku
    );
  }

  /**
   * Validates business rules before creating a composition item
   */
  async validateForCreation(data: CreateCompositionItemData): Promise<void> {
    // TODO: Implement validation rules
    // - Validate no self-reference
    // - Validate quantity bounds  
    // - Check for duplicate child
    // - Validate no circular dependency
    
    if (data.parentSku === data.childSku) {
      throw new Error('A product cannot be composed of itself');
    }
    
    if (data.quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    // Additional validation would include:
    // - Checking that parent product exists and is composite
    // - Checking that child product exists
    // - Validating child product eligibility (not variable unless specific variation)
  }

  /**
   * Validates business rules before updating a composition item
   */
  async validateForUpdate(
    id: string,
    data: UpdateCompositionItemData
  ): Promise<void> {
    const existingItem = await this.findById(id);
    if (!existingItem) {
      throw new Error(`Composition item with ID '${id}' not found`);
    }

    // Validate quantity bounds if being updated
    if (data.quantity !== undefined && data.quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    // Additional validation for parent/child changes would go here
    // (though typically these shouldn't be changed after creation)
  }

  /**
   * Validates that a composition item can be deleted
   */
  async validateForDeletion(id: string): Promise<void> {
    const item = await this.findById(id);
    if (!item) {
      throw new Error(`Composition item with ID '${id}' not found`);
    }

    // Additional validation could check business rules about minimum compositions
  }

  /**
   * Deletes all composition items for a specific parent product
   */
  async deleteByParent(parentSku: string): Promise<void> {
    const items = await this.findByParent(parentSku);
    const itemIds = items.map((item) => item.id);
    
    if (itemIds.length > 0) {
      await this.deleteMany(itemIds);
    }
  }

  /**
   * Deletes all composition items that use a specific child product
   */
  async deleteByChild(childSku: string): Promise<void> {
    const items = await this.findByChild(childSku);
    const itemIds = items.map((item) => item.id);
    
    if (itemIds.length > 0) {
      await this.deleteMany(itemIds);
    }
  }

  /**
   * Updates the quantity of a composition item
   */
  async updateQuantity(id: string, quantity: number): Promise<CompositionItem> {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }
    return this.update(id, { quantity });
  }

  /**
   * Gets all parent products that use a specific child
   */
  async getParentsUsingChild(childSku: string): Promise<string[]> {
    const items = await this.findByChild(childSku);
    return [...new Set(items.map((item) => item.parentSku))];
  }

  /**
   * Gets all child products used by a specific parent
   */
  async getChildrenOfParent(parentSku: string): Promise<string[]> {
    const items = await this.findByParent(parentSku);
    return items.map((item) => item.childSku);
  }

  /**
   * Checks if a product is used as a child in any composition
   */
  async isUsedAsChild(childSku: string): Promise<boolean> {
    const count = await this.countByChild(childSku);
    return count > 0;
  }

  /**
   * Checks if a product has any composition items (is a composite parent)
   */
  async hasCompositionItems(parentSku: string): Promise<boolean> {
    const count = await this.countByParent(parentSku);
    return count > 0;
  }

  /**
   * Searches composition items by parent or child SKU
   */
  async search(query: string): Promise<CompositionItem[]> {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      return this.findAll();
    }

    return this.findWhere((item) =>
      item.parentSku.toLowerCase().includes(normalizedQuery) ||
      item.childSku.toLowerCase().includes(normalizedQuery)
    );
  }

  /**
   * Creates a composition item with validation
   */
  async create(data: CreateCompositionItemData): Promise<CompositionItem> {
    await this.validateForCreation(data);
    return super.create(data);
  }

  /**
   * Updates a composition item with validation
   */
  async update(id: string, data: UpdateCompositionItemData): Promise<CompositionItem> {
    await this.validateForUpdate(id, data);
    return super.update(id, data);
  }

  /**
   * Deletes a composition item with validation
   */
  async delete(id: string): Promise<void> {
    await this.validateForDeletion(id);
    await super.delete(id);
  }

  /**
   * Batch create composition items
   */
  async createBatch(dataArray: CreateCompositionItemData[]): Promise<CompositionItem[]> {
    const createdItems: CompositionItem[] = [];
    
    for (const data of dataArray) {
      await this.validateForCreation(data);
      const item = await this.create(data);
      createdItems.push(item);
    }
    
    return createdItems;
  }

  /**
   * Find composition items by parent SKU pattern (for variations)
   */
  async findByParentPattern(parentSkuPattern: string): Promise<CompositionItem[]> {
    const items = await this.findAll();
    return items.filter(item => item.parentSku.startsWith(parentSkuPattern));
  }

  /**
   * Delete all composition items for a parent pattern (for variations)
   */
  async deleteByParentPattern(parentSkuPattern: string): Promise<void> {
    const items = await this.findByParentPattern(parentSkuPattern);
    const itemIds = items.map(item => item.id);
    
    if (itemIds.length > 0) {
      await this.deleteMany(itemIds);
    }
  }

  /**
   * Move composition items from one parent to another (for migrations)
   */
  async moveItems(fromParentSku: string, toParentSku: string): Promise<CompositionItem[]> {
    const items = await this.findByParent(fromParentSku);
    const movedItems: CompositionItem[] = [];

    for (const item of items) {
      const updatedItem = await this.update(item.id, { quantity: item.quantity });
      movedItems.push(updatedItem);
    }

    return movedItems;
  }

  /**
   * Copy composition items from one parent to another
   */
  async copyItems(fromParentSku: string, toParentSku: string): Promise<CompositionItem[]> {
    const sourceItems = await this.findByParent(fromParentSku);
    const copiedItems: CompositionItem[] = [];

    for (const sourceItem of sourceItems) {
      const copiedItem = await this.create({
        parentSku: toParentSku,
        childSku: sourceItem.childSku,
        quantity: sourceItem.quantity
      });
      copiedItems.push(copiedItem);
    }

    return copiedItems;
  }

  /**
   * Get composition statistics
   */
  async getCompositionStats(): Promise<{
    totalItems: number;
    uniqueParents: number;
    uniqueChildren: number;
    averageItemsPerParent: number;
  }> {
    const items = await this.findAll();
    const uniqueParents = new Set(items.map(item => item.parentSku)).size;
    const uniqueChildren = new Set(items.map(item => item.childSku)).size;
    
    return {
      totalItems: items.length,
      uniqueParents,
      uniqueChildren,
      averageItemsPerParent: uniqueParents > 0 ? items.length / uniqueParents : 0
    };
  }

  /**
   * Validate referential integrity
   */
  async validateIntegrity(availableProducts: string[]): Promise<{
    valid: boolean;
    orphanedItems: CompositionItem[];
    missingChildren: string[];
  }> {
    const items = await this.findAll();
    const orphanedItems: CompositionItem[] = [];
    const missingChildren: string[] = [];

    for (const item of items) {
      // Check if parent exists (extract base SKU for variations)
      const baseParentSku = item.parentSku.split('#')[0];
      if (!availableProducts.includes(baseParentSku)) {
        orphanedItems.push(item);
      }

      // Check if child exists (extract base SKU for variations)
      const baseChildSku = item.childSku.split('#')[0];
      if (!availableProducts.includes(baseChildSku)) {
        if (!missingChildren.includes(item.childSku)) {
          missingChildren.push(item.childSku);
        }
      }
    }

    return {
      valid: orphanedItems.length === 0 && missingChildren.length === 0,
      orphanedItems,
      missingChildren
    };
  }
}