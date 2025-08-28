"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Product,
  CreateProductData,
  UpdateProductData,
} from "@/lib/domain/entities/product";
import { DimensionsSchema } from "@/lib/domain/value-objects/dimensions";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/shared/forms/form-input";
import { FormField } from "@/components/shared/forms/form-field";
import { Input } from "@/components/ui/input";
import { TransitionDialog } from "@/components/shared/dialogs/transition-dialog";
import { cn } from "@/lib/utils/cn";
import { useProductTransitions } from "../hooks/use-product-transitions";

const ProductFormSchema = z.object({
  sku: z
    .string()
    .min(1, "SKU is required")
    .max(50, "SKU must be 50 characters or less")
    .regex(
      /^[A-Z0-9-]+$/,
      "SKU must contain only uppercase letters, numbers, and hyphens"
    ),
  name: z
    .string()
    .min(1, "Product name is required")
    .max(100, "Product name must be 100 characters or less"),
  weight: z
    .number()
    .positive("Weight must be a positive number")
    .optional()
    .or(z.literal("")),
  dimensions: z
    .object({
      height: z
        .number()
        .positive("Height must be positive")
        .optional()
        .or(z.literal("")),
      width: z
        .number()
        .positive("Width must be positive")
        .optional()
        .or(z.literal("")),
      depth: z
        .number()
        .positive("Depth must be positive")
        .optional()
        .or(z.literal("")),
    })
    .optional(),
  isComposite: z.boolean(),
  hasVariation: z.boolean(),
});

type ProductFormData = z.infer<typeof ProductFormSchema>;

export interface ProductFormProps {
  product?: Product;
  onSubmit: (data: CreateProductData | UpdateProductData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ProductForm({
  product,
  onSubmit,
  onCancel,
  loading = false,
}: ProductFormProps) {
  const isEditing = !!product;
  const [pendingFormData, setPendingFormData] =
    React.useState<ProductFormData | null>(null);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(ProductFormSchema),
    defaultValues: {
      sku: product?.sku || "",
      name: product?.name || "",
      weight: product?.weight || "",
      dimensions: {
        height: product?.dimensions?.height || "",
        width: product?.dimensions?.width || "",
        depth: product?.dimensions?.depth || "",
      },
      isComposite: product?.isComposite || false,
      hasVariation: product?.hasVariation || false,
    },
  });

  // Initialize transitions hook only for editing mode
  const transitions = useProductTransitions({
    product: product || ({} as Product),
    onProductUpdate: onSubmit,
  });

  const {
    watch,
    handleSubmit,
    control,
    formState: { errors },
  } = form;
  const isComposite = watch("isComposite");
  const hasVariation = watch("hasVariation");

