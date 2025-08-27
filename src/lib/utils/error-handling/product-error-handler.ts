/**
 * Enhanced error handling system for product operations
 */

export interface ErrorContext {
  operation: string;
  productSku?: string;
  timestamp: Date;
  userAction: string;
  errorCode: string;
  metadata?: Record<string, any>;
}

export interface UserFriendlyError {
  message: string;
  code: string;
  recoverable: boolean;
  retryAction?: () => void;
  supportInfo: {
    timestamp: Date;
    operation: string;
    errorId: string;
  };
}

export class ProductErrorHandler {
  private static errorMessages: Record<string, string> = {
    'MIGRATION_FAILED': 'Failed to migrate composition data. Please try again.',
    'VALIDATION_ERROR': 'Product data validation failed. Please check your inputs.',
    'NETWORK_ERROR': 'Network error occurred. Please check your connection.',
    'STORAGE_FULL': 'Local storage is full. Please clear some data.',
    'CONCURRENT_EDIT': 'This product was modified by another session. Please refresh.',
    'DUPLICATE_SKU': 'This SKU is already in use. Please choose a different one.',
    'DUPLICATE_NAME': 'This product name is already in use. Please choose a different one.',
    'CIRCULAR_DEPENDENCY': 'This would create a circular dependency in the composition.',
    'INVALID_COMPOSITION': 'Invalid composition configuration detected.',
    'MISSING_PRODUCT': 'Referenced product not found.',
    'INSUFFICIENT_PERMISSIONS': 'You do not have permission to perform this action.',
  };

  static handleError(error: Error, context: ErrorContext): UserFriendlyError {
    // Log error for debugging
    console.error('Product operation failed:', { error, context });

    // Generate unique error ID
    const errorId = this.generateErrorId();

    // Determine user-friendly message
    const message = this.errorMessages[context.errorCode] || 
                   'An unexpected error occurred. Please try again.';

    return {
      message,
      code: context.errorCode,
      recoverable: this.isRecoverable(context.errorCode),
      retryAction: this.getRetryAction(context.operation),
      supportInfo: {
        timestamp: context.timestamp,
        operation: context.operation,
        errorId
      }
    };
  }

  private static isRecoverable(errorCode: string): boolean {
    const recoverableErrors = [
      'NETWORK_ERROR', 
      'STORAGE_FULL', 
      'CONCURRENT_EDIT',
      'MIGRATION_FAILED'
    ];
    return recoverableErrors.includes(errorCode);
  }

  private static getRetryAction(operation: string): (() => void) | undefined {
    switch (operation) {
      case 'save-product':
        return () => window.location.reload();
      case 'migrate-composition':
        return () => {
          // Retry migration logic would go here
          console.log('Retrying migration...');
        };
      default:
        return undefined;
    }
  }

  private static generateErrorId(): string {
    return `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Create error context for operations
   */
  static createContext(
    operation: string,
    userAction: string,
    errorCode: string,
    productSku?: string,
    metadata?: Record<string, any>
  ): ErrorContext {
    return {
      operation,
      productSku,
      timestamp: new Date(),
      userAction,
      errorCode,
      metadata
    };
  }

  /**
   * Handle validation errors specifically
   */
  static handleValidationError(
    errors: string[],
    operation: string,
    productSku?: string
  ): UserFriendlyError {
    const context = this.createContext(
      operation,
      'form-submission',
      'VALIDATION_ERROR',
      productSku,
      { validationErrors: errors }
    );

    const error = new Error(`Validation failed: ${errors.join(', ')}`);
    return this.handleError(error, context);
  }

  /**
   * Handle migration errors specifically
   */
  static handleMigrationError(
    error: Error,
    operation: string,
    productSku: string
  ): UserFriendlyError {
    const context = this.createContext(
      operation,
      'data-migration',
      'MIGRATION_FAILED',
      productSku
    );

    return this.handleError(error, context);
  }
}
