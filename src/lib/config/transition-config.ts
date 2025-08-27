import { TransitionType, TransitionConfig } from '../types/transition-types';

/**
 * Configuration for different product transition types
 * Defines UI behavior, messaging, and validation for each transition
 */

export const transitionConfigs: Record<TransitionType, TransitionConfig> = {
  'enable-variations': {
    title: 'Enable Product Variations?',
    description: 'This will convert your existing composition into "Variation 1". You can then create additional variations with different compositions.',
    warning: 'Your current composition will become the first variation. This action cannot be undone.',
    confirmText: 'Enable Variations',
    cancelText: 'Cancel',
    destructive: false,
    requiresConfirmation: false,
    icon: 'Layers',
    warningType: 'info'
  },

  'disable-composite': {
    title: 'Disable Composite Product?',
    description: 'This will permanently delete all composition data for this product.',
    warning: 'All composition items and variation data will be lost forever. This action cannot be undone.',
    confirmText: 'Delete Composition Data',
    cancelText: 'Keep Composition',
    destructive: true,
    requiresConfirmation: true,
    icon: 'AlertTriangle',
    warningType: 'error'
  },

  'disable-variations': {
    title: 'Disable Product Variations?',
    description: 'This will permanently delete all variation-specific composition data.',
    warning: 'All variation compositions will be merged into a single composition or lost forever. This action cannot be undone.',
    confirmText: 'Delete Variation Data',
    cancelText: 'Keep Variations',
    destructive: true,
    requiresConfirmation: true,
    icon: 'AlertTriangle',
    warningType: 'error'
  },

  'enable-composite': {
    title: 'Enable Composite Product?',
    description: 'This will allow you to add composition items to this product.',
    confirmText: 'Enable Composition',
    cancelText: 'Cancel',
    destructive: false,
    requiresConfirmation: false,
    icon: 'Package',
    warningType: 'info'
  }
};

/**
 * Get configuration for a specific transition type
 */
export function getTransitionConfig(
  type: TransitionType, 
  existingDataCount: number = 0
): TransitionConfig {
  const config = transitionConfigs[type];
  
  // Customize warning message based on data count
  if (config.warning && existingDataCount > 0) {
    const itemText = existingDataCount === 1 ? 'item' : 'items';
    
    switch (type) {
      case 'enable-variations':
        config.warning = `${existingDataCount} composition ${itemText} will be moved to the first variation.`;
        break;
      case 'disable-composite':
        config.warning = `${existingDataCount} composition ${itemText} will be permanently deleted.`;
        break;
      case 'disable-variations':
        config.warning = `All variation compositions will be permanently deleted.`;
        break;
    }
  }
  
  return config;
}

/**
 * Determine which transition type is needed based on flag changes
 */
export function determineTransitionType(
  currentFlags: { isComposite: boolean; hasVariation: boolean },
  targetFlags: { isComposite: boolean; hasVariation: boolean }
): TransitionType | null {
  // Enable variations on composite product
  if (currentFlags.isComposite && !currentFlags.hasVariation && 
      targetFlags.isComposite && targetFlags.hasVariation) {
    return 'enable-variations';
  }
  
  // Disable composite (with or without variations)
  if (currentFlags.isComposite && !targetFlags.isComposite) {
    return 'disable-composite';
  }
  
  // Disable variations on composite product
  if (currentFlags.isComposite && currentFlags.hasVariation && 
      targetFlags.isComposite && !targetFlags.hasVariation) {
    return 'disable-variations';
  }
  
  // Enable composite on non-composite product
  if (!currentFlags.isComposite && targetFlags.isComposite) {
    return 'enable-composite';
  }
  
  return null;
}
