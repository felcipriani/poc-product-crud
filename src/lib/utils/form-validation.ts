import { z } from "zod";
import { ValidationError } from "./error-handling";

// Enhanced validation utilities for forms
export class FormValidator {
  // Validate data against a Zod schema with enhanced error messages
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        const field = firstError.path.join(".");
        const message = this.getEnhancedErrorMessage(firstError);
        
        throw new ValidationError(message, field, firstError.code);
      }
      throw error;
    }
  }

  // Get enhanced error messages for better UX
  private static getEnhancedErrorMessage(error: z.ZodIssue): string {
    const { code, path, message } = error;
    const fieldName = path.join(".");

    switch (code) {
      case "invalid_type":
        if (error.expected === "string" && error.received === "undefined") {
          return `${fieldName} is required`;
        }
        if (error.expected === "number" && error.received === "string") {
          return `${fieldName} must be a valid number`;
        }
        return `${fieldName} must be a ${error.expected}`;

      case "too_small":
        if (error.type === "string") {
          return error.minimum === 1 
            ? `${fieldName} is required`
            : `${fieldName} must be at least ${error.minimum} characters`;
        }
        if (error.type === "number") {
          return `${fieldName} must be at least ${error.minimum}`;
        }
        return message;

      case "too_big":
        if (error.type === "string") {
          return `${fieldName} must be no more than ${error.maximum} characters`;
        }
        if (error.type === "number") {
          return `${fieldName} must be no more than ${error.maximum}`;
        }
        return message;

      case "invalid_string":
        if (error.validation === "regex") {
          return this.getRegexErrorMessage(fieldName, error.message);
        }
        return message;

      case "custom":
        return message;

      default:
        return message;
    }
  }

  // Get user-friendly regex error messages
  private static getRegexErrorMessage(fieldName: string, originalMessage: string): string {
    // Common regex patterns and their user-friendly messages
    const regexMessages: Record<string, string> = {
      "SKU": "SKU must contain only uppercase letters, numbers, and hyphens",
      "email": "Please enter a valid email address",
      "phone": "Please enter a valid phone number",
      "alphanumeric": "Only letters and numbers are allowed",
    };

    // Try to match common patterns
    for (const [pattern, message] of Object.entries(regexMessages)) {
      if (originalMessage.toLowerCase().includes(pattern.toLowerCase())) {
        return message;
      }
    }

    return `${fieldName} format is invalid`;
  }

  // Validate individual field with custom rules
  static validateField<T>(
    value: T,
    rules: Array<(value: T) => string | null>,
    fieldName: string
  ): void {
    for (const rule of rules) {
      const error = rule(value);
      if (error) {
        throw new ValidationError(error, fieldName);
      }
    }
  }

  // Common validation rules
  static rules = {
    required: <T>(value: T): string | null => {
      if (value === null || value === undefined || value === "") {
        return "This field is required";
      }
      return null;
    },

    minLength: (min: number) => (value: string): string | null => {
      if (value && value.length < min) {
        return `Must be at least ${min} characters`;
      }
      return null;
    },

    maxLength: (max: number) => (value: string): string | null => {
      if (value && value.length > max) {
        return `Must be no more than ${max} characters`;
      }
      return null;
    },

    positive: (value: number): string | null => {
      if (value !== undefined && value !== null && value <= 0) {
        return "Must be a positive number";
      }
      return null;
    },

    unique: <T>(
      existingValues: T[],
      caseSensitive = true
    ) => (value: T): string | null => {
      if (value === undefined || value === null) return null;
      
      const compareValue = caseSensitive 
        ? value 
        : String(value).toLowerCase();
      
      const exists = existingValues.some(existing => {
        const compareExisting = caseSensitive 
          ? existing 
          : String(existing).toLowerCase();
        return compareExisting === compareValue;
      });

      return exists ? "This value already exists" : null;
    },

    regex: (pattern: RegExp, message: string) => (value: string): string | null => {
      if (value && !pattern.test(value)) {
        return message;
      }
      return null;
    },

    custom: <T>(validator: (value: T) => boolean, message: string) => (value: T): string | null => {
      if (value !== undefined && value !== null && !validator(value)) {
        return message;
      }
      return null;
    },
  };
}

