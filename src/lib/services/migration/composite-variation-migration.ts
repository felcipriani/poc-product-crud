import { 
  MigrationResult, 
  MigrationContext, 
  MigrationStep, 
  MigrationProgress,
  MigrationError,
  BackupData 
} from '@/lib/types/migration-types';
import { BackupService } from '../backup/backup-service';
import { CompositionItemRepository } from '@/lib/storage/repositories/composition-item-repository';
import { ProductVariationItemRepository } from '@/lib/storage/repositories/product-variation-item-repository';
import { ProductRepository } from '@/lib/storage/repositories/product-repository';
import { Product } from '@/lib/domain/entities/product';
import { CompositionItem, CreateCompositionItemData } from '@/lib/domain/entities/composition-item';
import { ProductVariationItem, CreateProductVariationItemData } from '@/lib/domain/entities/product-variation-item';

/**
 * Service for migrating composition data when transitioning between product states
 * Handles complex migrations with backup/rollback capabilities
 */
export class CompositeVariationMigrationService {
  private backupService: BackupService;
  private compositionRepository: CompositionItemRepository;
  private variationRepository: ProductVariationItemRepository;
  private productRepository: ProductRepository;

  constructor() {
    this.backupService = new BackupService();
    this.compositionRepository = new CompositionItemRepository();
    this.variationRepository = new ProductVariationItemRepository();
    this.productRepository = new ProductRepository();
  }

