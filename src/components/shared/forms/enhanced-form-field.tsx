"use client";

import * as React from "react";
import { Control, FieldPath, FieldValues, FieldError } from "react-hook-form";
import { cn } from "@/lib/utils/cn";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface EnhancedFormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  description?: string;
  required?: boolean;
  error?: FieldError;
  success?: boolean;
  loading?: boolean;
  children: (field: any) => React.ReactNode;
  className?: string;
}

export function EnhancedFormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  label,
  description,
  required = false,
  error,
  success = false,
  loading = false,
  children,
  className,
}: EnhancedFormFieldProps<TFieldValues, TName>) {
  const fieldId = `field-${String(name)}`;
  const errorId = `${fieldId}-error`;
  const descriptionId = `${fieldId}-description`;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label */}
      <label
        htmlFor={fieldId}
        className={cn(
          "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          error && "text-destructive",
          success && "text-green-600"
        )}
      >
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
        {loading && (
          <span className="ml-2 inline-flex items-center">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
          </span>
        )}
      </label>

      {/* Field Container */}
      <div className="relative">
        <>
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              const childElement = child as React.ReactElement<any>;
              return React.cloneElement(childElement, {
                id: fieldId,
                "aria-invalid": !!error,
                "aria-describedby": cn(
                  description && descriptionId,
                  error && errorId
                ),
                className: cn(
                  childElement.props.className,
                  error && "border-destructive focus:border-destructive",
                  success && "border-green-500 focus:border-green-500"
                ),
              });
            }
            return child;
          })}
        </>

        {/* Status Icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground"></div>
          )}
          {error && !loading && (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
          {success && !error && !loading && (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
        </div>
      </div>

      {/* Description */}
      {description && (
        <p
          id={descriptionId}
          className="text-sm text-muted-foreground"
        >
          {description}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <div
          id={errorId}
          role="alert"
          className="flex items-center space-x-2 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error.message}</span>
        </div>
      )}
    </div>
  );
}

// Enhanced Input with validation states
interface EnhancedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
  loading?: boolean;
}

export const EnhancedInput = React.forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({ className, error, success, loading, ...props }, ref) => {
    return (
      <input
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus-visible:ring-destructive",
          success && "border-green-500 focus-visible:ring-green-500",
          loading && "pr-10",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
EnhancedInput.displayName = "EnhancedInput";

// Form section with error boundary
interface FormSectionProps {
  title: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  title,
  description,
  error,
  children,
  className,
}: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <h3 className={cn(
          "text-lg font-medium",
          error && "text-destructive"
        )}>
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {error && (
          <div className="flex items-center space-x-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// Form actions with loading states
interface FormActionsProps {
  onCancel?: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function FormActions({
  onCancel,
  onSubmit,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  loading = false,
  disabled = false,
  className,
}: FormActionsProps) {
  return (
    <div className={cn("flex justify-end space-x-3 pt-6 border-t", className)}>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cancelLabel}
        </button>
      )}
      <button
        type="submit"
        onClick={onSubmit}
        disabled={loading || disabled}
        className={cn(
          "px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed",
          loading && "cursor-wait"
        )}
      >
        {loading && (
          <div className="inline-flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Saving...
          </div>
        )}
        {!loading && submitLabel}
      </button>
    </div>
  );
}