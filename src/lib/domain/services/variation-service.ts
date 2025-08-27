import {
  VariationType,
  CreateVariationTypeData,
  UpdateVariationTypeData,
} from '../entities/variation-type';
import {
  Variation,
  CreateVariationData,
  UpdateVariationData,
} from '../entities/variation';
import {
  ProductVariationItem,
  CreateProductVariationItemData,
} from '../entities/product-variation-item';
import { VariationTypeRepository } from '../../storage/repositories/variation-type-repository';
import { VariationRepository } from '../../storage/repositories/variation-repository';
import { ProductVariationItemRepository } from '../../storage/repositories/product-variation-item-repository';

export class VariationService {
  constructor(
    private variationTypeRepository: VariationTypeRepository,
    private variationRepository: VariationRepository,
    private variationItemRepository: ProductVariationItemRepository
  ) {}

  // ===== VARIATION TYPE METHODS =====

  /**
   * Creates a new variation type with business rule validation
   */
  async createVariationType(data: CreateVariationTypeData): Promise<VariationType> {
    // Validate business rules
    await this.validateVariationTypeCreation(data);

    // Create the variation type
    const variationType = await this.variationTypeRepository.create(data);

    return variationType;
  }

  /**
   * Updates an existing variation type with business rule validation
   */
  async updateVariationType(id: string, data: UpdateVariationTypeData): Promise<VariationType> {
    // Validate business rules
    await this.validateVariationTypeUpdate(id, data);

    // Update the variation type
    const variationType = await this.variationTypeRepository.update(id, data);

    return variationType;
  }

  /**
   * Deletes a variation type with constraint validation
   */
  async deleteVariationType(id: string): Promise<void> {
    // Validate deletion constraints
    await this.validateVariationTypeDeletion(id);

    // Delete all variations of this type first
    await this.variationRepository.deleteByVariationType(id);

    // Delete the variation type
    await this.variationTypeRepository.delete(id);
  }

  /**
   * Gets all variation types
   */
  async getAllVariationTypes(): Promise<VariationType[]> {
    return this.variationTypeRepository.findAll();
  }

  /**
   * Gets a variation type by ID
   */
  async getVariationType(id: string): Promise<VariationType | null> {
    return this.variationTypeRepository.findById(id);
  }

  /**
   * Searches variation types by name
   */
  async searchVariationTypes(query: string): Promise<VariationType[]> {
    return this.variationTypeRepository.search(query);
  }

  // ===== VARIATION METHODS =====

  /**
   * Creates a new variation with business rule validation
   */
  async createVariation(data: CreateVariationData): Promise<Variation> {
    // Validate business rules
    await this.validateVariationCreation(data);

    // Create the variation
    const variation = await this.variationRepository.create(data);

    return variation;
  }

  /**
   * Updates an existing variation with business rule validation
   */
  async updateVariation(id: string, data: UpdateVariationData): Promise<Variation> {
    // Validate business rules
    await this.validateVariationUpdate(id, data);

    // Update the variation
    const variation = await this.variationRepository.update(id, data);

    return variation;
  }

  /**
   * Deletes a variation with constraint validation
   */
  async deleteVariation(id: string): Promise<void> {
    // Validate deletion constraints
    await this.validateVariationDeletion(id);

    // Delete all product variation items using this variation
    await this.variationItemRepository.deleteByVariation(id);

    // Delete the variation
    await this.variationRepository.delete(id);
  }

  /**
   * Gets all variations
   */
  async getAllVariations(): Promise<Variation[]> {
    return this.variationRepository.findAll();
  }

  /**
   * Gets variations by variation type
   */
  async getVariationsByType(variationTypeId: string): Promise<Variation[]> {
    return this.variationRepository.findByVariationType(variationTypeId);
  }

  /**
   * Gets variations grouped by type
   */
  async getVariationsGroupedByType(): Promise<Record<string, Variation[]>> {
    return this.variationRepository.findGroupedByType();
  }

  // ===== PRODUCT VARIATION ITEM METHODS =====

  /**
   * Creates a product variation item with business rule validation
   */
  async createProductVariationItem(data: CreateProductVariationItemData): Promise<ProductVariationItem> {
    // Validate business rules
    await this.validateProductVariationItemCreation(data);

    // Create the variation item
    const variationItem = await this.variationItemRepository.create(data);

    return variationItem;
  }

  /**
   * Updates a product variation item with business rule validation
   */
  async updateProductVariationItem(
    id: string,
    data: Partial<CreateProductVariationItemData>
  ): Promise<ProductVariationItem> {
    // Validate business rules
    await this.validateProductVariationItemUpdate(id, data);

    // Update the variation item
    const variationItem = await this.variationItemRepository.update(id, data);

    return variationItem;
  }