// Async validation for server-side checks
export class AsyncFormValidator {
  // Validate uniqueness against repository
  static async validateUniqueness<T>(
    value: T,
    checkFunction: (value: T) => Promise<boolean>,
    fieldName: string,
    caseSensitive = true
  ): Promise<void> {
    if (!value) return;

    const compareValue = caseSensitive ? value : String(value).toLowerCase();
    const exists = await checkFunction(compareValue as T);
    
    if (exists) {
      throw new ValidationError(
        `${fieldName} '${value}' already exists`,
        fieldName,
        "unique"
      );
    }
  }

  // Validate business rules
  static async validateBusinessRule(
    data: any,
    validator: (data: any) => Promise<string | null>,
    fieldName?: string
  ): Promise<void> {
    const error = await validator(data);
    if (error) {
      throw new ValidationError(error, fieldName);
    }
  }
}

// Form state management utilities
export interface FormState<T> {
  data: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

export class FormStateManager<T extends Record<string, any>> {
  private state: FormState<T>;
  private schema?: z.ZodSchema<T>;
  private listeners: Array<(state: FormState<T>) => void> = [];

  constructor(initialData: T, schema?: z.ZodSchema<T>) {
    this.state = {
      data: initialData,
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: true,
    };
    this.schema = schema;
  }

  // Subscribe to state changes
  subscribe(listener: (state: FormState<T>) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Notify listeners of state changes
  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Update field value
  updateField(field: keyof T, value: any): void {
    this.state.data[field] = value;
    this.state.touched[field as string] = true;
    
    // Clear field error when user starts typing
    if (this.state.errors[field as string]) {
      delete this.state.errors[field as string];
    }

    this.validateField(field);
    this.notify();
  }

  // Validate single field
  private validateField(field: keyof T): void {
    if (!this.schema) return;

    try {
      // Create a partial schema for the field
      if ('pick' in this.schema && typeof this.schema.pick === 'function') {
        const fieldSchema = (this.schema as any).pick({ [field]: true });
        fieldSchema.parse({ [field]: this.state.data[field] });
      } else {
        // Fallback: validate the entire object and check for field-specific errors
        this.schema.parse(this.state.data);
      }
      
      // Remove error if validation passes
      delete this.state.errors[field as string];
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors[0];
        this.state.errors[field as string] = fieldError.message;
      }
    }

    this.updateValidState();
  }

  // Validate entire form
  validate(): boolean {
    if (!this.schema) return true;

    try {
      this.schema.parse(this.state.data);
      this.state.errors = {};
      this.state.isValid = true;
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.state.errors = {};
        error.errors.forEach(err => {
          const field = err.path.join(".");
          this.state.errors[field] = err.message;
        });
      }
      this.updateValidState();
      return false;
    }
  }

  // Update valid state based on errors
  private updateValidState(): void {
    this.state.isValid = Object.keys(this.state.errors).length === 0;
  }

  // Set field error manually
  setFieldError(field: keyof T, error: string): void {
    this.state.errors[field as string] = error;
    this.updateValidState();
    this.notify();
  }

  // Clear field error
  clearFieldError(field: keyof T): void {
    delete this.state.errors[field as string];
    this.updateValidState();
    this.notify();
  }

  // Set submitting state
  setSubmitting(isSubmitting: boolean): void {
    this.state.isSubmitting = isSubmitting;
    this.notify();
  }

  // Get current state
  getState(): FormState<T> {
    return { ...this.state };
  }

  // Reset form
  reset(newData?: T): void {
    this.state = {
      data: newData || this.state.data,
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: true,
    };
    this.notify();
  }
}