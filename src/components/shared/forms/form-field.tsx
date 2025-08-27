"use client";

import * as React from "react";
import { Control, Controller, FieldPath, FieldValues, FieldError } from "react-hook-form";
import { cn } from "@/lib/utils/cn";

interface FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  description?: string;
  required?: boolean;
  error?: FieldError;
  children: (field: {
    value: any;
    onChange: (value: any) => void;
    onBlur: () => void;
    name: string;
    ref: React.Ref<any>;
  }) => React.ReactElement;
  className?: string;
}

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  label,
  description,
  required = false,
  error,
  children,
  className,
}: FormFieldProps<TFieldValues, TName>) {
  const fieldId = `field-${name}`;
  const errorId = `${fieldId}-error`;
  const descriptionId = `${fieldId}-description`;

  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={fieldId}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div>
            {children({
              ...field,
              id: fieldId,
              "aria-describedby": cn(
                description && descriptionId,
                error && errorId
              ),
              "aria-invalid": !!error,
            } as any)}
          </div>
        )}
      />
      
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      )}
    </div>
  );
}