  /**
   * Deletes a product variation item
   */
  async deleteProductVariationItem(id: string): Promise<void> {
    await this.variationItemRepository.delete(id);
  }

  /**
   * Gets all variation items for a product
   */
  async getProductVariationItems(productSku: string): Promise<ProductVariationItem[]> {
    return this.variationItemRepository.findByProduct(productSku);
  }

  /**
   * Generates all possible combinations for a product
   */
  async generateAllCombinations(
    variationTypeIds: string[]
  ): Promise<Record<string, string>[]> {
    // Get variations for each type
    const variationsByType = await this.variationRepository.findForVariationTypes(variationTypeIds);

    // Convert to the format expected by the generator
    const variationsForGenerator: Record<string, Array<{ id: string; name: string }>> = {};
    for (const [typeId, variations] of Object.entries(variationsByType)) {
      variationsForGenerator[typeId] = variations.map((v) => ({ id: v.id, name: v.name }));
    }

    // Generate all combinations
    const combinations: Record<string, string>[] = [];
    const generator = this.variationItemRepository.generateCombinations(
      variationTypeIds,
      variationsForGenerator
    );

    for await (const combination of generator) {
      combinations.push(combination);
    }

    return combinations;
  }

  /**
   * Creates variation items from all possible combinations
   */
  async createAllCombinations(
    productSku: string,
    variationTypeIds: string[],
    defaultOverrides?: {
      weightOverride?: number;
      dimensionsOverride?: { height: number; width: number; depth: number };
    }
  ): Promise<ProductVariationItem[]> {
    // Generate all combinations
    const combinations = await this.generateAllCombinations(variationTypeIds);

    // Create variation items from combinations
    return this.variationItemRepository.createFromCombinations(
      productSku,
      combinations,
      defaultOverrides
    );
  }

  /**
   * Checks if variation types require weight override
   */
  async requiresWeightOverride(variationTypeIds: string[]): Promise<boolean> {
    return this.variationTypeRepository.anyModifyWeight(variationTypeIds);
  }

  /**
   * Checks if variation types require dimensions override
   */
  async requiresDimensionsOverride(variationTypeIds: string[]): Promise<boolean> {
    return this.variationTypeRepository.anyModifyDimensions(variationTypeIds);
  }

  // ===== VALIDATION METHODS =====

  /**
   * Validates variation type creation business rules
   */
  private async validateVariationTypeCreation(data: CreateVariationTypeData): Promise<void> {
    // Check name uniqueness
    const existingNames = await this.variationTypeRepository.getAllNames();
    // TODO: Implement VariationTypeBusinessRules.validateNameUniqueness(data.name, existingNames);
  }

  /**
   * Validates variation type update business rules
   */
  private async validateVariationTypeUpdate(
    id: string,
    data: UpdateVariationTypeData
  ): Promise<void> {
    const existingVariationType = await this.variationTypeRepository.findById(id);
    if (!existingVariationType) {
      throw new Error(`Variation type with ID '${id}' not found`);
    }

    // Check name uniqueness if name is being updated
    if (data.name !== undefined) {
      const existingNames = await this.variationTypeRepository.getAllNames();
      // TODO: Implement VariationTypeBusinessRules.validateNameUniqueness(data.name, existingNames, id);
    }
  }

  /**
   * Validates variation type deletion constraints
   */
  private async validateVariationTypeDeletion(id: string): Promise<void> {
    const variationType = await this.variationTypeRepository.findById(id);
    if (!variationType) {
      throw new Error(`Variation type with ID '${id}' not found`);
    }

    // Check if any variations exist for this type
    const variationCount = await this.variationRepository.countByVariationType(id);
    // TODO: Implement VariationTypeBusinessRules.validateDeletionConstraints(id, variationCount);
  }

  /**
   * Validates variation creation business rules
   */
  private async validateVariationCreation(data: CreateVariationData): Promise<void> {
    // Validate that variation type exists
    const variationType = await this.variationTypeRepository.findById(data.variationTypeId);
    if (!variationType) {
      throw new Error(`Variation type with ID '${data.variationTypeId}' not found`);
    }

    // Check name uniqueness within the variation type
    const existingVariations = await this.variationRepository.findAll();
    // TODO: Implement VariationBusinessRules.validateNameUniquenessWithinType(
    //   data.name,
    //   data.variationTypeId,
    //   existingVariations
    // );
  }

  /**
   * Validates variation update business rules
   */
  private async validateVariationUpdate(id: string, data: UpdateVariationData): Promise<void> {
    const existingVariation = await this.variationRepository.findById(id);
    if (!existingVariation) {
      throw new Error(`Variation with ID '${id}' not found`);
    }

    // Check name uniqueness if name is being updated
    if (data.name !== undefined) {
      const existingVariations = await this.variationRepository.findAll();
      // TODO: Implement VariationBusinessRules.validateNameUniquenessWithinType(
      //   data.name,
      //   existingVariation.variationTypeId,
      //   existingVariations,
      //   id
      // );
    }
  }

