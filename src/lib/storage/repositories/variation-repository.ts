import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './base-repository';
import { STORAGE_KEYS } from '../storage-service';
import {
  Variation,
  VariationSchema,
  CreateVariationData,
  UpdateVariationData,
} from '../../domain/entities/variation';

export class VariationRepository extends BaseRepository<
  Variation,
  CreateVariationData,
  UpdateVariationData
> {
  protected storageKey = STORAGE_KEYS.VARIATIONS;
  protected entityName = 'Variation';

  protected getId(entity: Variation): string {
    return entity.id;
  }

  protected createEntity(data: CreateVariationData): Variation {
    const now = new Date();
    return {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
  }

  protected updateEntity(existing: Variation, data: UpdateVariationData): Variation {
    return {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
  }

  protected validateEntity(entity: Variation): void {
    const result = VariationSchema.safeParse(entity);
    if (!result.success) {
      throw new Error(`Invalid variation data: ${result.error.message}`);
    }
  }

  /**
   * Finds variations by variation type ID
   */
  async findByVariationType(variationTypeId: string): Promise<Variation[]> {
    return this.findWhere((variation) => variation.variationTypeId === variationTypeId);
  }

  /**
   * Finds a variation by name within a specific variation type (case-insensitive)
   */
  async findByNameInType(name: string, variationTypeId: string): Promise<Variation | null> {
    const normalizedName = name.toLowerCase().trim();
    return this.findFirst((variation) => 
      variation.variationTypeId === variationTypeId &&
      variation.name.toLowerCase().trim() === normalizedName
    );
  }

  /**
   * Checks if a name already exists within a variation type (case-insensitive)
   */
  async nameExistsInType(
    name: string, 
    variationTypeId: string, 
    excludeId?: string
  ): Promise<boolean> {
    const existing = await this.findByNameInType(name, variationTypeId);
    return existing !== null && existing.id !== excludeId;
  }

  /**
   * Gets variations grouped by variation type
   */
  async findGroupedByType(): Promise<Record<string, Variation[]>> {
    const variations = await this.findAll();
    const grouped: Record<string, Variation[]> = {};
    
    for (const variation of variations) {
      if (!grouped[variation.variationTypeId]) {
        grouped[variation.variationTypeId] = [];
      }
      grouped[variation.variationTypeId].push(variation);
    }
    
    return grouped;
  }

  /**
   * Gets variations by multiple IDs
   */
  async findByIds(ids: string[]): Promise<Variation[]> {
    const idsSet = new Set(ids);
    return this.findWhere((variation) => idsSet.has(variation.id));
  }

  /**
   * Searches variations by name
   */
  async search(query: string, variationTypeId?: string): Promise<Variation[]> {
    const normalizedQuery = query.toLowerCase().trim();
    
    return this.findWhere((variation) => {
      // Filter by variation type if specified
      if (variationTypeId && variation.variationTypeId !== variationTypeId) {
        return false;
      }
      
      // Filter by name if query provided
      if (normalizedQuery && !variation.name.toLowerCase().includes(normalizedQuery)) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Counts variations by variation type
   */
  async countByVariationType(variationTypeId: string): Promise<number> {
    const variations = await this.findByVariationType(variationTypeId);
    return variations.length;
  }

  /**
   * Validates business rules before creating a variation
   */
  async validateForCreation(data: CreateVariationData): Promise<void> {
    // Check name uniqueness within the variation type
    const existing = await this.findByNameInType(data.name, data.variationTypeId);
    if (existing) {
      throw new Error(`A variation with name '${data.name}' already exists in this variation type`);
    }
  }

  /**
   * Validates business rules before updating a variation
   */
  async validateForUpdate(id: string, data: UpdateVariationData): Promise<void> {
    const existingVariation = await this.findById(id);
    if (!existingVariation) {
      throw new Error(`Variation with ID '${id}' not found`);
    }

    // Check name uniqueness if name is being updated
    if (data.name !== undefined) {
      const existing = await this.findByNameInType(data.name, existingVariation.variationTypeId);
      if (existing && existing.id !== id) {
        throw new Error(`A variation with name '${data.name}' already exists in this variation type`);
      }
    }
  }

  /**
   * Validates that a variation can be deleted
   */
  async validateForDeletion(id: string): Promise<void> {
    const variation = await this.findById(id);
    if (!variation) {
      throw new Error(`Variation with ID '${id}' not found`);
    }

    // Check if the variation is used in any product variation items
    const { ProductVariationItemRepository } = await import('./product-variation-item-repository');
    const variationItemRepository = new ProductVariationItemRepository();
    const usageItems = await variationItemRepository.findByVariation(id);
    
    if (usageItems.length > 0) {
      throw new Error(
        `Cannot delete variation '${variation.name}' because it is being used in ${usageItems.length} product variation(s). Please remove it from all products first.`
      );
    }
  }

  /**
   * Gets variations for multiple variation types (used for combination generation)
   */
  async findForVariationTypes(variationTypeIds: string[]): Promise<Record<string, Variation[]>> {
    const variations = await this.findAll();
    const result: Record<string, Variation[]> = {};
    
    for (const typeId of variationTypeIds) {
      result[typeId] = variations.filter(v => v.variationTypeId === typeId);
    }
    
    return result;
  }

  /**
   * Deletes all variations for a specific variation type
   */
  async deleteByVariationType(variationTypeId: string): Promise<void> {
    const variations = await this.findByVariationType(variationTypeId);
    const variationIds = variations.map((v) => v.id);
    
    if (variationIds.length > 0) {
      await this.deleteMany(variationIds);
      await this.updateMetadata();
    }
  }

  /**
   * Updates variation metadata counts
   */
  async updateMetadata(): Promise<void> {
    const count = await this.count();
    await this.storage.updateMeta({ totalVariations: count });
  }

  /**
   * Creates a variation with validation
   */
  async create(data: CreateVariationData): Promise<Variation> {
    await this.validateForCreation(data);
    const variation = await super.create(data);
    await this.updateMetadata();
    return variation;
  }

  /**
   * Updates a variation with validation
   */
  async update(id: string, data: UpdateVariationData): Promise<Variation> {
    await this.validateForUpdate(id, data);
    const variation = await super.update(id, data);
    return variation;
  }

  /**
   * Deletes a variation with validation
   */
  async delete(id: string): Promise<void> {
    await this.validateForDeletion(id);
    await super.delete(id);
    await this.updateMetadata();
  }
}