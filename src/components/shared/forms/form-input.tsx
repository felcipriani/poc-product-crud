"use client";

import * as React from "react";
import { Control, FieldPath, FieldValues, FieldError } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { FormField } from "./form-field";

interface FormInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<React.ComponentProps<typeof Input>, "name"> {
  control: Control<TFieldValues>;
  name: TName;
  label: string;
  description?: string;
  required?: boolean;
  error?: FieldError;
}

export function FormInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  label,
  description,
  required = false,
  error,
  className,
  ...inputProps
}: FormInputProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      label={label}
      description={description}
      required={required}
      error={error}
    >
      {(field) => (
        <Input
          {...field}
          {...inputProps}
          className={className}
        />
      )}
    </FormField>
  );
}