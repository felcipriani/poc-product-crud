/**
 * Types for data migration system
 * Handles migration of composition data when transitioning between product states
 */

export interface MigrationResult {
  success: boolean;
  migratedItemsCount: number;
  createdVariationId?: string;
  errors: string[];
  rollbackData?: BackupData;
  operationId: string;
  timestamp: Date;
}

export interface BackupData {
  id: string;
  productSku: string;
  timestamp: Date;
  originalProduct: any;
  originalCompositionItems: any[];
  originalVariations: any[];
  metadata: {
    operation: string;
    userAgent: string;
    version: string;
  };
}

export interface MigrationContext {
  productSku: string;
  operation: MigrationType;
  sourceData: {
    product: any;
    compositionItems: any[];
    variations: any[];
  };
  targetState: {
    isComposite: boolean;
    hasVariation: boolean;
  };
}

export type MigrationType = 
  | 'composite-to-variations'
  | 'variations-to-composite'
  | 'disable-composite'
  | 'enable-composite';

export interface MigrationStep {
  id: string;
  name: string;
  description: string;
  execute: (context: MigrationContext) => Promise<void>;
  rollback: (context: MigrationContext, backupData: BackupData) => Promise<void>;
  validate: (context: MigrationContext) => Promise<boolean>;
}

export interface MigrationProgress {
  operationId: string;
  currentStep: number;
  totalSteps: number;
  stepName: string;
  progress: number; // 0-100
  message: string;
  startTime: Date;
  estimatedCompletion?: Date;
}

export class MigrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public step?: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}
