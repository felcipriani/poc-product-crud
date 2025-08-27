import { toast } from "@/hooks/use-toast";

// Error types for better error categorization
export enum ErrorType {
  VALIDATION = "validation",
  BUSINESS_RULE = "business_rule",
  STORAGE = "storage",
  NETWORK = "network",
  UNKNOWN = "unknown",
}

// Custom error classes
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class BusinessRuleError extends Error {
  constructor(
    message: string,
    public rule: string,
    public context?: any
  ) {
    super(message);
    this.name = "BusinessRuleError";
  }
}

export class StorageError extends Error {
  constructor(
    message: string,
    public operation: string,
    public cause?: Error
  ) {
    super(message);
    this.name = "StorageError";
  }
}

// Error classification utility
export function classifyError(error: unknown): {
  type: ErrorType;
  message: string;
  originalError: Error;
} {
  if (error instanceof ValidationError) {
    return {
      type: ErrorType.VALIDATION,
      message: error.message,
      originalError: error,
    };
  }

  if (error instanceof BusinessRuleError) {
    return {
      type: ErrorType.BUSINESS_RULE,
      message: error.message,
      originalError: error,
    };
  }

  if (error instanceof StorageError) {
    return {
      type: ErrorType.STORAGE,
      message: error.message,
      originalError: error,
    };
  }

  if (error instanceof Error) {
    return {
      type: ErrorType.UNKNOWN,
      message: error.message,
      originalError: error,
    };
  }

  return {
    type: ErrorType.UNKNOWN,
    message: "An unknown error occurred",
    originalError: new Error(String(error)),
  };
}

// User-friendly error messages
export function getUserFriendlyMessage(error: unknown): string {
  const classified = classifyError(error);

  switch (classified.type) {
    case ErrorType.VALIDATION:
      return classified.message; // Validation messages are already user-friendly
    
    case ErrorType.BUSINESS_RULE:
      return classified.message; // Business rule messages are already user-friendly
    
    case ErrorType.STORAGE:
      return "There was a problem saving your data. Please try again.";
    
    case ErrorType.NETWORK:
      return "Network error. Please check your connection and try again.";
    
    default:
      return "Something went wrong. Please try again.";
  }
}

// Toast notification helpers
export function showErrorToast(error: unknown, title = "Error") {
  const message = getUserFriendlyMessage(error);
//   // toast({
//     title,
//     description: message,
//     variant: "destructive",
//   });
}

export function showSuccessToast(message: string, title = "Success") {
//   // toast({
//     title,
//     description: message,
//   });
}

// Async operation wrapper with error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options: {
    successMessage?: string;
    errorTitle?: string;
    showSuccessToast?: boolean;
    showErrorToast?: boolean;
    onSuccess?: (result: T) => void;
    onError?: (error: unknown) => void;
    retries?: number;
    retryDelay?: number;
  } = {}
): Promise<T | null> {
  const {
    successMessage,
    errorTitle = "Error",
    showSuccessToast: showSuccess = false,
    showErrorToast: showError = true,
    onSuccess,
    onError,
    retries = 0,
    retryDelay = 1000,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await operation();
      
      if (showSuccess && successMessage) {
        showSuccessToast(successMessage);
      }
      
      onSuccess?.(result);
      return result;
    } catch (error) {
      lastError = error;
      
      // If this is the last attempt or no retries configured
      if (attempt === retries) {
        if (showError) {
          showErrorToast(error, errorTitle);
        }
        
        onError?.(error);
        return null;
      }

      // Wait before retrying
      if (retryDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  return null;
}

// Optimistic update helper
export class OptimisticUpdate<T> {
  private originalValue: T;
  private currentValue: T;
  private rollbackCallbacks: Array<() => void> = [];

  constructor(initialValue: T) {
    this.originalValue = initialValue;
    this.currentValue = initialValue;
  }

  // Apply optimistic update
  apply(newValue: T, rollbackCallback?: () => void): void {
    this.currentValue = newValue;
    if (rollbackCallback) {
      this.rollbackCallbacks.push(rollbackCallback);
    }
  }

  // Commit the update (make it permanent)
  commit(): void {
    this.originalValue = this.currentValue;
    this.rollbackCallbacks = [];
  }

  // Rollback to original value
  rollback(): void {
    this.currentValue = this.originalValue;
    this.rollbackCallbacks.forEach(callback => callback());
    this.rollbackCallbacks = [];
  }

  // Get current value
  getValue(): T {
    return this.currentValue;
  }

  // Check if there are pending changes
  hasPendingChanges(): boolean {
    return JSON.stringify(this.originalValue) !== JSON.stringify(this.currentValue);
  }
}

// Form error handling utilities
export interface FormErrorState {
  [field: string]: string | undefined;
}

export function extractFormErrors(error: unknown): FormErrorState {
  const classified = classifyError(error);
  
  if (classified.originalError instanceof ValidationError && classified.originalError.field) {
    return {
      [classified.originalError.field]: classified.originalError.message,
    };
  }

  // For Zod validation errors
  if (classified.originalError.message.includes("validation")) {
    try {
      const zodError = JSON.parse(classified.originalError.message);
      const errors: FormErrorState = {};
      
      if (Array.isArray(zodError)) {
        zodError.forEach((err: any) => {
          if (err.path && err.message) {
            errors[err.path.join(".")] = err.message;
          }
        });
      }
      
      return errors;
    } catch {
      // If parsing fails, return general error
      return { _general: getUserFriendlyMessage(error) };
    }
  }

  return { _general: getUserFriendlyMessage(error) };
}

// Retry mechanism for failed operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError;
}

// Debounced error handler for form validation
export function createDebouncedErrorHandler(
  callback: (error: unknown) => void,
  delay = 300
) {
  let timeoutId: NodeJS.Timeout;

  return (error: unknown) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(error), delay);
  };
}