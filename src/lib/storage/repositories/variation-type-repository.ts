import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from './base-repository';
import { STORAGE_KEYS } from '../storage-service';
import {
  VariationType,
  VariationTypeSchema,
  CreateVariationTypeData,
  UpdateVariationTypeData,
} from '../../domain/entities/variation-type';

export class VariationTypeRepository extends BaseRepository<
  VariationType,
  CreateVariationTypeData,
  UpdateVariationTypeData
> {
  protected storageKey = STORAGE_KEYS.VARIATION_TYPES;
  protected entityName = 'VariationType';

  protected getId(entity: VariationType): string {
    return entity.id;
  }

  protected createEntity(data: CreateVariationTypeData): VariationType {
    const now = new Date();
    return {
      id: uuidv4(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
  }

  protected updateEntity(existing: VariationType, data: UpdateVariationTypeData): VariationType {
    return {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
  }

  protected validateEntity(entity: VariationType): void {
    const result = VariationTypeSchema.safeParse(entity);
    if (!result.success) {
      throw new Error(`Invalid variation type data: ${result.error.message}`);
    }
  }

  /**
   * Finds a variation type by name (case-insensitive)
   */
  async findByName(name: string): Promise<VariationType | null> {
    const normalizedName = name.toLowerCase().trim();
    return this.findFirst((vt) => 
      vt.name.toLowerCase().trim() === normalizedName
    );
  }

  /**
   * Checks if a name already exists (case-insensitive)
   */
  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findByName(name);
    return existing !== null && existing.id !== excludeId;
  }

  /**
   * Gets all variation type names for uniqueness validation
   */
  async getAllNames(): Promise<string[]> {
    const variationTypes = await this.findAll();
    return variationTypes.map((vt) => vt.name);
  }

  /**
   * Finds variation types that modify weight
   */
  async findWeightModifying(): Promise<VariationType[]> {
    return this.findWhere((vt) => vt.modifiesWeight);
  }

  /**
   * Finds variation types that modify dimensions
   */
  async findDimensionModifying(): Promise<VariationType[]> {
    return this.findWhere((vt) => vt.modifiesDimensions);
  }

  /**
   * Searches variation types by name
   */
  async search(query: string): Promise<VariationType[]> {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) {
      return this.findAll();
    }

    return this.findWhere((vt) =>
      vt.name.toLowerCase().includes(normalizedQuery)
    );
  }

  /**
   * Validates business rules before creating a variation type
   */
  async validateForCreation(data: CreateVariationTypeData): Promise<void> {
    // Check name uniqueness
    const existing = await this.findByName(data.name);
    if (existing) {
      throw new Error(`A variation type with name '${data.name}' already exists`);
    }
  }

  /**
   * Validates business rules before updating a variation type
   */
  async validateForUpdate(id: string, data: UpdateVariationTypeData): Promise<void> {
    const existingVariationType = await this.findById(id);
    if (!existingVariationType) {
      throw new Error(`Variation type with ID '${id}' not found`);
    }

    // Check name uniqueness if name is being updated
    if (data.name !== undefined) {
      const existing = await this.findByName(data.name);
      if (existing && existing.id !== id) {
        throw new Error(`A variation type with name '${data.name}' already exists`);
      }
    }
  }

  /**
   * Validates that a variation type can be deleted
   */
  async validateForDeletion(id: string): Promise<void> {
    const variationType = await this.findById(id);
    if (!variationType) {
      throw new Error(`Variation type with ID '${id}' not found`);
    }

    // Check if any variations exist for this type
    const { VariationRepository } = await import('./variation-repository');
    const variationRepository = new VariationRepository();
    const variationCount = await variationRepository.countByVariationType(id);
    
    if (variationCount > 0) {
      throw new Error(
        `Cannot delete variation type '${variationType.name}' because it has ${variationCount} variation(s) associated with it. Please delete all variations first.`
      );
    }
  }

  /**
   * Gets variation types by IDs
   */
  async findByIds(ids: string[]): Promise<VariationType[]> {
    const idsSet = new Set(ids);
    return this.findWhere((vt) => idsSet.has(vt.id));
  }

  /**
   * Checks if any of the given variation types modify weight
   */
  async anyModifyWeight(ids: string[]): Promise<boolean> {
    const variationTypes = await this.findByIds(ids);
    return variationTypes.some(vt => vt.modifiesWeight);
  }

  /**
   * Checks if any of the given variation types modify dimensions
   */
  async anyModifyDimensions(ids: string[]): Promise<boolean> {
    const variationTypes = await this.findByIds(ids);
    return variationTypes.some(vt => vt.modifiesDimensions);
  }

  /**
   * Updates variation type metadata counts
   */
  async updateMetadata(): Promise<void> {
    const count = await this.count();
    await this.storage.updateMeta({ totalVariationTypes: count });
  }

  /**
   * Creates a variation type with validation
   */
  async create(data: CreateVariationTypeData): Promise<VariationType> {
    await this.validateForCreation(data);
    const variationType = await super.create(data);
    await this.updateMetadata();
    return variationType;
  }

  /**
   * Updates a variation type with validation
   */
  async update(id: string, data: UpdateVariationTypeData): Promise<VariationType> {
    await this.validateForUpdate(id, data);
    const variationType = await super.update(id, data);
    return variationType;
  }

  /**
   * Deletes a variation type with validation
   */
  async delete(id: string): Promise<void> {
    await this.validateForDeletion(id);
    await super.delete(id);
    await this.updateMetadata();
  }
}