  /**
   * Validates variation deletion constraints
   */
  private async validateVariationDeletion(id: string): Promise<void> {
    const variation = await this.variationRepository.findById(id);
    if (!variation) {
      throw new Error(`Variation with ID '${id}' not found`);
    }

    // Check if the variation is used in any product variation items
    const usageCount = await this.variationItemRepository.findByVariation(id);
    // TODO: Implement VariationBusinessRules.validateDeletionConstraints(id, usageCount.length);
  }

  /**
   * Validates product variation item creation business rules
   */
  private async validateProductVariationItemCreation(
    data: CreateProductVariationItemData
  ): Promise<void> {
    // Check combination uniqueness
    const existingItems = await this.variationItemRepository.findAll();
    // TODO: Implement ProductVariationItemBusinessRules.validateCombinationUniqueness(
    //   data.productSku,
    //   data.selections,
    //   existingItems
    // );

    // Validate that all variation types and variations exist
    const variationTypeIds = Object.keys(data.selections);
    const variationIds = Object.values(data.selections);

    // Check variation types exist
    const variationTypes = await this.variationTypeRepository.findByIds(variationTypeIds);
    if (variationTypes.length !== variationTypeIds.length) {
      const foundIds = variationTypes.map((vt) => vt.id);
      const missingIds = variationTypeIds.filter((id) => !foundIds.includes(id));
      throw new Error(`Variation types not found: ${missingIds.join(', ')}`);
    }

    // Check variations exist and belong to correct types
    const variations = await this.variationRepository.findByIds(variationIds);
    if (variations.length !== variationIds.length) {
      const foundIds = variations.map((v) => v.id);
      const missingIds = variationIds.filter((id) => !foundIds.includes(id));
      throw new Error(`Variations not found: ${missingIds.join(', ')}`);
    }

    // Validate variation-type relationships
    for (const [typeId, variationId] of Object.entries(data.selections)) {
      const variation = variations.find((v) => v.id === variationId);
      if (variation && variation.variationTypeId !== typeId) {
        throw new Error(
          `Variation '${variationId}' does not belong to variation type '${typeId}'`
        );
      }
    }

    // Validate override requirements
    const weightModifyingTypes = variationTypes
      .filter((vt) => vt.modifiesWeight)
      .map((vt) => vt.id);
    const dimensionsModifyingTypes = variationTypes
      .filter((vt) => vt.modifiesDimensions)
      .map((vt) => vt.id);

    // TODO: Implement ProductVariationItemBusinessRules.validateWeightOverrideRequirement(
    //   data.selections,
    //   weightModifyingTypes,
    //   data.weightOverride
    // );

    // TODO: Implement ProductVariationItemBusinessRules.validateDimensionsOverrideRequirement(
    //   data.selections,
    //   dimensionsModifyingTypes,
    //   data.dimensionsOverride
    // );
  }

  /**
   * Validates product variation item update business rules
   */
  private async validateProductVariationItemUpdate(
    id: string,
    data: Partial<CreateProductVariationItemData>
  ): Promise<void> {
    const existingItem = await this.variationItemRepository.findById(id);
    if (!existingItem) {
      throw new Error(`Product variation item with ID '${id}' not found`);
    }

    // Check combination uniqueness if selections are being updated
    if (data.selections !== undefined) {
      const existingItems = await this.variationItemRepository.findAll();
      // TODO: Implement ProductVariationItemBusinessRules.validateCombinationUniqueness(
      //   existingItem.productSku,
      //   data.selections,
      //   existingItems,
      //   id
      // );
    }

    // Additional validation would be similar to creation validation
  }

  /**
   * Gets variation statistics
   */
  async getVariationStats(): Promise<{
    totalTypes: number;
    totalVariations: number;
    totalCombinations: number;
    typeStats: Array<{
      typeId: string;
      typeName: string;
      variationCount: number;
      modifiesWeight: boolean;
      modifiesDimensions: boolean;
    }>;
  }> {
    const variationTypes = await this.variationTypeRepository.findAll();
    const variations = await this.variationRepository.findAll();
    const variationItems = await this.variationItemRepository.findAll();

    const typeStats = variationTypes.map((type) => ({
      typeId: type.id,
      typeName: type.name,
      variationCount: variations.filter((v) => v.variationTypeId === type.id).length,
      modifiesWeight: type.modifiesWeight,
      modifiesDimensions: type.modifiesDimensions,
    }));

    return {
      totalTypes: variationTypes.length,
      totalVariations: variations.length,
      totalCombinations: variationItems.length,
      typeStats,
    };
  }
}