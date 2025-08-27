"use client";

import { useState, useCallback, useMemo } from 'react';
import { Product, UpdateProductData } from '@/lib/domain/entities/product';
import { 
  TransitionType, 
  TransitionContext, 
  TransitionResult 
} from '@/lib/types/transition-types';
import { determineTransitionType } from '@/lib/config/transition-config';
import { CompositeVariationMigrationService } from '@/lib/services/migration/composite-variation-migration';
import { CompositionItemRepository } from '@/lib/storage/repositories/composition-item-repository';
import { ProductVariationItemRepository } from '@/lib/storage/repositories/product-variation-item-repository';

interface UseProductTransitionsProps {
  product: Product;
  onProductUpdate: (data: UpdateProductData) => Promise<void>;
}

interface TransitionState {
  isOpen: boolean;
  type: TransitionType | null;
  context: TransitionContext | null;
  loading: boolean;
}

export function useProductTransitions({ product, onProductUpdate }: UseProductTransitionsProps) {
  const [transitionState, setTransitionState] = useState<TransitionState>({
    isOpen: false,
    type: null,
    context: null,
    loading: false
  });

  const migrationService = useMemo(() => new CompositeVariationMigrationService(), []);
  const compositionRepository = useMemo(() => new CompositionItemRepository(), []);
  const variationRepository = useMemo(() => new ProductVariationItemRepository(), []);

  /**
   * Check if a flag change requires a transition dialog
   */
  const checkTransitionRequired = useCallback(async (
    targetFlags: { isComposite: boolean; hasVariation: boolean }
  ): Promise<boolean> => {
    const currentFlags = {
      isComposite: product.isComposite,
      hasVariation: product.hasVariation
    };

    const transitionType = determineTransitionType(currentFlags, targetFlags);
    
    if (!transitionType) {
      return false;
    }

    // Get existing data count for context
    let existingDataCount = 0;
    
    if (product.isComposite) {
      const compositionItems = await compositionRepository.findByParent(product.sku);
      const variations = await variationRepository.findByProductSku(product.sku);
      
      existingDataCount = compositionItems.length;
      
      // Add variation composition items
      for (const variation of variations) {
        const variationItems = await compositionRepository.findByParent(`${product.sku}#${variation.id}`);
        existingDataCount += variationItems.length;
      }
    }

    // Create transition context
    const context: TransitionContext = {
      productSku: product.sku,
      productName: product.name,
      existingDataCount,
      currentFlags,
      targetFlags
    };

    // Open transition dialog
    setTransitionState({
      isOpen: true,
      type: transitionType,
      context,
      loading: false
    });

    return true;
  }, [product, compositionRepository, variationRepository]);

  /**
   * Execute the transition after user confirmation
   */
  const executeTransition = useCallback(async (): Promise<TransitionResult> => {
    if (!transitionState.type || !transitionState.context) {
      throw new Error('No transition in progress');
    }

    setTransitionState(prev => ({ ...prev, loading: true }));

    try {
      const { type, context } = transitionState;
      let result: TransitionResult;

      switch (type) {
        case 'enable-variations':
          // Migrate composite to composite + variations
          const migrationResult = await migrationService.migrateCompositeToVariations(
            context.productSku
          );
          
          if (migrationResult.success) {
            // Update product flags
            await onProductUpdate({
              hasVariation: true
            });
            
            result = {
              success: true,
              message: `Successfully enabled variations! Created "Variation 1" with ${migrationResult.migratedItemsCount} composition items.`
            };
          } else {
            result = {
              success: false,
              message: 'Failed to enable variations',
              error: migrationResult.errors.join(', ')
            };
          }
          break;

        case 'disable-composite':
          // Delete all composition and variation data
          const compositionItems = await compositionRepository.findByParent(context.productSku);
          const variations = await variationRepository.findByProductSku(context.productSku);
          
          // Delete variation compositions
          for (const variation of variations) {
            const variationItems = await compositionRepository.findByParent(`${context.productSku}#${variation.id}`);
            for (const item of variationItems) {
              await compositionRepository.delete(item.id);
            }
          }
          
          // Delete variations
          for (const variation of variations) {
            await variationRepository.delete(variation.id);
          }
          
          // Delete main composition items
          for (const item of compositionItems) {
            await compositionRepository.delete(item.id);
          }
          
          // Update product flags
          await onProductUpdate({
            isComposite: false,
            hasVariation: false
          });
          
          result = {
            success: true,
            message: 'Successfully disabled composite product and removed all composition data.'
          };
          break;

        case 'disable-variations':
          // Merge variations back to simple composite
          const mergeResult = await migrationService.migrateVariationsToComposite(
            context.productSku,
            'first-variation' // Use first variation's composition
          );
          
          if (mergeResult.success) {
            // Update product flags
            await onProductUpdate({
              hasVariation: false
            });
            
            result = {
              success: true,
              message: `Successfully disabled variations! Merged composition contains ${mergeResult.migratedItemsCount} items.`
            };
          } else {
            result = {
              success: false,
              message: 'Failed to disable variations',
              error: mergeResult.errors.join(', ')
            };
          }
          break;

        case 'enable-composite':
          // Simply enable composite flag
          await onProductUpdate({
            isComposite: true
          });
          
          result = {
            success: true,
            message: 'Successfully enabled composite product! You can now add composition items.'
          };
          break;

        default:
          throw new Error(`Unknown transition type: ${type}`);
      }

      return result;

    } catch (error) {
      return {
        success: false,
        message: 'Transition failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setTransitionState(prev => ({ ...prev, loading: false }));
    }
  }, [transitionState, onProductUpdate, migrationService, compositionRepository, variationRepository]);

  /**
   * Cancel the current transition
   */
  const cancelTransition = useCallback(() => {
    setTransitionState({
      isOpen: false,
      type: null,
      context: null,
      loading: false
    });
  }, []);

  /**
   * Handle successful transition completion
   */
  const handleTransitionComplete = useCallback(() => {
    setTransitionState({
      isOpen: false,
      type: null,
      context: null,
      loading: false
    });
  }, []);

  return {
    transitionState,
    checkTransitionRequired,
    executeTransition,
    cancelTransition,
    handleTransitionComplete
  };
}