  /**
   * Migrate composite product to composite + variations
   * Existing composition becomes "Variation 1"
   */
  async migrateCompositeToVariations(
    productSku: string,
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<MigrationResult> {
    const operationId = this.generateOperationId();
    const startTime = new Date();

    try {
      // Step 1: Load current data
      onProgress?.({
        operationId,
        currentStep: 1,
        totalSteps: 5,
        stepName: 'Loading current data',
        progress: 20,
        message: 'Loading product and composition data...',
        startTime
      });

      const product = await this.productRepository.findBySku(productSku);
      if (!product) {
        throw new MigrationError('Product not found', 'PRODUCT_NOT_FOUND', 'load-data', false);
      }

      const existingItems = await this.compositionRepository.findByParent(productSku);
      const existingVariations = await this.variationRepository.findByProductSku(productSku);

      // Step 2: Create backup
      onProgress?.({
        operationId,
        currentStep: 2,
        totalSteps: 5,
        stepName: 'Creating backup',
        progress: 40,
        message: 'Creating data backup for rollback safety...',
        startTime
      });

      const backupId = await this.backupService.createBackup(
        productSku,
        'migrate-composite-to-variations',
        product,
        existingItems,
        existingVariations
      );

      // Step 3: Create first variation
      onProgress?.({
        operationId,
        currentStep: 3,
        totalSteps: 5,
        stepName: 'Creating first variation',
        progress: 60,
        message: 'Creating "Variation 1" from existing composition...',
        startTime
      });

      const firstVariationData: CreateProductVariationItemData = {
        productSku,
        selections: {}, // Empty selections for composite variations
        weightOverride: undefined, // Weight will be calculated from composition
      };

      const firstVariation = await this.variationRepository.create(firstVariationData);

      // Step 4: Migrate composition items to variation context
      onProgress?.({
        operationId,
        currentStep: 4,
        totalSteps: 5,
        stepName: 'Migrating composition items',
        progress: 80,
        message: `Migrating ${existingItems.length} composition items...`,
        startTime
      });

      const migratedItems: CompositionItem[] = [];
      
      for (const item of existingItems) {
        // Create new composition item linked to variation
        const newItemData: CreateCompositionItemData = {
          parentSku: `${productSku}#${firstVariation.id}`,
          childSku: item.childSku,
          quantity: item.quantity,
        };

        const newItem = await this.compositionRepository.create(newItemData);
        migratedItems.push(newItem);
      }

      // Step 5: Cleanup original composition items
      onProgress?.({
        operationId,
        currentStep: 5,
        totalSteps: 5,
        stepName: 'Cleaning up',
        progress: 100,
        message: 'Finalizing migration...',
        startTime
      });

      // Delete original composition items
      for (const item of existingItems) {
        await this.compositionRepository.delete(item.id);
      }

      return {
        success: true,
        migratedItemsCount: migratedItems.length,
        createdVariationId: firstVariation.id,
        errors: [],
        rollbackData: await this.backupService.restore(backupId),
        operationId,
        timestamp: new Date()
      };

    } catch (error) {
      // Attempt rollback on error
      try {
        const backupData = await this.backupService.restore(operationId);
        await this.rollbackMigration(backupData);
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }

      const migrationError = error instanceof MigrationError ? error : 
        new MigrationError(
          `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'MIGRATION_FAILED',
          'unknown',
          true
        );

      return {
        success: false,
        migratedItemsCount: 0,
        errors: [migrationError.message],
        operationId,
        timestamp: new Date()
      };
    }
  }

  /**
   * Migrate variations back to simple composite
   * Merges all variation compositions into single composition
   */
  async migrateVariationsToComposite(
    productSku: string,
    mergeStrategy: 'first-variation' | 'merge-all' = 'first-variation',
    onProgress?: (progress: MigrationProgress) => void
  ): Promise<MigrationResult> {
    const operationId = this.generateOperationId();
    const startTime = new Date();

    try {
      // Step 1: Load current data
      onProgress?.({
        operationId,
        currentStep: 1,
        totalSteps: 4,
        stepName: 'Loading variation data',
        progress: 25,
        message: 'Loading variations and composition data...',
        startTime
      });

      const product = await this.productRepository.findBySku(productSku);
      if (!product) {
        throw new MigrationError('Product not found', 'PRODUCT_NOT_FOUND', 'load-data', false);
      }

      const variations = await this.variationRepository.findByProductSku(productSku);
      if (variations.length === 0) {
        throw new MigrationError('No variations found', 'NO_VARIATIONS', 'load-data', false);
      }

      // Step 2: Create backup
      onProgress?.({
        operationId,
        currentStep: 2,
        totalSteps: 4,
        stepName: 'Creating backup',
        progress: 50,
        message: 'Creating backup before merging variations...',
        startTime
      });

      const allCompositionItems: CompositionItem[] = [];
      for (const variation of variations) {
        const items = await this.compositionRepository.findByParent(`${productSku}#${variation.id}`);
        allCompositionItems.push(...items);
      }

      const backupId = await this.backupService.createBackup(
        productSku,
        'migrate-variations-to-composite',
        product,
        allCompositionItems,
        variations
      );

      // Step 3: Merge compositions based on strategy
      onProgress?.({
        operationId,
        currentStep: 3,
        totalSteps: 4,
        stepName: 'Merging compositions',
        progress: 75,
        message: 'Merging variation compositions...',
        startTime
      });

      let compositionToKeep: CompositionItem[] = [];

      if (mergeStrategy === 'first-variation') {
        // Use first variation's composition
        const firstVariation = variations[0];
        compositionToKeep = await this.compositionRepository.findByParent(`${productSku}#${firstVariation.id}`);
      } else {
        // Merge all variations (combine quantities for same items)
        const mergedMap = new Map<string, { childSku: string; quantity: number }>();
        
        for (const variation of variations) {
          const items = await this.compositionRepository.findByParent(`${productSku}#${variation.id}`);
          for (const item of items) {
            const existing = mergedMap.get(item.childSku);
            if (existing) {
              existing.quantity += item.quantity;
            } else {
              mergedMap.set(item.childSku, {
                childSku: item.childSku,
                quantity: item.quantity
              });
            }
          }
        }

        // Create new composition items from merged data
        for (const [childSku, data] of mergedMap) {
          const newItem = await this.compositionRepository.create({
            parentSku: productSku,
            childSku: data.childSku,
            quantity: data.quantity
          });
          compositionToKeep.push(newItem);
        }
      }

      // Step 4: Cleanup variations and their compositions
      onProgress?.({
        operationId,
        currentStep: 4,
        totalSteps: 4,
        stepName: 'Cleaning up variations',
        progress: 100,
        message: 'Removing variations and finalizing...',
        startTime
      });

      // Delete all variation compositions
      for (const item of allCompositionItems) {
        await this.compositionRepository.delete(item.id);
      }

      // Delete all variations
      for (const variation of variations) {
        await this.variationRepository.delete(variation.id);
      }

      // If using first-variation strategy, recreate items with product SKU
      if (mergeStrategy === 'first-variation') {
        const recreatedItems: CompositionItem[] = [];
        for (const item of compositionToKeep) {
          const newItem = await this.compositionRepository.create({
            parentSku: productSku,
            childSku: item.childSku,
            quantity: item.quantity
          });
          recreatedItems.push(newItem);
        }
        compositionToKeep = recreatedItems;
      }

      return {
        success: true,
        migratedItemsCount: compositionToKeep.length,
        errors: [],
        rollbackData: await this.backupService.restore(backupId),
        operationId,
        timestamp: new Date()
      };

    } catch (error) {
      const migrationError = error instanceof MigrationError ? error : 
        new MigrationError(
          `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'MIGRATION_FAILED',
          'unknown',
          true
        );

      return {
        success: false,
        migratedItemsCount: 0,
        errors: [migrationError.message],
        operationId,
        timestamp: new Date()
      };
    }
  }

  /**
   * Rollback migration using backup data
   */
  async rollbackMigration(backupData: BackupData): Promise<void> {
    try {
      const { productSku, originalProduct, originalCompositionItems, originalVariations } = backupData;

      // Restore product state
      await this.productRepository.update(productSku, originalProduct);

      // Clear current composition items
      const currentItems = await this.compositionRepository.findByParent(productSku);
      for (const item of currentItems) {
        await this.compositionRepository.delete(item.id);
      }

      // Clear current variations and their compositions
      const currentVariations = await this.variationRepository.findByProductSku(productSku);
      for (const variation of currentVariations) {
        const variationItems = await this.compositionRepository.findByParent(`${productSku}#${variation.id}`);
        for (const item of variationItems) {
          await this.compositionRepository.delete(item.id);
        }
        await this.variationRepository.delete(variation.id);
      }

      // Restore original composition items
      for (const item of originalCompositionItems) {
        await this.compositionRepository.create({
          parentSku: item.parentSku,
          childSku: item.childSku,
          quantity: item.quantity
        });
      }

      // Restore original variations
      for (const variation of originalVariations) {
        await this.variationRepository.create({
          productSku: variation.productSku,
          selections: variation.selections,
          weightOverride: variation.weightOverride,
          dimensionsOverride: variation.dimensionsOverride
        });
      }

    } catch (error) {
      throw new MigrationError(
        `Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ROLLBACK_FAILED',
        'rollback',
        false
      );
    }
  }

  /**
   * Validate migration prerequisites
   */
  async validateMigrationPrerequisites(
    productSku: string,
    targetState: { isComposite: boolean; hasVariation: boolean }
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const product = await this.productRepository.findBySku(productSku);
      if (!product) {
        errors.push('Product not found');
        return { valid: false, errors };
      }

      // Check if migration is actually needed
      if (product.isComposite === targetState.isComposite && 
          product.hasVariation === targetState.hasVariation) {
        errors.push('Product is already in target state');
      }

      // Validate specific transition scenarios
      if (targetState.hasVariation && targetState.isComposite) {
        // Enabling variations on composite product
        const existingVariations = await this.variationRepository.findByProductSku(productSku);
        if (existingVariations.length > 0) {
          errors.push('Product already has variations');
        }
      }

      if (!targetState.isComposite && product.isComposite) {
        // Disabling composite - check for composition data
        const compositionItems = await this.compositionRepository.findByParent(productSku);
        const variations = await this.variationRepository.findByProductSku(productSku);
        
        if (compositionItems.length > 0 || variations.length > 0) {
          // This is expected - we'll warn user about data loss
        }
      }

    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `migration-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}