  const handleFormSubmit = async (data: ProductFormData) => {
    try {
      // For editing mode, check if transition is required
      if (isEditing && product) {
        const targetFlags = {
          isComposite: data.isComposite,
          hasVariation: data.hasVariation,
        };

        const transitionRequired =
          await transitions.checkTransitionRequired(targetFlags);

        if (transitionRequired) {
          // Store form data for after transition
          setPendingFormData(data);
          return; // Wait for transition dialog
        }
      }

      // Transform and submit form data
      await submitFormData(data);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const submitFormData = async (data: ProductFormData) => {
    // Transform form data to match API expectations
    const transformedData = {
      sku: data.sku,
      name: data.name,
      weight: typeof data.weight === "number" ? data.weight : undefined,
      dimensions:
        data.dimensions?.height &&
        data.dimensions?.width &&
        data.dimensions?.depth
          ? {
              height: Number(data.dimensions.height),
              width: Number(data.dimensions.width),
              depth: Number(data.dimensions.depth),
            }
          : undefined,
      isComposite: data.isComposite,
      hasVariation: data.hasVariation,
    };

    if (isEditing) {
      // For updates, exclude SKU as it's immutable
      const { sku, ...updateData } = transformedData;
      await onSubmit(updateData);
    } else {
      await onSubmit(transformedData);
    }
  };

  // Handle transition completion
  const handleTransitionComplete = async () => {
    if (pendingFormData) {
      await submitFormData(pendingFormData);
      setPendingFormData(null);
    }
    transitions.handleTransitionComplete();
  };

  // Handle transition cancellation
  const handleTransitionCancel = () => {
    // Reset form to original values
    if (product) {
      form.reset({
        sku: product.sku,
        name: product.name,
        weight: product.weight || "",
        dimensions: {
          height: product.dimensions?.height || "",
          width: product.dimensions?.width || "",
          depth: product.dimensions?.depth || "",
        },
        isComposite: product.isComposite,
        hasVariation: product.hasVariation,
      });
    }
    setPendingFormData(null);
    transitions.cancelTransition();
  };

  return (
    <>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* SKU Field - disabled when editing */}
        <FormInput
          control={control}
          name="sku"
          label="SKU"
          placeholder="e.g., PROD-001"
          required
          disabled={isEditing}
          error={errors.sku}
          description={
            isEditing
              ? "SKU cannot be changed after creation"
              : "Unique product identifier"
          }
        />

        {/* Product Name */}
        <FormInput
          control={control}
          name="name"
          label="Product Name"
          placeholder="Enter product name"
          required
          error={errors.name}
        />

        {/* Product Flags */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name="isComposite"
            label="Composite Product"
            description="Product made up of other products"
          >
            {(field) => (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isComposite"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="isComposite" className="text-sm font-medium">
                  This is a composite product
                </label>
              </div>
            )}
          </FormField>

          <FormField
            control={control}
            name="hasVariation"
            label="Product Variations"
            description="Product has different variations (color, size, etc.)"
          >
            {(field) => (
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hasVariation"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="hasVariation" className="text-sm font-medium">
                  This product has variations
                </label>
              </div>
            )}
          </FormField>
        </div>

        {/* Weight Field - conditional visibility */}
        <FormField
          control={control}
          name="weight"
          label="Weight (kg)"
          description={
            isComposite
              ? "Weight will be calculated from composition items"
              : "Product weight in kilograms"
          }
        >
          {(field) => (
            <Input
              {...field}
              type="number"
              step="0.001"
              min="0"
              placeholder="0.00"
              disabled={isComposite}
              className={cn(isComposite && "bg-muted text-muted-foreground")}
              onChange={(e) => {
                const value = e.target.value;
                field.onChange(value === "" ? "" : parseFloat(value));
              }}
            />
          )}
        </FormField>

        {/* Dimensions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Dimensions (cm)</h3>
            <span className="text-xs text-muted-foreground">Optional</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={control}
              name="dimensions.height"
              label="Height"
            >
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.0"
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === "" ? "" : parseFloat(value));
                  }}
                />
              )}
            </FormField>

            <FormField control={control} name="dimensions.width" label="Width">
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.0"
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === "" ? "" : parseFloat(value));
                  }}
                />
              )}
            </FormField>

            <FormField control={control} name="dimensions.depth" label="Depth">
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.0"
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === "" ? "" : parseFloat(value));
                  }}
                />
              )}
            </FormField>
          </div>
        </div>

        {/* Information Messages */}
        {(isComposite || hasVariation) && (
          <div className="rounded-md bg-blue-50 p-4">
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">
                Additional Configuration Required:
              </p>
              <ul className="list-disc list-inside space-y-1">
                {isComposite && hasVariation ? (
                  <li>
                    Configure composition and variations in the unified
                    Composition tab after saving
                  </li>
                ) : (
                  <>
                    {isComposite && (
                      <li>
                        Configure composition items in the Composition tab after
                        saving
                      </li>
                    )}
                    {hasVariation && (
                      <li>
                        Configure product variations in the Variations tab after
                        saving
                      </li>
                    )}
                  </>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading
              ? "Saving..."
              : isEditing
                ? "Update Product"
                : isComposite || hasVariation
                  ? "Next"
                  : "Create Product"}
          </Button>
        </div>
      </form>

      {/* Transition Dialog */}
      {isEditing &&
        transitions.transitionState.isOpen &&
        transitions.transitionState.context && (
          <TransitionDialog
            open={transitions.transitionState.isOpen}
            type={transitions.transitionState.type!}
            context={transitions.transitionState.context}
            onConfirm={async () => {
              const result = await transitions.executeTransition();
              if (result.success) {
                handleTransitionComplete();
              }
              return result;
            }}
            onCancel={handleTransitionCancel}
            loading={transitions.transitionState.loading}
          />
        )}
    </>
  );
}
